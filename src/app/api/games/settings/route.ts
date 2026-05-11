import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/admin-middleware'

// Sabit bahis limitleri - tüm oyunlar için aynı
const FIXED_MIN_BET = 10
const FIXED_MAX_BET = 500

// Yardımcı fonksiyon: DB'den ayar değerini al
function getSettingValue(settings: { key: string; value: string }[], key: string, defaultValue: string): string {
  const setting = settings.find(s => s.key === key)
  return setting?.value ?? defaultValue
}

export async function GET(request: NextRequest) {
  try {
    // Admin değilse de ayarları döndür (oyunlar için gerekli)
    // Sadece enabled durumlarını ve sabit değerleri döndür

    // DB'den enabled ayarlarını çek
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            'game_blackjack_enabled',
            'game_blackjack_pending_disable',
            'game_mines_enabled'
          ]
        }
      }
    })

    // Admin kontrolü
    const adminSession = await getAdminSession(request)
    let isAdmin = false

    if (adminSession) {
      const admin = await prisma.admin.findUnique({
        where: { id: adminSession.adminId }
      })
      isAdmin = admin ? (admin.isSuperAdmin || admin.canAccessGames) : false
    }

    // Aktif oyun sayısı (sadece admin için)
    let activeBlackjackGames = 0
    let completedGamesStats = null

    if (isAdmin) {
      activeBlackjackGames = await prisma.blackjackGame.count({
        where: { status: 'active' }
      })

      // İstatistikler için tamamlanmış oyunları al
      const completedGames = await prisma.blackjackGame.findMany({
        where: { status: 'completed' },
        select: {
          result: true,
          betAmount: true,
          splitBetAmount: true,
          payout: true
        }
      })

      // İstatistikleri hesapla
      const wins = completedGames.filter(g => g.result === 'win').length
      const losses = completedGames.filter(g => g.result === 'lose').length
      const pushes = completedGames.filter(g => g.result === 'push').length
      const blackjacks = completedGames.filter(g => g.result === 'blackjack').length
      const totalBet = completedGames.reduce((sum, g) => sum + g.betAmount + g.splitBetAmount, 0)
      const totalPayout = completedGames.reduce((sum, g) => sum + (g.payout || 0), 0)
      const houseProfit = totalBet - totalPayout

      completedGamesStats = {
        totalGames: completedGames.length + activeBlackjackGames,
        completedGames: completedGames.length,
        wins,
        losses,
        pushes,
        blackjacks,
        winRate: completedGames.length > 0
          ? Math.round(((wins + blackjacks) / completedGames.length) * 100)
          : 0,
        totalBet,
        totalPayout,
        houseProfit,
        houseProfitPercent: totalBet > 0 ? Math.round((houseProfit / totalBet) * 100) : 0
      }
    }

    // Temel ayarlar - herkes görebilir
    const blackjackEnabled = getSettingValue(settings, 'game_blackjack_enabled', 'true') === 'true'
    const blackjackPendingDisable = getSettingValue(settings, 'game_blackjack_pending_disable', 'false') === 'true'
    const minesEnabled = getSettingValue(settings, 'game_mines_enabled', 'true') === 'true'

    const response: Record<string, unknown> = {
      // Oyuncular için basit format
      blackjackEnabled: blackjackEnabled && !blackjackPendingDisable,
      blackjackMaxBet: FIXED_MAX_BET,
      blackjackMinBet: FIXED_MIN_BET,
      minesEnabled: minesEnabled,
      minesMaxBet: FIXED_MAX_BET,
      minesMinBet: FIXED_MIN_BET,
      // Detaylı format (admin ve oyuncular için)
      blackjack: {
        enabled: blackjackEnabled && !blackjackPendingDisable,
        maxBet: FIXED_MAX_BET,
        minBet: FIXED_MIN_BET,
        pendingDisable: blackjackPendingDisable,
      },
      mines: {
        enabled: minesEnabled,
        maxBet: FIXED_MAX_BET,
        minBet: FIXED_MIN_BET,
      }
    }

    // Admin için ek bilgiler
    if (isAdmin) {
      response.settings = {
        blackjack: {
          enabled: blackjackEnabled,
          maxBet: FIXED_MAX_BET,
          minBet: FIXED_MIN_BET,
          pendingDisable: blackjackPendingDisable,
        },
        mines: {
          enabled: minesEnabled,
          maxBet: FIXED_MAX_BET,
          minBet: FIXED_MIN_BET,
        }
      }
      response.activeGames = {
        blackjack: activeBlackjackGames
      }
      response.statistics = completedGamesStats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching game settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Admin kontrolü
    const adminSession = await getAdminSession(request)
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminSession.adminId }
    })

    if (!admin || (!admin.isSuperAdmin && !admin.canAccessGames)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { game, settings } = await request.json()

    if (game === 'blackjack') {
      const updates: { key: string; value: string; description: string }[] = []

      // Sadece enabled ayarı değiştirilebilir - min/max bet sabittir
      if (settings.enabled !== undefined) {
        // Eğer kapatılıyorsa ve aktif oyun varsa, pending_disable yap
        if (!settings.enabled) {
          const activeGames = await prisma.blackjackGame.count({
            where: { status: 'active' }
          })

          if (activeGames > 0) {
            // Pending disable moduna al
            updates.push({
              key: 'game_blackjack_pending_disable',
              value: 'true',
              description: 'Blackjack bekleyen kapatma durumu'
            })
          } else {
            // Hemen kapat
            updates.push({
              key: 'game_blackjack_enabled',
              value: 'false',
              description: 'Blackjack oyunu durumu'
            })
            updates.push({
              key: 'game_blackjack_pending_disable',
              value: 'false',
              description: 'Blackjack bekleyen kapatma durumu'
            })
          }
        } else {
          // Açılıyorsa
          updates.push({
            key: 'game_blackjack_enabled',
            value: 'true',
            description: 'Blackjack oyunu durumu'
          })
          updates.push({
            key: 'game_blackjack_pending_disable',
            value: 'false',
            description: 'Blackjack bekleyen kapatma durumu'
          })
        }
      }

      // Tüm güncellemeleri uygula
      for (const update of updates) {
        await prisma.settings.upsert({
          where: { key: update.key },
          update: { value: update.value },
          create: {
            key: update.key,
            value: update.value,
            description: update.description,
            category: 'games'
          }
        })
      }

      console.log(`[Admin] ${admin.username} blackjack enabled: ${settings.enabled}`)
      return NextResponse.json({ success: true })
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

    return NextResponse.json({ error: 'Unknown game' }, { status: 400 })
  } catch (error) {
    console.error('Error updating game settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
