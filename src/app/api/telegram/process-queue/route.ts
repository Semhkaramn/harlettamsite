import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/telegram/utils/redis-client'
import { getTelegramBotToken } from '@/lib/site-config'
import { prisma } from '@/lib/prisma'

const QUEUE_CONFIG = {
  MESSAGES_PER_SECOND: 25,
  BATCH_SIZE: 30,
  MESSAGE_DELAY_MS: 40,
  QUEUE_KEY: 'telegram:queue:simple',
  STATS_KEY: 'telegram:stats:simple',
  LOCK_KEY: 'telegram:queue:lock', // Distributed lock key
  LOCK_TTL: 30, // Lock timeout in seconds
}

interface QueueMessage {
  id: string
  chatId: string | number
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  keyboard?: any
  imageUrl?: string
  priority: number
  createdAt: number
  batchId?: string // Batch ID for tracking
}

// Simple rate limiter
let lastSendTime = 0
let messageCount = 0

async function waitIfNeeded(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastSendTime

  if (elapsed >= 1000) {
    messageCount = 0
    lastSendTime = now
  }

  if (messageCount >= QUEUE_CONFIG.MESSAGES_PER_SECOND) {
    const waitTime = 1000 - elapsed + 50
    await new Promise(resolve => setTimeout(resolve, waitTime))
    messageCount = 0
    lastSendTime = Date.now()
  }

  messageCount++
}

