'use client'

import { useState, useEffect } from 'react'
import { SITE_CONFIG } from '@/lib/site-config'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useVisitStats } from '@/lib/hooks/useVisitStats'
import { Eye, Users } from 'lucide-react'

// Ziyaret İstatistikleri Barı
function VisitStatsBar() {
  const { theme } = useUserTheme()
  const { data: visitStats } = useVisitStats()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="w-full py-3 px-2 backdrop-blur-sm"
        style={{
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: `${theme.colors.background}50`
        }}
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <div className="flex items-center gap-1" style={{ color: theme.colors.primary }}>
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-lg sm:text-2xl font-bold">-</span>
              </div>
              <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.textMuted }}>Toplam Ziyaret</p>
            </div>
            <div className="h-8 sm:h-12 w-px" style={{ backgroundColor: theme.colors.border }} />
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <div className="flex items-center gap-1" style={{ color: theme.colors.primary }}>
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-lg sm:text-2xl font-bold">-</span>
              </div>
              <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.textMuted }}>Toplam Benzersiz Ziyaretçi</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full py-3 px-2 backdrop-blur-sm"
      style={{
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: `${theme.colors.background}50`
      }}
    >
      <div className="container mx-auto">
        <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="flex items-center gap-1" style={{ color: theme.colors.primary }}>
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-lg sm:text-2xl font-bold">{visitStats?.totalVisits?.toLocaleString() || '0'}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.textMuted }}>Toplam Ziyaret</p>
          </div>

          <div className="h-8 sm:h-12 w-px" style={{ backgroundColor: theme.colors.border }} />

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="flex items-center gap-1" style={{ color: theme.colors.primary }}>
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-lg sm:text-2xl font-bold">{visitStats?.totalUniqueVisitors?.toLocaleString() || '0'}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.textMuted }}>Toplam Benzersiz Ziyaretçi</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Footer() {
  const [year, setYear] = useState<number>(2025)
  const { theme } = useUserTheme()

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <>
      {/* İstatistik Barı - Footer'ın Üstünde */}
      <VisitStatsBar />

      {/* Footer */}
      <footer
        className="w-full py-6"
        style={{
          borderTop: `1px solid ${theme.colors.border}40`,
          backgroundColor: `${theme.colors.background}80`
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: theme.colors.textMuted }}>
            <p className="text-center md:text-left">
              © {year} {SITE_CONFIG.siteName}. Tüm hakları saklıdır.
            </p>
            <a
              href={`https://t.me/xangeiletisim`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors flex items-center gap-1.5"
              style={{ color: theme.colors.textMuted }}
            >
              This app powered by
              <span className="font-semibold" style={{ color: theme.colors.primary }}>Xange İletişim</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
