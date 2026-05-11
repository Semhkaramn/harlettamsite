'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useSponsors } from '@/lib/hooks/useSponsors'
import { optimizeCloudinaryImage, ensureAbsoluteUrl } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Heart, Crown, Sparkles, Search } from 'lucide-react'
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

async function fetchBanners(): Promise<BannerConfig> {
  try {
    const bannersRes = await fetch('/api/settings/banners')
    const bannersData = await bannersRes.json()

    const config: BannerConfig = {
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

    return config
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

function optimizeBannerImage(url: string): string {
  if (!url) return url
  if (url.toLowerCase().endsWith('.gif')) return url
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto/')
  }
  return url
}

export default function LykibomHome() {
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

  useEffect(() => {
    if (!loadingSponsors && sponsorsData) {
      window.dispatchEvent(new CustomEvent('contentReady'))
    }
  }, [loadingSponsors, sponsorsData])

  const sponsors = sponsorsData || []
  const sortedSponsors = [...sponsors].sort((a: Sponsor, b: Sponsor) => {
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

  // SSR ile veri geldiği için loading state kısa olacak
  if (loadingSponsors && !sponsorsData) {
    return <div className="min-h-screen" style={{ contain: 'layout' }} />
  }

  const filteredSponsors = sortedSponsors.filter((s: Sponsor) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const mainSponsors = filteredSponsors.filter((s: Sponsor) => s.category === 'main')
  const vipSponsors = filteredSponsors.filter((s: Sponsor) => s.category === 'vip')
  const normalSponsors = filteredSponsors.filter((s: Sponsor) => s.category !== 'vip' && s.category !== 'main')

  const { leftBanner, leftSponsor, rightBanner, rightSponsor } = bannerConfig || {}

  // Banner varsa içerik alanı daraltılacak mı kontrol et
  const hasBanners = (leftBanner && leftSponsor) || (rightBanner && rightSponsor)

  return (
    <div className="min-h-screen pb-8 overflow-x-hidden max-w-full">
      <HomePopup />

      <div className="flex justify-center gap-2 px-2 max-w-full overflow-x-hidden">
        {/* Sol Banner */}
        {leftBanner && leftSponsor && (
          <div
            className="hidden xl:block flex-shrink-0 w-[160px] 2xl:w-[200px] cursor-pointer pt-4"
            onClick={() => handleBannerClick(leftSponsor)}
          >
            <div className="sticky top-4 h-[calc(100vh-32px)] rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10">
              <Image
                src={optimizeBannerImage(leftBanner.imageUrl)}
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

        {/* Sponsors List */}
        <div className="flex-1 min-w-0 px-2 sm:px-4 py-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#3b82f6' }} />
            <Input
              type="text"
              placeholder="Sponsor ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredSponsors.length === 0 ? (
            <div className="text-center py-12" style={{ minHeight: '200px' }}>
              <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Henüz sponsor bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-6" style={{ contain: 'layout', minHeight: '400px' }}>
              {/* MAIN Sponsors */}
              {mainSponsors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 mb-6">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-400 animate-pulse" fill="currentColor" />
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-500">
                      ANA SPONSOR
                    </h2>
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-400 animate-pulse" fill="currentColor" />
                  </div>

                  {mainSponsors.map((sponsor, index) => (
                    <Card
                      key={sponsor.id}
                      onClick={(e) => visitSponsor(e, sponsor.id, sponsor.websiteUrl)}
                      className="relative overflow-hidden bg-gradient-to-br from-red-900/70 via-red-800/60 to-red-900/70 border-4 border-red-400 hover:border-red-300 transition-transform duration-300 hover:scale-[1.02] group cursor-pointer"
                      style={{ minHeight: '100px' }}
                    >
                      <div className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-5 p-4 sm:p-5 md:p-8">
                        {sponsor.logoUrl && (
                          <div className="w-32 h-16 sm:w-40 sm:h-20 md:w-52 md:h-26 lg:w-64 lg:h-32 rounded-2xl bg-gradient-to-br from-red-400/50 to-red-600/50 flex-shrink-0 relative overflow-hidden border-2 md:border-4 border-red-300/70">
                            <Image
                              src={optimizeCloudinaryImage(sponsor.logoUrl, 288, 192)}
                              alt={sponsor.name}
                              width={192}
                              height={128}
                              className="object-contain p-2 md:p-4 w-full h-full"
                              priority={index === 0}
                              loading={index === 0 ? "eager" : "lazy"}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center items-center w-full">
                          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-9 md:h-9 text-red-200" fill="currentColor" />
                            <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-100 via-red-200 to-red-300 text-center break-words leading-tight">
                              {sponsor.name}
                            </h3>
                            <span className="ml-1 sm:ml-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs sm:text-sm md:text-base font-bold rounded-full shadow-lg border border-red-400/50 flex-shrink-0">
                              MAIN
                            </span>
                          </div>
                          {sponsor.description && (
                            <p className="text-red-100/95 leading-snug font-bold text-center text-sm sm:text-base md:text-lg lg:text-2xl break-words w-full" style={{ whiteSpace: 'pre-line' }}>
                              {sponsor.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* VIP Sponsors */}
              {vipSponsors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Crown className="w-6 h-6 text-yellow-400 animate-pulse" fill="currentColor" />
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
                      VIP Sponsorlar
                    </h2>
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>

                  <div className={`grid gap-3 sm:gap-4 ${hasBanners ? 'grid-cols-1 2xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {vipSponsors.map((sponsor, index) => (
                      <Card
                        key={sponsor.id}
                        onClick={(e) => visitSponsor(e, sponsor.id, sponsor.websiteUrl)}
                        className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-yellow-800/30 border-2 border-yellow-500/50 hover:border-yellow-400 transition-transform duration-300 hover:scale-[1.02] group cursor-pointer"
                        style={{ minHeight: '80px' }}
                      >
                        <div className="relative flex flex-col sm:flex-row items-center gap-3 sm:gap-5 p-3 sm:p-4">
                          {sponsor.logoUrl && (
                            <div className="w-28 h-14 sm:w-36 sm:h-18 md:w-40 md:h-20 lg:w-48 lg:h-24 rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 flex-shrink-0 relative overflow-hidden border-2 border-yellow-400/30">
                              <Image
                                src={optimizeCloudinaryImage(sponsor.logoUrl, 216, 144)}
                                alt={sponsor.name}
                                width={144}
                                height={96}
                                className="object-contain p-2 w-full h-full"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center items-center w-full">
                            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" />
                              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-400 text-center break-words leading-tight">
                                {sponsor.name}
                              </h3>
                              <span className="ml-1 sm:ml-2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg flex-shrink-0">
                                VIP
                              </span>
                            </div>
                            {sponsor.description && (
                              <p className="text-yellow-100/90 leading-snug font-semibold text-center text-sm sm:text-base md:text-lg break-words w-full" style={{ whiteSpace: 'pre-line' }}>
                                {sponsor.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Normal Sponsors */}
              {normalSponsors.length > 0 && (
                <div>
                  {(mainSponsors.length > 0 || vipSponsors.length > 0) && (
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                      <Heart className="w-5 h-5 text-slate-400" />
                      Sponsorlar
                    </h2>
                  )}

                  <div className={`grid gap-3 sm:gap-4 ${hasBanners ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {normalSponsors.map(sponsor => (
                      <Card
                        key={sponsor.id}
                        onClick={(e) => visitSponsor(e, sponsor.id, sponsor.websiteUrl)}
                        className="relative overflow-hidden bg-white/5 border-white/10 p-2 sm:p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                          {sponsor.logoUrl && (
                            <div className="w-28 h-14 sm:w-32 sm:h-16 md:w-36 md:h-18 lg:w-40 lg:h-20 rounded-lg bg-white/10 flex-shrink-0 relative overflow-hidden border border-white/10">
                              <Image
                                src={optimizeCloudinaryImage(sponsor.logoUrl, 168, 120)}
                                alt={sponsor.name}
                                width={112}
                                height={80}
                                className="object-contain p-2 w-full h-full"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center items-center text-center w-full">
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-blue-300 transition-colors break-words w-full leading-tight">{sponsor.name}</h3>
                            {sponsor.description && (
                              <p className="text-gray-300 leading-snug text-xs sm:text-sm break-words w-full" style={{ whiteSpace: 'pre-line' }}>
                                {sponsor.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
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
            <div className="sticky top-4 h-[calc(100vh-32px)] rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10">
              <Image
                src={optimizeBannerImage(rightBanner.imageUrl)}
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