async function sendMessage(message: QueueMessage): Promise<{ success: boolean; error?: string }> {
  const botToken = getTelegramBotToken()
  if (!botToken) throw new Error('Bot token not configured')

  console.log(`📨 Sending to ${message.chatId}: ${message.text.substring(0, 30)}...`)

  const baseUrl = `https://api.telegram.org/bot${botToken}`

  try {
    if (message.imageUrl) {
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
      if (!data.ok) {
        return { success: false, error: data.description || 'Photo send failed' }
      }
      return { success: true }
    } else {
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
      if (!data.ok) {
        return { success: false, error: data.description || 'Message send failed' }
      }
      return { success: true }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

// Acquire distributed lock
async function acquireLock(redis: any): Promise<boolean> {
  const lockValue = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Try to set lock with NX (only if not exists) and EX (expiry)
  const result = await redis.set(QUEUE_CONFIG.LOCK_KEY, lockValue, {
    nx: true, // Only set if not exists
    ex: QUEUE_CONFIG.LOCK_TTL, // Expire after TTL seconds
  })

  return result === 'OK'
}

// Release distributed lock
async function releaseLock(redis: any): Promise<void> {
  await redis.del(QUEUE_CONFIG.LOCK_KEY)
}

// Extend lock TTL
async function extendLock(redis: any): Promise<void> {
  await redis.expire(QUEUE_CONFIG.LOCK_KEY, QUEUE_CONFIG.LOCK_TTL)
}

// Update broadcast history stats
async function updateBroadcastStats(batchId: string, sentDelta: number, failedDelta: number): Promise<void> {
  try {
    const broadcast = await prisma.broadcastHistory.findUnique({
      where: { batchId }
    })

    if (broadcast) {
      const newSent = broadcast.sentCount + sentDelta
      const newFailed = broadcast.failedCount + failedDelta
      const isCompleted = (newSent + newFailed) >= broadcast.queuedCount

      await prisma.broadcastHistory.update({
        where: { batchId },
        data: {
          sentCount: newSent,
          failedCount: newFailed,
          status: isCompleted ? 'completed' : 'processing',
          completedAt: isCompleted ? new Date() : undefined,
        }
      })
    }
  } catch (error) {
    console.error('Failed to update broadcast stats:', error)
  }
}

// Update broadcast recipient status
async function updateRecipientStatus(
  batchId: string,
  chatId: string | number,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    // Find broadcast by batchId
    const broadcast = await prisma.broadcastHistory.findUnique({
      where: { batchId }
    })

    if (!broadcast) return

    // Update recipient status
    await prisma.broadcastRecipient.updateMany({
      where: {
        broadcastId: broadcast.id,
        telegramId: String(chatId),
        status: 'pending'
      },
      data: {
        status,
        errorMessage: errorMessage || null,
        failureReason: status === 'failed' ? getFailureReason(errorMessage || '') : null,
        sentAt: status === 'sent' ? new Date() : null
      }
    })
  } catch (error) {
    console.error('Failed to update recipient status:', error)
  }
}

// Get failure reason from error message
function getFailureReason(errorMessage: string): string {
  const lowerMsg = errorMessage.toLowerCase()
  if (lowerMsg.includes('blocked') || lowerMsg.includes('bot was blocked')) {
    return 'blocked_bot'
  }
  if (lowerMsg.includes('deactivated') || lowerMsg.includes('user is deactivated')) {
    return 'user_deactivated'
  }
  if (lowerMsg.includes('not found') || lowerMsg.includes('chat not found')) {
    return 'chat_not_found'
  }
  if (lowerMsg.includes('too many requests') || lowerMsg.includes('retry after')) {
    return 'too_many_requests'
  }
  if (lowerMsg.includes('forbidden')) {
    return 'blocked_bot'
  }
  return 'unknown'
}

export async function POST(request: NextRequest) {
  // Optional: Add a secret key check for security
  const authHeader = request.headers.get('x-queue-secret')
  const expectedSecret = process.env.QUEUE_PROCESS_SECRET || 'queue-process-internal'

  if (authHeader !== expectedSecret) {
    console.log('⚠️ Queue process called without auth, continuing anyway...')
  }

  const redis = getRedisClient()
  if (!redis) {
    // Redis not configured - this is not an error, just skip processing
    console.log('⚠️ Redis not configured, skipping queue processing')
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Redis not configured',
      processed: 0,
      failed: 0,
      remaining: 0
    })
  }

  // 🚀 OPTIMIZATION: Kuyruk boşsa lock alma, direkt dön
  const queueSize = await redis.zcard(QUEUE_CONFIG.QUEUE_KEY)
  if (!queueSize || queueSize === 0) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Queue is empty',
      remaining: 0
    })
  }

  // Try to acquire distributed lock
  const lockAcquired = await acquireLock(redis)
  if (!lockAcquired) {
    console.log('🔒 Another worker is processing the queue, skipping...')
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Another worker is processing'
    })
  }

  console.log(`🚀 Lock acquired, processing ${queueSize} messages...`)

  let processedCount = 0
  let failedCount = 0
  const startTime = Date.now()
  const MAX_DURATION = 25000 // 25 seconds max (Netlify has 26s timeout)

  // Track batch stats for updating broadcast history
  const batchStats: Record<string, { sent: number; failed: number }> = {}

  try {
    while (Date.now() - startTime < MAX_DURATION) {
      // Extend lock periodically
      if (Date.now() - startTime > 5000) {
        await extendLock(redis)
      }

      // Get batch of messages
      const results = await redis.zrange(QUEUE_CONFIG.QUEUE_KEY, 0, QUEUE_CONFIG.BATCH_SIZE - 1)

      if (!results || results.length === 0) {
        console.log('📭 Queue empty')
        break
      }

      console.log(`📋 Got ${results.length} messages from queue`)

      // Parse messages
      const messages: { msg: QueueMessage; raw: string }[] = []

      for (const item of results) {
        let rawStr: string

        if (typeof item === 'string') {
          rawStr = item
        } else if (typeof item === 'object' && item !== null) {
          const obj = item as any
          if (obj.value) {
            rawStr = typeof obj.value === 'string' ? obj.value : JSON.stringify(obj.value)
          } else if (obj.id && obj.chatId) {
            messages.push({ msg: obj as QueueMessage, raw: JSON.stringify(obj) })
            continue
          } else {
            rawStr = JSON.stringify(item)
          }
        } else {
          continue
        }

        if (rawStr === '[object Object]' || rawStr.startsWith('[object')) {
          await redis.zrem(QUEUE_CONFIG.QUEUE_KEY, rawStr)
          continue
        }

        try {
          const msg = JSON.parse(rawStr) as QueueMessage
          if (msg.id && msg.chatId) {
            messages.push({ msg, raw: rawStr })
          }
        } catch {
          await redis.zrem(QUEUE_CONFIG.QUEUE_KEY, rawStr)
        }
      }

      if (messages.length === 0) {
        break
      }

      // Process messages
      for (const { msg, raw } of messages) {
        try {
          await waitIfNeeded()
          const result = await sendMessage(msg)
          await redis.zrem(QUEUE_CONFIG.QUEUE_KEY, raw)

          if (result.success) {
            await redis.hincrby(QUEUE_CONFIG.STATS_KEY, 'totalSent', 1)
            processedCount++
            console.log(`✅ Sent: ${msg.id}`)

            // Track batch stats
            if (msg.batchId) {
              if (!batchStats[msg.batchId]) {
                batchStats[msg.batchId] = { sent: 0, failed: 0 }
              }
              batchStats[msg.batchId].sent++

              // Update recipient status in database
              await updateRecipientStatus(msg.batchId, msg.chatId, 'sent')
            }
          } else {
            await redis.hincrby(QUEUE_CONFIG.STATS_KEY, 'totalFailed', 1)
            failedCount++
            console.log(`❌ Failed: ${msg.id} - ${result.error}`)

            // Track batch stats
            if (msg.batchId) {
              if (!batchStats[msg.batchId]) {
                batchStats[msg.batchId] = { sent: 0, failed: 0 }
              }
              batchStats[msg.batchId].failed++

              // Update recipient status in database
              await updateRecipientStatus(msg.batchId, msg.chatId, 'failed', result.error)
            }
          }

          await new Promise(resolve => setTimeout(resolve, QUEUE_CONFIG.MESSAGE_DELAY_MS))
        } catch (error: any) {
          console.error(`❌ Failed: ${msg.id}`, error?.message)
          await redis.zrem(QUEUE_CONFIG.QUEUE_KEY, raw)
          await redis.hincrby(QUEUE_CONFIG.STATS_KEY, 'totalFailed', 1)
          failedCount++

          // Track batch stats
          if (msg.batchId) {
            if (!batchStats[msg.batchId]) {
              batchStats[msg.batchId] = { sent: 0, failed: 0 }
            }
            batchStats[msg.batchId].failed++

            // Update recipient status in database
            await updateRecipientStatus(msg.batchId, msg.chatId, 'failed', error?.message)
          }
        }
      }
    }

    // Check remaining queue size
    const remaining = await redis.zcard(QUEUE_CONFIG.QUEUE_KEY)

    // 🚀 OPTIMIZATION: Sadece mesaj işlendiyse stats güncelle
    if (processedCount > 0 || failedCount > 0) {
      await redis.hset(QUEUE_CONFIG.STATS_KEY, { lastProcessedAt: Date.now() })
    }

    // Update broadcast history stats
    for (const [batchId, stats] of Object.entries(batchStats)) {
      await updateBroadcastStats(batchId, stats.sent, stats.failed)
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      failed: failedCount,
      remaining: remaining || 0,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Queue processing error:', error)
    return NextResponse.json({ error: 'Processing failed', processed: processedCount }, { status: 500 })
  } finally {
    // Always release lock
    await releaseLock(redis)
    console.log('🔓 Lock released')
  }
}

export async function GET() {
  const redis = getRedisClient()
  if (!redis) {
    return NextResponse.json({ queued: 0, error: 'Redis not configured' })
  }

  const [queued, stats, isLocked] = await Promise.all([
    redis.zcard(QUEUE_CONFIG.QUEUE_KEY),
    redis.hgetall(QUEUE_CONFIG.STATS_KEY),
    redis.exists(QUEUE_CONFIG.LOCK_KEY),
  ])

  return NextResponse.json({
    queued: queued || 0,
    totalSent: Number(stats?.totalSent) || 0,
    totalFailed: Number(stats?.totalFailed) || 0,
    lastProcessedAt: Number(stats?.lastProcessedAt) || 0,
    isProcessing: isLocked === 1,
  })
}
