'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { ensureAbsoluteUrl } from '@/lib/utils'

interface BannerData {
  enabled: boolean
  imageUrl: string
  mobileImageUrl?: string
  sponsorId: string
  sponsor: {
    id: string
    name: string
    websiteUrl?: string
  } | null
}

export default function YatayBanner() {
  const { theme } = useUserTheme()
  const [bannerData, setBannerData] = useState<BannerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Ekran boyutunu kontrol et
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Önce cache'den oku
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('yatayBannerCache')
      if (cached) {
        try {
          const data = JSON.parse(cached)
          setBannerData(data)
          // Cache varsa ve banner aktifse loading'i hemen kaldır
          if (data?.enabled && data?.imageUrl) {
            setIsLoading(false)
          }
        } catch {
          // ignore
        }
      }
    }

    loadBanner()

    return () => window.removeEventListener('resize', checkMobile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBanner() {
    try {
      const res = await fetch('/api/settings/yatay-banner')
      const data = await res.json()
      setBannerData(data)
      setIsLoading(false)

      // Cache'e kaydet
      if (typeof window !== 'undefined') {
        localStorage.setItem('yatayBannerCache', JSON.stringify(data))
      }
    } catch (error) {
      console.error('Error loading yatay banner:', error)
      setIsLoading(false)
    }
  }

  function handleClick() {
    if (!bannerData?.sponsor?.websiteUrl) return

    // Tracking
    if (bannerData.sponsor.id) {
      const data = JSON.stringify({ sponsorId: bannerData.sponsor.id })

      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' })
        navigator.sendBeacon('/api/sponsors/click', blob)
      } else {
        fetch('/api/sponsors/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(() => {})
      }
    }

    window.open(ensureAbsoluteUrl(bannerData.sponsor.websiteUrl), '_blank', 'noopener,noreferrer')
  }

  // Return null while loading - GlobalPreloader handles the loading UI
  if (!isClient || isLoading || !bannerData?.enabled || !bannerData?.imageUrl) {
    return null
  }

  // Mobilde mobileImageUrl varsa onu kullan, yoksa imageUrl kullan
  const currentImageUrl = isMobile && bannerData.mobileImageUrl
    ? bannerData.mobileImageUrl
    : bannerData.imageUrl

  const isGif = currentImageUrl.toLowerCase().endsWith('.gif')

  return (
    <div
      className="w-full lg:w-[calc(100%-16rem)] lg:ml-64"
      style={{
        background: `linear-gradient(to right, ${theme.colors.background}, ${theme.colors.backgroundSecondary}, ${theme.colors.background})`,
        borderBottomWidth: 1,
        borderColor: theme.colors.border
      }}
    >
      <div
        onClick={handleClick}
        className={`relative w-full h-16 sm:h-20 md:h-24 overflow-hidden ${bannerData.sponsor?.websiteUrl ? 'cursor-pointer' : ''}`}
        title={bannerData.sponsor?.name ? `${bannerData.sponsor.name} - Tıklayın` : ''}
      >
        <Image
          src={currentImageUrl}
          alt={bannerData.sponsor?.name || 'Sponsor Banner'}
          fill
          className="object-contain"
          priority
          unoptimized={isGif}
        />
      </div>
    </div>
  )
}
