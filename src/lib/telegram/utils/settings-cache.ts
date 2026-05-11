import { getRedisClient } from './redis-client'
import { prisma } from '@/lib/prisma'

const SETTINGS_CACHE_KEY = 'settings:all'
const SETTINGS_TTL = 3600 // 1 saat
const MEMORY_CACHE_TTL = 300000 // 5 dakika (ms)

// 🚀 OPTIMIZATION: In-memory cache layer (faster than Redis)
let memoryCache: Record<string, string> | null = null
let memoryCacheTimestamp: number = 0

/**
 * Ayarları getir (3-layer cache: Memory → Redis → DB)
 * @returns Settings map (key -> value)
 */
export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now()

  // 🚀 LAYER 1: In-memory cache (ultra fast, no network)
  if (memoryCache && (now - memoryCacheTimestamp) < MEMORY_CACHE_TTL) {
    console.log('⚡ Settings from memory cache (0ms)')
    return memoryCache
  }

  const redis = getRedisClient()

  try {
    // 🚀 LAYER 2: Redis cache (fast, network call)
    if (redis) {
      const cached = await redis.get<Record<string, string>>(SETTINGS_CACHE_KEY)

      if (cached) {
        console.log('✅ Settings from Redis cache (~5ms)')
        // Update memory cache
        memoryCache = cached
        memoryCacheTimestamp = now
        return cached
      }
    }

    // 🚀 LAYER 3: Database (slow, last resort)
    console.log('🔄 Settings from database (~50ms)')
    const settings = await prisma.settings.findMany()
    const settingsMap = settings.reduce(
      (acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }),
      {}
    )

    // Update both caches
    memoryCache = settingsMap
    memoryCacheTimestamp = now

    if (redis) {
      await redis.set(SETTINGS_CACHE_KEY, settingsMap, { ex: SETTINGS_TTL })
    }

    return settingsMap
  } catch (error) {
    console.error('Settings fetch error:', error)

    // Fallback: DB'den getir (cache olmadan)
    const settings = await prisma.settings.findMany()
    return settings.reduce(
      (acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }),
      {}
    )
  }
}

/**
 * Tek bir ayarı getir
 * @param key Setting key
 * @param defaultValue Default değer (key yoksa)
 * @returns Setting value
 */
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const settings = await getSettings()
  return settings[key] || defaultValue
}

/**
 * Settings cache'i temizle (admin panel'den setting değiştiğinde çağrılır)
 */
export async function invalidateSettingsCache(): Promise<void> {
  // Clear memory cache
  memoryCache = null
  memoryCacheTimestamp = 0

  const redis = getRedisClient()

  if (!redis) {
    return
  }

  try {
    await redis.del(SETTINGS_CACHE_KEY)
    console.log('✅ Settings cache invalidated (both memory and Redis)')
  } catch (error) {
    console.error('Settings cache invalidation error:', error)
  }
}
