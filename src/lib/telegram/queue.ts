/**
 * 🚀 Telegram Message Queue System - SIMPLIFIED
 *
 * Basit yaklaşım: Mesaj gelir → Gönderilir → Silinir
 * - Redis-backed queue (sadece bekleyen mesajlar)
 * - Rate limiting (Telegram API: 30 msg/sec per bot)
 * - Processing set YOK - karmaşıklık yok
 */

import { getRedisClient } from './utils/redis-client'
import { getTelegramBotToken } from '../site-config'

// Queue Configuration - SIMPLIFIED
const QUEUE_CONFIG = {
  // Telegram API limits
  MESSAGES_PER_SECOND: 25,

  // Batch configuration
  BATCH_SIZE: 30,
  BATCH_DELAY_MS: 1100, // 1 saniye + buffer
  MESSAGE_DELAY_MS: 40, // Mesajlar arası delay

  // Queue key - SADECE BU
  QUEUE_KEY: 'telegram:queue:simple',
  STATS_KEY: 'telegram:stats:simple',
}

// Message Priority
export enum MessagePriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

// Simple Queue Message
export interface QueueMessage {
  id: string
  chatId: string | number
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  keyboard?: any
  imageUrl?: string
  priority: MessagePriority
  createdAt: number
  batchId?: string // For tracking broadcast messages
}

// Queue Statistics
export interface QueueStats {
  queued: number
  processing: number
  failed: number
  totalSent: number
  totalFailed: number
  lastProcessedAt: number
}

// Rate Limiter - Simple in-memory
class SimpleRateLimiter {
  private lastSendTime = 0
  private messageCount = 0

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastSendTime

    // Her saniye sayacı sıfırla
    if (elapsed >= 1000) {
      this.messageCount = 0
      this.lastSendTime = now
    }

    // Limit aşıldıysa bekle
    if (this.messageCount >= QUEUE_CONFIG.MESSAGES_PER_SECOND) {
      const waitTime = 1000 - elapsed + 50 // +50ms buffer
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.messageCount = 0
      this.lastSendTime = Date.now()
    }

    this.messageCount++
  }
}

// Main Queue Manager - SIMPLIFIED
class SimpleTelegramQueue {
  private rateLimiter = new SimpleRateLimiter()
  private processTimeout: NodeJS.Timeout | null = null

  private get redis() {
    return getRedisClient()
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Queue a single message
   */
  async queueMessage(
    chatId: string | number,
    text: string,
    options: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      keyboard?: any
      imageUrl?: string
      priority?: MessagePriority
    } = {}
  ): Promise<string> {
    const message: QueueMessage = {
      id: this.generateId(),
      chatId,
      text,
      parseMode: options.parseMode || 'HTML',
      keyboard: options.keyboard,
      imageUrl: options.imageUrl,
      priority: options.priority || MessagePriority.NORMAL,
      createdAt: Date.now(),
    }

    await this.enqueue(message)
    console.log(`📬 Queued: ${message.id} to ${chatId}`)

    // Trigger processing
    this.scheduleProcessing()

    return message.id
  }

  /**
   * Queue multiple messages (for broadcasts)
   */
  async queueBulkMessages(
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
    const queueMessages: QueueMessage[] = messages.map(msg => ({
      id: this.generateId(),
      chatId: msg.chatId,
      text: msg.text,
      parseMode: 'HTML' as const,
      keyboard: msg.keyboard,
      imageUrl: msg.imageUrl,
      priority: options.priority || MessagePriority.LOW,
      createdAt: Date.now(),
      batchId: options.batchId, // Include batch ID for tracking
    }))

    // Batch enqueue
    for (const msg of queueMessages) {
      await this.enqueue(msg)
    }

    console.log(`📬 Bulk queued: ${messages.length} messages`)

    // Trigger processing
    this.scheduleProcessing()

    return queueMessages.map(m => m.id)
  }

