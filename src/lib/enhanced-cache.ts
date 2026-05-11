/**
 * 🚀 Enhanced Cache System
 * Gelişmiş cache yönetimi - Redis'e kolay geçiş için hazır
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[] // Cache invalidation için tag'ler
}

/**
 * Cache stratejileri
 */
export enum CacheStrategy {
  /** Sadece cache'te yoksa DB'den çek */
  CACHE_FIRST = 'cache-first',
  /** Her zaman DB'den çek, cache'i güncelle */
  NETWORK_FIRST = 'network-first',
  /** Cache varsa onu kullan, arka planda güncelle */
  STALE_WHILE_REVALIDATE = 'stale-while-revalidate'
}

/**
 * Cache TTL presets (saniye)
 */
export const CacheTTL = {
  SHORT: 60,           // 1 dakika
  MEDIUM: 300,         // 5 dakika
  LONG: 1800,          // 30 dakika
  VERY_LONG: 3600,     // 1 saat
  DAY: 86400,          // 24 saat
} as const

class EnhancedCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private tagIndex = new Map<string, Set<string>>() // Tag -> Keys mapping

  /**
   * Cache'e veri ekle
   */
  set<T>(
    key: string,
    data: T,
    ttlSeconds: number = CacheTTL.MEDIUM,
    tags: string[] = []
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      tags
    })

    // Tag index'i güncelle
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)?.add(key)
    }
  }

  /**
   * Cache'ten veri oku
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) return null

    // TTL kontrolü
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Cache'te var mı ve geçerli mi kontrol et
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Belirli bir key'i sil
   */
  delete(key: string): void {
    const entry = this.cache.get(key)

    if (entry) {
      // Tag index'ten de sil
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key)
      }
    }

    this.cache.delete(key)
  }

  /**
   * Tag'e göre cache'i sil
   */
  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag)

    if (keys) {
      for (const key of keys) {
        this.cache.delete(key)
      }
      this.tagIndex.delete(tag)
    }
  }

  /**
   * Tüm cache'i temizle
   */
  clear(): void {
    this.cache.clear()
    this.tagIndex.clear()
  }

  /**
   * Süresi dolmuş entry'leri temizle
   */
  cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key)
      }
    }
  }

  /**
   * Cache istatistikleri
   */
  getStats() {
    let validEntries = 0
    let expiredEntries = 0
    const now = Date.now()

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      tags: this.tagIndex.size
    }
  }
}

// Singleton instance
export const enhancedCache = new EnhancedCache()

// Otomatik cleanup (5 dakikada bir)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    enhancedCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Cache helper with automatic fetching
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    strategy?: CacheStrategy
  } = {}
): Promise<T> {
  const {
    ttl = CacheTTL.MEDIUM,
    tags = [],
    strategy = CacheStrategy.CACHE_FIRST
  } = options

  // CACHE_FIRST: Cache'te varsa onu döndür
  if (strategy === CacheStrategy.CACHE_FIRST) {
    const cached = enhancedCache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    enhancedCache.set(key, data, ttl, tags)
    return data
  }

  // NETWORK_FIRST: Her zaman yeni veriyi çek
  if (strategy === CacheStrategy.NETWORK_FIRST) {
    const data = await fetcher()
    enhancedCache.set(key, data, ttl, tags)
    return data
  }

  // STALE_WHILE_REVALIDATE: Cache'i döndür, arka planda güncelle
  if (strategy === CacheStrategy.STALE_WHILE_REVALIDATE) {
    const cached = enhancedCache.get<T>(key)

    // Arka planda güncelle
    fetcher().then(data => {
      enhancedCache.set(key, data, ttl, tags)
    }).catch(console.error)

    // Cache varsa onu döndür
    if (cached !== null) {
      return cached
    }

    // Cache yoksa bekle
    const data = await fetcher()
    enhancedCache.set(key, data, ttl, tags)
    return data
  }

  // Fallback
  const data = await fetcher()
  enhancedCache.set(key, data, ttl, tags)
  return data
}

/**
 * Specialized cache helpers
 */

export const CacheKeys = {
  USER: (userId: string) => `user:${userId}`,
  USER_STATS: (userId: string) => `user:${userId}:stats`,
  LEADERBOARD: (type: string) => `leaderboard:${type}`,
  SPONSORS: () => 'sponsors:all',
  SETTINGS: (key: string) => `settings:${key}`,
  WHEEL_PRIZES: () => 'wheel:prizes',
  WHEEL_WINNERS: () => 'wheel:winners',
  TASKS: () => 'tasks:all',
  SHOP_ITEMS: () => 'shop:items',
  SOCIAL_MEDIA: () => 'social:all',
} as const

