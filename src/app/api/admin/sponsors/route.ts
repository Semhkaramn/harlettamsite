import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enhancedCache, CacheTags } from '@/lib/enhanced-cache'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/admin-middleware'

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'canAccessSponsors')
  if (authResult.error) {
    return authResult.error
  }

  try {
    const { searchParams } = new URL(request.url)
    const includeUserData = searchParams.get('includeUserData')

    if (includeUserData === 'true') {
      // Hem sponsors hem de kullanıcı sponsor bilgilerini ve tüm kullanıcıları getir
      const [sponsors, userSponsorInfos, allUsers] = await Promise.all([
        prisma.sponsor.findMany({
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
        }),
        prisma.userSponsorInfo.findMany({
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                siteUsername: true,
                telegramUsername: true,
                firstName: true,
                lastName: true,
                trc20WalletAddress: true
              }
            },
            sponsor: {
              select: {
                id: true,
                name: true,
                identifierType: true,
                category: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        // Tüm kullanıcıları getir (sponsor olsun olmasın)
        prisma.user.findMany({
          select: {
            id: true,
            telegramId: true,
            siteUsername: true,
            telegramUsername: true,
            firstName: true,
            lastName: true,
            trc20WalletAddress: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
      ])

      return NextResponse.json({ sponsors, userSponsorInfos, allUsers })
    }

    // Normal sponsor listesi
    const sponsors = await prisma.sponsor.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json({ sponsors })
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return NextResponse.json({ error: 'Sponsorlar yüklenemedi' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'canAccessSponsors')
  if (authResult.error) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { name, description, logoUrl, logoPublicId, websiteUrl, category, identifierType, order } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name required' },
        { status: 400 }
      )
    }

    const sponsor = await prisma.sponsor.create({
      data: {
        name,
        description: description || null,
        logoUrl: logoUrl || null,
        logoPublicId: logoPublicId || null,
        websiteUrl: websiteUrl || null,
        category: category || 'normal',
        identifierType: identifierType || 'username',
        order: order || 0
      }
    })

    // ✅ Cache invalidation
    enhancedCache.invalidateByTag(CacheTags.SPONSORS)
    revalidatePath('/')
    revalidatePath('/api/sponsors')
    console.log('🔄 Sponsors cache temizlendi (yeni sponsor oluşturuldu)')

    return NextResponse.json({ sponsor })
  } catch (error) {
    console.error('Create sponsor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
