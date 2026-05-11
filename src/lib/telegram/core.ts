/**
 * 📱 Telegram Core Utilities
 * ALL telegram messaging and bot interaction functions in ONE place
 *
 * 🚀 v2.0 - Queue System Integration
 * - High-volume message support
 * - Rate limiting
 * - Retry mechanism
 */

import TelegramBot from 'node-telegram-bot-api'
import { createHash, createHmac } from 'crypto'
import { getCachedData, CacheTTL } from '../enhanced-cache'
import { getTelegramBotToken } from '../site-config'
import { telegramQueue, MessagePriority } from './queue'

let bot: TelegramBot | null = null

// 🚀 OPTIMIZATION: Admin cache sistemi
// chatId:userId -> { isAdmin: boolean, timestamp: number }
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>()
const ADMIN_CACHE_TTL = 300000 // 5 dakika (300 saniye)

/**
 * Admin cache'ini temizle (grup admin değişikliği olduğunda çağrılabilir)
 */
export function invalidateAdminCache(chatId?: number, userId?: number): void {
  if (chatId && userId) {
    // Belirli bir kullanıcı için temizle
    adminCache.delete(`${chatId}:${userId}`)
  } else if (chatId) {
    // Belirli bir grup için tüm cache'i temizle
    const prefix = `${chatId}:`
    for (const key of adminCache.keys()) {
      if (key.startsWith(prefix)) {
        adminCache.delete(key)
      }
    }
  } else {
    // Tüm cache'i temizle
    adminCache.clear()
  }
}

// 🚀 OPTIMIZED: Get bot token from ENV (no DB query, no cache needed)
function getCachedBotToken(): string {
  return getTelegramBotToken()
}

/**
 * Get Telegram Bot instance
 */
export async function getTelegramBot(): Promise<TelegramBot> {
  const token = getCachedBotToken()

  // Bot instance'ı yoksa oluştur
  if (!bot) {
    bot = new TelegramBot(token, { polling: false })
  }

  return bot
}

/**
 * Invalidate bot token cache (when admin changes token)
 */
export function invalidateBotTokenCache(): void {
  bot = null
}

/**
 * Setup menu button (next to message input)
 */
/**
 * Get user profile photo (cached for 24 hours)
 */
export async function getUserProfilePhoto(userId: number): Promise<string | null> {
  return getCachedData(
    `telegram_photo_${userId}`,
    async () => {
      try {
        const token = getCachedBotToken()

        const url = `https://api.telegram.org/bot${token}/getUserProfilePhotos`
        const response = await fetch(`${url}?user_id=${userId}&limit=1`)
        const data = await response.json()

        if (!data.ok || !data.result || !data.result.photos || data.result.photos.length === 0) {
          return null
        }

        const photo = data.result.photos[0]
        const largestPhoto = photo[photo.length - 1]
        const fileId = largestPhoto.file_id

        const fileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
        const fileResponse = await fetch(fileUrl)
        const fileData = await fileResponse.json()

        if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
          return null
        }

        const photoUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`
        return photoUrl
      } catch (error) {
        console.error('Error getting user profile photo:', error)
        return null
      }
    },
    { ttl: CacheTTL.DAY }
  )
}

/**
 * Verify Telegram Login Widget authentication
 */
export async function verifyTelegramAuth(data: Record<string, string>): Promise<boolean> {
  try {
    const token = getTelegramBotToken()

    const secret = createHash('sha256')
      .update(token)
      .digest()

    const checkString = Object.keys(data)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n')

    const hash = createHmac('sha256', secret)
      .update(checkString)
      .digest('hex')

    return hash === data.hash
  } catch (error) {
    console.error('Telegram auth verification error:', error)
    return false
  }
}

/**
 * Send a telegram message
 * @param chatId Chat ID (string or number)
 * @param text Message text (supports HTML)
 * @param options Optional keyboard, parse mode, and queue options
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    keyboard?: any
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
    // Queue options
    useQueue?: boolean
    priority?: MessagePriority
  } | any
): Promise<any> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      console.error('❌ Bot token not configured')
      return null
    }

    // Parse options
    let keyboard: any = undefined
    let parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
    let useQueue = false
    let priority = MessagePriority.NORMAL

    if (options) {
      if (options.inline_keyboard) {
        // Old style: keyboard passed directly
        keyboard = options
      } else {
        keyboard = options.keyboard
        if (options.parseMode) parseMode = options.parseMode
        if (options.useQueue !== undefined) useQueue = options.useQueue
        if (options.priority !== undefined) priority = options.priority
      }
    }

    // Use queue for bulk messages
    if (useQueue) {
      const messageId = await telegramQueue.queueMessage(chatId, text, {
        parseMode,
        keyboard,
        priority,
      })
      console.log(`📬 Message queued: ${messageId} to ${chatId}`)
      return { queued: true, messageId }
    }

    // Direct send for immediate messages
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      link_preview_options: { is_disabled: true }
    }

    if (keyboard) {
      body.reply_markup = keyboard
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!data.ok) {
      console.error(`❌ Telegram API error: ${data.description}`)
      return null
    }

    console.log(`✅ Telegram message sent to ${chatId}`)
    return data.result
  } catch (error) {
    console.error('❌ Error sending telegram message:', error)
    return null
  }
}

/**
 * Delete a Telegram message
 */
export async function deleteTelegramMessage(
  chatId: string | number,
  messageId: number
): Promise<boolean> {
  try {
    const botToken = getTelegramBotToken()
    if (!botToken) return false

    const url = `https://api.telegram.org/bot${botToken}/deleteMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId
      })
    })

    const data = await response.json()
    return data.ok === true
  } catch (error) {
    console.error('❌ Error deleting telegram message:', error)
    return false
  }
}

