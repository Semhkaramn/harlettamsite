import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { extractRequestInfo } from '@/lib/services/activity-log-service'
import { getRedisClient } from '@/lib/telegram/utils/redis-client'

// ========== SABİTLER ==========
const GRID_SIZE = 25 // 5x5
const FIXED_MIN_BET = 10
const FIXED_MAX_BET = 500
const GAME_TIMEOUT_MINUTES = 30

// ========== RATE LIMITING ==========
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 dakika
const RATE_LIMIT_MAX = 120 // Dakikada max 120 istek
const ACTION_COOLDOWN = 500 // 0.5 saniye cooldown

// In-memory game lock (fallback when Redis unavailable)
const gameLocksMap = new Map<string, { timestamp: number; action: string }>()
const LOCK_TTL = 30000 // 30 saniye

// ========== OYUN AYARLARI ==========
interface GameSettings {
  enabled: boolean
}

let cachedSettings: GameSettings | null = null
let settingsCacheTime = 0
const SETTINGS_CACHE_TTL = 30000 // 30 saniye

function getSettingValue(settings: { key: string; value: string }[], key: string, defaultValue: string): string {
  const setting = settings.find(s => s.key === key)
  return setting?.value ?? defaultValue
}

async function getGameSettings(): Promise<GameSettings> {
  const now = Date.now()

  if (cachedSettings && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return cachedSettings
  }

  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: ['game_mines_enabled'] } }
    })

    cachedSettings = {
      enabled: getSettingValue(settings, 'game_mines_enabled', 'true') === 'true'
    }
    settingsCacheTime = now

    return cachedSettings
  } catch {
    return { enabled: true }
  }
}

// ========== ÇARPAN HESAPLAMA ==========
function calculateMultiplier(mineCount: number, revealedCount: number): number {
  if (revealedCount === 0) return 1

  const safeSpots = GRID_SIZE - mineCount
  let multiplier = 1

  for (let i = 0; i < revealedCount; i++) {
    const remainingSafe = safeSpots - i
    const remainingTotal = GRID_SIZE - i
    // House edge ~3%
    multiplier *= (remainingTotal / remainingSafe) * 0.97
  }

  return Math.round(multiplier * 100) / 100
}

// ========== MAYIN POZİSYONLARI ==========
function generateMinePositions(mineCount: number): number[] {
  const positions: number[] = []
  const available = Array.from({ length: GRID_SIZE }, (_, i) => i)

  for (let i = 0; i < mineCount; i++) {
    const randomIndex = Math.floor(Math.random() * available.length)
    positions.push(available[randomIndex])
    available.splice(randomIndex, 1)
  }

  return positions
}

