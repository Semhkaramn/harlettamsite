import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'

// Randy listesini getir
export async function GET(req: NextRequest) {
  const authCheck = await requirePermission(req, 'canAccessRandy')
  if (authCheck.error) return authCheck.error

  try {

    const randies = await prisma.randy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        participants: {
          select: {
            username: true,
            firstName: true
          }
        },
        winners: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    const randiesWithCount = randies.map(randy => ({
      ...randy,
      // Sadece resmi katılımcıları say (username veya firstName dolu olanlar)
      participantCount: randy.participants.filter(p => p.username || p.firstName).length,
      participants: undefined // Listeye dahil etme, sadece sayıyı göster
    }))

    return NextResponse.json(randiesWithCount)
  } catch (error) {
    console.error('Randy listesi hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Yeni Randy oluştur
export async function POST(req: NextRequest) {
  const authCheck = await requirePermission(req, 'canAccessRandy')
  if (authCheck.error) return authCheck.error

  try {

    const data = await req.json()
    const {
      title,
      message,
      targetGroupId,
      requirementType,
      messageCountPeriod,
      messageCountRequired,
      postRandyMessages,
      requireChannelMembership,
      membershipCheckChannelIds,
      winnerCount,
      prizePoints,
      pinMessage
    } = data

    if (!title || !message) {
      return NextResponse.json({ error: 'Başlık ve mesaj zorunludur' }, { status: 400 })
    }

    if (!targetGroupId) {
      return NextResponse.json({ error: 'Hedef grup seçilmelidir' }, { status: 400 })
    }

    const randy = await prisma.randy.create({
      data: {
        title,
        message,
        targetGroupId,
        requirementType,
        messageCountPeriod: requirementType === 'message_count' ? messageCountPeriod : null,
        messageCountRequired: requirementType === 'message_count' ? messageCountRequired : null,
        postRandyMessages: requirementType === 'post_randy_messages' ? postRandyMessages : null,
        requireChannelMembership: requireChannelMembership || false,
        membershipCheckChannelIds: requireChannelMembership ? membershipCheckChannelIds : null,
        winnerCount,
        prizePoints: prizePoints || 0,
        pinMessage,
        status: 'draft'
      }
    })

    return NextResponse.json(randy)
  } catch (error) {
    console.error('Randy oluşturma hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
