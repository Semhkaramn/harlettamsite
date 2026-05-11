import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { extractRequestInfo, logActivity } from '@/lib/services/activity-log-service'

// ========== SABİTLER ==========
const FIXED_MIN_BET = 10
const FIXED_MAX_BET = 500

// Kırmızı sayılar
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

// Sütun sayıları
const COLUMN1_NUMBERS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
const COLUMN2_NUMBERS = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
const COLUMN3_NUMBERS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]

// Ödeme oranları
const PAYOUT_RATES: Record<string, number> = {
  number: 35,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
  first12: 2,
  second12: 2,
  third12: 2,
  column1: 2,
  column2: 2,
  column3: 2,
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 60

// ========== OYUN AYARLARI ==========
interface GameSettings {
  enabled: boolean
}

let cachedSettings: GameSettings | null = null
let settingsCacheTime = 0
const SETTINGS_CACHE_TTL = 30000

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
      where: { key: { in: ['game_roulette_enabled'] } }
    })

    cachedSettings = {
      enabled: getSettingValue(settings, 'game_roulette_enabled', 'true') === 'true'
    }
    settingsCacheTime = now

    return cachedSettings
  } catch {
    return { enabled: true }
  }
}

// Bahsin kazanıp kazanmadığını kontrol et
function isBetWinner(betType: string, betValue: number | undefined, result: number): boolean {
  switch (betType) {
    case 'number':
      return betValue === result
    case 'red':
      return RED_NUMBERS.includes(result)
    case 'black':
      return result > 0 && !RED_NUMBERS.includes(result)
    case 'odd':
      return result > 0 && result % 2 === 1
    case 'even':
      return result > 0 && result % 2 === 0
    case 'low':
      return result >= 1 && result <= 18
    case 'high':
      return result >= 19 && result <= 36
    case 'first12':
      return result >= 1 && result <= 12
    case 'second12':
      return result >= 13 && result <= 24
    case 'third12':
      return result >= 25 && result <= 36
    case 'column1':
      return COLUMN1_NUMBERS.includes(result)
    case 'column2':
      return COLUMN2_NUMBERS.includes(result)
    case 'column3':
      return COLUMN3_NUMBERS.includes(result)
    default:
      return false
  }
}

// Sayının rengini al
function getNumberColor(num: number): 'red' | 'black' | 'green' {
  if (num === 0) return 'green'
  if (RED_NUMBERS.includes(num)) return 'red'
  return 'black'
}

