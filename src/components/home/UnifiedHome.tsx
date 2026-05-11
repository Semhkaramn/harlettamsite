'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useSponsors } from '@/lib/hooks/useSponsors'
import { optimizeCloudinaryImage, ensureAbsoluteUrl } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Heart, Crown, Sparkles, Search, Star, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import HomePopup from '@/components/HomePopup'

interface Sponsor {
  id: string
  name: string
  description?: string
  logoUrl?: string
  websiteUrl?: string
  category: string
  clicks: number
}

interface BannerData {
  imageUrl: string
  sponsorId: string
  enabled: boolean
}

interface BannerSponsor {
  id: string
  name: string
  websiteUrl?: string
}

interface BannerConfig {
  leftBanner: BannerData | null
  leftSponsor: BannerSponsor | null
  rightBanner: BannerData | null
  rightSponsor: BannerSponsor | null
}

// Sabit tema renkleri - koyu tema, altın/turuncu vurgular
const theme = {
  colors: {
    primary: '#f59e0b', // Amber/Gold
    primaryHover: '#d97706',
    background: '#0a0a0a',
    backgroundSecondary: '#141414',
    card: '#1a1a1a',
    cardBorder: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    border: '#2a2a2a',
    accent: '#f59e0b',
    vip: '#eab308',
    main: '#ef4444',
  }
}

// Ana Sponsor Kartı
function MainSponsorCard({ sponsor, onClick, index = 0 }: { sponsor: Sponsor, onClick: (e: React.MouseEvent, sponsorId: string, websiteUrl?: string) => void, index?: number }) {
  return (
    <Card
      onClick={(e) => onClick(e, sponsor.id, sponsor.websiteUrl)}
      className="relative overflow-hidden transition-all duration-500 hover:scale-[1.02] group cursor-pointer"
      style={{
        background: `linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))`,
        border: '2px solid rgba(239, 68, 68, 0.5)',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)',
      }}
    >
      {/* Üst çizgi */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }}
      />

      {/* Parıltı efekti */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.1), transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center p-6 sm:p-8">
        {/* Logo */}
        {sponsor.logoUrl && (
          <div
            className="w-36 h-18 sm:w-48 sm:h-24 md:w-56 md:h-28 rounded-2xl relative overflow-hidden mb-4 transition-transform duration-300 group-hover:scale-105"
            style={{
              background: '#1a1a1a',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
            }}
          >
            <Image
              src={optimizeCloudinaryImage(sponsor.logoUrl, 336, 168)}
              alt={sponsor.name}
              width={224}
              height={112}
              className="object-contain p-3 w-full h-full"
              priority={index === 0}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </div>
        )}

        {/* Badge */}
        <span
          className="px-4 py-1.5 text-white text-sm font-bold rounded-full shadow-lg mb-3 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
          }}
        >
          <Star className="w-4 h-4" fill="currentColor" />
          ANA SPONSOR
        </span>

        {/* İsim */}
        <h3
          className="text-2xl sm:text-3xl font-black text-center mb-2"
          style={{ color: '#ef4444' }}
        >
          {sponsor.name}
        </h3>

        {/* Açıklama */}
        {sponsor.description && (
          <p
            className="text-center text-sm sm:text-base whitespace-pre-line"
            style={{ color: theme.colors.textSecondary }}
          >
            {sponsor.description}
          </p>
        )}

        {/* Link indicator */}
        <div className="mt-4 flex items-center gap-2 text-sm opacity-70 group-hover:opacity-100 transition-opacity"
          style={{ color: '#ef4444' }}>
          <ExternalLink className="w-4 h-4" />
          <span>Siteyi Ziyaret Et</span>
        </div>
      </div>
    </Card>
  )
}

