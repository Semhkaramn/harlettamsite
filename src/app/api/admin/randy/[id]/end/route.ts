import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'
import { editTelegramMessage } from '@/lib/telegram/core'
import { invalidateRandyCache } from '@/lib/telegram/handlers/message-handler'
import { RANDY } from '@/lib/telegram/taslaklar'
import { logActivity } from '@/lib/services/activity-log-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requirePermission(req, 'canAccessRandy')
  if (authCheck.error) return authCheck.error

  try {
    const { id } = await params

    const randy = await prisma.randy.findUnique({
      where: { id },
      include: {
        participants: true
      }
    })

    if (!randy) {
      return NextResponse.json({ error: 'Randy bulunamadı' }, { status: 404 })
    }

    if (randy.status !== 'active') {
      return NextResponse.json({ error: 'Randy aktif değil' }, { status: 400 })
    }

    // Katılımcıları kontrol et
    // NOT: Sadece resmi olarak katılmış kullanıcıları say (username veya firstName dolu olanlar)
    // Mesaj tracking için otomatik oluşturulan kayıtlar (username ve firstName null) sayılmaz
    const eligibleParticipants = randy.participants.filter(p =>
      p.username || p.firstName
    )

    if (eligibleParticipants.length === 0) {
      return NextResponse.json({ error: 'Hiç katılımcı yok' }, { status: 400 })
    }

    // Kazananları seç (rastgele)
    // Katılımcı sayısı kazanan sayısından az ise, mevcut katılımcıların hepsini kazanan yap
    const shuffled = eligibleParticipants.sort(() => 0.5 - Math.random())
    const actualWinnerCount = Math.min(randy.winnerCount, eligibleParticipants.length)
    const selectedWinners = shuffled.slice(0, actualWinnerCount)

    // Kazananlar için site kullanıcılarını bul ve puan ekle
    const winnersWithPoints = await Promise.all(
      selectedWinners.map(async (participant) => {
        // ✅ User tablosundan doğrudan telegramId ile kontrol et
        const siteUser = await prisma.user.findUnique({
          where: { telegramId: participant.telegramId }
        })

        let pointsAwarded = 0
        let hasLinkedUser = false
        let linkedUserId: string | null = null

        // Site kullanıcısı varsa
        if (siteUser) {
          hasLinkedUser = true
          linkedUserId = siteUser.id

          // Puan ödülü varsa puan ekle
          if (randy.prizePoints > 0) {
            pointsAwarded = randy.prizePoints

            // Kullanıcıya puan ekle
            await prisma.user.update({
              where: { id: linkedUserId },
              data: {
                points: { increment: randy.prizePoints }
              }
            })

            // Puan geçmişine kaydet
            await prisma.pointHistory.create({
              data: {
                userId: linkedUserId,
                amount: randy.prizePoints,
                type: 'randy_win',
                description: `Randy çekilişi kazandı: ${randy.title}`,
                relatedId: randy.id
              }
            })

            // Aktivite log'a kaydet
            await logActivity({
              userId: linkedUserId,
              actionType: 'randy_win' as any,
              actionTitle: `${randy.title} çekilişini kazandı`,
              actionDescription: `+${randy.prizePoints} puan kazanıldı`,
              newValue: String(randy.prizePoints),
              relatedId: randy.id,
              relatedType: 'randy',
              metadata: {
                randyTitle: randy.title,
                pointsWon: randy.prizePoints
              }
            })
          }
        }

        return {
          participant,
          pointsAwarded,
          hasLinkedUser,
          linkedUserId
        }
      })
    )

    // Kazananları kaydet
    const winners = await Promise.all(
      winnersWithPoints.map(({ participant, pointsAwarded, hasLinkedUser, linkedUserId }) =>
        prisma.randyWinner.create({
          data: {
            randyId: randy.id,
            telegramId: participant.telegramId,
            username: participant.username,
            firstName: participant.firstName,
            lastName: participant.lastName,
            pointsAwarded,
            hasLinkedUser,
            linkedUserId
          }
        })
      )
    )

    // Randy'yi güncelle
    await prisma.randy.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date()
      }
    })

    // ✅ Randy cache'ini temizle
    await invalidateRandyCache()

    // ✅ Güzel kazanan mesajını hazırla
    const totalParticipantCount = eligibleParticipants.length

    // Kazananlar listesi
    const kazananListesi = winners.map((w, index) => {
      const isim = w.username ? `@${w.username}` : `${w.firstName}${w.lastName ? ` ${w.lastName}` : ''}`
      return {
        sira: index + 1,
        isim,
        puanEklendi: w.hasLinkedUser && w.pointsAwarded > 0,
        uyelikYok: !w.hasLinkedUser
      }
    })

    const winnerMessage = RANDY.KAZANAN_MESAJI(
      totalParticipantCount,
      randy.prizePoints,
      kazananListesi,
      randy.title
    )

    // Telegram mesajını DÜZENLE (yeni mesaj atmak yerine)
    const chatId = randy.targetGroupId
    if (chatId && randy.messageId) {
      await editTelegramMessage(
        chatId,
        randy.messageId,
        winnerMessage
        // ❌ Keyboard kaldırıldı - artık butona gerek yok
      )

      // ✅ Mesaj sabitlenmişse SABİT KALSIN - unpin YAPILMADI
      // Eğer admin sabitlemiş ise kazananlar açıklandığında da sabit kalacak
    }

    return NextResponse.json({ success: true, winners })
  } catch (error) {
    console.error('Randy sonlandırma hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