// ========== OYUN ID ==========
function generateGameId(): string {
  return `mines_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ========== DISTRIBUTED LOCK ==========
async function acquireGameLock(gameId: string, action: string): Promise<boolean> {
  // Lazy cleanup of stale locks
  cleanupStaleLocksLazy()

  const redis = getRedisClient()
  const lockKey = `mines:lock:${gameId}`

  if (redis) {
    try {
      const result = await redis.set(lockKey, `${action}:${Date.now()}`, { nx: true, ex: 30 })
      return result === 'OK'
    } catch (error) {
      console.error('[Mines Lock] Redis error:', error)
    }
  }

  // In-memory fallback
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
  const lockKey = `mines:lock:${gameId}`

  if (redis) {
    try {
      await redis.del(lockKey)
    } catch (error) {
      console.error('[Mines Lock] Redis release error:', error)
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

// ========== RATE LIMIT ==========
async function checkRateLimit(userId: string): Promise<boolean> {
  // Lazy cleanup of stale rate limits
  cleanupStaleRateLimitsLazy()

  const redis = getRedisClient()
  const rateLimitKey = `mines:ratelimit:${userId}`

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

// ========== POST HANDLER ==========
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const userId = session.userId

    // Rate limit
    if (!(await checkRateLimit(userId))) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })
    }

    const body = await request.json()
    const { action, gameId, bet, mineCount, cellId, gameState: savedGameState, gamePhase: phase } = body
    const requestInfo = extractRequestInfo(request)

    // Oyun enabled kontrolü
    const settings = await getGameSettings()

    // ========== START ACTION ==========
    if (action === 'start') {
      if (!settings.enabled) {
        return NextResponse.json({ error: 'Mines oyunu şu anda kapalı' }, { status: 403 })
      }

      if (!bet || bet < FIXED_MIN_BET) {
        return NextResponse.json({ error: `Minimum bahis ${FIXED_MIN_BET} puan` }, { status: 400 })
      }
      if (bet > FIXED_MAX_BET) {
        return NextResponse.json({ error: `Maksimum bahis ${FIXED_MAX_BET} puan` }, { status: 400 })
      }
      if (!mineCount || mineCount < 1 || mineCount > 24) {
        return NextResponse.json({ error: 'Geçersiz mayın sayısı (1-24)' }, { status: 400 })
      }

      const txResult = await prisma.$transaction(async (tx) => {
        // Mevcut aktif oyunu kontrol et ve iptal et
        const existingGame = await tx.minesGame.findFirst({
          where: { userId, status: 'active' }
        })

        if (existingGame) {
          // Eski oyunu kayıp olarak işaretle
          await tx.minesGame.update({
            where: { id: existingGame.id },
            data: {
              status: 'completed',
              result: 'lose',
              payout: 0,
              completedAt: new Date()
            }
          })
        }

        // Kullanıcı bakiyesi kontrolü
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { points: true, siteUsername: true }
        })

        if (!currentUser) {
          throw new Error('Kullanıcı bulunamadı')
        }

        if (currentUser.points < bet) {
          throw new Error('Yetersiz puan')
        }

        const balanceBefore = currentUser.points
        const balanceAfter = balanceBefore - bet

        // Bahsi düş
        await tx.user.update({
          where: { id: userId },
          data: {
            points: { decrement: bet },
            pointHistory: {
              create: {
                amount: -bet,
                type: 'GAME_BET',
                description: 'Mines Bahis',
                balanceBefore,
                balanceAfter
              }
            }
          }
        })

        // Mayın pozisyonları oluştur
        const minePositions = generateMinePositions(mineCount)
        const newGameId = generateGameId()

        // Oyunu veritabanına kaydet
        await tx.minesGame.create({
          data: {
            odunId: newGameId,
            userId,
            siteUsername: currentUser.siteUsername || null,
            betAmount: bet,
            mineCount,
            status: 'active',
            minePositions: JSON.stringify(minePositions),
            revealedPositions: JSON.stringify([]),
            currentMultiplier: 1,
            revealedCount: 0,
            balanceBefore,
            gamePhase: 'playing',
            lastActionAt: new Date(),
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent
          }
        })

        return { gameId: newGameId, balanceBefore, balanceAfter }
      })

      return NextResponse.json({
        success: true,
        gameId: txResult.gameId,
        balanceAfter: txResult.balanceAfter
      })
    }

    // ========== REVEAL ACTION ==========
    if (action === 'reveal') {
      if (!gameId || cellId === undefined) {
        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
      }

      if (cellId < 0 || cellId >= GRID_SIZE) {
        return NextResponse.json({ error: 'Geçersiz kare' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'reveal')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.minesGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) {
            throw new Error('Oyun bulunamadı')
          }

          if (game.status !== 'active') {
            throw new Error('Oyun zaten tamamlanmış')
          }

          if (game.userId !== userId) {
            throw new Error('Bu oyun size ait değil')
          }

          const minePositions: number[] = JSON.parse(game.minePositions || '[]')
          const revealedPositions: number[] = JSON.parse(game.revealedPositions || '[]')

          if (revealedPositions.includes(cellId)) {
            throw new Error('Bu kare zaten açıldı')
          }

          const isMine = minePositions.includes(cellId)

          if (isMine) {
            // Mayına basıldı - oyun bitti
            const currentUser = await tx.user.findUnique({
              where: { id: userId },
              select: { points: true }
            })

            await tx.minesGame.update({
              where: { odunId: gameId },
              data: {
                status: 'completed',
                result: 'lose',
                payout: 0,
                balanceAfter: currentUser?.points || 0,
                revealedPositions: JSON.stringify([...revealedPositions, cellId]),
                revealedCount: revealedPositions.length + 1,
                completedAt: new Date()
              }
            })

            return {
              isMine: true,
              minePositions
            }
          }

          // Güvenli kare
          const newRevealedPositions = [...revealedPositions, cellId]
          const newRevealedCount = newRevealedPositions.length
          const newMultiplier = calculateMultiplier(game.mineCount, newRevealedCount)
          const potentialWin = Math.floor(game.betAmount * newMultiplier)

          // Tüm güvenli kareler açıldı mı?
          const safeSpots = GRID_SIZE - game.mineCount
          const allRevealed = newRevealedCount >= safeSpots

          if (allRevealed) {
            // Otomatik cashout
            const currentUser = await tx.user.findUnique({
              where: { id: userId },
              select: { points: true }
            })

            if (!currentUser) throw new Error('Kullanıcı bulunamadı')

            const balanceBefore = currentUser.points
            const balanceAfter = balanceBefore + potentialWin

            await tx.user.update({
              where: { id: userId },
              data: {
                points: { increment: potentialWin },
                pointHistory: {
                  create: {
                    amount: potentialWin,
                    type: 'GAME_WIN',
                    description: 'Mines Tüm Elmaslar!',
                    balanceBefore,
                    balanceAfter
                  }
                }
              }
            })

            await tx.minesGame.update({
              where: { odunId: gameId },
              data: {
                status: 'completed',
                result: 'win',
                payout: potentialWin,
                balanceAfter,
                revealedPositions: JSON.stringify(newRevealedPositions),
                revealedCount: newRevealedCount,
                currentMultiplier: newMultiplier,
                completedAt: new Date()
              }
            })

            return {
              isMine: false,
              multiplier: newMultiplier,
              potentialWin,
              revealedCount: newRevealedCount,
              allRevealed: true,
              winAmount: potentialWin,
              minePositions,
              balanceAfter
            }
          }

          // Devam eden oyun
          await tx.minesGame.update({
            where: { odunId: gameId },
            data: {
              revealedPositions: JSON.stringify(newRevealedPositions),
              revealedCount: newRevealedCount,
              currentMultiplier: newMultiplier,
              lastActionAt: new Date()
            }
          })

          return {
            isMine: false,
            multiplier: newMultiplier,
            potentialWin,
            revealedCount: newRevealedCount
          }
        })

        return NextResponse.json({ success: true, ...result })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== CASHOUT ACTION ==========
    if (action === 'cashout') {
      if (!gameId) {
        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
      }

      const lockAcquired = await acquireGameLock(gameId, 'cashout')
      if (!lockAcquired) {
        return NextResponse.json({ error: 'İstek işleniyor' }, { status: 409 })
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const game = await tx.minesGame.findUnique({
            where: { odunId: gameId }
          })

          if (!game) {
            throw new Error('Oyun bulunamadı')
          }

          if (game.status !== 'active') {
            throw new Error('Oyun zaten tamamlanmış')
          }

          if (game.userId !== userId) {
            throw new Error('Bu oyun size ait değil')
          }

          if (game.revealedCount === 0) {
            throw new Error('En az bir kare açmalısınız')
          }

          const winAmount = Math.floor(game.betAmount * game.currentMultiplier)
          const minePositions: number[] = JSON.parse(game.minePositions || '[]')

          const currentUser = await tx.user.findUnique({
            where: { id: userId },
            select: { points: true }
          })

          if (!currentUser) throw new Error('Kullanıcı bulunamadı')

          const balanceBefore = currentUser.points
          const balanceAfter = balanceBefore + winAmount

          await tx.user.update({
            where: { id: userId },
            data: {
              points: { increment: winAmount },
              pointHistory: {
                create: {
                  amount: winAmount,
                  type: 'GAME_WIN',
                  description: `Mines Kazanç (${game.currentMultiplier.toFixed(2)}x)`,
                  balanceBefore,
                  balanceAfter
                }
              }
            }
          })

          await tx.minesGame.update({
            where: { odunId: gameId },
            data: {
              status: 'completed',
              result: 'win',
              payout: winAmount,
              balanceAfter,
              completedAt: new Date()
            }
          })

          return { winAmount, minePositions, balanceAfter }
        })

        return NextResponse.json({ success: true, ...result })
      } finally {
        await releaseGameLock(gameId)
      }
    }

    // ========== SAVE STATE ACTION ==========
    if (action === 'save_state') {
      if (!gameId || !savedGameState) {
        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
      }

      const game = await prisma.minesGame.findUnique({
        where: { odunId: gameId }
      })

      if (!game || game.status !== 'active') {
        return NextResponse.json({ error: 'Aktif oyun bulunamadı' }, { status: 404 })
      }

      if (game.userId !== userId) {
        return NextResponse.json({ error: 'Bu oyun size ait değil' }, { status: 403 })
      }

      await prisma.minesGame.update({
        where: { odunId: gameId },
        data: {
          gameStateJson: JSON.stringify(savedGameState),
          gamePhase: phase || game.gamePhase,
          lastActionAt: new Date()
        }
      })

      return NextResponse.json({ success: true, action: 'state_saved' })
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })

  } catch (error) {
    console.error('Mines API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// ========== GET - Aktif oyun durumunu getir (devam etmek için) ==========
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    // Kullanıcının aktif oyununu bul
    const activeGame = await prisma.minesGame.findFirst({
      where: {
        userId: session.userId,
        status: 'active'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!activeGame) {
      return NextResponse.json({ hasActiveGame: false })
    }

    // Oyun 30 dakikadan eski ise iptal et
    const timeoutMs = GAME_TIMEOUT_MINUTES * 60 * 1000
    const timeoutDate = new Date(Date.now() - timeoutMs)

    if (activeGame.createdAt < timeoutDate) {
      // Oyuncu hiç kare açmadıysa iade et, açtıysa kayıp olarak işaretle
      const hasPlayed = activeGame.revealedCount > 0
      const shouldRefund = !hasPlayed

      await prisma.$transaction(async (tx) => {
        if (shouldRefund) {
          // Oyuncu oynamadı - iade et
          const user = await tx.user.findUnique({
            where: { id: session.userId },
            select: { points: true }
          })

          if (user) {
            const balanceBefore = user.points
            const balanceAfter = balanceBefore + activeGame.betAmount

            await tx.user.update({
              where: { id: session.userId },
              data: {
                points: { increment: activeGame.betAmount },
                pointHistory: {
                  create: {
                    amount: activeGame.betAmount,
                    type: 'GAME_WIN',
                    description: 'Mines Zaman Aşımı İadesi',
                    balanceBefore,
                    balanceAfter
                  }
                }
              }
            })
          }

          await tx.minesGame.update({
            where: { id: activeGame.id },
            data: {
              status: 'timeout',
              result: 'timeout',
              payout: activeGame.betAmount,
              completedAt: new Date()
            }
          })
        } else {
          // Oyuncu oynadı (kare açtı) - kayıp olarak işaretle, iade YOK
          await tx.minesGame.update({
            where: { id: activeGame.id },
            data: {
              status: 'completed',
              result: 'lose',
              payout: 0,
              completedAt: new Date()
            }
          })
        }
      })

      console.log('[Mines] Expired oyun sonuçlandırıldı:', {
        gameId: activeGame.odunId,
        userId: session.userId,
        betAmount: activeGame.betAmount,
        revealedCount: activeGame.revealedCount,
        refunded: shouldRefund,
        createdAt: activeGame.createdAt
      })

      return NextResponse.json({ hasActiveGame: false, expired: true, refunded: shouldRefund })
    }

    // Parse gameStateJson if exists
    let gameState = null
    if (activeGame.gameStateJson) {
      try {
        gameState = JSON.parse(activeGame.gameStateJson)
      } catch (e) {
        console.error('[Mines] Failed to parse gameStateJson:', e)
      }
    }

    // Mayın pozisyonlarını parse et (client'a gönderilmez - güvenlik için)
    const revealedPositions: number[] = JSON.parse(activeGame.revealedPositions || '[]')

    return NextResponse.json({
      hasActiveGame: true,
      gameId: activeGame.odunId,
      betAmount: activeGame.betAmount,
      mineCount: activeGame.mineCount,
      revealedPositions,
      revealedCount: activeGame.revealedCount,
      currentMultiplier: activeGame.currentMultiplier,
      potentialWin: Math.floor(activeGame.betAmount * activeGame.currentMultiplier),
      gamePhase: activeGame.gamePhase,
      gameState,
      lastActionAt: activeGame.lastActionAt,
      createdAt: activeGame.createdAt
    })

  } catch (error) {
    console.error('Mines get active game error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