/**
 * Send message via queue (for bulk operations)
 * Guaranteed delivery with retry mechanism
 */
export async function queueTelegramMessage(
  chatId: string | number,
  text: string,
  options: {
    keyboard?: any
    imageUrl?: string
    priority?: MessagePriority
    scheduledFor?: number
    metadata?: { type?: string; userId?: string; eventId?: string }
  } = {}
): Promise<string> {
  return await telegramQueue.queueMessage(chatId, text, options)
}

/**
 * Send bulk messages via queue
 */
export async function queueBulkMessages(
  messages: Array<{
    chatId: string | number
    text: string
    imageUrl?: string
    keyboard?: any
  }>,
  options: {
    priority?: MessagePriority
    batchId?: string
  } = {}
): Promise<string[]> {
  return await telegramQueue.queueBulkMessages(messages, options)
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  return await telegramQueue.getStats()
}

/**
 * Cleanup corrupted messages from queue
 */
export async function cleanupQueueCorrupted(): Promise<number> {
  return await telegramQueue.cleanupCorrupted()
}

/**
 * Edit a telegram message
 * @param chatId Chat ID
 * @param messageId Message ID to edit
 * @param text New message text
 * @param keyboard Optional keyboard
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  keyboard?: any
): Promise<any> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      throw new Error('Bot token not configured')
    }

    const url = `https://api.telegram.org/bot${botToken}/editMessageText`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true }
      })
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Message edit failed')
    }

    console.log(`✅ Telegram message edited: ${chatId}/${messageId}`)
    return data.result
  } catch (error) {
    console.error('❌ Error editing telegram message:', error)
    throw error
  }
}

/**
 * Answer a callback query
 * @param callbackQueryId Callback query ID
 * @param text Optional notification text
 * @param showAlert Show as alert popup (true) or toast (false)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<void> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      console.error('❌ Bot token not configured')
      return
    }

    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert
      })
    })
  } catch (error) {
    console.error('❌ Error answering callback query:', error)
  }
}

/**
 * Check if user is admin in a telegram chat
 * 🚀 OPTIMIZED: Memory cache ile Telegram API çağrılarını azaltır
 * @param chatId Chat ID
 * @param userId User ID
 * @returns True if user is admin or creator
 */
export async function checkTelegramAdmin(
  chatId: number,
  userId: number
): Promise<boolean> {
  const cacheKey = `${chatId}:${userId}`
  const now = Date.now()

  // 🚀 Cache kontrolü
  const cached = adminCache.get(cacheKey)
  if (cached && now - cached.timestamp < ADMIN_CACHE_TTL) {
    return cached.isAdmin
  }

  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      return false
    }

    const url = `https://api.telegram.org/bot${botToken}/getChatMember`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId
      })
    })

    const data = await response.json()

    let isAdmin = false
    if (data.ok) {
      const status = data.result.status
      isAdmin = status === 'creator' || status === 'administrator'
    }

    // 🚀 Cache'e kaydet
    adminCache.set(cacheKey, { isAdmin, timestamp: now })

    return isAdmin
  } catch (error) {
    console.error('❌ Error checking admin status:', error)
    return false
  }
}

