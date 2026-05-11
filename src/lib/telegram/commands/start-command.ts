import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '../core'
import { SiteConfig } from '@/lib/site-config'
import { handleStatsStart } from './me-command'
import { GENEL, BAGLANTI } from '../taslaklar'

/**
 * /start komutu handler
 * @param message Telegram message objesi
 */
export async function handleStartCommand(message: any) {
  const chatId = message.chat.id
  const chatType = message.chat.type
  const userId = String(message.from.id)
  const username = message.from.username
  const firstName = message.from.first_name
  const lastName = message.from.last_name
  const messageText = message.text.trim()

  const webAppUrl = SiteConfig.appUrl
  const startParam = messageText.split(' ')[1]

  // 0️⃣ Stats parametresi ile başlatma (istatistik görüntüleme)
  if (startParam && startParam.startsWith('stats_')) {
    const targetUserId = startParam.replace('stats_', '')
    return await handleStatsStart(message, targetUserId)
  }

  // 1️⃣ Token ile bağlantı (6 haneli kod)
  if (startParam && /^\d{6}$/.test(startParam)) {
    console.log('🔐 Token connection attempt:', {
      token: startParam,
      telegramId: userId,
      firstName,
      username
    })

    // Token ile kullanıcı bul
    const webUser = await prisma.user.findFirst({
      where: {
        telegramConnectionToken: startParam,
        telegramConnectionTokenExpiry: { gte: new Date() }
      }
    })

    console.log(
      '👤 Token search result:',
      webUser
        ? `Found: ${webUser.email || webUser.id} (Current telegramId: ${webUser.telegramId || 'none'})`
        : 'Not found'
    )

    if (webUser) {
      // ✅ Bu Telegram ID başka bir kullanıcıya zaten bağlı mı kontrol et
      const existingTelegramUser = await prisma.user.findUnique({
        where: { telegramId: userId }
      })

      if (existingTelegramUser && existingTelegramUser.id !== webUser.id) {
        console.log('❌ Telegram ID already linked to another user:', {
          telegramId: userId,
          existingUserId: existingTelegramUser.id,
          attemptedUserId: webUser.id
        })
        await sendTelegramMessage(
          chatId,
          BAGLANTI.ZATEN_BAGLI_BASKA_HESAP
        )
        return NextResponse.json({ ok: true })
      }

      // User tablosunu güncelle
      const updatedUser = await prisma.user.update({
        where: { id: webUser.id },
        data: {
          telegramId: userId,
          telegramUsername: username || webUser.telegramUsername,
          firstName: firstName || webUser.firstName,
          lastName: lastName || webUser.lastName,
          telegramConnectionToken: null,
          telegramConnectionTokenExpiry: null
        }
      })

      console.log('✅ [TOKEN-LINK] User table updated:', {
        userId: webUser.id,
        email: webUser.email,
        telegramId: userId,
        username
      })

      // TelegramGroupUser bul veya oluştur ve bağla
      let telegramGroupUser = await prisma.telegramGroupUser.findUnique({
        where: { telegramId: userId }
      })

      if (telegramGroupUser) {
        // Mevcut TelegramGroupUser'ı bağla
        await prisma.telegramGroupUser.update({
          where: { id: telegramGroupUser.id },
          data: {
            linkedUserId: updatedUser.id,
            username: username || telegramGroupUser.username,
            firstName: firstName || telegramGroupUser.firstName,
            lastName: lastName || telegramGroupUser.lastName,
            hadStart: true
          }
        })
        console.log(
          `✅ [TOKEN-LINK] TelegramGroupUser linked (${telegramGroupUser.messageCount} past messages)`
        )
      } else {
        // Yeni TelegramGroupUser oluştur ve bağla
        telegramGroupUser = await prisma.telegramGroupUser.create({
          data: {
            telegramId: userId,
            username: username || null,
            firstName: firstName || null,
            lastName: lastName || null,
            linkedUserId: updatedUser.id,
            hadStart: true,
            messageCount: 0
          }
        })
        console.log(
          '✅ [TOKEN-LINK] New TelegramGroupUser created and linked'
        )
      }

      await sendTelegramMessage(
        chatId,
        BAGLANTI.BASARILI(firstName || webUser.firstName || 'Kullanıcı', telegramGroupUser?.messageCount)
      )

      console.log('✅ Web user linked with Telegram:', {
        userId: webUser.id,
        email: webUser.email,
        telegramId: userId,
        updatedUser: updatedUser.telegramId
      })

      // Private chat ise burada dur
      if (chatType === 'private') {
        return NextResponse.json({ ok: true })
      }

      // Grup mesajında puan kazanma için devam et
      return NextResponse.json({ ok: true })
    } else {
      // Token bulunamadı
      console.log('❌ Token not found or expired')
      await sendTelegramMessage(
        chatId,
        BAGLANTI.TOKEN_GECERSIZ
      )
      return NextResponse.json({ ok: true })
    }
  }

  // 2️⃣ Normal /start (token yok)
  if (chatType === 'private') {
    // Private chat'te hoş geldin mesajı
    await sendTelegramMessage(
      chatId,
      GENEL.HOŞGELDİN(firstName)
    )
    return NextResponse.json({ ok: true })
  }

  // Grup mesajında /start - sessiz kal
  return NextResponse.json({ ok: true })
}
