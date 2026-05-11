import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requirePermission } from '@/lib/admin-middleware'
import { invalidateCache } from '@/lib/enhanced-cache'

// GET - Tüm etkinlikleri listele
export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin(request)
  if (authCheck.error) return authCheck.error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status
    }

    // 🚀 OPTIMIZATION: Limit to prevent memory issues under high load
    const events = await prisma.event.findMany({
      where,
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            identifierType: true,
          },
        },
        _count: {
          select: {
            participants: true,
            winners: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 100, // Max 100 events (admin panel)
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Etkinlikler yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}

// POST - Yeni etkinlik oluştur
export async function POST(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessEvents')
  if (authCheck.error) return authCheck.error

  try {
    const body = await request.json()
    const {
      title,
      description,
      imageUrl,
      imagePublicId,
      sponsorId,
      participantLimit,
      participationType,
      endDate,
    } = body

    // Validasyon
    if (!title || !sponsorId || !participantLimit || !participationType || !endDate) {
      return NextResponse.json(
        { error: 'Tüm gerekli alanları doldurun' },
        { status: 400 }
      )
    }

    if (participantLimit < 1) {
      return NextResponse.json(
        { error: 'Katılımcı limiti en az 1 olmalı' },
        { status: 400 }
      )
    }

    if (!['limited', 'raffle'].includes(participationType)) {
      return NextResponse.json(
        { error: 'Geçersiz katılım tipi' },
        { status: 400 }
      )
    }

    // Sponsor kontrolü
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
    })

    if (!sponsor) {
      return NextResponse.json(
        { error: 'Sponsor bulunamadı' },
        { status: 404 }
      )
    }

    // Etkinlik oluştur
    // endDate string'i Türkiye saatinde gelir, UTC'ye çevirmek için +03:00 offset ekliyoruz
    const event = await prisma.event.create({
      data: {
        title,
        description,
        imageUrl,
        imagePublicId,
        sponsorId,
        participantLimit,
        participationType,
        endDate: new Date(endDate + '+03:00'),
        status: 'active',
      },
      include: {
        sponsor: true,
      },
    })

    // ✅ Cache invalidation
    invalidateCache.events()

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Etkinlik oluşturulurken hata oluştu' },
      { status: 500 }
    )
  }
}