/**
 * Check if user is member of required channels
 * @param channelIds Channel IDs (comma or newline separated)
 * @param userId User ID
 * @returns Membership status and missing channels
 */
export async function checkChannelMembership(
  channelIds: string,
  userId: number
): Promise<{ isMember: boolean; missingChannels: string[] }> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      return { isMember: false, missingChannels: [] }
    }

    // Parse channel IDs
    const channels = channelIds
      .split(/[,\n]/)
      .map(id => id.trim())
      .filter(id => id.length > 0)

    if (channels.length === 0) {
      return { isMember: true, missingChannels: [] }
    }

    const url = `https://api.telegram.org/bot${botToken}/getChatMember`
    const missingChannels: string[] = []

    // Check each channel
    for (const channelId of channels) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            user_id: userId
          })
        })

        const data = await response.json()

        if (!data.ok) {
          console.warn(`⚠️ Cannot check membership for channel ${channelId}:`, data.description)
          missingChannels.push(channelId)
          continue
        }

        const status = data.result.status

        // left = left channel, kicked = banned
        if (status === 'left' || status === 'kicked') {
          missingChannels.push(channelId)
        }
      } catch (error) {
        console.error(`❌ Error checking channel ${channelId}:`, error)
        missingChannels.push(channelId)
      }
    }

    return {
      isMember: missingChannels.length === 0,
      missingChannels
    }
  } catch (error) {
    console.error('❌ Error checking channel membership:', error)
    return { isMember: false, missingChannels: [] }
  }
}

/**
 * Pin a message in a chat
 * @param chatId Chat ID
 * @param messageId Message ID to pin
 */
export async function pinChatMessage(
  chatId: string | number,
  messageId: number
): Promise<void> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      throw new Error('Bot token not configured')
    }

    const url = `https://api.telegram.org/bot${botToken}/pinChatMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true
      })
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Pin message failed')
    }

    console.log(`✅ Message pinned: ${chatId}/${messageId}`)
  } catch (error) {
    console.error('❌ Error pinning message:', error)
    throw error
  }
}

/**
 * Unpin a message in a chat
 * @param chatId Chat ID
 * @param messageId Message ID to unpin
 */
export async function unpinChatMessage(
  chatId: string | number,
  messageId: number
): Promise<void> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      throw new Error('Bot token not configured')
    }

    const url = `https://api.telegram.org/bot${botToken}/unpinChatMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId
      })
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Unpin message failed')
    }

    console.log(`✅ Message unpinned: ${chatId}/${messageId}`)
  } catch (error) {
    console.error('❌ Error unpinning message:', error)
    throw error
  }
}

/**
 * Get chat information
 * @param chatId Chat ID
 * @returns Chat info or null
 */
export async function getChatInfo(chatId: string): Promise<{ title: string; username?: string } | null> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      return null
    }

    const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`

    const response = await fetch(url)
    const data = await response.json()

    if (!data.ok || !data.result) {
      return null
    }

    return {
      title: data.result.title || data.result.first_name || 'Unknown',
      username: data.result.username
    }
  } catch (error) {
    console.error('❌ Error getting chat info:', error)
    return null
  }
}

/**
 * Get group administrators
 * @param chatId Chat ID
 * @returns Array of admin users
 */
export async function getGroupAdmins(chatId: string): Promise<Array<{
  userId: number
  firstName: string
  lastName?: string
  telegramUsername?: string
}>> {
  try {
    const botToken = getTelegramBotToken()

    if (!botToken) {
      throw new Error('Bot token not configured')
    }

    const url = `https://api.telegram.org/bot${botToken}/getChatAdministrators?chat_id=${chatId}`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Failed to get admins')
    }

    interface TelegramAdmin {
      user: {
        id: number
        is_bot: boolean
        first_name: string
        last_name?: string
        username?: string
      }
    }

    const admins = (data.result as TelegramAdmin[])
      .filter((admin) => !admin.user.is_bot)
      .map((admin) => ({
        userId: admin.user.id,
        firstName: admin.user.first_name,
        lastName: admin.user.last_name,
        telegramUsername: admin.user.username
      }))

    console.log(`✅ Found ${admins.length} admins`)
    return admins
  } catch (error) {
    console.error('❌ Error getting group admins:', error)
    throw error
  }
}
