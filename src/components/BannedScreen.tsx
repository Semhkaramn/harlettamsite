'use client'

import { Card } from '@/components/ui/card'
import { Ban, ShieldX, AlertTriangle } from 'lucide-react'
import { useUserTheme } from '@/components/providers/user-theme-provider'

interface BannedScreenProps {
  banReason?: string
  bannedAt?: Date | string
  bannedBy?: string
}

export function BannedScreen({ banReason, bannedAt, bannedBy }: BannedScreenProps) {
  const { theme } = useUserTheme()

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(to bottom right, ${theme.colors.error}30, ${theme.colors.background}, ${theme.colors.backgroundSecondary})`
      }}
    >
      <Card
        className="max-w-md w-full p-8 text-center"
        style={{
          backgroundColor: `${theme.colors.error}15`,
          borderColor: `${theme.colors.error}50`
        }}
      >
        <div className="mb-6">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{ backgroundColor: `${theme.colors.error}20` }}
          >
            <ShieldX className="w-12 h-12" style={{ color: theme.colors.error }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: theme.colors.error }}>Hesap Yasaklandı</h1>
          <p style={{ color: theme.colors.textSecondary }}>Hesabınız sistem yöneticileri tarafından yasaklanmıştır.</p>
        </div>

        <div className="space-y-4 mb-6">
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: `${theme.colors.error}20`,
              borderColor: `${theme.colors.error}50`,
              borderWidth: 1
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: theme.colors.error }} />
              <div className="text-left">
                <p className="text-sm font-semibold mb-1" style={{ color: `${theme.colors.error}CC` }}>Ban Nedeni:</p>
                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  {banReason || 'Sistem kurallarını ihlal ettiniz.'}
                </p>
              </div>
            </div>
          </div>

          {bannedAt && (
            <div className="text-sm" style={{ color: theme.colors.textMuted }}>
              <p>
                <span className="font-semibold">Tarih:</span>{' '}
                {new Date(bannedAt).toLocaleString('tr-TR')}
              </p>
            </div>
          )}

          {bannedBy && (
            <div className="text-sm" style={{ color: theme.colors.textMuted }}>
              <p>
                <span className="font-semibold">Yasaklayan:</span> {bannedBy}
              </p>
            </div>
          )}
        </div>

        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: `${theme.colors.backgroundSecondary}80`,
            borderColor: theme.colors.border,
            borderWidth: 1
          }}
        >
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: theme.colors.warning }} />
            <div className="text-left">
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                Bu yasak kalıcıdır ve bot özelliklerini kullanmanız engellenmiştir.
                Eğer bunun bir hata olduğunu düşünüyorsanız, lütfen destek ekibiyle iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
