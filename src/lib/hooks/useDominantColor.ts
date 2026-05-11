import { useState, useEffect, useRef } from 'react'

interface RGB {
  r: number
  g: number
  b: number
}

interface ColorResult {
  hex: string
  rgb: RGB
  isDark: boolean
}

// Rengin beyaz veya siyaha yakın olup olmadığını kontrol et
function isNeutralColor(r: number, g: number, b: number, threshold: number = 40): boolean {
  // Beyaza yakın mı? (tüm değerler yüksek ve birbirine yakın)
  const isWhitish = r > 200 && g > 200 && b > 200

  // Siyaha yakın mı? (tüm değerler düşük)
  const isBlackish = r < 50 && g < 50 && b < 50

  // Gri mi? (tüm değerler birbirine çok yakın)
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))
  const isGrayish = maxDiff < threshold && ((r + g + b) / 3 > 180 || (r + g + b) / 3 < 70)

  return isWhitish || isBlackish || isGrayish
}

// Rengin ne kadar "renkli" olduğunu hesapla (saturation benzeri)
function getColorfulness(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  // Yüksek fark = daha renkli
  // Orta parlaklık = daha belirgin
  const brightness = (r + g + b) / 3
  const brightnessBonus = brightness > 60 && brightness < 200 ? 1.2 : 1

  return diff * brightnessBonus
}

// RGB'yi HEX'e çevir
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Rengin koyu mu açık mı olduğunu belirle
function isColorDark(r: number, g: number, b: number): boolean {
  // Luminance hesaplama
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

// Resimden dominant rengi çıkar
async function extractDominantColor(imageUrl: string): Promise<ColorResult | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(null)
          return
        }

        // Küçük boyutta analiz et (performans için)
        const sampleSize = 50
        canvas.width = sampleSize
        canvas.height = sampleSize

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
        const pixels = imageData.data

        // Renk frekanslarını topla
        const colorCounts: Map<string, { count: number; r: number; g: number; b: number; colorfulness: number }> = new Map()

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]

          // Şeffaf pikselleri atla
          if (a < 128) continue

          // Nötr renkleri (beyaz, siyah, gri) atla
          if (isNeutralColor(r, g, b)) continue

          // Renkleri grupla (yakın renkleri birleştir)
          const groupedR = Math.round(r / 20) * 20
          const groupedG = Math.round(g / 20) * 20
          const groupedB = Math.round(b / 20) * 20

          const key = `${groupedR}-${groupedG}-${groupedB}`
          const colorfulness = getColorfulness(r, g, b)

          const existing = colorCounts.get(key)
          if (existing) {
            existing.count++
            // Ortalama rengi güncelle
            existing.r = Math.round((existing.r * (existing.count - 1) + r) / existing.count)
            existing.g = Math.round((existing.g * (existing.count - 1) + g) / existing.count)
            existing.b = Math.round((existing.b * (existing.count - 1) + b) / existing.count)
            existing.colorfulness = Math.max(existing.colorfulness, colorfulness)
          } else {
            colorCounts.set(key, { count: 1, r, g, b, colorfulness })
          }
        }

        // En belirgin rengi bul (frekans + renk canlılığı)
        let bestColor: RGB | null = null
        let bestScore = 0

        colorCounts.forEach((data) => {
          // Skor = frekans * renk canlılığı
          const score = data.count * (data.colorfulness / 100 + 0.5)

          if (score > bestScore) {
            bestScore = score
            bestColor = { r: data.r, g: data.g, b: data.b }
          }
        })

        const finalColor = bestColor as RGB | null
        if (finalColor) {
          resolve({
            hex: rgbToHex(finalColor.r, finalColor.g, finalColor.b),
            rgb: finalColor,
            isDark: isColorDark(finalColor.r, finalColor.g, finalColor.b)
          })
        } else {
          resolve(null)
        }
      } catch (error) {
        console.error('Error extracting color:', error)
        resolve(null)
      }
    }

    img.onerror = () => {
      resolve(null)
    }

    img.src = imageUrl
  })
}

// Cache for extracted colors (in-memory)
const colorCache = new Map<string, ColorResult | null>()

// localStorage cache key
const STORAGE_CACHE_KEY = 'dominant-colors-cache'
const STORAGE_CACHE_VERSION = 'v1'

