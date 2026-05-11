'use client'

import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { hexToRgba } from '@/components/ui/themed'
import { Gamepad2, Play, Sparkles, Info, Bomb, Diamond, CircleDot } from 'lucide-react'

interface Game {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  href: string
  isNew?: boolean
}

// Games array
const games: Game[] = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Klasik 21 kart oyunu. Krupiyeyi yenerek puanlarını katla!',
    icon: (
      <div className="relative">
        {/* Card stack effect */}
        <div className="absolute -left-2 -top-1 w-16 h-20 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 transform -rotate-12" />
        <div className="absolute -right-2 -top-1 w-16 h-20 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 transform rotate-12" />
        {/* Main card */}
        <div className="relative w-16 h-20 rounded-lg bg-gradient-to-br from-white to-gray-100 border-2 border-white/50 shadow-xl flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900">21</span>
          <span className="text-red-500 text-lg">♥</span>
        </div>
      </div>
    ),
    href: '/games/blackjack'
  },
  {
    id: 'mines',
    name: 'Mines',
    description: 'Mayın tarlasında elmasları bul! Daha fazla risk, daha yüksek ödül!',
    icon: (
      <div className="relative">
        {/* Grid background */}
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 shadow-xl grid grid-cols-3 gap-1 p-2">
          <div className="rounded bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Diamond className="w-3 h-3 text-white" />
          </div>
          <div className="rounded bg-gradient-to-br from-slate-600 to-slate-700" />
          <div className="rounded bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Diamond className="w-3 h-3 text-white" />
          </div>
          <div className="rounded bg-gradient-to-br from-slate-600 to-slate-700" />
          <div className="rounded bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <Bomb className="w-3 h-3 text-white" />
          </div>
          <div className="rounded bg-gradient-to-br from-slate-600 to-slate-700" />
          <div className="rounded bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Diamond className="w-3 h-3 text-white" />
          </div>
          <div className="rounded bg-gradient-to-br from-slate-600 to-slate-700" />
          <div className="rounded bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Diamond className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    ),
    href: '/games/mines',
    isNew: false
  },
  {
    id: 'roulette',
    name: 'Rulet',
    description: 'Klasik casino ruleti! Sayilara, renklere veya gruplara bahis yap!',
    icon: (
      <div className="relative">
        {/* Roulette wheel */}
        <div className="w-20 h-20 rounded-full shadow-xl relative overflow-hidden" style={{
          background: 'linear-gradient(145deg, #1a1a2e, #0f0f1a)',
          border: '3px solid #d4af37'
        }}>
          {/* Inner decoration */}
          <div className="absolute inset-2 rounded-full" style={{
            background: 'conic-gradient(from 0deg, #c62828, #1a1a1a, #c62828, #1a1a1a, #c62828, #1a1a1a, #c62828, #1a1a1a, #00a651, #1a1a1a, #c62828, #1a1a1a)',
          }} />
          {/* Center */}
          <div className="absolute inset-6 rounded-full flex items-center justify-center" style={{
            background: 'linear-gradient(145deg, #d4af37, #b8860b)'
          }}>
            <CircleDot className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    ),
    href: '/games/roulette',
    isNew: true
  }
]

