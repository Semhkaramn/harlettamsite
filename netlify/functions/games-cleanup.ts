import { schedule } from '@netlify/functions'
import { getPrisma, disconnectPrisma } from './lib/prisma'

/**
 * Games Scheduled Cleanup (Netlify Functions)
 * Her 15 dakikada bir çalışır.
 *
 * Blackjack ve Mines oyunları için tek cleanup function.
 *
 * Status değerleri standardizasyonu:
 * - 'active': Oyun devam ediyor
 * - 'completed': Oyun normal şekilde tamamlandı (win/lose/push/blackjack)
 * - 'timeout': Zaman aşımı nedeniyle oyun sonlandırıldı
 *
 * İADE KURALLARI:
 * - Oyuncu hiç oynamadıysa (sadece bet yaptı, kart dağıtıldı ama hiç aksiyon almadı) → Bahis iade edilir
 * - Oyuncu oynadıysa (double, split yaptı veya dealer_turn'e geçti) → İade YOK, kayıp olarak işaretlenir
 */

const STALE_GAME_MINUTES = 30

// Blackjack için oyuncunun aksiyon alıp almadığını kontrol et
// gameStateJson'dan oyuncu el sayısını da kontrol ediyoruz (hit yapıldıysa 3+ kart olur)
function hasBlackjackPlayerTakenAction(game: {
  isDoubleDown: boolean
  isSplit: boolean
  gamePhase: string | null
  gameStateJson: string | null
}): boolean {
  // Double veya split yaptıysa kesinlikle oynadı
  if (game.isDoubleDown || game.isSplit) return true

  // Dealer turn'e geçtiyse oynadı (stand yaptı veya 21 oldu)
  if (game.gamePhase === 'dealer_turn' || game.gamePhase === 'game_over') return true

  // playing_split aşamasındaysa split yapmış demektir
  if (game.gamePhase === 'playing_split') return true

  // gameStateJson'dan oyuncu kartlarını kontrol et
  // İlk dağıtımda 2 kart olur, hit yaptıysa 3+ olur
  if (game.gameStateJson) {
    try {
      const state = JSON.parse(game.gameStateJson)
      // Oyuncu 2'den fazla karta sahipse hit yapmış demektir
      if (state.playerHand && state.playerHand.length > 2) return true
      // Split hand varsa ve 2'den fazla kartı varsa
      if (state.splitHand && state.splitHand.length > 2) return true
    } catch {
      // JSON parse hatası - güvenli tarafta kal, iade yapma
      return true
    }
  }

  // Sadece playing aşamasındaysa ve 2 karta sahipse henüz aksiyon almamış
  // Bu durumda iade edilebilir
  return false
}

const handler = schedule('*/30 * * * *', async () => {
  const prisma = getPrisma()
  const staleDate = new Date(Date.now() - STALE_GAME_MINUTES * 60 * 1000)

  const results = {
    blackjack: { cleaned: 0, refunded: 0, lostDueToPlay: 0 },
    mines: { cleaned: 0, refunded: 0, lostDueToPlay: 0 }
  }

  try {
    // ==================== BLACKJACK CLEANUP ====================
    const staleBlackjackGames = await prisma.blackjackGame.findMany({
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
        gamePhase: true,
        isDoubleDown: true,
        isSplit: true,
        gameStateJson: true
      }
    })

    for (const game of staleBlackjackGames) {
      try {
        const totalBet = game.betAmount + game.splitBetAmount
        const hasPlayed = hasBlackjackPlayerTakenAction(game)

        // Oyuncu aksiyon almadıysa (sadece betting sonrası playing'de kaldıysa) iade et
        const shouldRefund = !hasPlayed

        await prisma.$transaction(async (tx) => {
          if (shouldRefund && totalBet > 0) {
            // Oyuncu aksiyon almadı - iade et
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
                      description: 'Blackjack Zaman Aşımı İadesi',
                      balanceBefore,
                      balanceAfter
                    }
                  }
                }
              })

              results.blackjack.refunded += totalBet
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
            results.blackjack.lostDueToPlay++
          }
        })

        results.blackjack.cleaned++
      } catch (err) {
        console.error(`[Games Cleanup] Blackjack oyun hatası (${game.odunId}):`, err)
      }
    }

    // ==================== MINES CLEANUP ====================
    const staleMinesGames = await prisma.minesGame.findMany({
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
        revealedCount: true
      }
    })

    for (const game of staleMinesGames) {
      try {
        // Oyuncu hiç kare açmadıysa iade et, açtıysa kayıp
        const shouldRefund = game.revealedCount === 0

        await prisma.$transaction(async (tx) => {
          if (shouldRefund && game.betAmount > 0) {
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
                      description: 'Mines Zaman Aşımı İadesi',
                      balanceBefore,
                      balanceAfter
                    }
                  }
                }
              })

              results.mines.refunded += game.betAmount
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
            results.mines.lostDueToPlay++
          }
        })

        results.mines.cleaned++
      } catch (err) {
        console.error(`[Games Cleanup] Mines oyun hatası (${game.odunId}):`, err)
      }
    }

    // Sonuçları logla
    console.log('[Games Cleanup] Tamamlandı:', {
      blackjack: {
        cleaned: results.blackjack.cleaned,
        refunded: results.blackjack.refunded,
        lostDueToPlay: results.blackjack.lostDueToPlay
      },
      mines: {
        cleaned: results.mines.cleaned,
        refunded: results.mines.refunded,
        lostDueToPlay: results.mines.lostDueToPlay
      }
    })

    await disconnectPrisma()
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Games cleanup completed',
        blackjack: results.blackjack,
        mines: results.mines,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[Games Cleanup] Error:', error)
    await disconnectPrisma()
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Cleanup failed' })
    }
  }
})

export { handler }
