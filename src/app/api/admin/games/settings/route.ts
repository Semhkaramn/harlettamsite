import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'

// Yardımcı fonksiyon: DB'den ayar değerini al
function getSettingValue(settings: { key: string; value: string }[], key: string, defaultValue: string): string {
  const setting = settings.find(s => s.key === key)
  return setting?.value ?? defaultValue
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, 'canAccessGames')
    if (authCheck.error) return authCheck.error
    const admin = authCheck.admin!

    // DB'den tüm oyun ayarlarını çek
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            'game_blackjack_enabled',
            'game_mines_enabled',
            'game_roulette_enabled'
          ]
        }
      }
    })

    // Aktif oyun sayısı
    const [activeBlackjackGames, activeMinesGames] = await Promise.all([
      prisma.blackjackGame.count({
        where: { status: 'active' }
      }),
      prisma.minesGame.count({
        where: { status: 'active' }
      })
    ])

    // İstatistikler için tamamlanmış oyunları al
    const [completedBlackjackGames, completedMinesGames, completedRouletteGames] = await Promise.all([
      prisma.blackjackGame.findMany({
        where: { status: 'completed' },
        select: {
          result: true,
          betAmount: true,
          splitBetAmount: true,
          payout: true
        }
      }),
      prisma.minesGame.findMany({
        where: { status: 'completed' },
        select: {
          result: true,
          betAmount: true,
          payout: true
        }
      }),
      prisma.rouletteGame.findMany({
        where: { status: 'completed' },
        select: {
          result: true,
          totalBet: true,
          totalWin: true,
          netChange: true,
          payout: true
        }
      })
    ])

    // Blackjack istatistikleri
    const wins = completedBlackjackGames.filter(g => g.result === 'win').length
    const losses = completedBlackjackGames.filter(g => g.result === 'lose').length
    const pushes = completedBlackjackGames.filter(g => g.result === 'push').length
    const blackjacks = completedBlackjackGames.filter(g => g.result === 'blackjack').length
    const totalBet = completedBlackjackGames.reduce((sum, g) => sum + g.betAmount + g.splitBetAmount, 0)
    const totalPayout = completedBlackjackGames.reduce((sum, g) => sum + (g.payout || 0), 0)
    const houseProfit = totalBet - totalPayout

    // Mines istatistikleri
    const minesWins = completedMinesGames.filter(g => g.result === 'win').length
    const minesLosses = completedMinesGames.filter(g => g.result === 'lose').length
    const minesTotalBet = completedMinesGames.reduce((sum, g) => sum + g.betAmount, 0)
    const minesTotalPayout = completedMinesGames.reduce((sum, g) => sum + (g.payout || 0), 0)
    const minesHouseProfit = minesTotalBet - minesTotalPayout

    // Rulet istatistikleri
    const rouletteWins = completedRouletteGames.filter(g => g.result === 'win').length
    const rouletteLosses = completedRouletteGames.filter(g => g.result === 'lose').length
    const rouletteTotalBet = completedRouletteGames.reduce((sum, g) => sum + g.totalBet, 0)
    const rouletteTotalPayout = completedRouletteGames.reduce((sum, g) => sum + (g.payout || 0), 0)
    const rouletteHouseProfit = rouletteTotalBet - rouletteTotalPayout

    return NextResponse.json({
      settings: {
        blackjack: {
          enabled: getSettingValue(settings, 'game_blackjack_enabled', 'true') === 'true',
        },
        mines: {
          enabled: getSettingValue(settings, 'game_mines_enabled', 'true') === 'true',
        },
        roulette: {
          enabled: getSettingValue(settings, 'game_roulette_enabled', 'true') === 'true',
        }
      },
      activeGames: {
        blackjack: activeBlackjackGames,
        mines: activeMinesGames
      },
      statistics: {
        totalGames: completedBlackjackGames.length + activeBlackjackGames,
        completedGames: completedBlackjackGames.length,
        wins,
        losses,
        pushes,
        blackjacks,
        winRate: completedBlackjackGames.length > 0
          ? Math.round(((wins + blackjacks) / completedBlackjackGames.length) * 100)
          : 0,
        totalBet,
        totalPayout,
        houseProfit,
        houseProfitPercent: totalBet > 0 ? Math.round((houseProfit / totalBet) * 100) : 0
      },
      minesStatistics: {
        totalGames: completedMinesGames.length + activeMinesGames,
        completedGames: completedMinesGames.length,
        wins: minesWins,
        losses: minesLosses,
        winRate: completedMinesGames.length > 0
          ? Math.round((minesWins / completedMinesGames.length) * 100)
          : 0,
        totalBet: minesTotalBet,
        totalPayout: minesTotalPayout,
        houseProfit: minesHouseProfit,
        houseProfitPercent: minesTotalBet > 0 ? Math.round((minesHouseProfit / minesTotalBet) * 100) : 0
      },
      rouletteStatistics: {
        totalGames: completedRouletteGames.length,
        completedGames: completedRouletteGames.length,
        wins: rouletteWins,
        losses: rouletteLosses,
        winRate: completedRouletteGames.length > 0
          ? Math.round((rouletteWins / completedRouletteGames.length) * 100)
          : 0,
        totalBet: rouletteTotalBet,
        totalPayout: rouletteTotalPayout,
        houseProfit: rouletteHouseProfit,
        houseProfitPercent: rouletteTotalBet > 0 ? Math.round((rouletteHouseProfit / rouletteTotalBet) * 100) : 0
      }
    })
  } catch (error) {
    console.error('Error fetching game settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await requirePermission(request, 'canAccessGames')
    if (authCheck.error) return authCheck.error
    const admin = authCheck.admin!

    const { game, settings } = await request.json()

    // Blackjack oyunu ayarları
    if (game === 'blackjack') {
      if (settings.enabled !== undefined) {
        await prisma.settings.upsert({
          where: { key: 'game_blackjack_enabled' },
          update: { value: settings.enabled ? 'true' : 'false' },
          create: {
            key: 'game_blackjack_enabled',
            value: settings.enabled ? 'true' : 'false',
            description: 'Blackjack oyunu durumu',
            category: 'games'
          }
        })

        console.log(`[Admin] ${admin.username} blackjack enabled: ${settings.enabled}`)
        return NextResponse.json({ success: true })
      }
    }

    // Mines oyunu ayarları
    if (game === 'mines') {
      if (settings.enabled !== undefined) {
        await prisma.settings.upsert({
          where: { key: 'game_mines_enabled' },
          update: { value: settings.enabled ? 'true' : 'false' },
          create: {
            key: 'game_mines_enabled',
            value: settings.enabled ? 'true' : 'false',
            description: 'Mines oyunu durumu',
            category: 'games'
          }
        })

        console.log(`[Admin] ${admin.username} mines enabled: ${settings.enabled}`)
        return NextResponse.json({ success: true })
      }
    }

    // Roulette oyunu ayarları
    if (game === 'roulette') {
      if (settings.enabled !== undefined) {
        await prisma.settings.upsert({
          where: { key: 'game_roulette_enabled' },
          update: { value: settings.enabled ? 'true' : 'false' },
          create: {
            key: 'game_roulette_enabled',
            value: settings.enabled ? 'true' : 'false',
            description: 'Rulet oyunu durumu',
            category: 'games'
          }
        })

        console.log(`[Admin] ${admin.username} roulette enabled: ${settings.enabled}`)
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Unknown game' }, { status: 400 })
  } catch (error) {
    console.error('Error updating game settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
