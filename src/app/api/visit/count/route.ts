import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyToday, getTurkeyDateAgo } from '@/lib/utils'
import { getCachedData, CacheTTL, CacheStrategy } from '@/lib/enhanced-cache'

// 🚀 OPTIMIZATION: Timeout promise
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ])
}

export async function GET() {
  try {
    // 🚀 OPTIMIZATION: Cache ile veri getir (60 saniye)
    const stats = await getCachedData(
      'visit_count_stats',
      async () => {
        const today = getTurkeyToday()
        const weekAgo = getTurkeyDateAgo(7)
        const monthAgo = getTurkeyDateAgo(30)

        // 🚀 OPTIMIZATION: Timeout ile DB sorguları (5 saniye)
        const result = await withTimeout(
          Promise.all([
            // Tüm zamanların toplamı
            prisma.dailyStats.aggregate({
              _sum: { totalVisits: true }
            }),
            // Bugünkü ziyaretler (uniqueVisitors dahil)
            prisma.dailyStats.findUnique({
              where: { date: today }
            }),
            // Haftalık ziyaretler
            prisma.dailyStats.aggregate({
              where: { date: { gte: weekAgo } },
              _sum: { totalVisits: true }
            }),
            // Aylık ziyaretler
            prisma.dailyStats.aggregate({
              where: { date: { gte: monthAgo } },
              _sum: { totalVisits: true }
            }),
            // Tüm zamanların toplam benzersiz ziyaretçi sayısı
            prisma.dailyStats.aggregate({
              _sum: { uniqueVisitors: true }
            })
          ]),
          5000, // 5 saniye timeout
          [
            { _sum: { totalVisits: 0 } },
            null,
            { _sum: { totalVisits: 0 } },
            { _sum: { totalVisits: 0 } },
            { _sum: { uniqueVisitors: 0 } }
          ]
        )

        const [totalStats, todayStats, weeklyStats, monthlyStats, allTimeUniqueStats] = result

        return {
          totalVisits: totalStats._sum.totalVisits || 0,
          todayVisits: todayStats?.totalVisits || 0,
          weeklyVisits: weeklyStats._sum.totalVisits || 0,
          monthlyVisits: monthlyStats._sum.totalVisits || 0,
          uniqueVisitors: todayStats?.uniqueVisitors || 0,
          totalUniqueVisitors: allTimeUniqueStats._sum.uniqueVisitors || 0
        }
      },
      { ttl: CacheTTL.SHORT, strategy: CacheStrategy.STALE_WHILE_REVALIDATE }
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting visit count:', error)
    // 🚀 FIX: Hata durumunda boş değerler döndür (503 önleme)
    return NextResponse.json({
      totalVisits: 0,
      todayVisits: 0,
      weeklyVisits: 0,
      monthlyVisits: 0,
      uniqueVisitors: 0,
      totalUniqueVisitors: 0
    })
  }
}
