import { prisma } from '@/lib/prisma'
import { getTurkeyToday } from '@/lib/utils'

// 🚀 OPTIMIZATION: Timeout promise helper
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ])
}

const DB_TIMEOUT = 5000 // 5 saniye timeout

// Server-side sponsor fetcher - doğrudan DB'den
export async function fetchSponsorsServer() {
  try {
    const sponsors = await withTimeout(
      prisma.sponsor.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'desc' }, // VIP önce
          { order: 'asc' }
        ],
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
          category: true,
          clicks: true,
          showInBanner: true,
          order: true,
          isActive: true,
        }
      }),
      DB_TIMEOUT,
      []
    )
    return sponsors
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return []
  }
}

// Server-side visit stats fetcher - Cache yok, anlık veri
export async function fetchVisitStatsServer() {
  try {
    const today = getTurkeyToday()

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
        // Tüm zamanların toplam benzersiz ziyaretçi sayısı
        prisma.dailyStats.aggregate({
          _sum: { uniqueVisitors: true }
        })
      ]),
      DB_TIMEOUT,
      [
        { _sum: { totalVisits: 0 } },
        null,
        { _sum: { uniqueVisitors: 0 } }
      ]
    )

    const [totalStats, todayStats, allTimeUniqueStats] = result

    return {
      totalVisits: totalStats._sum.totalVisits || 0,
      todayVisits: todayStats?.totalVisits || 0,
      uniqueVisitors: todayStats?.uniqueVisitors || 0,
      totalUniqueVisitors: allTimeUniqueStats._sum.uniqueVisitors || 0
    }
  } catch (error) {
    console.error('Error fetching visit stats:', error)
    return { totalVisits: 0, todayVisits: 0, uniqueVisitors: 0, totalUniqueVisitors: 0 }
  }
}

// Server-side social media fetcher
export async function fetchSocialMediaServer() {
  try {
    const socialMedia = await withTimeout(
      prisma.socialMedia.findMany({
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          platform: true,
          username: true,
          order: true,
        }
      }),
      DB_TIMEOUT,
      []
    )
    return socialMedia
  } catch (error) {
    console.error('Error fetching social media:', error)
    return []
  }
}

// Server-side banners fetcher
export async function fetchBannersServer() {
  try {
    const [leftBannerSetting, rightBannerSetting] = await withTimeout(
      Promise.all([
        prisma.settings.findUnique({ where: { key: 'left_banner_data' } }),
        prisma.settings.findUnique({ where: { key: 'right_banner_data' } })
      ]),
      DB_TIMEOUT,
      [null, null]
    )

    const result: {
      left: { imageUrl: string; sponsorId: string; sponsor: { id: string; name: string; websiteUrl: string | null } | null } | null;
      right: { imageUrl: string; sponsorId: string; sponsor: { id: string; name: string; websiteUrl: string | null } | null } | null;
    } = { left: null, right: null }

    if (leftBannerSetting?.value) {
      try {
        const leftData = JSON.parse(leftBannerSetting.value)
        if (leftData.enabled && leftData.imageUrl && leftData.sponsorId) {
          const sponsor = await withTimeout(
            prisma.sponsor.findUnique({
              where: { id: leftData.sponsorId },
              select: { id: true, name: true, websiteUrl: true }
            }),
            DB_TIMEOUT,
            null
          )
          result.left = {
            imageUrl: leftData.imageUrl,
            sponsorId: leftData.sponsorId,
            sponsor
          }
        }
      } catch {}
    }

    if (rightBannerSetting?.value) {
      try {
        const rightData = JSON.parse(rightBannerSetting.value)
        if (rightData.enabled && rightData.imageUrl && rightData.sponsorId) {
          const sponsor = await withTimeout(
            prisma.sponsor.findUnique({
              where: { id: rightData.sponsorId },
              select: { id: true, name: true, websiteUrl: true }
            }),
            DB_TIMEOUT,
            null
          )
          result.right = {
            imageUrl: rightData.imageUrl,
            sponsorId: rightData.sponsorId,
            sponsor
          }
        }
      } catch {}
    }

    return result
  } catch (error) {
    console.error('Error fetching banners:', error)
    return { left: null, right: null }
  }
}

// Server-side sponsor banner settings fetcher
export async function fetchSponsorBannerEnabledServer() {
  try {
    const setting = await withTimeout(
      prisma.settings.findUnique({
        where: { key: 'sponsor_banner_enabled' }
      }),
      DB_TIMEOUT,
      null
    )
    return setting?.value === 'true'
  } catch (error) {
    console.error('Error fetching sponsor banner setting:', error)
    return false
  }
}