export const CacheTags = {
  USER: 'user',
  LEADERBOARD: 'leaderboard',
  SPONSORS: 'sponsors',
  SETTINGS: 'settings',
  WHEEL: 'wheel',
  TASKS: 'tasks',
  SHOP: 'shop',
  SOCIAL: 'social',
  EVENTS: 'events',
} as const

/**
 * Throttle yönetimi için state
 */
let lastLeaderboardInvalidation = 0
const LEADERBOARD_INVALIDATION_THROTTLE = 5 * 60 * 1000 // 5 dakika

/**
 * Invalidation helpers
 */
export const invalidateCache = {
  user: (userId: string) => {
    enhancedCache.delete(CacheKeys.USER(userId))
    enhancedCache.delete(CacheKeys.USER_STATS(userId))
    enhancedCache.invalidateByTag(CacheTags.LEADERBOARD) // Leaderboard etkilenir
  },

  leaderboard: () => {
    enhancedCache.invalidateByTag(CacheTags.LEADERBOARD)
  },

  /**
   * Leaderboard cache'i throttled invalidate eder (performans için)
   * 5 dakikada bir invalidate eder - arada puan değişimleri birikerek toplu invalidate olur
   */
  leaderboardThrottled: () => {
    const now = Date.now()

    // Son invalidation'dan 5 dakika geçmediyse skip et
    if (now - lastLeaderboardInvalidation < LEADERBOARD_INVALIDATION_THROTTLE) {
      return
    }

    lastLeaderboardInvalidation = now
    enhancedCache.invalidateByTag(CacheTags.LEADERBOARD)

    console.log('🔄 Leaderboard cache invalidated (throttled)')
  },

  sponsors: () => {
    enhancedCache.invalidateByTag(CacheTags.SPONSORS)
  },

  wheel: () => {
    enhancedCache.invalidateByTag(CacheTags.WHEEL)
  },

  shop: () => {
    enhancedCache.invalidateByTag(CacheTags.SHOP)
  },

  tasks: () => {
    enhancedCache.invalidateByTag(CacheTags.TASKS)
  },

  social: () => {
    enhancedCache.invalidateByTag(CacheTags.SOCIAL)
  },

  events: () => {
    enhancedCache.invalidateByTag(CacheTags.EVENTS)
  },

  /**
   * Settings cache'i temizle (hem enhanced cache hem telegram cache)
   */
  settings: async () => {
    enhancedCache.invalidateByTag(CacheTags.SETTINGS)

    // Telegram settings cache'ini de temizle
    try {
      const { invalidateSettingsCache: invalidateTelegramCache } =
        await import('@/lib/telegram/utils/settings-cache')
      await invalidateTelegramCache()
    } catch (error) {
      console.error('Telegram settings cache invalidation error:', error)
    }
  },

  all: () => {
    enhancedCache.clear()
  }
} as const

/**
 * Helper functions - backward compatibility için
 */

// Settings cache helpers
export async function getCachedSettings(
  fetcher: () => Promise<any>,
  ttlSeconds: number = 3600
): Promise<any> {
  return getCachedData(
    'app_settings',
    fetcher,
    { ttl: ttlSeconds, tags: [CacheTags.SETTINGS] }
  )
}

export async function invalidateSettingsCache(): Promise<void> {
  await invalidateCache.settings()
}

// User profile photo cache
export async function getCachedUserPhoto(
  userId: string,
  fetcher: () => Promise<string | null>,
  ttlSeconds: number = 86400
): Promise<string | null> {
  return getCachedData(
    CacheKeys.USER(userId),
    fetcher,
    { ttl: ttlSeconds, tags: [CacheTags.USER] }
  )
}

export function invalidateUserPhotoCache(userId: string): void {
  enhancedCache.delete(CacheKeys.USER(userId))
}

// Leaderboard cache
export async function getCachedLeaderboard(
  sortBy: string,
  fetcher: () => Promise<any>,
  ttlSeconds: number = 300
): Promise<any> {
  return getCachedData(
    CacheKeys.LEADERBOARD(sortBy),
    fetcher,
    { ttl: ttlSeconds, tags: [CacheTags.LEADERBOARD] }
  )
}

export function invalidateLeaderboardCache(): void {
  invalidateCache.leaderboard()
}

export function invalidateLeaderboardCacheThrottled(): void {
  invalidateCache.leaderboardThrottled()
}
