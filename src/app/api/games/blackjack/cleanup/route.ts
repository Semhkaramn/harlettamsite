import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Blackjack Cleanup API
 *
 * Status değerleri standardizasyonu:
 * - 'active': Oyun devam ediyor
 * - 'completed': Oyun normal şekilde tamamlandı (win/lose/push/blackjack)
 * - 'timeout': Zaman aşımı nedeniyle oyun sonlandırıldı ve bahis iade edildi
 *
 * NOT: 'cancelled' artık kullanılmıyor, tüm timeout durumları 'timeout' olarak işaretlenir.
 */

// 30 dakikadan eski active oyunları timeout olarak işaretle
// Bu endpoint admin tarafından veya cron job ile çağrılabilir
const STALE_GAME_MINUTES = 30

export async function POST(request: NextRequest) {
  try {
    // API key kontrolü (basit güvenlik)
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CLEANUP_API_KEY || 'cleanup-secret-key'

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staleDate = new Date(Date.now() - STALE_GAME_MINUTES * 60 * 1000)

    // Eski active oyunları bul (userId dahil)
    const staleGames = await prisma.blackjackGame.findMany({
      where: {
        status: 'active',
        createdAt: { lt: staleDate }
      },
      select: {
        id: true,
        odunId: true,
        userId: true,
        siteUsername: true,
        betAmount: true,
        splitBetAmount: true,
        createdAt: true,
        gameStateJson: true,
        gamePhase: true,
        isDoubleDown: true,
        isSplit: true
      }
    })

    if (staleGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Temizlenecek eski oyun bulunamadı',
        cleanedCount: 0
      })
    }

    // Oyuncu oynadı mı kontrol et
    function hasPlayerPlayed(game: typeof staleGames[0]): boolean {
      if (game.isDoubleDown || game.isSplit) return true
      if (!game.gameStateJson) return false
      try {
        const state = JSON.parse(game.gameStateJson)
        if (state.playerHand && state.playerHand.length > 2) return true
        if (state.splitHand && state.splitHand.length > 0) return true
        return false
      } catch {
        return false
      }
    }

    // Her bir oyun için kontrol et
    let totalRefunded = 0
    let lostDueToPlay = 0
    let cleanedCount = 0

    for (const game of staleGames) {
      try {
        const totalBet = game.betAmount + game.splitBetAmount
        const hasPlayed = hasPlayerPlayed(game)
        const shouldRefund = !hasPlayed && game.gamePhase === 'playing'

        await prisma.$transaction(async (tx) => {
          if (shouldRefund && totalBet > 0) {
            // Oyuncu oynamadı - iade et
            const user = await tx.user.findUnique({
              where: { id: game.userId },
              select: { points: true }
            })

            if (user) {
              const balanceBefore = user.points
              const balanceAfter = balanceBefore + totalBet

              await tx.user.update({
                where: { id: game.userId },
                data: {
                  points: { increment: totalBet },
                  pointHistory: {
                    create: {
                      amount: totalBet,
                      type: 'GAME_WIN',
                      description: 'Blackjack Zaman Aşımı İadesi (Cleanup)',
                      balanceBefore,
                      balanceAfter
                    }
                  }
                }
              })

              totalRefunded += totalBet
            }

            await tx.blackjackGame.update({
              where: { id: game.id },
              data: {
                status: 'timeout',
                result: 'timeout',
                payout: totalBet,
                completedAt: new Date()
              }
            })
          } else {
            // Oyuncu oynadı - kayıp olarak işaretle, iade YOK
            await tx.blackjackGame.update({
              where: { id: game.id },
              data: {
                status: 'completed',
                result: 'lose',
                payout: 0,
                completedAt: new Date()
              }
            })
            lostDueToPlay++
          }
        })

        cleanedCount++
      } catch (err) {
        console.error(`[Blackjack Cleanup] Oyun hatası (${game.odunId}):`, err)
      }
    }

    console.log(`[Blackjack Cleanup] ${cleanedCount} eski oyun temizlendi, iade: ${totalRefunded}, kayıp: ${lostDueToPlay}`)

    return NextResponse.json({
      success: true,
      message: `${cleanedCount} eski oyun temizlendi, ${totalRefunded} puan iade edildi, ${lostDueToPlay} kayıp olarak işaretlendi`,
      cleanedCount,
      totalRefunded,
      lostDueToPlay
    })

  } catch (error) {
    console.error('Blackjack cleanup error:', error)
    return NextResponse.json(
      { error: 'Temizleme sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

// GET ile durum kontrolü
export async function GET() {
  try {
    const staleDate = new Date(Date.now() - STALE_GAME_MINUTES * 60 * 1000)

    const [activeCount, staleCount, totalCount] = await Promise.all([
      prisma.blackjackGame.count({ where: { status: 'active' } }),
      prisma.blackjackGame.count({
        where: {
          status: 'active',
          createdAt: { lt: staleDate }
        }
      }),
      prisma.blackjackGame.count()
    ])

    return NextResponse.json({
      activeGames: activeCount,
      staleGames: staleCount,
      totalGames: totalCount,
      staleThresholdMinutes: STALE_GAME_MINUTES
    })

  } catch (error) {
    console.error('Blackjack status error:', error)
    return NextResponse.json(
      { error: 'Durum kontrolü sırasında hata oluştu' },
      { status: 500 }
    )
  }
}