function GamesContent() {
  const { theme } = useUserTheme()
  const { user, loading, setShowLoginModal, setReturnUrl } = useAuth()

  const handleGameClick = (e: React.MouseEvent, game: Game) => {
    if (!user && !loading) {
      e.preventDefault()
      setReturnUrl(game.href)
      setShowLoginModal(true)
    }
  }

  return (
    <DashboardLayout showYatayBanner={true}>
      <div className="user-page-container">
        <div className="user-page-inner">
          {/* Modern Header */}
          <div className="px-4 pt-6 pb-4">
            <div
              className="flex items-center gap-4 p-5 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.1)}, ${hexToRgba(theme.colors.gradientTo, 0.05)})`,
                border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
              }}
            >
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.2)}, ${hexToRgba(theme.colors.gradientTo, 0.15)})`
                }}
              >
                <Gamepad2 className="w-7 h-7" style={{ color: theme.colors.primary }} />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: theme.colors.text }}>
                  Oyunlar
                </h1>
                <p className="text-sm mt-0.5" style={{ color: theme.colors.textSecondary }}>
                  Puanlarınla oyna, kazan veya kaybet!
                </p>
              </div>
            </div>
          </div>

          {/* Games Grid */}
          <div className="px-4 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {games.map((game) => (
                <Link
                  key={game.id}
                  href={user ? game.href : '#'}
                  onClick={(e) => handleGameClick(e, game)}
                  className="group"
                >
                  <div
                    className="relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
                    style={{
                      background: `linear-gradient(145deg, ${hexToRgba(theme.colors.primary, 0.15)}, ${hexToRgba(theme.colors.gradientTo, 0.1)})`,
                      border: `1px solid ${hexToRgba(theme.colors.primary, 0.3)}`,
                      boxShadow: `0 4px 24px ${hexToRgba(theme.colors.primary, 0.1)}`
                    }}
                  >
                    {/* Animated gradient background - uses theme primary color */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`
                      }}
                    />

                    {/* Glow effect on hover - uses theme primary color */}
                    <div
                      className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                      style={{ background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.3)}, transparent)` }}
                    />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div
                        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="relative p-6">
                      {/* Top row with icon and badge */}
                      <div className="flex items-start justify-between mb-5">
                        {/* Icon container with glow - uses theme primary color */}
                        <div className="relative">
                          <div
                            className="absolute inset-0 blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"
                            style={{ background: theme.colors.primary }}
                          />
                          <div className="relative transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            {game.icon}
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2">
                          {game.isNew && (
                            <div
                              className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                              style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
                              }}
                            >
                              YENİ
                            </div>
                          )}
                          <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                              boxShadow: `0 4px 15px ${hexToRgba(theme.colors.primary, 0.4)}`
                            }}
                          >
                            <span className="relative flex h-2 w-2">
                              <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ background: 'white' }}
                              />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                            </span>
                            CANLI
                          </div>
                        </div>
                      </div>

                      {/* Game info */}
                      <div className="space-y-2 mb-5">
                        <h3
                          className="text-xl font-bold tracking-tight"
                          style={{ color: theme.colors.text }}
                        >
                          {game.name}
                        </h3>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {game.description}
                        </p>
                      </div>

                      {/* Play button */}
                      <div>
                        <div
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 group-hover:gap-3 shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.gradientTo})`,
                            boxShadow: `0 4px 20px ${hexToRgba(theme.colors.primary, 0.4)}`
                          }}
                        >
                          <Play className="w-4 h-4 fill-current" />
                          {user ? 'Hemen Oyna' : 'Giriş Yap ve Oyna'}
                          <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom decorative line */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)` }}
                    />
                  </div>
                </Link>
              ))}
            </div>

            {/* Info Card */}
            <div
              className="mt-8 p-5 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(theme.colors.primary, 0.08)}, ${hexToRgba(theme.colors.gradientTo, 0.05)})`,
                border: `1px solid ${hexToRgba(theme.colors.primary, 0.2)}`
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-xl flex-shrink-0"
                  style={{ background: hexToRgba(theme.colors.primary, 0.15) }}
                >
                  <Info className="w-5 h-5" style={{ color: theme.colors.primary }} />
                </div>
                <div>
                  <h3 className="font-bold mb-2" style={{ color: theme.colors.text }}>
                    Nasıl Oynanır?
                  </h3>
                  <ul className="space-y-1.5 text-sm" style={{ color: theme.colors.textSecondary }}>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                      <span>Oyunlarda puanlarınızı kullanarak bahis yapabilirsiniz</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                      <span>Maksimum bahis limiti 500 puandır</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.colors.primary }} />
                      <span>Kazandığınız puanlar anında hesabınıza eklenir</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                      <span>Dikkatli oynayın, kaybedilen puanlar geri gelmez!</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function GamesPage() {
  return <GamesContent />
}