// localStorage'dan cache'i yükle (sadece bir kez)
let storageLoaded = false
function loadStorageCache(): void {
  if (storageLoaded || typeof window === 'undefined') return
  storageLoaded = true

  try {
    const stored = localStorage.getItem(STORAGE_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Versiyon kontrolü
      if (parsed.version === STORAGE_CACHE_VERSION && parsed.colors) {
        Object.entries(parsed.colors).forEach(([key, value]) => {
          colorCache.set(key, value as ColorResult | null)
        })
      }
    }
  } catch (error) {
    // localStorage hatası - sessizce devam et
  }
}

// Cache'i localStorage'a kaydet (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
function saveStorageCache(): void {
  if (typeof window === 'undefined') return

  // Debounce - çok sık kaydetmeyi önle
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      const cacheObj: Record<string, ColorResult | null> = {}
      colorCache.forEach((value, key) => {
        cacheObj[key] = value
      })
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify({
        version: STORAGE_CACHE_VERSION,
        colors: cacheObj,
        timestamp: Date.now()
      }))
    } catch (error) {
      // localStorage dolu veya hata - sessizce devam et
    }
  }, 1000)
}

export function useDominantColor(imageUrl: string | undefined): ColorResult | null {
  const [color, setColor] = useState<ColorResult | null>(() => {
    // İlk render'da localStorage cache'ini yükle
    if (typeof window !== 'undefined') {
      loadStorageCache()
    }
    // Eğer cache'de varsa hemen kullan
    if (imageUrl && colorCache.has(imageUrl)) {
      return colorCache.get(imageUrl) || null
    }
    return null
  })
  const processedUrl = useRef<string | null>(null)

  useEffect(() => {
    // localStorage cache'ini yükle
    loadStorageCache()

    if (!imageUrl) {
      setColor(null)
      return
    }

    // Cache'de varsa kullan
    if (colorCache.has(imageUrl)) {
      const cachedColor = colorCache.get(imageUrl) || null
      setColor(cachedColor)
      processedUrl.current = imageUrl
      return
    }

    // Aynı URL için tekrar işleme yapma
    if (processedUrl.current === imageUrl) {
      return
    }

    processedUrl.current = imageUrl

    // Renk çıkar
    extractDominantColor(imageUrl).then((result) => {
      colorCache.set(imageUrl, result)
      // localStorage'a kaydet
      saveStorageCache()
      // URL hala aynıysa state'i güncelle
      if (processedUrl.current === imageUrl) {
        setColor(result)
      }
    })
  }, [imageUrl])

  return color
}

// Birden fazla resim için batch hook
export function useDominantColors(imageUrls: (string | undefined)[]): Map<string, ColorResult | null> {
  const [colors, setColors] = useState<Map<string, ColorResult | null>>(() => {
    // İlk render'da localStorage cache'ini yükle
    if (typeof window !== 'undefined') {
      loadStorageCache()
    }
    // Cache'de olan renkleri hemen kullan
    const initialColors = new Map<string, ColorResult | null>()
    for (const url of imageUrls) {
      if (url && colorCache.has(url)) {
        initialColors.set(url, colorCache.get(url) || null)
      }
    }
    return initialColors
  })

  useEffect(() => {
    // localStorage cache'ini yükle
    loadStorageCache()

    const processImages = async () => {
      const newColors = new Map<string, ColorResult | null>()
      let hasNewColors = false

      for (const url of imageUrls) {
        if (!url) continue

        if (colorCache.has(url)) {
          newColors.set(url, colorCache.get(url) || null)
        } else {
          const result = await extractDominantColor(url)
          colorCache.set(url, result)
          newColors.set(url, result)
          hasNewColors = true
        }
      }

      // Yeni renkler varsa localStorage'a kaydet
      if (hasNewColors) {
        saveStorageCache()
      }

      setColors(newColors)
    }

    processImages()
  }, [imageUrls.join(',')])

  return colors
}

// Renk için stil oluşturucu
export function createColorStyles(color: ColorResult | null, fallbackColor: string = '#8b5cf6') {
  if (!color) {
    return {
      primary: fallbackColor,
      primaryLight: `${fallbackColor}30`,
      primaryMedium: `${fallbackColor}50`,
      primaryBorder: `${fallbackColor}60`,
      textColor: `${fallbackColor}E0`,
      gradient: `linear-gradient(to bottom right, ${fallbackColor}30, ${fallbackColor}20, ${fallbackColor}30)`,
    }
  }

  const { hex } = color

  return {
    primary: hex,
    primaryLight: `${hex}30`,
    primaryMedium: `${hex}50`,
    primaryBorder: `${hex}60`,
    textColor: `${hex}E0`,
    gradient: `linear-gradient(to bottom right, ${hex}30, ${hex}20, ${hex}30)`,
  }
}

