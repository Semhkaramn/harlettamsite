import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram/core'

// GET - Otomatik etkinlik kontrolü (Cron job için)
export async function GET(request: NextRequest) {
  try {
    // Güvenlik için basit bir token kontrolü
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret-change-this'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    const now = new Date()

    // Süresi dolmuş aktif etkinlikleri bul
    const expiredEvents = await prisma.event.findMany({
      where: {
        status: 'active',
        endDate: {
          lte: now, // Bitiş tarihi şimdiden önce veya eşit
        },
      },
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

    const results = []

    for (const event of expiredEvents) {
      try {
        // Çekiliş tipindeyse ve katılımcı varsa çekiliş yap
        if (event.participationType === 'raffle' && event.participants.length > 0) {
          // ✅ Zaten çekiliş yapılmış mı kontrol et
          if (event.winners.length > 0) {
            // Zaten kazananlar var, sadece pending yap
            await prisma.event.update({
              where: { id: event.id },
              data: { status: 'pending' },
            })

            results.push({
              eventId: event.id,
              title: event.title,
              action: 'already_has_winners',
              winnersCount: event.winners.length,
            })
            continue
          }

          // Rastgele kazananları seç
          const shuffled = [...event.participants].sort(() => Math.random() - 0.5)
          const winners = shuffled.slice(0, Math.min(event.participantLimit, event.participants.length))

          // Kazananları kaydet - DURUM PENDING OLARAK (Admin kontrol edecek)
          await Promise.all(
            winners.map((participant) =>
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

          // Etkinliği pending durumuna al (admin onayı için)
          await prisma.event.update({
            where: { id: event.id },
            data: { status: 'pending' },
          })

          // ✅ Kazananlara İLK bildirim gönder
          let messageSentCount = 0
          for (const participant of winners) {
            if (participant.user.telegramId) {
              try {
                const message = `🎉 <b>Tebrikler Kazandınız!</b> 🎉

📌 <b>${event.title}</b>
📅 Tarih: ${new Date(event.createdAt).toLocaleDateString('tr-TR')}

🏆 <b>Sonuç:</b> Ödülünüz kontrol ediliyor. Sonuç belirlendikten sonra size bildirim gönderilecektir.`

                await sendTelegramMessage(participant.user.telegramId, message)

                // ✅ Mesaj gönderildi olarak işaretle
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

          results.push({
            eventId: event.id,
            title: event.title,
            action: 'raffle_completed',
            winnersCount: winners.length,
            messageSentCount,
          })
        } else if (event.participationType === 'limited' && event.participants.length > 0) {
          // ✅ Limited tipinde kazananlar zaten katılım sırasında oluşturulmuş olabilir

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

          await prisma.event.update({
            where: { id: event.id },
            data: { status: 'pending' },
          })

          // ✅ Kazananlara İLK bildirim gönder (henüz mesaj gönderilmemişlere)
          let messageSentCount = 0
          for (const winner of winnersToNotify) {
            if (winner.user.telegramId) {
              try {
                const message = `🎉 <b>Tebrikler Kazandınız!</b> 🎉

📌 <b>${event.title}</b>
📅 Tarih: ${new Date(event.createdAt).toLocaleDateString('tr-TR')}

🏆 <b>Sonuç:</b> Ödülünüz kontrol ediliyor. Sonuç belirlendikten sonra size bildirim gönderilecektir.`

                await sendTelegramMessage(winner.user.telegramId, message)

                // ✅ Mesaj gönderildi olarak işaretle
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

          results.push({
            eventId: event.id,
            title: event.title,
            action: 'limited_completed',
            winnersCount: event.winners.length || event.participants.length,
            messageSentCount,
          })
        } else {
          // Katılımcı yoksa direkt pending yap
          await prisma.event.update({
            where: { id: event.id },
            data: { status: 'pending' },
          })

          results.push({
            eventId: event.id,
            title: event.title,
            action: 'moved_to_pending',
          })
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        results.push({
          eventId: event.id,
          title: event.title,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: expiredEvents.length,
      results,
    })
  } catch (error) {
    console.error('Error in auto-check:', error)
    return NextResponse.json(
      { error: 'Otomatik kontrol sırasında hata oluştu' },
      { status: 500 }
    )
  }
}
