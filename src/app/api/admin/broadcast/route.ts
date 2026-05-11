import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTelegramBot, queueBulkMessages } from '@/lib/telegram/core'
import { requirePermission } from '@/lib/admin-middleware'
import { MessagePriority } from '@/lib/telegram/queue'

interface InlineButton {
  text: string
  url: string
}

interface TargetUser {
  id: string
  telegramId: string | null
  siteUsername: string | null
  username: string | null
  firstName: string | null
  points: number
  rank: { name: string } | null
  hadStart?: boolean
  isBanned?: boolean
}

export async function POST(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessBroadcast')
  if (authCheck.error) return authCheck.error

  try {
    const body = await request.json()
    const { message, imageUrl, buttons, sendToAll, userIds } = body

    // At least one content should exist: message or image
    if ((!message || !message.trim()) && !imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'En az bir mesaj metni veya görsel gerekli'
      }, { status: 400 })
    }

    // Get users to send message to
    let allTargetUsers: TargetUser[] = []
    let validTargetUsers: TargetUser[] = []
    let skippedUsers: Array<{
      user: TargetUser
      reason: string
      failureReason: string
    }> = []

    if (sendToAll) {
      // 🚀 OPTIMIZED: Sadece hadStart=true olanları getir (veritabanı seviyesinde)
      const telegramUsers = await prisma.telegramGroupUser.findMany({
        where: {
          hadStart: true  // Sadece botu başlatanları getir
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          hadStart: true,
          linkedUser: {
            select: {
              id: true,
              siteUsername: true,
              points: true,
              isBanned: true,
              rank: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      // Process all users
      for (const tgUser of telegramUsers) {
        const user: TargetUser = {
          id: tgUser.id,
          telegramId: tgUser.telegramId,
          siteUsername: tgUser.linkedUser?.siteUsername || null,
          username: tgUser.username,
          firstName: tgUser.firstName,
          points: tgUser.linkedUser?.points || 0,
          rank: tgUser.linkedUser?.rank || null,
          hadStart: tgUser.hadStart,
          isBanned: tgUser.linkedUser?.isBanned || false
        }

        allTargetUsers.push(user)

        // Check if user should receive message
        // NOT: hadStart kontrolü artık veritabanı sorgusunda yapılıyor
        if (tgUser.linkedUser?.isBanned) {
          skippedUsers.push({
            user,
            reason: 'Kullanıcı banlı',
            failureReason: 'banned_user'
          })
        } else if (!tgUser.telegramId) {
          skippedUsers.push({
            user,
            reason: 'Telegram ID yok',
            failureReason: 'no_telegram_id'
          })
        } else {
          validTargetUsers.push(user)
        }
      }
    } else {
      if (!userIds || userIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'En az bir kullanıcı seçmelisiniz'
        }, { status: 400 })
      }

      // Seçili telegram kullanıcılarını al - SADECE hadStart=true olanları
      const telegramUsers = await prisma.telegramGroupUser.findMany({
        where: {
          id: { in: userIds },
          hadStart: true  // Sadece botu başlatanları getir
        },
        include: {
          linkedUser: {
            select: {
              id: true,
              siteUsername: true,
              points: true,
              isBanned: true,
              rank: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      // Process all selected users
      for (const tgUser of telegramUsers) {
        const user: TargetUser = {
          id: tgUser.id,
          telegramId: tgUser.telegramId,
          siteUsername: tgUser.linkedUser?.siteUsername || null,
          username: tgUser.username,
          firstName: tgUser.firstName,
          points: tgUser.linkedUser?.points || 0,
          rank: tgUser.linkedUser?.rank || null,
          hadStart: tgUser.hadStart,
          isBanned: tgUser.linkedUser?.isBanned || false
        }

        allTargetUsers.push(user)

        // Check if user should receive message
        // NOT: hadStart kontrolü artık veritabanı sorgusunda yapılıyor
        if (tgUser.linkedUser?.isBanned) {
          skippedUsers.push({
            user,
            reason: 'Kullanıcı banlı',
            failureReason: 'banned_user'
          })
        } else if (!tgUser.telegramId) {
          skippedUsers.push({
            user,
            reason: 'Telegram ID yok',
            failureReason: 'no_telegram_id'
          })
        } else {
          validTargetUsers.push(user)
        }
      }
    }

    if (allTargetUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Mesaj gönderilecek kullanıcı bulunamadı'
      }, { status: 404 })
    }

    // Process buttons if provided
    let replyMarkup: any = undefined
    if (buttons && buttons.length > 0) {
      const inlineKeyboard = buttons.map((btn: InlineButton) => [
        { text: btn.text, url: btn.url }
      ])
      replyMarkup = {
        inline_keyboard: inlineKeyboard
      }
    }

    // Create batch ID
    const batchId = `broadcast_${Date.now()}`

    // Create broadcast history record
    const broadcastHistory = await prisma.broadcastHistory.create({
      data: {
        message: message || '',
        imageUrl: imageUrl || null,
        buttons: buttons && buttons.length > 0 ? JSON.stringify(buttons) : null,
        sendToAll,
        targetUserCount: allTargetUsers.length,
        status: 'processing',
        queuedCount: validTargetUsers.length,
        sentCount: 0,
        failedCount: skippedUsers.length,
        batchId,
        adminId: authCheck.admin?.id,
        adminUsername: authCheck.admin?.username,
        startedAt: new Date(),
      }
    })

    // Create recipient records for all users (including skipped ones)
    const recipientRecords = []

    // Add skipped users as recipients with their failure reasons
    for (const skipped of skippedUsers) {
      recipientRecords.push({
        broadcastId: broadcastHistory.id,
        telegramId: skipped.user.telegramId || '',
        telegramUsername: skipped.user.username,
        firstName: skipped.user.firstName,
        siteUsername: skipped.user.siteUsername,
        status: 'skipped',
        errorMessage: skipped.reason,
        failureReason: skipped.failureReason,
        personalizedMessage: null,
        createdAt: new Date()
      })
    }

    // Add valid users as pending recipients
    for (const user of validTargetUsers) {
      // Replace tags in message
      let personalizedMessage = ''
      if (message && message.trim()) {
        personalizedMessage = message
          .replace(/{username}/g, user.username ? `@${user.username}` : (user.firstName || 'Kullanıcı'))
          .replace(/{firstname}/g, user.firstName || user.username || 'Kullanıcı')
      }

      recipientRecords.push({
        broadcastId: broadcastHistory.id,
        telegramId: user.telegramId || '',
        telegramUsername: user.username,
        firstName: user.firstName,
        siteUsername: user.siteUsername,
        status: 'pending',
        errorMessage: null,
        failureReason: null,
        personalizedMessage: personalizedMessage || null,
        createdAt: new Date()
      })
    }

    // Bulk create recipient records
    if (recipientRecords.length > 0) {
      await prisma.broadcastRecipient.createMany({
        data: recipientRecords
      })
    }

    // Prepare messages for queue
    const queueMessages = validTargetUsers
      .filter(user => user.telegramId)
      .map(user => {
        // Replace tags in message (with @ prefix for username)
        let personalizedMessage = ''
        if (message && message.trim()) {
          personalizedMessage = message
            .replace(/{username}/g, user.username ? `@${user.username}` : (user.firstName || 'Kullanıcı'))
            .replace(/{firstname}/g, user.firstName || user.username || 'Kullanıcı')
        }

        return {
          chatId: user.telegramId!,
          text: personalizedMessage || '',
          imageUrl: imageUrl || undefined,
          keyboard: replyMarkup,
        }
      })
      .filter(msg => msg.text || msg.imageUrl)

    if (queueMessages.length === 0) {
      // Update broadcast as completed with no messages sent
      await prisma.broadcastHistory.update({
        where: { id: broadcastHistory.id },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        queued: false,
        queuedCount: 0,
        skippedCount: skippedUsers.length,
        broadcastId: broadcastHistory.id,
        totalUsers: allTargetUsers.length,
        message: `Gönderilecek geçerli mesaj bulunamadı. ${skippedUsers.length} kullanıcı atlandı.`
      })
    }

    // Queue all messages with LOW priority (broadcast)
    const messageIds = await queueBulkMessages(
      queueMessages as Array<{
        chatId: string | number
        text: string
        imageUrl?: string
        keyboard?: any
      }>,
      {
        priority: MessagePriority.LOW,
        batchId,
      }
    )

    console.log(`📬 Broadcast queued: ${messageIds.length} messages in batch ${batchId}`)

    // Return immediately - messages will be processed in background
    return NextResponse.json({
      success: true,
      queued: true,
      queuedCount: messageIds.length,
      skippedCount: skippedUsers.length,
      batchId,
      broadcastId: broadcastHistory.id,
      totalUsers: allTargetUsers.length,
      message: `${messageIds.length} mesaj kuyruğa eklendi. ${skippedUsers.length} kullanıcı atlandı. Mesajlar arka planda gönderilecek.`
    })
  } catch (error) {
    console.error('Error sending broadcast:', error)
    return NextResponse.json({
      success: false,
      error: 'Mesajlar gönderilirken hata oluştu'
    }, { status: 500 })
  }
}
