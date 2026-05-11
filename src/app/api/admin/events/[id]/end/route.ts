import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'
import { sendTelegramMessage } from '@/lib/telegram/core'
import { invalidateCache } from '@/lib/enhanced-cache'

// POST - Etkinliği manuel olarak bitir
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requirePermission(request, 'canAccessEvents')
  if (authCheck.error) return authCheck.error

  try {
    const { id } = await params

    // Etkinliği bul
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        winners: true, // ✅ Mevcut kazananları da al
        sponsor: true,
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Etkinlik bulunamadı' },
        { status: 404 }
      )
    }

    if (event.status !== 'active') {
      return NextResponse.json(
        { error: 'Sadece aktif etkinlikler bitirilebilir' },
        { status: 400 }
      )
    }

    // Çekiliş tipindeyse ve katılımcı varsa çekiliş yap
    if (event.participationType === 'raffle' && event.participants.length > 0) {
      // ✅ Zaten çekiliş yapılmış mı kontrol et
      if (event.winners.length > 0) {
        return NextResponse.json(
          { error: 'Bu etkinlikte zaten çekiliş yapılmış' },
          { status: 400 }
        )
      }

      // Eğer katılımcı sayısı kazanan sayısından az veya eşitse, hepsini kazanan yap
      let selectedWinners
      if (event.participants.length <= event.participantLimit) {
        selectedWinners = event.participants
      } else {
        // Rastgele kazananları seç
        const shuffled = [...event.participants].sort(() => Math.random() - 0.5)
        selectedWinners = shuffled.slice(0, event.participantLimit)
      }

      // Kazananları kaydet (durum pending olarak, admin seçebilsin)
      await Promise.all(
        selectedWinners.map((participant) =>
          prisma.eventWinner.create({
            data: {
              eventId: event.id,
              userId: participant.userId,
              status: 'pending',
              statusMessage: 'Durum bekleniyor',
            },
          })
        )
      )

      // ✅ Kazananlara İLK bildirim gönder
      let messageSentCount = 0
      for (const participant of selectedWinners) {
        if (participant.user.telegramId) {
          try {
            const message = `🎉 <b>Tebrikler Kazandınız!</b> 🎉

📌 <b>${event.title}</b>
📅 Tarih: ${new Date(event.createdAt).toLocaleDateString('tr-TR')}

🏆 <b>Sonuç:</b> Ödülünüz kontrol ediliyor. Sonuç belirlendikten sonra size bildirim gönderilecektir.`

            await sendTelegramMessage(participant.user.telegramId, message)

            // Rate limiting: Telegram API 30 msg/sec limit
            await new Promise(resolve => setTimeout(resolve, 50))

            // Mesaj gönderildi olarak işaretle
            await prisma.eventWinner.updateMany({
              where: {
                eventId: event.id,
                userId: participant.userId,
              },
              data: {
                messageSent: true,
                messageSentAt: new Date(),
              },
            })

            messageSentCount++
          } catch (error) {
            console.error(`Error sending message to user ${participant.userId}:`, error)
          }
        }
      }

      // Etkinliği pending durumuna al (admin durum seçmesi için)
      await prisma.event.update({
        where: { id },
        data: { status: 'pending' },
      })

      // ✅ Cache invalidation
      invalidateCache.events()

      return NextResponse.json({
        success: true,
        message: 'Çekiliş tamamlandı, kazananlar belirlendi. Lütfen kazanan durumlarını seçin.',
        winnersCount: selectedWinners.length,
        messageSentCount,
      })
    } else if (event.participationType === 'limited' && event.participants.length > 0) {
      // ✅ Limited tipinde kazananlar zaten katılım sırasında oluşturulmuş olabilir
      // Sadece henüz mesaj gönderilmemiş kazananlara mesaj gönder

      // Mevcut kazananları al (mesaj gönderilmemişler)
      const existingWinners = await prisma.eventWinner.findMany({
        where: {
          eventId: event.id,
          messageSent: false,
        },
        include: {
          user: true,
        },
      })

      // Eğer hiç kazanan yoksa, katılımcılardan oluştur (eski sistemle uyumluluk)
      if (event.winners.length === 0) {
        await Promise.all(
          event.participants.map((participant) =>
            prisma.eventWinner.create({
              data: {
                eventId: event.id,
                userId: participant.userId,
                status: 'pending',
                statusMessage: 'Durum bekleniyor',
              },
            })
          )
        )
      }

      // Güncel kazananları al (mesaj gönderilmemişler)
      const winnersToNotify = await prisma.eventWinner.findMany({
        where: {
          eventId: event.id,
          messageSent: false,
        },
        include: {
          user: true,
        },
      })

      // ✅ Kazananlara İLK bildirim gönder
      let messageSentCount = 0
      for (const winner of winnersToNotify) {
        if (winner.user.telegramId) {
          try {
            const message = `🎉 <b>Tebrikler Kazandınız!</b> 🎉

📌 <b>${event.title}</b>
📅 Tarih: ${new Date(event.createdAt).toLocaleDateString('tr-TR')}

🏆 <b>Sonuç:</b> Ödülünüz kontrol ediliyor. Sonuç belirlendikten sonra size bildirim gönderilecektir.`

            await sendTelegramMessage(winner.user.telegramId, message)

            // Rate limiting: Telegram API 30 msg/sec limit
            await new Promise(resolve => setTimeout(resolve, 50))

            // Mesaj gönderildi olarak işaretle
            await prisma.eventWinner.update({
              where: { id: winner.id },
              data: {
                messageSent: true,
                messageSentAt: new Date(),
              },
            })

            messageSentCount++
          } catch (error) {
            console.error(`Error sending message to user ${winner.userId}:`, error)
          }
        }
      }

      await prisma.event.update({
        where: { id },
        data: { status: 'pending' },
      })

      // ✅ Cache invalidation
      invalidateCache.events()

      return NextResponse.json({
        success: true,
        message: 'Etkinlik sonlandırıldı. Lütfen kazanan durumlarını seçin.',
        winnersCount: event.winners.length || event.participants.length,
        messageSentCount,
      })
    } else {
      // Katılımcı yoksa direkt pending yap
      await prisma.event.update({
        where: { id },
        data: { status: 'pending' },
      })

      // ✅ Cache invalidation
      invalidateCache.events()

      return NextResponse.json({
        success: true,
        message: 'Etkinlik sonlandırıldı',
      })
    }
  } catch (error) {
    console.error('Error ending event:', error)
    return NextResponse.json(
      { error: 'Etkinlik bitirilirken hata oluştu' },
      { status: 500 }
    )
  }
}
