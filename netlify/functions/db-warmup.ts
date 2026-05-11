import { schedule } from "@netlify/functions"
import { getPrisma, disconnectPrisma } from "./lib/prisma"

/**
 * 🚀 Neon Connection Warming
 * Her 30 dakikada bir basit query yaparak connection pool'u sıcak tutar
 * Cold start gecikmesini önler (~300-800ms kazanç)
 *
 * 🔧 OPTIMIZATION: 5 dakika -> 30 dakika (aylık ~7000 request tasarrufu)
 */

// Timeout helper with AbortController
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`))
    }, ms)

    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

const handler = schedule("*/30 * * * *", async () => {
  const startTime = Date.now()
  const prisma = getPrisma()

  try {
    // 5 second timeout for database query
    await withTimeout(
      prisma.$queryRaw`SELECT 1 as warmup`,
      5000
    )

    const duration = Date.now() - startTime
    console.log(`✅ Database connection warmed in ${duration}ms`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Database connection warmed',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ Database warmup failed after ${duration}ms:`, error)

    return {
      statusCode: 200, // Return 200 to prevent Netlify from marking as failed
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
    }
  } finally {
    await disconnectPrisma()
  }
})

export { handler }
