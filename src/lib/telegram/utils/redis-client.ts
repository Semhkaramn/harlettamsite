import { Redis } from '@upstash/redis'

// Redis client singleton
let redisClient: Redis | null = null

export function getRedisClient(): Redis | null {
  // Redis devre dışı bırakılabilir (env var yoksa)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️ Redis credentials not found. Running without Redis cache.')
    return null
  }

  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
      console.log('✅ Redis client initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error)
      return null
    }
  }

  return redisClient
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false

  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('❌ Redis health check failed:', error)
    return false
  }
}
