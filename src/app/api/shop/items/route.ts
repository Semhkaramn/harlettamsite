import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedData, CacheTTL, CacheTags } from '@/lib/enhanced-cache'

// ✅ Force dynamic rendering due to searchParams usage
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // ✅ CACHE FIX: Shop items cache'den getir (-50ms)
    const items = await getCachedData(
      'shop:items',
      async () => {
        return await prisma.shopItem.findMany({
          where: { isActive: true },
          orderBy: [
            { category: 'asc' },
            { order: 'asc' }
          ]
        })
      },
      {
        ttl: CacheTTL.LONG, // 30 dakika
        tags: [CacheTags.SHOP]
      }
    )

    // 🚀 CRITICAL FIX: N+1 query problem eliminated!
    // BEFORE: 20 items × 200 users = 4,000 DB queries
    // AFTER: 1 query per user (200 queries total)
    if (userId) {
      // Single query to get all purchase counts for this user
      const userPurchases = await prisma.userPurchase.groupBy({
        by: ['itemId'],
        where: {
          userId,
          itemId: {
            in: items.map(item => item.id)
          }
        },
        _count: {
          id: true
        }
      })

      // Create a map for O(1) lookup
      const purchaseCountMap = new Map(
        userPurchases.map(p => [p.itemId, p._count.id])
      )

      // Add purchase counts to items (NO DB queries in loop!)
      const itemsWithPurchaseCount = items.map((item) => {
        const userPurchaseCount = purchaseCountMap.get(item.id) || 0

        return {
          ...item,
          userPurchaseCount,
          remainingPurchases: item.purchaseLimit !== null
            ? Math.max(0, item.purchaseLimit - userPurchaseCount)
            : null
        }
      })

      // ✅ User-specific data için daha kısa cache
      return NextResponse.json(
        { items: itemsWithPurchaseCount },
        {
          headers: {
            'Cache-Control': 'private, max-age=60'
          }
        }
      )
    }

    // ✅ Genel liste için kısa cache (yeni ürünler hızlı görünsün)
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    )
  } catch (error) {
    console.error('Get shop items error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
