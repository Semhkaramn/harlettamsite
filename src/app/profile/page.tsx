'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileTabs from '@/components/profile/ProfileTabs'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import {
  ThemedCard,
  ThemedButton,
  hexToRgba,
} from '@/components/ui/themed'
import { Building2, Share2, ArrowRight, Gift, Star, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'

interface PointHistory {
  id: string
  amount: number
  type: string
  description: string
  adminUsername?: string
  createdAt: string
}

interface Rank {
  id: string
  name: string
  icon: string
  color: string
  minXp: number
  order: number
}

interface Sponsor {
  id: string
  name: string
  identifierType: string
  logoUrl?: string
}

interface UserSponsorInfo {
  id: string
  identifier: string
  sponsor: Sponsor
}

interface UserData {
  id: string
  telegramId?: string
  telegramUsername?: string
  email?: string
  emailVerified?: boolean
  siteUsername?: string
  username?: string
  firstName?: string
  lastName?: string
  points: number
  xp: number
  totalMessages: number
  totalReferrals: number
  referralPoints: number
  pointHistory?: PointHistory[]
  messageStats?: {
    daily: number
    weekly: number
    monthly: number
    total: number
  }
  rank?: Rank
  nextRank?: Rank
  allRanks?: Rank[]
  dailySpinsLeft: number
  leaderboardRank?: number
  createdAt: string
  walletAddress?: string
  trc20WalletAddress?: string
}

interface Purchase {
  id: string
  item: {
    name: string
    imageUrl?: string
  }
  pointsSpent: number
  status: string
  purchasedAt: string
}

function ProfileContent() {
  const { refreshUser } = useAuth()
  const { theme } = useUserTheme()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  // Promocode state
  const [promocode, setPromocode] = useState('')
  const [promocodeLoading, setPromocodeLoading] = useState(false)
  const [promocodeSuccess, setPromocodeSuccess] = useState<{ points: number } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Cache bypass için timestamp ekle
      const ts = Date.now()
      const [userRes, purchasesRes] = await Promise.all([
        fetch(`/api/user/me?_t=${ts}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/user/me/purchases?_t=${ts}`, { credentials: 'include', cache: 'no-store' })
      ])

      if (!userRes.ok || !purchasesRes.ok) {
        throw new Error('API request failed')
      }

      const userDataRes = await userRes.json()
      const purchasesData = await purchasesRes.json()

      setUserData(userDataRes)
      setPurchases(purchasesData.purchases || [])
    } catch (error) {
      console.error('Error loading profile data:', error)
      // Set empty data to stop loading spinner
      setUserData({
        id: '',
        points: 0,
        xp: 0,
        totalMessages: 0,
        totalReferrals: 0,
        referralPoints: 0,
        dailySpinsLeft: 0,
        createdAt: new Date().toISOString()
      } as UserData)
    } finally {
      setLoading(false)
    }
  }

  async function handlePromocodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!promocode.trim() || promocodeLoading) return

    setPromocodeLoading(true)
    setPromocodeSuccess(null)

    try {
      const res = await fetch('/api/promocode/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: promocode.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setPromocodeSuccess({ points: data.pointsEarned })
        toast.success(data.message || 'Promocode başarıyla kullanıldı!')
        refreshUser()
        loadData() // Profil verilerini yenile
        setPromocode('')

        // 3 saniye sonra success mesajını kaldır
        setTimeout(() => setPromocodeSuccess(null), 3000)
      } else {
        toast.error(data.error || 'Promocode kullanılamadı')
      }
    } catch (error) {
      console.error('Promocode hatası:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setPromocodeLoading(false)
    }
  }

  if (loading || !userData) {
    return <LoadingSpinner fullscreen={true} />
  }

  return (
    <DashboardLayout>
      <div className="user-page-container">
        <div className="user-page-inner space-y-4">
          {/* Profile Header */}
          <ProfileHeader userData={userData} onUpdate={loadData} />

          {/* Promocode Section - PromoCodeModal Style */}
          <ThemedCard
            variant="active"
            className="p-0"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(theme.colors.accent, 0.1)}, ${hexToRgba(theme.colors.success, 0.05)})`,
              borderColor: hexToRgba(theme.colors.accent, 0.3)
            }}
          >
            <div className="p-4">
              {promocodeSuccess ? (
                <div className="py-4 text-center space-y-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                    style={{ backgroundColor: hexToRgba(theme.colors.success, 0.3) }}
                  >
                    <CheckCircle className="w-7 h-7" style={{ color: theme.colors.success }} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>Tebrikler!</p>
                    <div className="flex items-center justify-center gap-2 text-xl font-bold" style={{ color: theme.colors.warning }}>
                      <Star className="w-5 h-5" style={{ fill: theme.colors.warning }} />
                      +{promocodeSuccess.points} Puan
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePromocodeSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                      PROMOCODE
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Gift
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                          style={{ color: theme.colors.textMuted }}
                        />
                        <Input
                          value={promocode}
                          onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                          className="w-full pl-10 font-mono tracking-wider"
                          style={{
                            background: hexToRgba(theme.colors.backgroundSecondary, 0.5),
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                          }}
                          placeholder="KODUNUZ"
                          disabled={promocodeLoading}
                          autoComplete="off"
                        />
                      </div>
                      <ThemedButton
                        type="submit"
                        disabled={!promocode.trim() || promocodeLoading}
                        variant="primary"
                        className="px-5 whitespace-nowrap"
                      >
                        {promocodeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Gift className="mr-2 h-4 w-4" />
                            Kullan
                          </>
                        )}
                      </ThemedButton>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </ThemedCard>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Social Media Link */}
            <Link href="/profile/social-media">
              <ThemedCard
                variant="active"
                className="p-0 cursor-pointer group transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}10, ${theme.colors.accent}10)`,
                  borderColor: `${theme.colors.primary}30`
                }}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center border"
                        style={{
                          background: `${theme.colors.primary}20`,
                          borderColor: `${theme.colors.primary}30`
                        }}
                      >
                        <Share2 className="w-6 h-6" style={{ color: theme.colors.primary }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg" style={{ color: theme.colors.text }}>Sosyal Medya Bağlama</h3>
                        <p className="text-xs sm:text-sm" style={{ color: theme.colors.textMuted }}>Hesaplarınızı Bağlayın</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" style={{ color: theme.colors.primary }} />
                  </div>
                </div>
              </ThemedCard>
            </Link>

            {/* Sponsors Link */}
            <Link href="/profile/sponsors">
              <ThemedCard
                variant="active"
                className="p-0 cursor-pointer group transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.gradientFrom}10, ${theme.colors.gradientTo}10)`,
                  borderColor: `${theme.colors.gradientFrom}30`
                }}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center border"
                        style={{
                          background: `${theme.colors.gradientFrom}20`,
                          borderColor: `${theme.colors.gradientFrom}30`
                        }}
                      >
                        <Building2 className="w-6 h-6" style={{ color: theme.colors.gradientFrom }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg" style={{ color: theme.colors.text }}>Ödeme & Sponsorlar</h3>
                        <p className="text-xs sm:text-sm" style={{ color: theme.colors.textMuted }}>Ödeme & Sponsor bilgilerinizi ekleyin</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" style={{ color: theme.colors.gradientFrom }} />
                  </div>
                </div>
              </ThemedCard>
            </Link>
          </div>

          {/* History, Purchases, Ranks Tabs - Full Width */}
          <ProfileTabs
            pointHistory={userData.pointHistory}
            purchases={purchases}
            allRanks={userData.allRanks}
            currentRank={userData.rank}
            nextRank={userData.nextRank}
            currentXp={userData.xp}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ProfileContent />
    </ProtectedRoute>
  )
}
