import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { extractRequestInfo, logActivity } from '@/lib/services/activity-log-service'
import { getRedisClient } from '@/lib/telegram/utils/redis-client'

// Sabit bahis limitleri - değiştirilemez
const FIXED_MIN_BET = 10
const FIXED_MAX_BET = 500

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 dakika
const RATE_LIMIT_MAX = 60 // Dakikada max 60 istek
const ACTION_COOLDOWN = 500 // 0.5 saniye cooldown

// In-memory game lock (fallback when Redis unavailable)
const gameLocksMap = new Map<string, { timestamp: number; action: string }>()
const LOCK_TTL = 10000 // 10 saniye (Redis ile tutarlı)

// Oyun ayarları tipi (sadece enabled kontrolü için)
interface GameSettings {
  enabled: boolean
  pendingDisable: boolean
}

// ========== SERVER-SIDE KART TİPLERİ ==========
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

interface Card {
  suit: Suit
  value: CardValue
  hidden?: boolean
  id: string
}

interface GameState {
  deck: Card[]
  playerHand: Card[]
  splitHand: Card[]
  dealerHand: Card[]
  phase: 'betting' | 'playing' | 'playing_split' | 'dealer_turn' | 'game_over'
  activeHand: 'main' | 'split'
  hasSplit: boolean
  isDoubleDown: boolean
  splitDoubleDown: boolean
}

// Ayarları cache'le - her 30 saniyede bir güncelle
let cachedSettings: GameSettings | null = null
let settingsCacheTime = 0
const SETTINGS_CACHE_TTL = 30000 // 30 saniye

// Yardımcı fonksiyon: DB'den ayar değerini al
function getSettingValue(settings: { key: string; value: string }[], key: string, defaultValue: string): string {
  const setting = settings.find(s => s.key === key)
  return setting?.value ?? defaultValue
}

// Cache'i temizle
export function clearGameSettingsCache() {
  cachedSettings = null
  settingsCacheTime = 0
}

// Oyun ayarlarını getir
async function getGameSettings(): Promise<GameSettings> {
  const now = Date.now()

  if (cachedSettings && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return cachedSettings
  }

  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['game_blackjack_enabled', 'game_blackjack_pending_disable']
        }
      }
    })

    const gameSettings: GameSettings = {
      enabled: getSettingValue(settings, 'game_blackjack_enabled', 'true') === 'true',
      pendingDisable: getSettingValue(settings, 'game_blackjack_pending_disable', 'false') === 'true',
    }

    if (gameSettings.pendingDisable) {
      gameSettings.enabled = false
      settingsCacheTime = now - SETTINGS_CACHE_TTL + 5000
    } else {
      settingsCacheTime = now
    }

    cachedSettings = gameSettings
    return gameSettings
  } catch (error) {
    console.error('Error fetching game settings:', error)
    return { enabled: true, pendingDisable: false }
  }
}

// ========== SERVER-SIDE KART FONKSİYONLARI ==========

// Thread-safe card ID generator using crypto-like random values
function generateCardId(): string {
  // Use timestamp + random to avoid collisions across concurrent requests
  const timestamp = Date.now()
  const random1 = Math.random().toString(36).substring(2, 8)
  const random2 = Math.random().toString(36).substring(2, 8)
  return `card-${timestamp}-${random1}-${random2}`
}

function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, id: generateCardId() })
    }
  }

  return deck
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function drawCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  if (deck.length === 0) {
    throw new Error('Deck is empty')
  }
  const remainingDeck = [...deck]
  const card = remainingDeck.pop()!
  return { card: { ...card, id: generateCardId() }, remainingDeck }
}

