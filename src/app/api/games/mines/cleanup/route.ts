import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Cleanup eski/timeout oyunları - CRON job ile çağrılabilir
const GAME_TIMEOUT_MINUTES = 30

export async function POST(request: NextRequest) {
  try {
    // API key kontrolü (opsiyonel güvenlik)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // CRON_SECRET varsa kontrol et
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const timeoutMs = GAME_TIMEOUT_MINUTES * 60 * 1000
    const timeoutDate = new Date(Date.now() - timeoutMs)

    // Timeout olan aktif oyunları bul
    const expiredGames = await prisma.minesGame.findMany({
      where: {
        status: 'active',
        createdAt: {
          lt: timeoutDate
        }
      },
      select: {
        id: true,
        odunId: true,
        userId: true,
        betAmount: true,
        revealedCount: true
      }
    })

    let cleanedCount = 0
    let refundedAmount = 0

    let lostDueToPlay = 0

    for (const game of expiredGames) {
      try {
        // Oyuncu hiç kare açmadıysa iade et, açtıysa kayıp
        const shouldRefund = game.revealedCount === 0

        await prisma.$transaction(async (tx) => {
          if (shouldRefund) {
            // Oyuncu oynamadı - iade et
            const user = await tx.user.findUnique({
              where: { id: game.userId },
              select: { points: true }
            })

            if (user) {
              const balanceBefore = user.points
              const balanceAfter = balanceBefore + game.betAmount

              await tx.user.update({
                where: { id: game.userId },
                data: {
                  points: { increment: game.betAmount },
                  pointHistory: {
                    create: {
                      amount: game.betAmount,
                      type: 'GAME_WIN',
                      description: 'Mines Zaman Aşımı İadesi (Cleanup)',
                      balanceBefore,
                      balanceAfter
                    }
                  }
                }
              })

              refundedAmount += game.betAmount
            }

            await tx.minesGame.update({
              where: { id: game.id },
              data: {
                status: 'timeout',
                result: 'timeout',
                payout: game.betAmount,
                completedAt: new Date()
              }
            })
          } else {
            // Oyuncu oynadı (kare açtı) - kayıp olarak işaretle, iade YOK
            await tx.minesGame.update({
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

          cleanedCount++
        })

        console.log(`[Mines Cleanup] Game ${game.odunId} cleaned up, refunded: ${shouldRefund}, revealedCount: ${game.revealedCount}`)
      } catch (error) {
        console.error(`[Mines Cleanup] Failed to cleanup game ${game.odunId}:`, error)
      }
    }

    console.log(`[Mines Cleanup] Completed: ${cleanedCount} games cleaned, ${refundedAmount} refunded, ${lostDueToPlay} lost due to play`)

    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      refundedAmount,
      lostDueToPlay,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Mines cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// GET endpoint - durum kontrolü için
export async function GET() {
  try {
    const timeoutMs = GAME_TIMEOUT_MINUTES * 60 * 1000
    const timeoutDate = new Date(Date.now() - timeoutMs)

    // Aktif ve timeout olmuş oyun sayılarını getir
    const [activeCount, expiredCount, totalCompleted] = await Promise.all([
      prisma.minesGame.count({
        where: {
          status: 'active',
          createdAt: { gte: timeoutDate }
        }
      }),
      prisma.minesGame.count({
        where: {
          status: 'active',
          createdAt: { lt: timeoutDate }
        }
      }),
      prisma.minesGame.count({
        where: {
          status: { in: ['completed', 'timeout'] }
        }
      })
    ])

    return NextResponse.json({
      activeGames: activeCount,
      expiredGames: expiredCount,
      completedGames: totalCompleted,
      timeoutMinutes: GAME_TIMEOUT_MINUTES,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Mines cleanup status error:', error)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
