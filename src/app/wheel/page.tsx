'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthActions } from '@/components/providers/auth-provider'
import { useWheelData, useSpinWheel, useRefreshWheelData } from '@/lib/hooks/useWheel'
import { useUserTheme } from '@/components/providers/user-theme-provider'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import DashboardLayout from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import {
  ThemedCard,
  ThemedButton,
  ThemedEmptyState,
} from '@/components/ui/themed'
import { Ticket, Gift, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'

interface WheelPrize {
  id: string
  name: string
  points: number
  color: string
  order: number
}

interface UserData {
  dailySpinsLeft: number
}

interface RecentWinner {
  id: string
  user: {
    siteUsername?: string
    avatar?: string
  }
  prize: {
    name: string
  }
  pointsWon: number
  spunAt: string
}

function WheelContent() {
  const router = useRouter()
  const { user, setShowLoginModal } = useAuth()
  const { refreshUser } = useAuthActions()
  const { theme, button, card } = useUserTheme()

  const { prizes, winners: recentWinners, isLoading: loading } = useWheelData({ enablePolling: true })
  const spinMutation = useSpinWheel()
  const refreshWheelData = useRefreshWheelData()

  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  async function spinWheel() {
    if (!user) {
      toast.error('Çark çevirmek için giriş yapmalısınız')
      setShowLoginModal(true)
      return
    }

    if (!user.dailySpinsLeft || user.dailySpinsLeft <= 0) {
      toast.error('Günlük çark hakkınız kalmadı!')
      return
    }

    setSpinning(true)

    try {
      const data = await spinMutation.mutateAsync()

      if (data.success) {
        await refreshUser()

        const prizeIndex = prizes.findIndex(p => p.id === data.prize.id)

        const segmentAngle = 360 / prizes.length
        const prizeStartAngle = -90 + (prizeIndex * segmentAngle)
        const prizeMidAngle = prizeStartAngle + (segmentAngle / 2)

        let targetAngle = -90 - prizeMidAngle

        while (targetAngle < 0) {
          targetAngle += 360
        }
        targetAngle = targetAngle % 360

        const randomSpins = 5 + Math.floor(Math.random() * 5)
        const totalRotation = (randomSpins * 360) + targetAngle

        setRotation(totalRotation)

        setTimeout(() => {
          setSpinning(false)
          toast.success(`Tebrikler! ${data.pointsWon} puan kazandınız!`, {
            duration: 5000,
          })

          setTimeout(() => {
            refreshWheelData()
          }, 500)
        }, 4000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Çark çevrilemedi'
      toast.error(errorMessage)
      setSpinning(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const segmentAngle = 360 / (prizes.length || 8)

  return (
    <div className="user-page-container">
      <div className="user-page-inner space-y-4">
      <div className="container mx-auto px-4 pt-6">

      </div>
      <div className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="flex flex-col">
            <div className="text-center mb-6">
              <p className="font-semibold text-sm mb-1" style={{ color: theme.colors.success }}>Tamamen Ücretsiz</p>
              {user ? (
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                  Kalan hak: {user.dailySpinsLeft} çevirme
                </p>
              ) : (
                <p className="text-xs" style={{ color: theme.colors.warning }}>
                  Çevrim hakkınızı görmek için giriş yapın
                </p>
              )}
            </div>

            <div className="relative mb-6 flex-1 flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-square">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
                  <div
                    className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[35px] drop-shadow-2xl"
                    style={{ borderTopColor: theme.colors.text }}
                  />
                </div>

                <div
                  className="w-full h-full rounded-full border-8 shadow-2xl relative overflow-hidden"
                  style={{
                    borderColor: theme.colors.text,
                    background: theme.colors.background
                  }}
                >
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                    }}
                  >
                    {prizes.map((prize, index) => {
                      const startAngle = index * segmentAngle - 90
                      const endAngle = (index + 1) * segmentAngle - 90
                      const midAngle = (startAngle + endAngle) / 2

                      const startX = 100 + 100 * Math.cos((startAngle * Math.PI) / 180)
                      const startY = 100 + 100 * Math.sin((startAngle * Math.PI) / 180)
                      const endX = 100 + 100 * Math.cos((endAngle * Math.PI) / 180)
                      const endY = 100 + 100 * Math.sin((endAngle * Math.PI) / 180)

                      const textRadius = 65
                      const textX = 100 + textRadius * Math.cos((midAngle * Math.PI) / 180)
                      const textY = 100 + textRadius * Math.sin((midAngle * Math.PI) / 180)

                      return (
                        <g key={prize.id}>
                          <path
                            d={`M 100 100 L ${startX} ${startY} A 100 100 0 0 1 ${endX} ${endY} Z`}
                            fill={prize.color}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="0.5"
                          />
                          {/* Text - Dikey (içten dışa) */}
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontWeight="bold"
                            fontSize="14"
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                              transform: `rotate(${midAngle}deg)`,
                              transformOrigin: `${textX}px ${textY}px`
                            }}
                          >
                            {prize.name}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.warning}, ${theme.colors.primary})`,
                      borderColor: theme.colors.text
                    }}
                  >
                    <Gift className="w-10 h-10 drop-shadow-lg" style={{ color: theme.colors.text }} />
                  </div>
                </div>
              </div>
            </div>

            <ThemedButton
              onClick={spinWheel}
              disabled={spinning || !user || (user.dailySpinsLeft ?? 0) <= 0}
              variant="primary"
              className="w-full font-bold py-6 text-lg disabled:opacity-50 shadow-xl"
              style={{ cursor: 'pointer' }}
            >
              {spinning ? (
                <>
                  <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"
                    style={{ borderColor: theme.colors.text }}
                  />
                  Çark Dönüyor...
                </>
              ) : !user ? (
                <>
                  <TrendingUp className="w-6 h-6 mr-2" />
                  Giriş Yapın
                </>
              ) : (user.dailySpinsLeft ?? 0) <= 0 ? (
                <>
                  <TrendingUp className="w-6 h-6 mr-2" />
                  Hakkınız Bitti
                </>
              ) : (
                <>
                  <TrendingUp className="w-6 h-6 mr-2" />
                  Çarkı Çevir
                </>
              )}
            </ThemedButton>
          </div>

          <div className="flex flex-col">
            <h3
              className="text-lg lg:text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: theme.colors.text }}
            >
              <Trophy className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: theme.colors.warning }} />
              Son Kazananlar
            </h3>
            {recentWinners.length === 0 ? (
              <ThemedEmptyState
                icon={<Trophy className="w-12 h-12" />}
                title="Henüz kazanan yok"
              />
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] lg:max-h-none">
                {recentWinners.map((winner) => (
                  <ThemedCard key={winner.id} variant="hover" className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="w-10 h-10 border-2"
                        style={{ borderColor: `${theme.colors.warning}50` }}
                      >
                        {winner.user.avatar ? (
                          <AvatarImage src={winner.user.avatar} alt="Avatar" />
                        ) : (
                          <AvatarFallback
                            className="font-bold text-sm"
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors.warning}, ${theme.colors.primary})`,
                              color: theme.colors.text
                            }}
                          >
                            {winner.user.siteUsername?.[0] || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: theme.colors.text }}>
                          {winner.user.siteUsername || 'Kullanıcı'}
                        </p>
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                          {winner.prize.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg" style={{ color: theme.colors.warning }}>+{winner.pointsWon}</p>
                        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                          {new Date(winner.spunAt).toLocaleDateString('tr-TR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </ThemedCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function WheelPage() {
  return (
    <DashboardLayout showYatayBanner={true}>
      <WheelContent />
    </DashboardLayout>
  )
}
