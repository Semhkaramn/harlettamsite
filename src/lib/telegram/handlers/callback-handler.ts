import { NextResponse } from 'next/server'
import { answerCallbackQuery, checkChannelMembership } from '../core'
import { checkUserBan } from '../utils/ban-check'
import { prisma } from '@/lib/prisma'
import { GENEL, RANDY } from '../taslaklar'
import { GROUP_ANONYMOUS_BOT_ID, TELEGRAM_SERVICE_ACCOUNT_ID } from '../utils/anonymous-admin'

/**
 * Callback query handler (buton tıklamaları)
 *
 * 🚀 ULTRA OPTIMIZATION:
 * - Activity group kontrolü WEBHOOK'ta yapılıyor (burada YOK)
 *
 * 🔒 ANONİM ADMİN DESTEĞİ:
 * - Anonim adminler (GroupAnonymousBot) callback işlemlerine katılamaz
 * - Randy'ye katılım vb. işlemler için gerçek kullanıcı ID'si gereklidir
 *
 * @param query Callback query objesi
 */
export async function handleCallbackQuery(query: any) {
  const fromId = query.from.id

  // 🔒 SİSTEM HESAPLARI KONTROLÜ
  // Callback'lerde from her zaman gerçek kullanıcı olmalı, ama güvenlik için kontrol edelim

  // 1️⃣ Telegram Servis Hesabı (bağlı kanallardan gelen callback'ler - ID: 777000)
  if (fromId === TELEGRAM_SERVICE_ACCOUNT_ID) {
    await answerCallbackQuery(
      query.id,
      '📢 Kanal hesabıyla bu işlemi yapamazsınız.',
      false
    )
    return NextResponse.json({ ok: true })
  }

  // 2️⃣ Anonim Admin (GroupAnonymousBot - ID: 1087968824)
  if (fromId === GROUP_ANONYMOUS_BOT_ID) {
    await answerCallbackQuery(
      query.id,
      '👤 Anonim olarak bu işlemi yapamazsınız. Kendi hesabınızdan deneyin.',
      false
    )
    return NextResponse.json({ ok: true })
  }

  const userId = String(fromId)

  // Ban kontrolü - küçük tepki ile göster
  const banStatus = await checkUserBan(userId)
  if (banStatus.isBanned) {
    await answerCallbackQuery(
      query.id,
      GENEL.YASAKLANDI,
      false // Küçük tepki olarak göster
    )
    return NextResponse.json({ ok: true })
  }

  // Randy join callback
  if (query.data.startsWith('randy_join_')) {
    const randyId = query.data.replace('randy_join_', '')
    return await handleRandyJoin(query, userId, randyId)
  }

  // Callback data'ya göre işlem yap
  switch (query.data) {
    case 'my_stats':
      // Stats callback'i var ama mesaj gönderme
      await answerCallbackQuery(query.id)
      break

    default:
      await answerCallbackQuery(query.id)
  }

  return NextResponse.json({ ok: true })
}

/**
 * Randy katılım handler
 */