function calculateHandValue(hand: Card[], ignoreHidden = false): number {
  let value = 0
  let aces = 0

  for (const card of hand) {
    if (card.hidden && !ignoreHidden) continue

    if (card.value === 'A') {
      aces++
      value += 11
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      value += 10
    } else {
      value += Number.parseInt(card.value)
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value
}

function isNaturalBlackjack(hand: Card[]): boolean {
  if (hand.length !== 2) return false
  const hasAce = hand.some(c => c.value === 'A')
  const hasTenValue = hand.some(c => ['10', 'J', 'Q', 'K'].includes(c.value))
  return hasAce && hasTenValue
}

function canSplitHand(hand: Card[]): boolean {
  if (hand.length !== 2) return false
  const getCardNumericValue = (v: CardValue) => {
    if (['J', 'Q', 'K'].includes(v)) return 10
    if (v === 'A') return 11
    return Number.parseInt(v)
  }
  return getCardNumericValue(hand[0].value) === getCardNumericValue(hand[1].value)
}

function determineGameResult(
  playerHand: Card[],
  dealerHand: Card[],
  isSplitHand = false
): 'win' | 'lose' | 'push' | 'blackjack' {
  const playerValue = calculateHandValue(playerHand, true)
  const dealerValue = calculateHandValue(dealerHand, true)

  if (playerValue > 21) return 'lose'

  if (!isSplitHand && playerHand.length === 2 && isNaturalBlackjack(playerHand)) {
    if (dealerHand.length === 2 && isNaturalBlackjack(dealerHand)) {
      return 'push'
    }
    return 'blackjack'
  }

  if (dealerHand.length === 2 && isNaturalBlackjack(dealerHand)) {
    return 'lose'
  }

  if (dealerValue > 21) return 'win'
  if (playerValue > dealerValue) return 'win'
  if (playerValue < dealerValue) return 'lose'
  return 'push'
}

function calculatePayout(result: string, betAmount: number): number {
  switch (result) {
    case 'blackjack':
      return Math.floor(betAmount * 2.5)
    case 'win':
      return betAmount * 2
    case 'push':
      return betAmount
    case 'lose':
    default:
      return 0
  }
}

// Dealer'ın kartlarını çekmesi (17'ye kadar)
function dealerPlay(gameState: GameState): GameState {
  let { deck, dealerHand } = gameState

  // Gizli kartı aç
  dealerHand = dealerHand.map(c => ({ ...c, hidden: false }))

  // 17'ye kadar kart çek
  while (calculateHandValue(dealerHand, true) < 17) {
    const { card, remainingDeck } = drawCard(deck)
    dealerHand = [...dealerHand, card]
    deck = remainingDeck
  }

  return {
    ...gameState,
    deck,
    dealerHand,
    phase: 'game_over'
  }
}

// ========== LOCK FONKSİYONLARI ==========

async function acquireGameLock(gameId: string, action: string): Promise<boolean> {
  // Lazy cleanup of stale locks
  cleanupStaleLocksLazy()

  const redis = getRedisClient()
  const lockKey = `blackjack:lock:${gameId}`

  if (redis) {
    try {
      // Reduced TTL to 10 seconds for faster recovery
      const result = await redis.set(lockKey, `${action}:${Date.now()}`, { nx: true, ex: 10 })
      return result === 'OK'
    } catch (error) {
      console.error('[Blackjack Lock] Redis error:', error)
    }
  }

  const now = Date.now()
  const existingLock = gameLocksMap.get(gameId)

  if (existingLock && now - existingLock.timestamp < LOCK_TTL) {
    return false
  }

  gameLocksMap.set(gameId, { timestamp: now, action })
  return true
}

async function releaseGameLock(gameId: string): Promise<void> {
  const redis = getRedisClient()
  const lockKey = `blackjack:lock:${gameId}`

  if (redis) {
    try {
      await redis.del(lockKey)
    } catch (error) {
      console.error('[Blackjack Lock] Redis release error:', error)
    }
  }

  gameLocksMap.delete(gameId)
}

// Cleanup old in-memory locks on each request (lazy cleanup)
// Note: setInterval is not reliable in serverless environments
function cleanupStaleLocksLazy() {
  const now = Date.now()
  // Only cleanup if map has more than 100 entries to avoid overhead
  if (gameLocksMap.size > 100) {
    for (const [gameId, lock] of gameLocksMap.entries()) {
      if (now - lock.timestamp > LOCK_TTL) {
        gameLocksMap.delete(gameId)
      }
    }
  }
}

// Rate limit cleanup - lazy cleanup to prevent memory leak
function cleanupStaleRateLimitsLazy() {
  const now = Date.now()
  // Only cleanup if map has more than 500 entries
  if (rateLimitMap.size > 500) {
    for (const [userId, limit] of rateLimitMap.entries()) {
      if (now - limit.lastReset > RATE_LIMIT_WINDOW * 2) {
        rateLimitMap.delete(userId)
      }
    }
  }
}

// Rate limit check
async function checkRateLimit(userId: string): Promise<boolean> {
  // Lazy cleanup
  cleanupStaleRateLimitsLazy()

  const redis = getRedisClient()
  const rateLimitKey = `blackjack:ratelimit:${userId}`

  if (redis) {
    try {
      const count = await redis.incr(rateLimitKey)
      if (count === 1) {
        await redis.expire(rateLimitKey, Math.ceil(RATE_LIMIT_WINDOW / 1000))
      }
      return count <= RATE_LIMIT_MAX
    } catch {
      // Fall through to in-memory
    }
  }

  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, lastReset: now })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }

  userLimit.count++
  return true
}

// ========== KART GÖRÜNÜMÜ (CLIENT İÇİN) ==========

function formatCardsForClient(cards: Card[], hideHidden = true): Card[] {
  return cards.map(card => {
    if (hideHidden && card.hidden) {
      return { ...card, suit: 'spades' as Suit, value: 'A' as CardValue, hidden: true }
    }
    return { ...card }
  })
}