// Unique oyun ID'si oluştur
function generateGameId(): string {
  return `roulette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const rateLimit = rateLimitMap.get(clientIp)

    if (rateLimit) {
      if (now - rateLimit.lastReset > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(clientIp, { count: 1, lastReset: now })
      } else if (rateLimit.count >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })
      } else {
        rateLimit.count++
      }
    } else {
      rateLimitMap.set(clientIp, { count: 1, lastReset: now })
    }

    // Session kontrolü
    const session = await getSession(request)
    if (!session?.userId) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    // Oyun ayarları kontrolü
    const settings = await getGameSettings()
    if (!settings.enabled) {
      return NextResponse.json({ error: 'Rulet oyunu şu anda kapalı' }, { status: 403 })
    }

    const body = await request.json()
    const { action, bets } = body
    const requestInfo = extractRequestInfo(request)

    if (action !== 'spin') {
      return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 })
    }

    // Bahis kontrolü
    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: 'Bahis yapmalısınız' }, { status: 400 })
    }

    // Toplam bahsi hesapla
    let totalBet = 0
    for (const bet of bets) {
      if (!bet.type || !PAYOUT_RATES.hasOwnProperty(bet.type)) {
        return NextResponse.json({ error: 'Geçersiz bahis tipi' }, { status: 400 })
      }
      if (typeof bet.amount !== 'number' || bet.amount <= 0) {
        return NextResponse.json({ error: 'Geçersiz bahis miktarı' }, { status: 400 })
      }
      if (bet.type === 'number' && (bet.value === undefined || bet.value < 0 || bet.value > 36)) {
        return NextResponse.json({ error: 'Geçersiz sayı seçimi' }, { status: 400 })
      }
      totalBet += bet.amount
    }

    // Min/Max kontrolü
    if (totalBet < FIXED_MIN_BET) {
      return NextResponse.json({ error: `Minimum bahis ${FIXED_MIN_BET} puandır` }, { status: 400 })
    }
    if (totalBet > FIXED_MAX_BET) {
      return NextResponse.json({ error: `Maksimum bahis ${FIXED_MAX_BET} puandır` }, { status: 400 })
    }

    // Transaction içinde tüm işlemleri yap
    const txResult = await prisma.$transaction(async (tx) => {
      // Kullanıcı bilgilerini al
      const user = await tx.user.findUnique({
        where: { id: session.userId },
        select: { id: true, points: true, isBanned: true, siteUsername: true }
      })

      if (!user) {
        throw new Error('Kullanıcı bulunamadı')
      }

      if (user.isBanned) {
        throw new Error('Hesabınız yasaklı')
      }

      if (user.points < totalBet) {
        throw new Error('Yetersiz puan')
      }

      const balanceBefore = user.points

      // Rastgele sonuç üret (0-36)
      const resultNumber = Math.floor(Math.random() * 37)
      const resultColor = getNumberColor(resultNumber)

      // Kazançları hesapla
      let totalWin = 0
      const betResults = bets.map((bet: { type: string; value?: number; amount: number }) => {
        const won = isBetWinner(bet.type, bet.value, resultNumber)
        const winAmount = won ? bet.amount * (PAYOUT_RATES[bet.type] + 1) : 0
        totalWin += winAmount
        return {
          ...bet,
          won,
          winAmount
        }
      })

      // Net değişim hesapla (kazanç - bahis)
      const netChange = totalWin - totalBet
      const balanceAfter = balanceBefore + netChange
      const isWin = netChange >= 0
      const gameId = generateGameId()

      // Bahis için puan düş ve PointHistory kaydı oluştur
      await tx.user.update({
        where: { id: session.userId },
        data: {
          points: { decrement: totalBet },
          pointHistory: {
            create: {
              amount: -totalBet,
              type: 'GAME_BET',
              description: 'Rulet Bahis',
              balanceBefore,
              balanceAfter: balanceBefore - totalBet
            }
          }
        }
      })

      // Kazanç varsa ekle ve PointHistory kaydı oluştur
      if (totalWin > 0) {
        await tx.user.update({
          where: { id: session.userId },
          data: {
            points: { increment: totalWin },
            pointHistory: {
              create: {
                amount: totalWin,
                type: 'GAME_WIN',
                description: `Rulet Kazanç (${resultNumber} ${resultColor === 'red' ? 'Kırmızı' : resultColor === 'black' ? 'Siyah' : 'Yeşil'})`,
                balanceBefore: balanceBefore - totalBet,
                balanceAfter
              }
            }
          }
        })
      }

      // RouletteGame tablosuna kaydet
      await tx.rouletteGame.create({
        data: {
          odunId: gameId,
          userId: session.userId,
          siteUsername: user.siteUsername || null,
          totalBet,
          status: 'completed',
          result: isWin ? 'win' : 'lose',
          resultNumber,
          resultColor,
          betsJson: JSON.stringify(betResults),
          totalWin,
          netChange,
          payout: totalWin,
          balanceBefore,
          balanceAfter,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        }
      })

      return {
        gameId,
        resultNumber,
        resultColor,
        betResults,
        totalBet,
        totalWin,
        netChange,
        balanceBefore,
        balanceAfter,
        isWin,
        siteUsername: user.siteUsername
      }
    })

    // Activity log kaydı (transaction dışında - async)
    const resultTitle = txResult.isWin
      ? txResult.netChange > 0 ? 'Kazanç!' : 'Berabere'
      : 'Kayıp'

    logActivity({
      userId: session.userId,
      actionType: txResult.isWin ? 'roulette_win' : 'roulette_lose',
      actionTitle: `Rulet - ${resultTitle}`,
      actionDescription: `${resultTitle} | Bahis: ${txResult.totalBet} | ${txResult.isWin ? `Kazanç: +${txResult.totalWin}` : 'Kayıp'} | Sonuç: ${txResult.resultNumber} (${txResult.resultColor === 'red' ? 'Kırmızı' : txResult.resultColor === 'black' ? 'Siyah' : 'Yeşil'}) | Önceki: ${txResult.balanceBefore.toLocaleString('tr-TR')} → Sonraki: ${txResult.balanceAfter.toLocaleString('tr-TR')} (${txResult.netChange >= 0 ? '+' : ''}${txResult.netChange})`,
      oldValue: String(txResult.balanceBefore),
      newValue: String(txResult.balanceAfter),
      relatedId: txResult.gameId,
      relatedType: 'roulette',
      metadata: {
        gameId: txResult.gameId,
        result: txResult.isWin ? 'win' : 'lose',
        resultNumber: txResult.resultNumber,
        resultColor: txResult.resultColor,
        totalBet: txResult.totalBet,
        totalWin: txResult.totalWin,
        netChange: txResult.netChange,
        balanceBefore: txResult.balanceBefore,
        balanceAfter: txResult.balanceAfter,
        bets: txResult.betResults
      },
      ...requestInfo
    }).catch(err => console.error('Roulette activity log error:', err))

    return NextResponse.json({
      success: true,
      gameId: txResult.gameId,
      result: {
        number: txResult.resultNumber,
        color: txResult.resultColor
      },
      bets: txResult.betResults,
      totalBet: txResult.totalBet,
      totalWin: txResult.totalWin,
      netChange: txResult.netChange,
      newBalance: txResult.balanceAfter
    })

  } catch (error) {
    console.error('Roulette error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session?.userId) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const settings = await getGameSettings()

    return NextResponse.json({
      enabled: settings.enabled,
      minBet: FIXED_MIN_BET,
      maxBet: FIXED_MAX_BET,
      payoutRates: PAYOUT_RATES
    })
  } catch (error) {
    console.error('Roulette settings error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
