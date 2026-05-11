import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'
import { sendTelegramMessage, pinChatMessage, getChatInfo } from '@/lib/telegram/core'
import { getActivityGroupId } from '@/lib/site-config'
import { invalidateRandyCache } from '@/lib/telegram/handlers/message-handler'
import { RANDY } from '@/lib/telegram/taslaklar'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requirePermission(req, 'canAccessRandy')
  if (authCheck.error) return authCheck.error

  try {
    const { id } = await params

    const randy = await prisma.randy.findUnique({
      where: { id }
    })

    if (!randy) {
      return NextResponse.json({ error: 'Randy bulunamadı' }, { status: 404 })
    }

    if (randy.status !== 'draft') {
      return NextResponse.json({ error: 'Randy zaten başlatılmış' }, { status: 400 })
    }

    // Telegram'a mesaj gönder
    const chatId = randy.targetGroupId
    if (!chatId) {
      return NextResponse.json({ error: 'Randy için hedef grup belirlenmemiş' }, { status: 500 })
    }

    // ✅ Yeni güzel format ile mesaj oluştur
    let finalMessage = RANDY.START_MESAJI(
      randy.title,
      randy.message,
      0, // Başlangıçta 0 katılımcı
      randy.winnerCount,
      randy.prizePoints
    )

    // Şartları ekle
    const sartlar: string[] = []

    if (randy.requirementType === 'message_count' && randy.messageCountRequired) {
      const periodText = {
        daily: 'Günlük',
        weekly: 'Haftalık',
        monthly: 'Aylık',
        all_time: 'Toplam'
      }[randy.messageCountPeriod || 'daily'] || 'Günlük'
      sartlar.push(`📝 ${periodText} ${randy.messageCountRequired} mesaj`)
    }

    if (randy.requirementType === 'post_randy_messages' && randy.postRandyMessages) {
      sartlar.push(`📝 Randy sonrası ${randy.postRandyMessages} mesaj`)
    }

    if (sartlar.length > 0) {
      finalMessage += RANDY.SARTLAR_BOLUMU(sartlar)
    }

    // Katılım zorunlu kanal linklerini mesaja ekle
    if (randy.requireChannelMembership && randy.membershipCheckChannelIds) {
      const channelIds = randy.membershipCheckChannelIds.split('\n').map(id => id.trim()).filter(id => id)

      // Her kanal için bilgileri çek ve link oluştur
      const channelLinksPromises = channelIds.map(async (id) => {
        const chatInfo = await getChatInfo(id)
        const channelName = chatInfo?.title || 'Kanal'

        // Link oluştur (username varsa kullan, yoksa chat ID ile)
        let link = ''
        if (chatInfo?.username) {
          link = `https://t.me/${chatInfo.username}`
        } else {
          // Sayısal ID'yi t.me/c/ formatına çevir
          const numericId = id.replace('-100', '')
          link = `https://t.me/c/${numericId}`
        }

        return `📢 <a href="${link}">${channelName}</a>`
      })

      const channelLinks = await Promise.all(channelLinksPromises)
      finalMessage += RANDY.ZORUNLU_KANALLAR(channelLinks.join('\n'))
    }

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: RANDY.KATIL_BUTONU,
            callback_data: `randy_join_${id}`
          }
        ]
      ]
    }

    const message = await sendTelegramMessage(
      chatId,
      finalMessage,
      keyboard
    )

    if (!message) {
      return NextResponse.json({ error: 'Telegram mesajı gönderilemedi' }, { status: 500 })
    }

    // Mesajı sabitle
    if (randy.pinMessage && message.message_id) {
      await pinChatMessage(chatId, message.message_id)
    }

    // Randy'yi güncelle
    const updatedRandy = await prisma.randy.update({
      where: { id },
      data: {
        status: 'active',
        messageId: message.message_id,
        startedAt: new Date()
      }
    })

    // ✅ Randy cache'ini temizle
    await invalidateRandyCache()

    return NextResponse.json(updatedRandy)
  } catch (error) {
    console.error('Randy başlatma hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