  /**
   * Send a message directly (bypass queue)
   */
  async sendDirect(
    chatId: string | number,
    text: string,
    options: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
      keyboard?: any
      imageUrl?: string
    } = {}
  ): Promise<any> {
    await this.rateLimiter.waitIfNeeded()
    return await this.sendMessage({
      id: this.generateId(),
      chatId,
      text,
      parseMode: options.parseMode || 'HTML',
      keyboard: options.keyboard,
      imageUrl: options.imageUrl,
      priority: MessagePriority.HIGH,
      createdAt: Date.now(),
    })
  }

  /**
   * Add message to queue
   */
  private async enqueue(message: QueueMessage): Promise<void> {
    if (!this.redis) {
      // Redis yoksa hata fırlat - broadcast sistemi Redis gerektirir
      console.error('❌ Redis not configured - cannot queue message')
      throw new Error('Redis not configured - queue system requires Redis')
    }

    const score = message.priority * 1000000000000 + message.createdAt
    await this.redis.zadd(QUEUE_CONFIG.QUEUE_KEY, { score, member: JSON.stringify(message) })
  }

  /**
   * Schedule processing - Triggers the queue processor API
   */
  private scheduleProcessing(): void {
    if (this.processTimeout) return

    // Use fire-and-forget pattern to trigger queue processing API
    this.processTimeout = setTimeout(() => {
      this.processTimeout = null
      this.triggerQueueProcessor()
    }, 50)
  }

  /**
   * Trigger queue processor API (fire-and-forget)
   */
  private async triggerQueueProcessor(): Promise<void> {
    try {
      // Try multiple URL sources
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                      process.env.NEXT_PUBLIC_SITE_URL ||
                      process.env.URL ||
                      ''

      if (!baseUrl) {
        console.log('⚠️ No base URL configured - messages will stay in queue until API processes them')
        return
      }

      console.log(`🔗 Triggering queue processor at: ${baseUrl}/api/telegram/process-queue`)

      const secret = process.env.QUEUE_PROCESS_SECRET || 'queue-process-internal'

      // Fire and forget - don't await
      fetch(`${baseUrl}/api/telegram/process-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-queue-secret': secret,
        },
      }).then(res => {
        console.log(`🚀 Queue processor triggered: ${res.status}`)
      }).catch(err => {
        console.log('⚠️ Queue processor trigger failed - messages will stay in queue:', err.message)
      })
    } catch (error) {
      console.log('⚠️ Failed to trigger queue processor - messages will stay in queue')
    }
  }

  // NOT: processQueue() metodu kaldırıldı
  // Tüm kuyruk işleme /api/telegram/process-queue API endpoint'i üzerinden yapılır
  // Bu sayede BroadcastRecipient ve BroadcastHistory güncellemeleri tutarlı şekilde yapılır

  /**
   * Send message to Telegram
   */
  private async sendMessage(message: QueueMessage): Promise<any> {
    const botToken = getTelegramBotToken()
    if (!botToken) throw new Error('Bot token not configured')

    console.log(`📨 Sending to ${message.chatId}: ${message.text.substring(0, 30)}... (hasImage: ${!!message.imageUrl})`)

    const baseUrl = `https://api.telegram.org/bot${botToken}`

    if (message.imageUrl) {
      // Send photo
      const response = await fetch(`${baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chatId,
          photo: message.imageUrl,
          caption: message.text,
          parse_mode: message.parseMode,
          reply_markup: message.keyboard,
        }),
      })

      const data = await response.json()
      console.log(`📬 Telegram response:`, data.ok ? 'OK' : data.description)
      if (!data.ok) throw new Error(data.description || 'Photo send failed')
      return data.result
    } else {
      // Send text
      const response = await fetch(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: message.parseMode,
          reply_markup: message.keyboard,
          link_preview_options: { is_disabled: true },
        }),
      })

      const data = await response.json()
      console.log(`📬 Telegram response:`, data.ok ? 'OK' : data.description)
      if (!data.ok) throw new Error(data.description || 'Message send failed')
      return data.result
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    if (!this.redis) {
      return {
        queued: 0,
        processing: 0,
        failed: 0,
        totalSent: 0,
        totalFailed: 0,
        lastProcessedAt: 0,
      }
    }

    const [queued, stats] = await Promise.all([
      this.redis.zcard(QUEUE_CONFIG.QUEUE_KEY),
      this.redis.hgetall(QUEUE_CONFIG.STATS_KEY),
    ])

    return {
      queued: queued || 0,
      processing: 0, // No processing set anymore
      failed: 0, // No failed queue anymore
      totalSent: Number(stats?.totalSent) || 0,
      totalFailed: Number(stats?.totalFailed) || 0,
      lastProcessedAt: Number(stats?.lastProcessedAt) || 0,
    }
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    if (!this.redis) return 0
    return await this.redis.zcard(QUEUE_CONFIG.QUEUE_KEY) || 0
  }

  /**
   * Clear the queue completely
   */
  async clearQueue(): Promise<void> {
    if (!this.redis) return

    // Delete all queue-related keys
    await Promise.all([
      this.redis.del(QUEUE_CONFIG.QUEUE_KEY),
      this.redis.del(QUEUE_CONFIG.STATS_KEY),
      // Also clean old keys from previous system
      this.redis.del('telegram:message:queue'),
      this.redis.del('telegram:message:processing'),
      this.redis.del('telegram:message:failed'),
      this.redis.del('telegram:message:stats'),
    ])

    console.log('🗑️ Queue cleared completely')
  }

  /**
   * Cleanup old/corrupted data (for migration from old system)
   */
  async cleanupCorrupted(): Promise<number> {
    if (!this.redis) return 0

    let removedCount = 0

    // Clean old system keys
    const oldKeys = [
      'telegram:message:queue',
      'telegram:message:processing',
      'telegram:message:failed',
      'telegram:message:stats',
    ]

    for (const key of oldKeys) {
      try {
        const deleted = await this.redis.del(key)
        if (deleted) {
          console.log(`🗑️ Deleted old key: ${key}`)
          removedCount++
        }
      } catch (e) {
        console.error(`Failed to delete ${key}:`, e)
      }
    }

    // Clean corrupted messages from new queue
    try {
      const results = await this.redis.zrange(QUEUE_CONFIG.QUEUE_KEY, 0, -1)
      const toRemove: string[] = []

      for (const item of results) {
        const rawStr = typeof item === 'string' ? item : JSON.stringify(item)
        try {
          if (rawStr === '[object Object]' || rawStr.startsWith('[object')) {
            toRemove.push(rawStr)
            continue
          }
          const parsed = JSON.parse(rawStr)
          if (!parsed.id || !parsed.chatId) {
            toRemove.push(rawStr)
          }
        } catch {
          toRemove.push(rawStr)
        }
      }

      if (toRemove.length > 0) {
        await this.redis.zrem(QUEUE_CONFIG.QUEUE_KEY, ...toRemove)
        console.log(`🗑️ Removed ${toRemove.length} corrupted messages`)
        removedCount += toRemove.length
      }
    } catch (e) {
      console.error('Error cleaning corrupted messages:', e)
    }

    return removedCount
  }
}

// Singleton instance
export const telegramQueue = new SimpleTelegramQueue()
