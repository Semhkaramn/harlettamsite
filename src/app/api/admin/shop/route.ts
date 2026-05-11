import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invalidateCache } from '@/lib/enhanced-cache'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/admin-middleware'

export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessShop')
  if (authCheck.error) return authCheck.error

  try {
    const items = await prisma.shopItem.findMany({
      orderBy: { order: 'asc' },
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            identifierType: true
          }
        },
        _count: {
          select: { purchases: true }
        }
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Get shop items error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessShop')
  if (authCheck.error) return authCheck.error

  try {
    const body = await request.json()
    const { name, description, price, imageUrl, imagePublicId, category, sponsorId, stock, purchaseLimit, order } = body

    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'name and price required' },
        { status: 400 }
      )
    }

    const item = await prisma.shopItem.create({
      data: {
        name,
        description: description || null,
        price,
        imageUrl: imageUrl || null,
        imagePublicId: imagePublicId || null,
        category: category || 'Genel',
        sponsorId: sponsorId || null,
        stock: stock || null,
        purchaseLimit: purchaseLimit || null,
        order: order || 0
      }
    })

    // ✅ Cache invalidation
    invalidateCache.shop()
    revalidatePath('/shop')
    revalidatePath('/api/shop')
    console.log('🔄 Shop cache temizlendi (yeni ürün oluşturuldu)')

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Create shop item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