// ============================================
// SPONSOR RENKLERINI ÖNCEDEN YÜKLEME
// ============================================

// Tüm sponsor renklerinin yüklenme durumunu takip et
interface PreloadState {
  isLoading: boolean
  isReady: boolean
  loadedCount: number
  totalCount: number
}

// Sponsor renklerini önceden yükle ve hazır olduğunda bildir
export async function preloadSponsorColors(imageUrls: string[]): Promise<void> {
  // localStorage cache'ini yükle
  loadStorageCache()

  const urlsToProcess: string[] = []

  // Cache'de olmayan URL'leri bul
  for (const url of imageUrls) {
    if (url && !colorCache.has(url)) {
      urlsToProcess.push(url)
    }
  }

  // Tüm cache'de olmayanları paralel olarak işle
  if (urlsToProcess.length > 0) {
    const promises = urlsToProcess.map(url => extractDominantColor(url).then(result => {
      colorCache.set(url, result)
      return result
    }))

    await Promise.all(promises)

    // localStorage'a kaydet
    saveStorageCache()
  }
}

// Sponsor renklerini önceden yükleyen ve durumu döndüren hook
export function usePreloadedSponsorColors(imageUrls: (string | undefined)[]): PreloadState {
  const [state, setState] = useState<PreloadState>(() => {
    // İlk render'da localStorage cache'ini yükle
    if (typeof window !== 'undefined') {
      loadStorageCache()
    }

    // Geçerli URL'leri filtrele
    const validUrls = imageUrls.filter((url): url is string => !!url)

    // Cache'de kaç tane var kontrol et
    let loadedCount = 0
    for (const url of validUrls) {
      if (colorCache.has(url)) {
        loadedCount++
      }
    }

    const isReady = validUrls.length === 0 || loadedCount === validUrls.length

    return {
      isLoading: !isReady,
      isReady,
      loadedCount,
      totalCount: validUrls.length
    }
  })

  const processedRef = useRef<string>('')

  useEffect(() => {
    // localStorage cache'ini yükle
    loadStorageCache()

    // Geçerli URL'leri filtrele
    const validUrls = imageUrls.filter((url): url is string => !!url)

    // URL listesi değişmediyse işleme
    const urlsKey = validUrls.join(',')
    if (processedRef.current === urlsKey) {
      return
    }
    processedRef.current = urlsKey

    // Hiç URL yoksa hazır
    if (validUrls.length === 0) {
      setState({
        isLoading: false,
        isReady: true,
        loadedCount: 0,
        totalCount: 0
      })
      return
    }

    // Cache'de kaç tane var kontrol et
    let loadedCount = 0
    const urlsToLoad: string[] = []

    for (const url of validUrls) {
      if (colorCache.has(url)) {
        loadedCount++
      } else {
        urlsToLoad.push(url)
      }
    }

    // Tümü cache'de ise hazır
    if (urlsToLoad.length === 0) {
      setState({
        isLoading: false,
        isReady: true,
        loadedCount: validUrls.length,
        totalCount: validUrls.length
      })
      return
    }

    // Loading başlat
    setState({
      isLoading: true,
      isReady: false,
      loadedCount,
      totalCount: validUrls.length
    })

    // Tüm renkleri paralel olarak yükle
    const loadColors = async () => {
      let currentLoaded = loadedCount

      const promises = urlsToLoad.map(async (url) => {
        const result = await extractDominantColor(url)
        colorCache.set(url, result)
        currentLoaded++

        // Progress güncelle
        setState(prev => ({
          ...prev,
          loadedCount: currentLoaded
        }))

        return result
      })

      await Promise.all(promises)

      // localStorage'a kaydet
      saveStorageCache()

      // Tamamlandı
      setState({
        isLoading: false,
        isReady: true,
        loadedCount: validUrls.length,
        totalCount: validUrls.length
      })
    }

    loadColors()
  }, [imageUrls.filter(u => !!u).join(',')])

  return state
}

// Cache'den renk al (senkron) - renkler önceden yüklenmişse kullanılır
export function getCachedColor(imageUrl: string | undefined): ColorResult | null {
  if (!imageUrl) return null
  loadStorageCache()
  return colorCache.get(imageUrl) || null
}
