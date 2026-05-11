'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProfileTelegram from '@/components/profile/ProfileTelegram'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ArrowLeft } from 'lucide-react'
import { useUserTheme } from '@/components/providers/user-theme-provider'

interface TelegramStatus {
  connected: boolean
  canReconnect: boolean
  daysUntilReconnect?: number
}

interface UserData {
  telegramId?: string
  telegramUsername?: string
}

function SocialMediaContent() {
  const router = useRouter()
  const { theme, button } = useUserTheme()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>({ connected: false, canReconnect: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [userRes, telegramRes] = await Promise.all([
        fetch('/api/user/me'),
        fetch('/api/user/telegram-status')
      ])

      const userDataRes = await userRes.json()
      const telegramData = await telegramRes.json()

      setUserData(userDataRes)
      setTelegramStatus(telegramData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      {loading || !userData ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner fullscreen={false} />
        </div>
      ) : (
      <div className="user-page-container">
        <div className="user-page-inner space-y-4">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/profile')}
              variant="outline"
              size="sm"
              className={button('outline')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: theme.colors.text }}
            >
              Sosyal Medya Bağlama
            </h1>
          </div>

          {/* Telegram Connection */}
          <ProfileTelegram
            telegramUsername={userData.telegramUsername}
            telegramId={userData.telegramId}
            telegramStatus={telegramStatus}
            onUpdate={loadData}
          />

          {/* Other social media platforms can be added here */}
        </div>
      </div>
      )}
    </DashboardLayout>
  )
}

export default function SocialMediaPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <SocialMediaContent />
    </ProtectedRoute>
  )
}