// VIP Sponsor Kartı
function VIPSponsorCard({ sponsor, onClick }: { sponsor: Sponsor, onClick: (e: React.MouseEvent, sponsorId: string, websiteUrl?: string) => void }) {
  return (
    <Card
      onClick={(e) => onClick(e, sponsor.id, sponsor.websiteUrl)}
      className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
      style={{
        background: `linear-gradient(145deg, rgba(234, 179, 8, 0.12), rgba(234, 179, 8, 0.04))`,
        border: '2px solid rgba(234, 179, 8, 0.4)',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: 'linear-gradient(90deg, transparent, #eab308, transparent)' }}
      />

      <div className="relative flex flex-col sm:flex-row items-center gap-4 p-4">
        {sponsor.logoUrl && (
          <div
            className="w-32 h-16 sm:w-40 sm:h-20 rounded-xl relative overflow-hidden transition-transform group-hover:scale-105"
            style={{
              background: '#1a1a1a',
              border: '2px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <Image
              src={optimizeCloudinaryImage(sponsor.logoUrl, 240, 120)}
              alt={sponsor.name}
              width={160}
              height={80}
              className="object-contain p-2 w-full h-full"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5" style={{ color: '#eab308' }} fill="currentColor" />
            <h3 className="text-xl font-bold" style={{ color: '#eab308' }}>
              {sponsor.name}
            </h3>
            <span
              className="px-2 py-0.5 text-white text-xs font-bold rounded-full"
              style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
            >
              VIP
            </span>
          </div>
          {sponsor.description && (
            <p className="text-sm whitespace-pre-line" style={{ color: theme.colors.textSecondary }}>
              {sponsor.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// Normal Sponsor Kartı
function NormalSponsorCard({ sponsor, onClick }: { sponsor: Sponsor, onClick: (e: React.MouseEvent, sponsorId: string, websiteUrl?: string) => void }) {
  return (
    <Card
      onClick={(e) => onClick(e, sponsor.id, sponsor.websiteUrl)}
      className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
      style={{
        background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
        border: '1px solid rgba(245, 158, 11, 0.25)',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-50"
        style={{ background: '#f59e0b' }}
      />

      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 sm:p-4">
        {sponsor.logoUrl && (
          <div
            className="w-28 h-14 sm:w-32 sm:h-16 rounded-xl relative overflow-hidden transition-transform group-hover:scale-105"
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <Image
              src={optimizeCloudinaryImage(sponsor.logoUrl, 192, 96)}
              alt={sponsor.name}
              width={128}
              height={64}
              className="object-contain p-2 w-full h-full"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center items-center text-center">
          <h3 className="text-lg font-bold mb-1 group-hover:text-amber-400 transition-colors"
              style={{ color: '#f59e0b' }}>
            {sponsor.name}
          </h3>
          {sponsor.description && (
            <p className="text-xs sm:text-sm whitespace-pre-line" style={{ color: theme.colors.textSecondary }}>
              {sponsor.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// API fonksiyonları
async function fetchBanners(): Promise<BannerConfig> {
  try {
    const bannersRes = await fetch('/api/settings/banners')
    const bannersData = await bannersRes.json()

    return {
      leftBanner: bannersData.left ? {
        enabled: true,
        imageUrl: bannersData.left.imageUrl,
        sponsorId: bannersData.left.sponsorId
      } : null,
      leftSponsor: bannersData.left?.sponsor || null,
      rightBanner: bannersData.right ? {
        enabled: true,
        imageUrl: bannersData.right.imageUrl,
        sponsorId: bannersData.right.sponsorId
      } : null,
      rightSponsor: bannersData.right?.sponsor || null
    }
  } catch (error) {
    console.error('Error loading banners:', error)
    return {
      leftBanner: null,
      leftSponsor: null,
      rightBanner: null,
      rightSponsor: null
    }
  }
}

// Ana Sayfa Bileşeni
export default function UnifiedHome() {
  const { user } = useAuth()
  const { data: sponsorsData, isLoading: loadingSponsors } = useSponsors()

  const { data: bannerConfig } = useQuery({
    queryKey: ['sideBanners'],
    queryFn: fetchBanners,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 120000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const [searchTerm, setSearchTerm] = useState('')

  // Sponsorlar yüklendiğinde contentReady event'i gönder
  useEffect(() => {
    if (!loadingSponsors && sponsorsData) {
      window.dispatchEvent(new CustomEvent('contentReady'))
    }
  }, [loadingSponsors, sponsorsData])

  const sponsors = sponsorsData || []
  const sortedSponsors = [...sponsors].sort((a: Sponsor, b: Sponsor) => {
    if (a.category === 'main' && b.category !== 'main') return -1
    if (a.category !== 'main' && b.category === 'main') return 1
    if (a.category === 'vip' && b.category !== 'vip') return -1
    if (a.category !== 'vip' && b.category === 'vip') return 1
    return 0
  })

  function visitSponsor(e: React.MouseEvent, sponsorId: string, websiteUrl?: string) {
    if (!websiteUrl) return
    const data = JSON.stringify({ sponsorId })
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
    window.open(ensureAbsoluteUrl(websiteUrl), '_blank', 'noopener,noreferrer')
  }

  function handleBannerClick(sponsor: BannerSponsor | null) {
    if (!sponsor?.websiteUrl) return
    if (sponsor.id) {
      const data = JSON.stringify({ sponsorId: sponsor.id })
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
    window.open(ensureAbsoluteUrl(sponsor.websiteUrl), '_blank', 'noopener,noreferrer')
  }

  // Loading state
  if (loadingSponsors && !sponsorsData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.colors.background }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: theme.colors.textSecondary }}>Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const filteredSponsors = sortedSponsors.filter((s: Sponsor) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const mainSponsors = filteredSponsors.filter((s: Sponsor) => s.category === 'main')
  const vipSponsors = filteredSponsors.filter((s: Sponsor) => s.category === 'vip')
  const normalSponsors = filteredSponsors.filter((s: Sponsor) => s.category !== 'vip' && s.category !== 'main')

  const { leftBanner, leftSponsor, rightBanner, rightSponsor } = bannerConfig || {}
  const hasBanners = (leftBanner && leftSponsor) || (rightBanner && rightSponsor)

  return (
    <div className="min-h-screen pb-8 overflow-x-hidden max-w-full" style={{ background: theme.colors.background }}>
      <HomePopup />

      <div className="flex justify-center gap-2 px-2 max-w-full overflow-x-hidden">
        {/* Sol Banner */}
        {leftBanner && leftSponsor && (
          <div
            className="hidden xl:block flex-shrink-0 w-[160px] 2xl:w-[200px] cursor-pointer pt-4"
            onClick={() => handleBannerClick(leftSponsor)}
          >
            <div
              className="sticky top-4 h-[calc(100vh-32px)] rounded-lg overflow-hidden shadow-2xl"
              style={{
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.backgroundSecondary,
              }}
            >
              <Image
                src={leftBanner.imageUrl}
                alt={leftSponsor.name}
                width={200}
                height={800}
                className="object-fill w-full h-full"
                priority
                loading="eager"
                quality={85}
                unoptimized={leftBanner.imageUrl.toLowerCase().endsWith('.gif')}
              />
            </div>
          </div>
        )}

        {/* Ana İçerik */}
        <div className="flex-1 min-w-0 px-2 sm:px-4 py-4">
          {/* Arama */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: theme.colors.textMuted }} />
            <Input
              type="text"
              placeholder="Sponsor ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-all border-0"
              style={{
                backgroundColor: theme.colors.backgroundSecondary,
                color: theme.colors.text,
              }}
            />
          </div>

          {filteredSponsors.length === 0 ? (
            <div className="text-center py-12" style={{ minHeight: '200px' }}>
              <Heart className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
              <p style={{ color: theme.colors.textMuted }}>Henüz sponsor bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ANA SPONSORLAR */}
              {mainSponsors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" style={{ color: '#ef4444' }} fill="currentColor" />
                    <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg, #ef4444, #f87171)' }}>
                      ANA SPONSOR
                    </h2>
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" style={{ color: '#ef4444' }} fill="currentColor" />
                  </div>

                  <div className={`grid gap-4 ${hasBanners ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {mainSponsors.map((sponsor, index) => (
                      <MainSponsorCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        onClick={visitSponsor}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* VIP SPONSORLAR */}
              {vipSponsors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Crown className="w-6 h-6 animate-pulse" style={{ color: '#eab308' }} fill="currentColor" />
                    <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg, #eab308, #fcd34d)' }}>
                      VIP Sponsorlar
                    </h2>
                    <Sparkles className="w-5 h-5 animate-pulse" style={{ color: '#eab308' }} />
                  </div>

                  <div className={`grid gap-4 ${hasBanners ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {vipSponsors.map((sponsor) => (
                      <VIPSponsorCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        onClick={visitSponsor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* NORMAL SPONSORLAR */}
              {normalSponsors.length > 0 && (
                <div>
                  {(mainSponsors.length > 0 || vipSponsors.length > 0) && (
                    <h2 className="text-xl font-bold mb-4 flex items-center justify-center gap-2"
                        style={{ color: theme.colors.primary }}>
                      <Heart className="w-5 h-5" style={{ color: theme.colors.primary }} />
                      Sponsorlar
                    </h2>
                  )}

                  <div className={`grid gap-4 ${hasBanners ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {normalSponsors.map((sponsor) => (
                      <NormalSponsorCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        onClick={visitSponsor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sağ Banner */}
        {rightBanner && rightSponsor && (
          <div
            className="hidden xl:block flex-shrink-0 w-[160px] 2xl:w-[200px] cursor-pointer pt-4"
            onClick={() => handleBannerClick(rightSponsor)}
          >
            <div
              className="sticky top-4 h-[calc(100vh-32px)] rounded-lg overflow-hidden shadow-2xl"
              style={{
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.backgroundSecondary,
              }}
            >
              <Image
                src={rightBanner.imageUrl}
                alt={rightSponsor.name}
                width={200}
                height={800}
                className="object-fill w-full h-full"
                priority
                loading="eager"
                quality={85}
                unoptimized={rightBanner.imageUrl.toLowerCase().endsWith('.gif')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