async function handleRandyJoin(query: any, userId: string, randyId: string) {
  try {
    // Randy'yi kontrol et
    const randy = await prisma.randy.findUnique({
      where: { id: randyId }
    })

    if (!randy) {
      await answerCallbackQuery(
        query.id,
        RANDY.RANDY_BULUNAMADI,
        false
      )
      return NextResponse.json({ ok: true })
    }

    if (randy.status !== 'active') {
      await answerCallbackQuery(
        query.id,
        RANDY.RANDY_AKTIF_DEGIL,
        false
      )
      return NextResponse.json({ ok: true })
    }

    // Mevcut katılımcı kaydını kontrol et (otomatik tracking için oluşturulmuş olabilir)
    const existingParticipant = await prisma.randyParticipant.findUnique({
      where: {
        randyId_telegramId: {
          randyId: randy.id,
          telegramId: userId
        }
      }
    })

    // Kanal üyelik kontrolü
    if (randy.requireChannelMembership && randy.membershipCheckChannelIds) {
      const membershipCheck = await checkChannelMembership(
        randy.membershipCheckChannelIds,
        Number(userId)
      )

      if (!membershipCheck.isMember) {
        await answerCallbackQuery(
          query.id,
          RANDY.KANAL_UYESI_DEGIL,
          false
        )
        return NextResponse.json({ ok: true })
      }
    }

    // Mesaj şartı kontrolü (message_count)
    if (randy.requirementType === 'message_count') {
      const telegramUser = await prisma.telegramGroupUser.findUnique({
        where: { telegramId: userId }
      })

      if (!telegramUser) {
        await answerCallbackQuery(
          query.id,
          RANDY.MESAJ_YAZ_ONCE,
          false
        )
        return NextResponse.json({ ok: true })
      }

      let userMessageCount = 0
      switch (randy.messageCountPeriod) {
        case 'daily':
          userMessageCount = telegramUser.dailyMessageCount
          break
        case 'weekly':
          userMessageCount = telegramUser.weeklyMessageCount
          break
        case 'monthly':
          userMessageCount = telegramUser.monthlyMessageCount
          break
        case 'all_time':
          userMessageCount = telegramUser.messageCount
          break
      }

      const requiredMessages = randy.messageCountRequired || 0

      if (userMessageCount < requiredMessages) {
        const periodText = RANDY.PERIOD_TEXT[randy.messageCountPeriod || 'daily']
        const remainingMessages = requiredMessages - userMessageCount

        await answerCallbackQuery(
          query.id,
          RANDY.MESAJ_SARTI(remainingMessages, periodText),
          false
        )
        return NextResponse.json({ ok: true })
      }
    }

    // Randy sonrası mesaj şartı kontrolü (post_randy_messages)
    if (randy.requirementType === 'post_randy_messages') {
      const requiredMessages = randy.postRandyMessages || 0
      const currentMessageCount = existingParticipant?.postRandyMessageCount || 0

      console.log(`🔍 Randy katılım kontrolü: userId=${userId}, gerekli=${requiredMessages}, mevcut=${currentMessageCount}`)

      if (currentMessageCount < requiredMessages) {
        const remainingMessages = requiredMessages - currentMessageCount

        console.log(`❌ Randy katılım reddedildi: ${remainingMessages} mesaj daha gerekli`)
        await answerCallbackQuery(
          query.id,
          RANDY.MESAJ_DAHA_YAZ(remainingMessages),
          false
        )
        return NextResponse.json({ ok: true })
      }
      console.log(`✅ Randy katılım şartı karşılandı: ${currentMessageCount}/${requiredMessages}`)
    }

    // Eğer kullanıcı kaydı varsa kontrol et
    if (existingParticipant) {
      // Kullanıcı bilgileri dolu mu? (username veya firstName varsa resmi katılım yapılmış demektir)
      const hasUserInfo = existingParticipant.username || existingParticipant.firstName

      if (hasUserInfo) {
        // Zaten resmi olarak katılmış
        await answerCallbackQuery(
          query.id,
          RANDY.ZATEN_KATILDIN,
          false
        )
        return NextResponse.json({ ok: true })
      }

      // Kullanıcı bilgileri boş = sadece mesaj tracking için oluşturulmuş
      // Bilgileri doldur ve katılımı onayla
      await prisma.randyParticipant.update({
        where: {
          randyId_telegramId: {
            randyId: randy.id,
            telegramId: userId
          }
        },
        data: {
          username: query.from.username,
          firstName: query.from.first_name,
          lastName: query.from.last_name
        }
      })

      await answerCallbackQuery(
        query.id,
        RANDY.BASARIYLA_KATILDIN,
        false
      )
    } else {
      // Hiç kayıt yok, yeni oluştur
      await prisma.randyParticipant.create({
        data: {
          randyId: randy.id,
          telegramId: userId,
          username: query.from.username,
          firstName: query.from.first_name,
          lastName: query.from.last_name,
          postRandyMessageCount: 0
        }
      })

      await answerCallbackQuery(
        query.id,
        RANDY.BASARIYLA_KATILDIN,
        false
      )
    }

    // ✅ Mesajı güncelle (katılımcı sayısı ile) - YENİ FORMAT
    try {
      // Sadece resmi katılımcıları say (username veya firstName dolu olanlar)
      const participants = await prisma.randyParticipant.findMany({
        where: { randyId: randy.id },
        select: { username: true, firstName: true }
      })
      const participantCount = participants.filter(p => p.username || p.firstName).length

      // ✅ Yeni güzel format ile mesaj oluştur
      let updatedMessage = RANDY.START_MESAJI(
        randy.title,
        randy.message,
        participantCount,
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
        updatedMessage += RANDY.SARTLAR_BOLUMU(sartlar)
      }

      // Katılım zorunlu kanal linklerini ekle
      if (randy.requireChannelMembership && randy.membershipCheckChannelIds) {
        const { getChatInfo } = await import('@/lib/telegram/core')
        const channelIds = randy.membershipCheckChannelIds.split('\n').map(id => id.trim()).filter(id => id)

        const channelLinksPromises = channelIds.map(async (channelId) => {
          const chatInfo = await getChatInfo(channelId)
          const channelName = chatInfo?.title || 'Kanal'

          // Link oluştur
          let link = ''
          if (chatInfo?.username) {
            link = `https://t.me/${chatInfo.username}`
          } else {
            let numericId = channelId.replace(/^-100/, '')
            numericId = numericId.replace(/^-/, '')
            link = `https://t.me/c/${numericId}`
          }

          return `📢 <a href="${link}">${channelName}</a>`
        })

        const channelLinks = await Promise.all(channelLinksPromises)
        updatedMessage += RANDY.ZORUNLU_KANALLAR(channelLinks.join('\n'))
      }

      updatedMessage = updatedMessage.trim()

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: RANDY.KATIL_BUTONU,
              callback_data: `randy_join_${randy.id}`
            }
          ]
        ]
      }

      const { editTelegramMessage } = await import('@/lib/telegram/core')
      const chatId = randy.targetGroupId

      if (chatId && randy.messageId) {
        await editTelegramMessage(
          chatId,
          randy.messageId,
          updatedMessage,
          keyboard
        )
      }
    } catch (error) {
      console.error('Randy mesaj güncelleme hatası:', error)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Randy katılım hatası:', error)
    await answerCallbackQuery(
      query.id,
      GENEL.HATA_GENEL,
      false
    )
    return NextResponse.json({ ok: true })
  }
}