// ========== POST HANDLER ==========

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    if (!(await checkRateLimit(session.userId))) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })
    }

    const gameSettings = await getGameSettings()
    const body = await request.json()
    const { action, amount, gameId, isSplit, result: clientResult, splitResult: clientSplitResult, betAmount } = body
    const requestInfo = extractRequestInfo(request)

    // ========== BET (Frontend'den gelen) - START ile aynı işlevi görür ==========
    if (action === 'bet') {
      if (!gameSettings.enabled) {
        return NextResponse.json({ error: 'Blackjack oyunu şu anda kapalı' }, { status: 403 })
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Geçersiz bahis miktarı' }, { status: 400 })
      }

      if (amount < FIXED_MIN_BET) {
        return NextResponse.json({ error: `Minimum bahis ${FIXED_MIN_BET} puandır` }, { status: 400 })
      }

      if (amount > FIXED_MAX_BET) {
        return NextResponse.json({ error: `Maksimum bahis ${FIXED_MAX_BET} puandır` }, { status: 400 })
      }

      // gameId frontend'den geliyor - sadece bahsi düş
      const txResult = await prisma.$transaction(async (tx) => {
        // Mevcut aktif oyunu kontrol et
        const existingGame = await tx.blackjackGame.findFirst({
          where: { userId: session.userId, status: 'active' }
        })

        if (existingGame) {
          // Eski oyunu kayıp olarak işaretle
          await tx.blackjackGame.update({
            where: { id: existingGame.id },
            data: { status: 'completed', result: 'lose', payout: 0, completedAt: new Date() }
          })
        }

        const currentUser = await tx.user.findUnique({
          where: { id: session.userId },
          select: { points: true, siteUsername: true }
        })

        if (!currentUser) {
          throw new Error('Kullanıcı bulunamadı')
        }

        if (currentUser.points < amount) {
          throw new Error('Yetersiz puan')
        }

        const balanceBefore = currentUser.points
        const balanceAfter = balanceBefore - amount

        // Bahsi düş
        await tx.user.update({
          where: { id: session.userId },
          data: {
            points: { decrement: amount },
            pointHistory: {
              create: {
                amount: -amount,
                type: 'GAME_BET',
                description: 'Blackjack Bahis',
                balanceBefore,
                balanceAfter
              }
            }
          }
        })

        // Oyunu kaydet - frontend kart yönetimini yapıyor
        await tx.blackjackGame.create({
          data: {
            odunId: gameId,
            userId: session.userId,
            siteUsername: currentUser.siteUsername || null,
            betAmount: amount,
            status: 'active',
            balanceBefore,
            gamePhase: 'playing',
            lastActionAt: new Date(),
            gameStateJson: JSON.stringify({ phase: 'playing' }),
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent
          }
        })

        return { balanceAfter }
      })

      return NextResponse.json({
        success: true,
        balanceAfter: txResult.balanceAfter
      })
    }

    // ========== WIN - Oyuncu kazandı ==========
    if (action === 'win') {
      if (!gameId) {
        return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'win')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek zaten işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.blackjackGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) {
            throw new Error('Oyun bulunamadı')
          }

          // Zaten tamamlanmış oyunu tekrar işleme
          if (game.status === 'completed') {
            return {
              alreadyCompleted: true,
              payout: game.payout || 0,
              result: game.result
            }
          }

          if (game.userId !== session.userId) {
            throw new Error('Bu oyun size ait değil')
          }

          const winAmount = amount || 0 // Frontend'den gelen kazanç miktarı

          if (winAmount <= 0) {
            throw new Error('Geçersiz kazanç miktarı')
          }

          const user = await tx.user.findUnique({
            where: { id: session.userId },
            select: { points: true }
          })

          if (!user) {
            throw new Error('Kullanıcı bulunamadı')
          }

          const balanceAfter = user.points + winAmount

          // Kazancı ekle
          await tx.user.update({
            where: { id: session.userId },
            data: {
              points: { increment: winAmount },
              pointHistory: {
                create: {
                  amount: winAmount,
                  type: 'GAME_WIN',
                  description: clientResult === 'blackjack' ? 'Blackjack!' :
                               clientResult === 'push' ? 'Blackjack Berabere' : 'Blackjack Kazanç',
                  balanceBefore: user.points,
                  balanceAfter
                }
              }
            }
          })

          // Oyunu tamamla
          await tx.blackjackGame.update({
            where: { odunId: gameId },
            data: {
              status: 'completed',
              result: clientResult || 'win',
              splitResult: clientSplitResult,
              payout: winAmount,
              balanceAfter,
              completedAt: new Date()
            }
          })

          // Activity log - daha detaylı bilgi
          const totalBet = game.betAmount + (game.splitBetAmount || 0)
          const balanceBeforeWin = user.points
          const resultTitle = clientResult === 'blackjack' ? 'BLACKJACK!' :
                              clientResult === 'push' ? 'Berabere' : 'Kazanç!'
          const pointChange = winAmount - totalBet

          await logActivity({
            userId: session.userId,
            actionType: 'blackjack_win',
            actionTitle: `Blackjack - ${resultTitle}`,
            actionDescription: `${resultTitle} | Bahis: ${totalBet} | Kazanç: +${winAmount} | Önceki: ${game.balanceBefore?.toLocaleString('tr-TR') || balanceBeforeWin.toLocaleString('tr-TR')} → Sonraki: ${balanceAfter.toLocaleString('tr-TR')} (${pointChange >= 0 ? '+' : ''}${pointChange})`,
            oldValue: String(game.balanceBefore || balanceBeforeWin),
            newValue: String(balanceAfter),
            relatedId: gameId,
            relatedType: 'blackjack',
            metadata: {
              gameId,
              result: clientResult || 'win',
              splitResult: clientSplitResult,
              betAmount: game.betAmount,
              splitBetAmount: game.splitBetAmount,
              payout: winAmount,
              balanceBefore: game.balanceBefore || balanceBeforeWin,
              balanceAfter,
              isSplit
            },
            ...requestInfo
          })

          return {
            alreadyCompleted: false,
            payout: winAmount,
            result: clientResult || 'win',
            balanceAfter
          }
        })

        return NextResponse.json({
          success: true,
          ...result
        })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== LOSE - Oyuncu kaybetti ==========
    if (action === 'lose') {
      if (!gameId) {
        return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'lose')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek zaten işleniyor' }, { status: 409 })
      }

      try {
        await prisma.$transaction(async (tx) => {
          const game = await tx.blackjackGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) {
            // Oyun bulunamadı - sessizce geç
            return
          }

          // Zaten tamamlanmış
          if (game.status === 'completed') {
            return
          }

          if (game.userId !== session.userId) {
            throw new Error('Bu oyun size ait değil')
          }

          const user = await tx.user.findUnique({
            where: { id: session.userId },
            select: { points: true }
          })

          const currentBalance = user?.points || 0
          const totalBet = game.betAmount + (game.splitBetAmount || 0)

          // Oyunu tamamla - balanceBefore'u da kaydet
          await tx.blackjackGame.update({
            where: { odunId: gameId },
            data: {
              status: 'completed',
              result: 'lose',
              splitResult: clientSplitResult,
              payout: 0,
              balanceAfter: currentBalance,
              // balanceBefore zaten oyun başlarken kaydedilmiş olmalı
              completedAt: new Date()
            }
          })

          // Activity log - daha detaylı bilgi
          const balanceBeforeGame = game.balanceBefore || (currentBalance + totalBet)
          await logActivity({
            userId: session.userId,
            actionType: 'blackjack_lose',
            actionTitle: 'Blackjack oyunu kaybedildi',
            actionDescription: `Kayıp | Bahis: ${totalBet} kaybedildi | Önceki: ${balanceBeforeGame.toLocaleString('tr-TR')} → Sonraki: ${currentBalance.toLocaleString('tr-TR')} (-${totalBet})`,
            oldValue: String(balanceBeforeGame),
            newValue: String(currentBalance),
            relatedId: gameId,
            relatedType: 'blackjack',
            metadata: {
              gameId,
              result: 'lose',
              splitResult: clientSplitResult,
              betAmount: game.betAmount,
              splitBetAmount: game.splitBetAmount,
              payout: 0,
              balanceBefore: balanceBeforeGame,
              balanceAfter: currentBalance,
              isSplit
            },
            ...requestInfo
          })
        })

        return NextResponse.json({ success: true })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== START (YENİ OYUN BAŞLAT) ==========
    if (action === 'start') {
      if (!gameSettings.enabled) {
        return NextResponse.json({ error: 'Blackjack oyunu şu anda kapalı' }, { status: 403 })
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Geçersiz bahis miktarı' }, { status: 400 })
      }

      if (amount < FIXED_MIN_BET) {
        return NextResponse.json({ error: `Minimum bahis ${FIXED_MIN_BET} puandır` }, { status: 400 })
      }

      if (amount > FIXED_MAX_BET) {
        return NextResponse.json({ error: `Maksimum bahis ${FIXED_MAX_BET} puandır` }, { status: 400 })
      }

      const txResult = await prisma.$transaction(async (tx) => {
        // Mevcut aktif oyunu kontrol et
        const existingGame = await tx.blackjackGame.findFirst({
          where: { userId: session.userId, status: 'active' }
        })

        if (existingGame) {
          // Eski oyunu kayıp olarak işaretle
          await tx.blackjackGame.update({
            where: { id: existingGame.id },
            data: { status: 'completed', result: 'lose', payout: 0, completedAt: new Date() }
          })
        }

        const currentUser = await tx.user.findUnique({
          where: { id: session.userId },
          select: { points: true, siteUsername: true }
        })

        if (!currentUser) {
          throw new Error('Kullanıcı bulunamadı')
        }

        if (currentUser.points < amount) {
          throw new Error('Yetersiz puan')
        }

        const balanceBefore = currentUser.points
        const balanceAfter = balanceBefore - amount

        // Bahsi düş
        await tx.user.update({
          where: { id: session.userId },
          data: {
            points: { decrement: amount },
            pointHistory: {
              create: {
                amount: -amount,
                type: 'GAME_BET',
                description: 'Blackjack Bahis',
                balanceBefore,
                balanceAfter
              }
            }
          }
        })

        // Deste oluştur ve kartları dağıt
        let deck = shuffleDeck(createDeck())

        const { card: pCard1, remainingDeck: d1 } = drawCard(deck)
        const { card: dCard1, remainingDeck: d2 } = drawCard(d1)
        const { card: pCard2, remainingDeck: d3 } = drawCard(d2)
        const { card: dCard2, remainingDeck: d4 } = drawCard(d3)
        deck = d4

        const playerHand: Card[] = [pCard1, pCard2]
        const dealerHand: Card[] = [dCard1, { ...dCard2, hidden: true }]

        const gameState: GameState = {
          deck,
          playerHand,
          splitHand: [],
          dealerHand,
          phase: 'playing',
          activeHand: 'main',
          hasSplit: false,
          isDoubleDown: false,
          splitDoubleDown: false
        }

        const newGameId = `bj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Oyunu kaydet
        await tx.blackjackGame.create({
          data: {
            odunId: newGameId,
            userId: session.userId,
            siteUsername: currentUser.siteUsername || null,
            betAmount: amount,
            status: 'active',
            balanceBefore,
            gamePhase: 'playing',
            lastActionAt: new Date(),
            gameStateJson: JSON.stringify(gameState),
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent
          }
        })

        // Blackjack kontrolü
        const playerHasBlackjack = isNaturalBlackjack(playerHand)
        const dealerHasBlackjack = isNaturalBlackjack([dCard1, dCard2])

        let immediateResult: { result: string; payout: number } | null = null

        if (playerHasBlackjack || dealerHasBlackjack) {
          // Blackjack durumu - oyunu hemen bitir
          let result: 'blackjack' | 'push' | 'lose'
          let payout = 0

          if (playerHasBlackjack && dealerHasBlackjack) {
            result = 'push'
            payout = amount
          } else if (playerHasBlackjack) {
            result = 'blackjack'
            payout = Math.floor(amount * 2.5)
          } else {
            result = 'lose'
            payout = 0
          }

          // Ödemeyi yap
          if (payout > 0) {
            await tx.user.update({
              where: { id: session.userId },
              data: {
                points: { increment: payout },
                pointHistory: {
                  create: {
                    amount: payout,
                    type: 'GAME_WIN',
                    description: result === 'blackjack' ? 'Blackjack!' : 'Blackjack Berabere',
                    balanceBefore: balanceAfter,
                    balanceAfter: balanceAfter + payout
                  }
                }
              }
            })
          }

          // Oyunu tamamla
          const revealedDealerHand = dealerHand.map(c => ({ ...c, hidden: false }))
          gameState.dealerHand = revealedDealerHand
          gameState.phase = 'game_over'

          await tx.blackjackGame.update({
            where: { odunId: newGameId },
            data: {
              status: 'completed',
              result,
              payout,
              balanceAfter: balanceAfter + payout,
              playerScore: calculateHandValue(playerHand, true),
              dealerScore: calculateHandValue(revealedDealerHand, true),
              playerCards: JSON.stringify(playerHand),
              dealerCards: JSON.stringify(revealedDealerHand),
              gameStateJson: JSON.stringify(gameState),
              completedAt: new Date()
            }
          })

          immediateResult = { result, payout }
        }

        return {
          gameId: newGameId,
          gameState,
          balanceAfter,
          immediateResult
        }
      })

      return NextResponse.json({
        success: true,
        gameId: txResult.gameId,
        playerHand: formatCardsForClient(txResult.gameState.playerHand),
        dealerHand: formatCardsForClient(txResult.gameState.dealerHand),
        playerValue: calculateHandValue(txResult.gameState.playerHand, true),
        dealerValue: calculateHandValue(txResult.gameState.dealerHand, false),
        phase: txResult.gameState.phase,
        canSplit: canSplitHand(txResult.gameState.playerHand),
        canDouble: txResult.gameState.playerHand.length === 2,
        balanceAfter: txResult.balanceAfter,
        immediateResult: txResult.immediateResult
      })
    }

    // ========== HIT ==========
    if (action === 'hit') {
      if (!gameId) {
        return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'hit')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.blackjackGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) throw new Error('Oyun bulunamadı')
          if (game.status !== 'active') throw new Error('Oyun zaten tamamlanmış')
          if (game.userId !== session.userId) throw new Error('Bu oyun size ait değil')

          let gameState: GameState = JSON.parse(game.gameStateJson || '{}')

          if (gameState.phase !== 'playing' && gameState.phase !== 'playing_split') {
            throw new Error('Geçersiz oyun durumu')
          }

          const isPlayingSplit = gameState.phase === 'playing_split'
          let currentHand = isPlayingSplit ? gameState.splitHand : gameState.playerHand

          // Kart çek
          const { card, remainingDeck } = drawCard(gameState.deck)
          currentHand = [...currentHand, card]
          gameState.deck = remainingDeck

          if (isPlayingSplit) {
            gameState.splitHand = currentHand
          } else {
            gameState.playerHand = currentHand
          }

          const handValue = calculateHandValue(currentHand, true)
          let bust = false
          let gameOver = false
          let finalResult: string | null = null
          let splitFinalResult: string | null = null
          let payout = 0

          if (handValue > 21) {
            bust = true

            if (isPlayingSplit) {
              // Split hand bust - ana ele geç
              gameState.phase = 'playing'
              gameState.activeHand = 'main'
            } else if (gameState.hasSplit) {
              // Ana el bust, split var
              // Split zaten oynandı (çünkü ana elde bust olduk), dealer oyna
              gameState = dealerPlay(gameState)
              gameOver = true

              finalResult = 'lose' // Ana el kaybetti
              // Split eli de dealer'a karşı değerlendir
              const splitValue = calculateHandValue(gameState.splitHand, true)
              if (splitValue > 21) {
                // Split de bust olduysa
                splitFinalResult = 'lose'
                payout = 0
              } else {
                splitFinalResult = determineGameResult(gameState.splitHand, gameState.dealerHand, true)
                payout = calculatePayout(splitFinalResult, game.splitBetAmount)
              }
            } else {
              // Tek el bust - oyun bitti
              gameState.phase = 'game_over'
              gameOver = true
              finalResult = 'lose'
              payout = 0
            }
          } else if (handValue === 21) {
            // 21 - otomatik stand
            if (isPlayingSplit) {
              gameState.phase = 'playing'
              gameState.activeHand = 'main'
            } else if (gameState.hasSplit) {
              gameState = dealerPlay(gameState)
              gameOver = true

              finalResult = determineGameResult(gameState.playerHand, gameState.dealerHand, true)
              splitFinalResult = determineGameResult(gameState.splitHand, gameState.dealerHand, true)
              payout = calculatePayout(finalResult, game.betAmount) + calculatePayout(splitFinalResult, game.splitBetAmount)
            } else {
              gameState = dealerPlay(gameState)
              gameOver = true

              finalResult = determineGameResult(gameState.playerHand, gameState.dealerHand, false)
              payout = calculatePayout(finalResult, game.betAmount)
            }
          }

          // Ödeme ve kayıt
          if (gameOver && payout > 0) {
            const user = await tx.user.findUnique({
              where: { id: session.userId },
              select: { points: true }
            })

            if (user) {
              await tx.user.update({
                where: { id: session.userId },
                data: {
                  points: { increment: payout },
                  pointHistory: {
                    create: {
                      amount: payout,
                      type: 'GAME_WIN',
                      description: 'Blackjack Kazanç',
                      balanceBefore: user.points,
                      balanceAfter: user.points + payout
                    }
                  }
                }
              })
            }
          }

          // Oyunu güncelle
          await tx.blackjackGame.update({
            where: { odunId: gameId },
            data: {
              status: gameOver ? 'completed' : 'active',
              result: finalResult,
              splitResult: splitFinalResult,
              payout: gameOver ? payout : null,
              gamePhase: gameState.phase,
              gameStateJson: JSON.stringify(gameState),
              lastActionAt: new Date(),
              completedAt: gameOver ? new Date() : null
            }
          })

          const currentUser = await tx.user.findUnique({
            where: { id: session.userId },
            select: { points: true }
          })

          return {
            gameState,
            bust,
            gameOver,
            result: finalResult,
            splitResult: splitFinalResult,
            payout,
            balanceAfter: currentUser?.points || 0
          }
        })

        return NextResponse.json({
          success: true,
          playerHand: formatCardsForClient(result.gameState.playerHand),
          splitHand: formatCardsForClient(result.gameState.splitHand),
          dealerHand: formatCardsForClient(result.gameState.dealerHand, !result.gameOver),
          playerValue: calculateHandValue(result.gameState.playerHand, true),
          splitValue: result.gameState.hasSplit ? calculateHandValue(result.gameState.splitHand, true) : null,
          dealerValue: result.gameOver ? calculateHandValue(result.gameState.dealerHand, true) : calculateHandValue(result.gameState.dealerHand, false),
          phase: result.gameState.phase,
          activeHand: result.gameState.activeHand,
          bust: result.bust,
          gameOver: result.gameOver,
          result: result.result,
          splitResult: result.splitResult,
          payout: result.payout,
          balanceAfter: result.balanceAfter
        })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== STAND ==========
    if (action === 'stand') {
      if (!gameId) {
        return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'stand')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.blackjackGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) throw new Error('Oyun bulunamadı')
          if (game.status !== 'active') throw new Error('Oyun zaten tamamlanmış')
          if (game.userId !== session.userId) throw new Error('Bu oyun size ait değil')

          let gameState: GameState = JSON.parse(game.gameStateJson || '{}')

          if (gameState.phase !== 'playing' && gameState.phase !== 'playing_split') {
            throw new Error('Geçersiz oyun durumu')
          }

          const isPlayingSplit = gameState.phase === 'playing_split'

          if (isPlayingSplit) {
            // Split hand stand - ana ele geç
            gameState.phase = 'playing'
            gameState.activeHand = 'main'

            await tx.blackjackGame.update({
              where: { odunId: gameId },
              data: {
                gamePhase: gameState.phase,
                gameStateJson: JSON.stringify(gameState),
                lastActionAt: new Date()
              }
            })

            return {
              gameState,
              gameOver: false,
              result: null,
              splitResult: null,
              payout: 0,
              balanceAfter: 0
            }
          }

          // Ana el stand - dealer oyna
          gameState = dealerPlay(gameState)

          let finalResult: string
          let splitFinalResult: string | null = null
          let payout = 0

          if (gameState.hasSplit) {
            finalResult = determineGameResult(gameState.playerHand, gameState.dealerHand, true)
            splitFinalResult = determineGameResult(gameState.splitHand, gameState.dealerHand, true)
            payout = calculatePayout(finalResult, game.betAmount) + calculatePayout(splitFinalResult, game.splitBetAmount)
          } else {
            finalResult = determineGameResult(gameState.playerHand, gameState.dealerHand, false)
            payout = calculatePayout(finalResult, game.betAmount)
          }

          // Ödeme yap
          let balanceAfter = 0
          if (payout > 0) {
            const user = await tx.user.findUnique({
              where: { id: session.userId },
              select: { points: true }
            })

            if (user) {
              balanceAfter = user.points + payout
              await tx.user.update({
                where: { id: session.userId },
                data: {
                  points: { increment: payout },
                  pointHistory: {
                    create: {
                      amount: payout,
                      type: 'GAME_WIN',
                      description: finalResult === 'blackjack' ? 'Blackjack!' : 'Blackjack Kazanç',
                      balanceBefore: user.points,
                      balanceAfter
                    }
                  }
                }
              })
            }
          } else {
            const user = await tx.user.findUnique({
              where: { id: session.userId },
              select: { points: true }
            })
            balanceAfter = user?.points || 0
          }

          // Oyunu tamamla
          await tx.blackjackGame.update({
            where: { odunId: gameId },
            data: {
              status: 'completed',
              result: finalResult,
              splitResult: splitFinalResult,
              payout,
              balanceAfter,
              playerScore: calculateHandValue(gameState.playerHand, true),
              dealerScore: calculateHandValue(gameState.dealerHand, true),
              playerCards: JSON.stringify(gameState.playerHand),
              dealerCards: JSON.stringify(gameState.dealerHand),
              gamePhase: 'game_over',
              gameStateJson: JSON.stringify(gameState),
              completedAt: new Date()
            }
          })

          return {
            gameState,
            gameOver: true,
            result: finalResult,
            splitResult: splitFinalResult,
            payout,
            balanceAfter
          }
        })

        return NextResponse.json({
          success: true,
          playerHand: formatCardsForClient(result.gameState.playerHand),
          splitHand: formatCardsForClient(result.gameState.splitHand),
          dealerHand: formatCardsForClient(result.gameState.dealerHand, false),
          playerValue: calculateHandValue(result.gameState.playerHand, true),
          splitValue: result.gameState.hasSplit ? calculateHandValue(result.gameState.splitHand, true) : null,
          dealerValue: calculateHandValue(result.gameState.dealerHand, true),
          phase: result.gameState.phase,
          activeHand: result.gameState.activeHand,
          gameOver: result.gameOver,
          result: result.result,
          splitResult: result.splitResult,
          payout: result.payout,
          balanceAfter: result.balanceAfter
        })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== DOUBLE ==========
    if (action === 'double') {
      if (!gameId) {
        return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'double')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.blackjackGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) throw new Error('Oyun bulunamadı')
          if (game.status !== 'active') throw new Error('Oyun zaten tamamlanmış')
          if (game.userId !== session.userId) throw new Error('Bu oyun size ait değil')

          let gameState: GameState = JSON.parse(game.gameStateJson || '{}')

          if (gameState.phase !== 'playing' && gameState.phase !== 'playing_split') {
            throw new Error('Geçersiz oyun durumu')
          }

          const isPlayingSplit = gameState.phase === 'playing_split'
          const currentHand = isPlayingSplit ? gameState.splitHand : gameState.playerHand

          if (currentHand.length !== 2) {
            throw new Error('Double sadece ilk 2 kart ile yapılabilir')
          }

          const doubleBet = isPlayingSplit ? game.splitBetAmount : game.betAmount

          // Bakiye kontrolü
          const user = await tx.user.findUnique({
            where: { id: session.userId },
            select: { points: true }
          })

          if (!user || user.points < doubleBet) {
            throw new Error('Yetersiz puan')
          }

          // Double bahsini düş
          await tx.user.update({
            where: { id: session.userId },
            data: {
              points: { decrement: doubleBet },
              pointHistory: {
                create: {
                  amount: -doubleBet,
                  type: 'GAME_BET',
                  description: 'Blackjack Double',
                  balanceBefore: user.points,
                  balanceAfter: user.points - doubleBet
                }
              }
            }
          })

          // Bahsi güncelle - FIX: Doğru hesaplama
          // Split hand için double yapılırsa: splitBetAmount iki katına çıkar, betAmount aynı kalır
          // Main hand için double yapılırsa: betAmount iki katına çıkar, splitBetAmount aynı kalır
          const newBetAmount = isPlayingSplit ? game.betAmount : game.betAmount + doubleBet
          const newSplitBetAmount = isPlayingSplit ? (game.splitBetAmount || 0) + doubleBet : (game.splitBetAmount || 0)

          // Tek kart çek
          const { card, remainingDeck } = drawCard(gameState.deck)
          gameState.deck = remainingDeck

          if (isPlayingSplit) {
            gameState.splitHand = [...gameState.splitHand, card]
            gameState.splitDoubleDown = true
          } else {
            gameState.playerHand = [...gameState.playerHand, card]
            gameState.isDoubleDown = true
          }

          const handValue = calculateHandValue(isPlayingSplit ? gameState.splitHand : gameState.playerHand, true)
          let gameOver = false
          let finalResult: string | null = null
          let splitFinalResult: string | null = null
          let payout = 0

          if (isPlayingSplit) {
            // Split hand double tamamlandı - ana ele geç (bust olsa da olmasa da)
            gameState.phase = 'playing'
            gameState.activeHand = 'main'
          } else {
            // Ana el double - dealer oyna
            gameState = dealerPlay(gameState)
            gameOver = true

            if (gameState.hasSplit) {
              finalResult = determineGameResult(gameState.playerHand, gameState.dealerHand, true)
              splitFinalResult = determineGameResult(gameState.splitHand, gameState.dealerHand, true)
              payout = calculatePayout(finalResult, newBetAmount) + calculatePayout(splitFinalResult, newSplitBetAmount)
            } else {
              finalResult = determineGameResult(gameState.playerHand, gameState.dealerHand, false)
              payout = calculatePayout(finalResult, newBetAmount)
            }
          }

          // Ödeme yap
          let balanceAfter = user.points - doubleBet
          if (gameOver && payout > 0) {
            balanceAfter += payout
            await tx.user.update({
              where: { id: session.userId },
              data: {
                points: { increment: payout },
                pointHistory: {
                  create: {
                    amount: payout,
                    type: 'GAME_WIN',
                    description: 'Blackjack Kazanç',
                    balanceBefore: user.points - doubleBet,
                    balanceAfter
                  }
                }
              }
            })
          }

          // Oyunu güncelle
          await tx.blackjackGame.update({
            where: { odunId: gameId },
            data: {
              betAmount: isPlayingSplit ? game.betAmount : newBetAmount,
              splitBetAmount: isPlayingSplit ? newSplitBetAmount : game.splitBetAmount,
              status: gameOver ? 'completed' : 'active',
              result: finalResult,
              splitResult: splitFinalResult,
              payout: gameOver ? payout : null,
              isDoubleDown: gameState.isDoubleDown,
              gamePhase: gameState.phase,
              gameStateJson: JSON.stringify(gameState),
              lastActionAt: new Date(),
              completedAt: gameOver ? new Date() : null
            }
          })

          return {
            gameState,
            gameOver,
            result: finalResult,
            splitResult: splitFinalResult,
            payout,
            balanceAfter,
            bust: handValue > 21
          }
        })

        return NextResponse.json({
          success: true,
          playerHand: formatCardsForClient(result.gameState.playerHand),
          splitHand: formatCardsForClient(result.gameState.splitHand),
          dealerHand: formatCardsForClient(result.gameState.dealerHand, !result.gameOver),
          playerValue: calculateHandValue(result.gameState.playerHand, true),
          splitValue: result.gameState.hasSplit ? calculateHandValue(result.gameState.splitHand, true) : null,
          dealerValue: result.gameOver ? calculateHandValue(result.gameState.dealerHand, true) : calculateHandValue(result.gameState.dealerHand, false),
          phase: result.gameState.phase,
          activeHand: result.gameState.activeHand,
          bust: result.bust,
          gameOver: result.gameOver,
          result: result.result,
          splitResult: result.splitResult,
          payout: result.payout,
          balanceAfter: result.balanceAfter
        })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== SPLIT ==========
    if (action === 'split') {
      if (!gameId) {
        return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'split')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.blackjackGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) throw new Error('Oyun bulunamadı')
          if (game.status !== 'active') throw new Error('Oyun zaten tamamlanmış')
          if (game.userId !== session.userId) throw new Error('Bu oyun size ait değil')

          let gameState: GameState = JSON.parse(game.gameStateJson || '{}')

          if (gameState.phase !== 'playing') {
            throw new Error('Geçersiz oyun durumu')
          }

          if (!canSplitHand(gameState.playerHand)) {
            throw new Error('Bu el bölünemez')
          }

          if (gameState.hasSplit) {
            throw new Error('Zaten split yapılmış')
          }

          const splitBet = game.betAmount

          // Bakiye kontrolü
          const user = await tx.user.findUnique({
            where: { id: session.userId },
            select: { points: true }
          })

          if (!user || user.points < splitBet) {
            throw new Error('Yetersiz puan')
          }

          // Split bahsini düş
          await tx.user.update({
            where: { id: session.userId },
            data: {
              points: { decrement: splitBet },
              pointHistory: {
                create: {
                  amount: -splitBet,
                  type: 'GAME_BET',
                  description: 'Blackjack Split',
                  balanceBefore: user.points,
                  balanceAfter: user.points - splitBet
                }
              }
            }
          })

          // Elleri böl
          const card1 = gameState.playerHand[0]
          const card2 = gameState.playerHand[1]

          // Her ele bir kart çek
          const { card: newCard1, remainingDeck: d1 } = drawCard(gameState.deck)
          const { card: newCard2, remainingDeck: d2 } = drawCard(d1)

          // Ana el (sol): İlk kart + yeni kart
          // Split el (sağ): İkinci kart + yeni kart
          gameState.playerHand = [card1, newCard1]
          gameState.splitHand = [card2, newCard2]
          gameState.deck = d2
          gameState.hasSplit = true
          // Önce split eli oynanır (sağ taraftaki el)
          gameState.phase = 'playing_split'
          gameState.activeHand = 'split'

          // Oyunu güncelle
          await tx.blackjackGame.update({
            where: { odunId: gameId },
            data: {
              splitBetAmount: splitBet,
              isSplit: true,
              gamePhase: 'playing_split',
              gameStateJson: JSON.stringify(gameState),
              lastActionAt: new Date()
            }
          })

          return {
            gameState,
            balanceAfter: user.points - splitBet
          }
        })

        return NextResponse.json({
          success: true,
          playerHand: formatCardsForClient(result.gameState.playerHand),
          splitHand: formatCardsForClient(result.gameState.splitHand),
          dealerHand: formatCardsForClient(result.gameState.dealerHand),
          playerValue: calculateHandValue(result.gameState.playerHand, true),
          splitValue: calculateHandValue(result.gameState.splitHand, true),
          dealerValue: calculateHandValue(result.gameState.dealerHand, false),
          phase: result.gameState.phase,
          activeHand: result.gameState.activeHand,
          hasSplit: true,
          balanceAfter: result.balanceAfter
        })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })

  } catch (error) {
    console.error('Blackjack API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ========== GET - AKTİF OYUNU GETİR ==========
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const activeGame = await prisma.blackjackGame.findFirst({
      where: {
        userId: session.userId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!activeGame) {
      return NextResponse.json({ hasActiveGame: false })
    }

    // 30 dakikadan eski oyunu timeout yap
    const timeoutMs = 30 * 60 * 1000
    if (activeGame.createdAt < new Date(Date.now() - timeoutMs)) {
      await prisma.blackjackGame.update({
        where: { id: activeGame.id },
        data: {
          status: 'completed',
          result: 'lose',
          payout: 0,
          completedAt: new Date()
        }
      })

      return NextResponse.json({ hasActiveGame: false, expired: true })
    }

    const gameState: GameState = JSON.parse(activeGame.gameStateJson || '{}')

    return NextResponse.json({
      hasActiveGame: true,
      gameId: activeGame.odunId,
      betAmount: activeGame.betAmount,
      splitBetAmount: activeGame.splitBetAmount,
      playerHand: formatCardsForClient(gameState.playerHand),
      splitHand: formatCardsForClient(gameState.splitHand),
      dealerHand: formatCardsForClient(gameState.dealerHand),
      playerValue: calculateHandValue(gameState.playerHand, true),
      splitValue: gameState.hasSplit ? calculateHandValue(gameState.splitHand, true) : null,
      dealerValue: calculateHandValue(gameState.dealerHand, false),
      phase: gameState.phase,
      activeHand: gameState.activeHand,
      hasSplit: gameState.hasSplit,
      canSplit: canSplitHand(gameState.playerHand) && !gameState.hasSplit,
      canDouble: (gameState.phase === 'playing' && gameState.playerHand.length === 2) ||
                 (gameState.phase === 'playing_split' && gameState.splitHand.length === 2)
    })
  } catch (error) {
    console.error('Blackjack GET error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
