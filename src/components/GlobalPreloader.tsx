'use client'
import { useEffect, useState, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { SITE_CONFIG } from '@/lib/site-config'
import { getActiveTheme } from '@/config/themes'

/**
 * Global Preloader - Sadece ilk site yüklemesinde gösterilir
 *
 * - Admin sayfalarında gösterilmez
 * - Session boyunca sadece 1 kez gösterilir
 * - Logo animasyonlu splash screen
 * - ✅ FIX: contentReady event beklemek yerine daha hızlı bir yaklaşım
 */
export default function GlobalPreloader() {
  const [isLoading, setIsLoading] = useState(true)
  // FIX: Başlangıçta true - preloader varsayılan olarak gösterilir
  const [shouldShow, setShouldShow] = useState(true)
  const pathname = usePathname()
  const theme = getActiveTheme()

  // ✅ FIX: Daha kısa minimum süre (daha hızlı yükleme hissi)
  const MINIMUM_LOADING_TIME = 500 // 0.5 saniye minimum (0.8'den düşürüldü)

  useLayoutEffect(() => {
    // Admin sayfalarında preloader gösterme
    if (pathname?.startsWith('/admin')) {
      setIsLoading(false)
      setShouldShow(false)
      return
    }

    // Session'da daha önce yüklendi mi kontrol et
    try {
      const hasLoaded = sessionStorage.getItem('site_preloader_shown')
      if (hasLoaded) {
        // Daha önce yüklendi, preloader gösterme
        setIsLoading(false)
        setShouldShow(false)
        return
      }
    } catch {
      // sessionStorage erişim hatası (örn. private mode)
      setIsLoading(false)
      setShouldShow(false)
      return
    }

    // İlk yükleme - preloader göster (shouldShow zaten true)
    const startTime = Date.now()

    const hidePreloader = () => {
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime)

      // Minimum süre dolana kadar bekle, sonra kapat
      setTimeout(() => {
        setIsLoading(false)
        // Session'a kaydet - bu oturumda tekrar gösterme
        try {
          sessionStorage.setItem('site_preloader_shown', 'true')
        } catch {
          // sessionStorage yazma hatası - yoksay
        }
      }, remainingTime)
    }

    // ✅ FIX: Daha hızlı yaklaşım - document.readyState kullan
    // contentReady event'i beklemek yerine sayfa yüklenince hemen kapat
    if (document.readyState === 'complete') {
      // Sayfa zaten yüklendi
      hidePreloader()
    } else {
      // Sayfa yüklenmeyi bekle
      const handleLoad = () => {
        hidePreloader()
      }

      window.addEventListener('load', handleLoad)

      // Fallback: maksimum 2 saniye sonra zorla kapat (6 saniyeden düşürüldü)
      const fallbackTimer = setTimeout(() => {
        setIsLoading(false)
        try {
          sessionStorage.setItem('site_preloader_shown', 'true')
        } catch {
          // sessionStorage yazma hatası - yoksay
        }
      }, 2000)

      return () => {
        window.removeEventListener('load', handleLoad)
        clearTimeout(fallbackTimer)
      }
    }
  }, [pathname])

  // Admin sayfası veya daha önce gösterildi
  if (!shouldShow || !isLoading) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary} 50%, ${theme.colors.background} 100%)`,
        opacity: isLoading ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: isLoading ? 'auto' : 'none'
      }}
    >
      {/* Animated background glow effects */}
      <div
        className="absolute w-[500px] h-[500px] md:w-[600px] md:h-[600px] rounded-full blur-[100px] animate-pulse"
        style={{
          backgroundColor: `${theme.colors.primary}15`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Secondary glow */}
      <div
        className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full blur-[80px] opacity-50"
        style={{
          backgroundColor: `${theme.colors.accent || theme.colors.primary}20`,
          top: '45%',
          left: '55%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulse 2s ease-in-out infinite alternate'
        }}
      />

      {/* Logo Container */}
      <div className="relative flex flex-col items-center gap-6 md:gap-8">
        {/* Logo with scale and glow animation */}
        <div
          className="relative w-28 h-28 md:w-40 md:h-40"
          style={{
            animation: 'logoFloat 2s ease-in-out infinite'
          }}
        >
          {/* Logo glow effect */}
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-60"
            style={{
              backgroundColor: theme.colors.primary,
              transform: 'scale(1.2)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />

          {/* Logo image */}
          <Image
            src={SITE_CONFIG.siteLogo}
            alt="Logo"
            fill
            className="object-contain drop-shadow-2xl relative z-10"
            priority
            sizes="(max-width: 768px) 112px, 160px"
          />
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full"
                style={{
                  backgroundColor: theme.colors.primary,
                  animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`
                }}
              />
            ))}
          </div>

          {/* Loading text */}
          <p
            className="text-sm md:text-base font-medium tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Yükleniyor...
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
