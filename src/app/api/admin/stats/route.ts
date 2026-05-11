import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyToday, getTurkeyDateAgo } from '@/lib/utils'
import { requireAdmin } from '@/lib/admin-middleware'
import { getCachedData, CacheTTL } from '@/lib/enhanced-cache'

// 🚀 OPTIMIZATION: Admin stats cache key
const ADMIN_STATS_CACHE_KEY = 'admin:stats:dashboard:v2'

export async function GET(request: NextRequest) {
  // ✅ Dashboard her admin tarafından erişilebilir olmalı (izin kontrolü yok)
  const authCheck = await requireAdmin(request)
  if (authCheck.error) return authCheck.error

  try {
    // 🚀 OPTIMIZATION: Cache admin stats for 5 minutes
    const stats = await getCachedData(
      ADMIN_STATS_CACHE_KEY,
      async () => {
        const today = getTurkeyToday() // Türkiye saatine göre bugün
        const weekAgo = getTurkeyDateAgo(7) // 7 gün önce
        const monthAgo = getTurkeyDateAgo(30) // 30 gün önce

        const [
          // Kullanıcı istatistikleri
          registeredUsers,
          telegramOnlyUsers,
          linkedUsers,
          bannedUsers,
          newUsersToday,
          newUsersWeek,
          newUsersMonth,
          emailVerifiedUsers,
          usersWithWallet,

          // Satın alma istatistikleri
          totalPurchases,
          pendingPurchases,
          completedPurchases,
          purchasesToday,
          purchasesWeek,
          purchasesMonth,

          // Çark istatistikleri
          totalSpins,
          spinsToday,
          spinsWeek,
          spinsMonth,
          wheelPrizes,

          // Puan istatistikleri
          pointsSum,
          xpSum,

          // Telegram kullanıcıları
          allTelegramUsers,

          // Sponsor istatistikleri
          sponsorClicksSum,
          totalSponsors,
          activeSponsors,
          sponsorsList,

          // Site ziyaretleri
          totalSiteVisits,
          dailySiteVisits,
          weeklySiteVisits,
          monthlySiteVisits,

          // Mesaj istatistikleri
          totalMessagesAggregate,
          dailyMessagesAggregate,
          weeklyMessagesAggregate,
          monthlyMessagesAggregate,

          // Görev istatistikleri
          totalTasks,
          activeTasks,
          totalTaskCompletions,
          taskCompletionsToday,

          // Shop istatistikleri
          totalShopItems,
          activeShopItems,

          // Bilet istatistikleri
          totalTicketEvents,
          activeTicketEvents,
          totalTicketRequests,
          pendingTicketRequests,
          approvedTicketRequests,

          // Etkinlik istatistikleri
          totalEvents,
          activeEvents,
          totalEventParticipants,
          totalEventWinners,

          // Randy istatistikleri
          totalRandys,
          activeRandys,
          totalRandyParticipants,

          // Promocode istatistikleri
          totalPromocodes,
          activePromocodes,
          totalPromocodeUsages,
          promocodeUsagesToday,

          // Broadcast istatistikleri
          totalBroadcasts,
          completedBroadcasts,
          totalMessagesSent,

          // Rank istatistikleri
          totalRanks,

          // Admin istatistikleri
          totalAdmins,

          // Multi hesap tespiti istatistikleri (sadece IP bazlı)
          duplicateIPCount,
          usersWithMultiIP,

          // Blackjack oyun istatistikleri
          blackjackGamesPlayed,
          blackjackGamesToday,
          blackjackGamesWeek,
          blackjackGamesMonth,
          blackjackTotalBets,
          blackjackTotalWins,
          blackjackBetsToday,
          blackjackWinsToday,

          // Mines oyun istatistikleri
          minesGamesPlayed,
          minesGamesToday,
          minesGamesWeek,
          minesGamesMonth,
          minesTotalStats,
          minesTodayStats,

          // Roulette oyun istatistikleri
          rouletteGamesPlayed,
          rouletteGamesToday,
          rouletteGamesWeek,
          rouletteGamesMonth,
          rouletteTotalStats,
          rouletteTodayStats
        ] = await Promise.all([
          // Kullanıcı istatistikleri
          prisma.user.count(),
          prisma.telegramGroupUser.count({
            where: { linkedUserId: null }
          }),
          prisma.telegramGroupUser.count({
            where: { linkedUserId: { not: null } }
          }),
          prisma.user.count({
            where: { isBanned: true }
          }),
          prisma.user.count({
            where: { createdAt: { gte: today } }
          }),
          prisma.user.count({
            where: { createdAt: { gte: weekAgo } }
          }),
          prisma.user.count({
            where: { createdAt: { gte: monthAgo } }
          }),
          prisma.user.count({
            where: { emailVerified: true }
          }),
          prisma.user.count({
            where: { trc20WalletAddress: { not: null } }
          }),

          // Satın alma istatistikleri
          prisma.userPurchase.count(),
          prisma.userPurchase.count({
            where: { status: 'pending' }
          }),
          prisma.userPurchase.count({
            where: { status: 'completed' }
          }),
          prisma.userPurchase.count({
            where: { purchasedAt: { gte: today } }
          }),
          prisma.userPurchase.count({
            where: { purchasedAt: { gte: weekAgo } }
          }),
          prisma.userPurchase.count({
            where: { purchasedAt: { gte: monthAgo } }
          }),

          // Çark istatistikleri
          prisma.wheelSpin.count(),
          prisma.wheelSpin.count({
            where: { spunAt: { gte: today } }
          }),
          prisma.wheelSpin.count({
            where: { spunAt: { gte: weekAgo } }
          }),
          prisma.wheelSpin.count({
            where: { spunAt: { gte: monthAgo } }
          }),
          prisma.wheelPrize.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
          }),

          // Puan istatistikleri
          prisma.user.aggregate({
            _sum: { points: true }
          }),
          prisma.user.aggregate({
            _sum: { xp: true }
          }),

          // Tüm Telegram kullanıcıları
          prisma.telegramGroupUser.findMany({
            select: {
              hadStart: true,
              linkedUser: { select: { id: true } }
            }
          }),

          // Sponsor istatistikleri
          prisma.sponsor.aggregate({
            _sum: { clicks: true }
          }),
          prisma.sponsor.count(),
          prisma.sponsor.count({
            where: { isActive: true }
          }),
          prisma.sponsor.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              clicks: true,
              category: true
            },
            orderBy: { clicks: 'desc' },
            take: 10
          }),

          // Site ziyaretleri (DailyStats'tan aggregate)
          prisma.dailyStats.aggregate({
            _sum: { totalVisits: true }
          }),
          prisma.dailyStats.findUnique({
            where: { date: today }
          }),
          prisma.dailyStats.aggregate({
            where: { date: { gte: weekAgo } },
            _sum: { totalVisits: true }
          }),
          prisma.dailyStats.aggregate({
            where: { date: { gte: monthAgo } },
            _sum: { totalVisits: true }
          }),

          // Mesaj istatistikleri
          prisma.telegramGroupUser.aggregate({
            _sum: { messageCount: true }
          }),
          prisma.telegramGroupUser.aggregate({
            _sum: { dailyMessageCount: true }
          }),
          prisma.telegramGroupUser.aggregate({
            _sum: { weeklyMessageCount: true }
          }),
          prisma.telegramGroupUser.aggregate({
            _sum: { monthlyMessageCount: true }
          }),

          // Görev istatistikleri
          prisma.task.count(),
          prisma.task.count({
            where: { isActive: true }
          }),
          prisma.userTaskReward.count(),
          prisma.userTaskReward.count({
            where: {
              claimedAt: { gte: today }
            }
          }),

          // Shop istatistikleri
          prisma.shopItem.count(),
          prisma.shopItem.count({
            where: { isActive: true }
          }),

          // Bilet istatistikleri
          prisma.ticketEvent.count(),
          prisma.ticketEvent.count({
            where: { status: 'active' }
          }),
          prisma.ticketRequest.count(),
          prisma.ticketRequest.count({
            where: { status: 'pending' }
          }),
          prisma.ticketRequest.count({
            where: { status: 'approved' }
          }),

          // Etkinlik istatistikleri
          prisma.event.count(),
          prisma.event.count({
            where: { status: 'active' }
          }),
          prisma.eventParticipant.count(),
          prisma.eventWinner.count(),

          // Randy istatistikleri
          prisma.randy.count(),
          prisma.randy.count({
            where: { status: 'active' }
          }),
          prisma.randyParticipant.count(),

          // Promocode istatistikleri
          prisma.promocode.count(),
          prisma.promocode.count({
            where: { isActive: true }
          }),
          prisma.promocodeUsage.count(),
          prisma.promocodeUsage.count({
            where: { usedAt: { gte: today } }
          }),

          // Broadcast istatistikleri
          prisma.broadcastHistory.count(),
          prisma.broadcastHistory.count({
            where: { status: 'completed' }
          }),
          prisma.broadcastHistory.aggregate({
            _sum: { sentCount: true }
          }),

          // Rank istatistikleri
          prisma.rank.count(),

          // Admin istatistikleri
          prisma.admin.count(),

          // Multi hesap tespiti istatistikleri (sadece IP bazlı)
          // Duplicate IP count
          prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM (
              SELECT "ipAddress"
              FROM "UserActivityLog"
              WHERE "ipAddress" IS NOT NULL
              GROUP BY "ipAddress"
              HAVING COUNT(DISTINCT "userId") > 1
            ) as duplicates
          `,
          // Users with multi IP
          prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(DISTINCT "userId") as count
            FROM "UserActivityLog"
            WHERE "ipAddress" IN (
              SELECT "ipAddress"
              FROM "UserActivityLog"
              WHERE "ipAddress" IS NOT NULL
              GROUP BY "ipAddress"
              HAVING COUNT(DISTINCT "userId") > 1
            )
          `,

          // Blackjack oyun istatistikleri - BlackjackGame tablosundan
          prisma.blackjackGame.count({
            where: { status: 'completed' }
          }),
          prisma.blackjackGame.count({
            where: { status: 'completed', completedAt: { gte: today } }
          }),
          prisma.blackjackGame.count({
            where: { status: 'completed', completedAt: { gte: weekAgo } }
          }),
          prisma.blackjackGame.count({
            where: { status: 'completed', completedAt: { gte: monthAgo } }
          }),
          prisma.pointHistory.aggregate({
            where: { type: 'GAME_BET' },
            _sum: { amount: true }
          }),
          prisma.pointHistory.aggregate({
            where: { type: 'GAME_WIN' },
            _sum: { amount: true }
          }),
          prisma.pointHistory.aggregate({
            where: { type: 'GAME_BET', createdAt: { gte: today } },
            _sum: { amount: true }
          }),
          prisma.pointHistory.aggregate({
            where: { type: 'GAME_WIN', createdAt: { gte: today } },
            _sum: { amount: true }
          }),

          // Mines oyun istatistikleri - MinesGame tablosundan
          prisma.minesGame.count({
            where: { status: 'completed' }
          }),
          prisma.minesGame.count({
            where: { status: 'completed', completedAt: { gte: today } }
          }),
          prisma.minesGame.count({
            where: { status: 'completed', completedAt: { gte: weekAgo } }
          }),
          prisma.minesGame.count({
            where: { status: 'completed', completedAt: { gte: monthAgo } }
          }),
          prisma.minesGame.aggregate({
            where: { status: 'completed' },
            _sum: { betAmount: true, payout: true }
          }),
          prisma.minesGame.aggregate({
            where: { status: 'completed', completedAt: { gte: today } },
            _sum: { betAmount: true, payout: true }
          }),

          // Roulette oyun istatistikleri - RouletteGame tablosundan
          prisma.rouletteGame.count({
            where: { status: 'completed' }
          }),
          prisma.rouletteGame.count({
            where: { status: 'completed', createdAt: { gte: today } }
          }),
          prisma.rouletteGame.count({
            where: { status: 'completed', createdAt: { gte: weekAgo } }
          }),
          prisma.rouletteGame.count({
            where: { status: 'completed', createdAt: { gte: monthAgo } }
          }),
          prisma.rouletteGame.aggregate({
            where: { status: 'completed' },
            _sum: { totalBet: true, payout: true }
          }),
          prisma.rouletteGame.aggregate({
            where: { status: 'completed', createdAt: { gte: today } },
            _sum: { totalBet: true, payout: true }
          })
        ])

        // Toplam değerleri hesapla
        const totalUsers = registeredUsers + telegramOnlyUsers
        const totalMessages = totalMessagesAggregate._sum.messageCount || 0

        // Günlük, haftalık ve aylık mesaj sayıları
        const dailyMessages = dailyMessagesAggregate._sum.dailyMessageCount || 0
        const weeklyMessages = weeklyMessagesAggregate._sum.weeklyMessageCount || 0
        const monthlyMessages = monthlyMessagesAggregate._sum.monthlyMessageCount || 0

        // hadStart hesaplama
        const hadStartUsers = allTelegramUsers.filter(tgUser => tgUser.hadStart || false).length

        // En popüler ödüller
        const topPrizes = await prisma.wheelSpin.groupBy({
          by: ['prizeId'],
          _count: { prizeId: true },
          orderBy: { _count: { prizeId: 'desc' } },
          take: 5
        })

        // Son kayıtlar
        const recentUsers = await prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            siteUsername: true,
            telegramUsername: true,
            createdAt: true
          }
        })

        const recentPurchases = await prisma.userPurchase.findMany({
          take: 5,
          orderBy: { purchasedAt: 'desc' },
          select: {
            id: true,
            pointsSpent: true,
            status: true,
            purchasedAt: true,
            user: {
              select: { siteUsername: true, telegramUsername: true }
            },
            item: {
              select: { name: true }
            }
          }
        })

        return {
          // Kullanıcı istatistikleri
          users: {
            total: totalUsers,
            siteUsers: registeredUsers,
            telegramOnly: telegramOnlyUsers,
            linked: linkedUsers,
            banned: bannedUsers,
            hadStart: hadStartUsers,
            emailVerified: emailVerifiedUsers,
            withWallet: usersWithWallet,
            newToday: newUsersToday,
            newWeek: newUsersWeek,
            newMonth: newUsersMonth,
            recent: recentUsers
          },

          // Puan istatistikleri
          points: {
            total: pointsSum._sum.points || 0,
            totalXp: xpSum._sum.xp || 0
          },

          // Satın alma istatistikleri
          purchases: {
            total: totalPurchases,
            pending: pendingPurchases,
            completed: completedPurchases,
            today: purchasesToday,
            week: purchasesWeek,
            month: purchasesMonth,
            recent: recentPurchases
          },

          // Çark istatistikleri
          wheel: {
            totalSpins: totalSpins,
            today: spinsToday,
            week: spinsWeek,
            month: spinsMonth,
            prizes: wheelPrizes,
            topPrizes: topPrizes
          },

          // Sponsor istatistikleri
          sponsors: {
            total: totalSponsors,
            active: activeSponsors,
            totalClicks: sponsorClicksSum._sum.clicks || 0,
            topSponsors: sponsorsList
          },

          // Site ziyaretleri
          siteVisits: {
            total: totalSiteVisits?._sum?.totalVisits || 0,
            daily: dailySiteVisits?.totalVisits || 0,
            weekly: weeklySiteVisits?._sum?.totalVisits || 0,
            monthly: monthlySiteVisits?._sum?.totalVisits || 0
          },

          // Mesaj istatistikleri
          messages: {
            total: totalMessages,
            daily: dailyMessages,
            weekly: weeklyMessages,
            monthly: monthlyMessages
          },

          // Görev istatistikleri
          tasks: {
            total: totalTasks,
            active: activeTasks,
            completions: totalTaskCompletions,
            completionsToday: taskCompletionsToday
          },

          // Shop istatistikleri
          shop: {
            total: totalShopItems,
            active: activeShopItems
          },

          // Bilet istatistikleri
          tickets: {
            totalEvents: totalTicketEvents,
            activeEvents: activeTicketEvents,
            totalRequests: totalTicketRequests,
            pendingRequests: pendingTicketRequests,
            approvedRequests: approvedTicketRequests
          },

          // Etkinlik istatistikleri
          events: {
            total: totalEvents,
            active: activeEvents,
            participants: totalEventParticipants,
            winners: totalEventWinners
          },

          // Randy istatistikleri
          randy: {
            total: totalRandys,
            active: activeRandys,
            participants: totalRandyParticipants
          },

          // Promocode istatistikleri
          promocodes: {
            total: totalPromocodes,
            active: activePromocodes,
            usages: totalPromocodeUsages,
            usagesToday: promocodeUsagesToday
          },

          // Broadcast istatistikleri
          broadcasts: {
            total: totalBroadcasts,
            completed: completedBroadcasts,
            messagesSent: totalMessagesSent._sum.sentCount || 0
          },

          // Sistem istatistikleri
          system: {
            ranks: totalRanks,
            admins: totalAdmins
          },

          // Blackjack oyun istatistikleri
          blackjack: {
            totalGames: blackjackGamesPlayed,
            gamesToday: blackjackGamesToday,
            gamesWeek: blackjackGamesWeek,
            gamesMonth: blackjackGamesMonth,
            totalBets: Math.abs(blackjackTotalBets._sum.amount || 0),
            totalWins: blackjackTotalWins._sum.amount || 0,
            betsToday: Math.abs(blackjackBetsToday._sum.amount || 0),
            winsToday: blackjackWinsToday._sum.amount || 0,
            netProfit: Math.abs(blackjackTotalBets._sum.amount || 0) - (blackjackTotalWins._sum.amount || 0)
          },

          // Mines oyun istatistikleri
          mines: {
            totalGames: minesGamesPlayed,
            gamesToday: minesGamesToday,
            gamesWeek: minesGamesWeek,
            gamesMonth: minesGamesMonth,
            totalBets: minesTotalStats._sum.betAmount || 0,
            totalWins: minesTotalStats._sum.payout || 0,
            betsToday: minesTodayStats._sum.betAmount || 0,
            winsToday: minesTodayStats._sum.payout || 0,
            netProfit: (minesTotalStats._sum.betAmount || 0) - (minesTotalStats._sum.payout || 0)
          },

          // Roulette oyun istatistikleri
          roulette: {
            totalGames: rouletteGamesPlayed,
            gamesToday: rouletteGamesToday,
            gamesWeek: rouletteGamesWeek,
            gamesMonth: rouletteGamesMonth,
            totalBets: rouletteTotalStats._sum.totalBet || 0,
            totalWins: rouletteTotalStats._sum.payout || 0,
            betsToday: rouletteTodayStats._sum.totalBet || 0,
            winsToday: rouletteTodayStats._sum.payout || 0,
            netProfit: (rouletteTotalStats._sum.totalBet || 0) - (rouletteTotalStats._sum.payout || 0)
          },

          // Multi hesap tespiti istatistikleri (sadece IP bazlı)
          multi: {
            duplicateIPs: Number(duplicateIPCount[0]?.count || 0),
            usersWithMulti: Number(usersWithMultiIP[0]?.count || 0)
          },

          // Legacy support
          totalUsers,
          totalPoints: pointsSum._sum.points || 0,
          totalPurchases,
          totalSpins,
          hadStartUsers,
          bannedUsers,
          activeUsers: linkedUsers,
          totalSponsorClicks: sponsorClicksSum._sum.clicks || 0
        }
      },
      { ttl: CacheTTL.MEDIUM, tags: ['admin', 'stats'] } // 5 minutes cache
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
