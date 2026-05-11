import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-middleware'

// GET - Aktif blackjack oyunlarını getir
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request)
    if (authCheck.error) return authCheck.error

    const admin = authCheck.admin!

    // Yetki kontrolü
    if (!admin.isSuperAdmin && !admin.canAccessGames) {
      return NextResponse.json({ error: 'Bu sayfaya erişim yetkiniz yok' }, { status: 403 })
    }

    // Aktif oyunları çek
    const activeGames = await prisma.blackjackGame.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        odunId: true,
        userId: true,
        siteUsername: true,
        betAmount: true,
        splitBetAmount: true,
        isDoubleDown: true,
        isSplit: true,
        createdAt: true,
        ipAddress: true
      }
    })

    // Kullanıcı bilgilerini zenginleştir
    const enrichedGames = await Promise.all(
      activeGames.map(async (game) => {
        const user = await prisma.user.findUnique({
          where: { id: game.userId },
          select: {
            siteUsername: true,
            telegramUsername: true,
            points: true
          }
        })

        return {
          ...game,
          user: user ? {
            username: user.siteUsername || user.telegramUsername || 'Anonim',
            points: user.points
          } : null,
          totalBet: game.betAmount + game.splitBetAmount,
          duration: Math.floor((Date.now() - game.createdAt.getTime()) / 1000) // saniye
        }
      })
    )

    return NextResponse.json({
      games: enrichedGames,
      count: enrichedGames.length
    })
  } catch (error) {
    console.error('Error fetching active games:', error)
    return NextResponse.json({ error: 'Aktif oyunlar alınamadı' }, { status: 500 })
  }
}

// DELETE - Aktif oyunu iptal et (admin müdahalesi)
export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request)
    if (authCheck.error) return authCheck.error

    const admin = authCheck.admin!

    // Sadece super admin iptal edebilir
    if (!admin.isSuperAdmin) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json({ error: 'Oyun ID gerekli' }, { status: 400 })
    }

    // Oyunu bul
    const game = await prisma.blackjackGame.findUnique({
      where: { odunId: gameId }
    })

    if (!game) {
      return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Oyun zaten tamamlanmış' }, { status: 400 })
    }

    // Transaction ile bahsi iade et ve oyunu iptal et
    await prisma.$transaction(async (tx) => {
      const totalBet = game.betAmount + game.splitBetAmount

      // Bahsi iade et
      const user = await tx.user.findUnique({
        where: { id: game.userId },
        select: { points: true }
      })

      if (user) {
        await tx.user.update({
          where: { id: game.userId },
          data: {
            points: { increment: totalBet },
            pointHistory: {
              create: {
                amount: totalBet,
                type: 'GAME_REFUND',
                description: 'Blackjack oyunu admin tarafından iptal edildi',
                balanceBefore: user.points,
                balanceAfter: user.points + totalBet
              }
            }
          }
        })
      }

      // Oyunu iptal et
      await tx.blackjackGame.update({
        where: { odunId: gameId },
        data: {
          status: 'cancelled',
          result: 'cancelled',
          payout: totalBet,
          completedAt: new Date()
        }
      })
    })

    return NextResponse.json({ success: true, message: 'Oyun iptal edildi ve bahis iade edildi' })
  } catch (error) {
    console.error('Error cancelling game:', error)
    return NextResponse.json({ error: 'Oyun iptal edilemedi' }, { status: 500 })
  }
}
