/**
 * 🚀 Rate Limiting System
 *
 * Protects APIs from abuse and DDoS attacks
 * Uses in-memory store (can be upgraded to Redis for distributed systems)
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup expired entries every 60 seconds
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 60000)
    }
  }

  /**
   * Check if request is allowed
   * @param key Unique identifier (IP, user ID, etc.)
   * @param limit Max requests allowed
   * @param windowMs Time window in milliseconds
   * @returns Object with allowed status and retry info
   */
  check(key: string, limit: number, windowMs: number): {
    allowed: boolean
    remaining: number
    resetAt: number
    retryAfter?: number
  } {
    const now = Date.now()
    const entry = this.store.get(key)

    // No entry or expired - create new
    if (!entry || now >= entry.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs
      })

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs
      }
    }

    // Entry exists and valid
    if (entry.count < limit) {
      entry.count++
      this.store.set(key, entry)

      return {
        allowed: true,
        remaining: limit - entry.count,
        resetAt: entry.resetAt
      }
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000) // seconds
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      entries: Array.from(this.store.entries()).map(([key, entry]) => ({
        key,
        count: entry.count,
        resetAt: new Date(entry.resetAt).toISOString()
      }))
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Rate limit presets
 */
export const RateLimitPresets = {
  // Very strict - for sensitive operations (login, register)
  STRICT: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },

  // Standard - for general API endpoints
  STANDARD: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },

  // Relaxed - for public endpoints
  RELAXED: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },

  // Wheel spin - prevent abuse
  WHEEL: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // Admin actions
  ADMIN: {
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
  }
} as const

/**
 * Get client identifier (IP address or user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try to get real IP from headers (Netlify, Vercel, Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'

  return `ip:${ip}`
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
      }
    }
  )
}
