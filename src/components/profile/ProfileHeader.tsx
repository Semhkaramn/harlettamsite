'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageSquare, Clock, Mail, Key, Send, Shield, CheckCircle2, AlertCircle, LogOut, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Rank {
  id: string
  name: string
  icon: string
  color: string
  minXp: number
  order: number
}

interface UserData {
  id: string
  siteUsername?: string
  firstName?: string
  email?: string
  emailVerified?: boolean
  points: number
  xp: number
  totalMessages?: number
  totalReferrals?: number
  rank?: Rank
  nextRank?: Rank
  leaderboardRank?: number
  createdAt: string
  avatar?: string
  messageStats?: {
    total: number
    daily?: number
    weekly?: number
    monthly?: number
  }
}

interface ProfileHeaderProps {
  userData: UserData
  onUpdate: () => Promise<void>
}

// Available avatars
const AVATARS = Array.from({ length: 10 }, (_, i) => `/avatar/${i + 1}.svg`)

export default function ProfileHeader({ userData, onUpdate }: ProfileHeaderProps) {
  const router = useRouter()
  const { logout } = useAuth()
  const { theme, card, button, badge } = useUserTheme()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [changingAvatar, setChangingAvatar] = useState(false)

  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function handleLogout() {
    await logout()
    toast.success('Çıkış yapıldı')
    router.push('/')
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Tüm alanları doldurun')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır')
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Şifre başarıyla değiştirildi')
        setShowPasswordDialog(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Şifre değiştirilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setChangingPassword(false)
    }
  }

  async function sendVerificationCode() {
    setSendingCode(true)
    try {
      const response = await fetch('/api/user/send-verification-email', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        setShowEmailVerification(true)
      } else {
        toast.error(data.error || 'Kod gönderilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSendingCode(false)
    }
  }

  async function verifyEmail() {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Geçerli bir 6 haneli kod girin')
      return
    }
    setVerifying(true)
    try {
      const response = await fetch('/api/user/verify-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Email başarıyla doğrulandı!')
        setShowEmailVerification(false)
        setVerificationCode('')
        await onUpdate()
      } else {
        toast.error(data.error || 'Doğrulama başarısız')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setVerifying(false)
    }
  }

  async function changeAvatar(avatarPath: string) {
    setChangingAvatar(true)
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarPath })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Avatar başarıyla değiştirildi')
        setShowAvatarDialog(false)
        await onUpdate()
      } else {
        toast.error(data.error || 'Avatar değiştirilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setChangingAvatar(false)
    }
  }

  return (
    <>
      <Card
        className={`overflow-hidden ${card('hover')}`}
        style={{ background: `linear-gradient(135deg, ${theme.colors.backgroundSecondary}cc, ${theme.colors.background}cc)` }}
      >
        <div className="p-4 sm:p-5">
          {/* Top Section: Avatar + Info + Logout */}
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            {/* Avatar */}
            <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => setShowAvatarDialog(true)}>
              <div
                className="absolute -inset-0.5 rounded-full opacity-60 group-hover:opacity-100 blur-sm transition-all"
                style={{ background: `linear-gradient(to right, ${theme.colors.gradientFrom}, ${theme.colors.gradientVia || theme.colors.gradientFrom}, ${theme.colors.gradientTo})` }}
              />
              <Avatar className="relative w-14 h-14 sm:w-16 sm:h-16 border-2 border-white/20 shadow-xl">
                {userData.avatar ? (
                  <Image src={userData.avatar} alt="Avatar" width={64} height={64} className="rounded-full" />
                ) : (
                  <AvatarFallback
                    className="text-white text-xl sm:text-2xl font-bold"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientVia || theme.colors.gradientFrom}, ${theme.colors.gradientTo})` }}
                  >
                    {userData.siteUsername?.[0] || userData.firstName?.[0] || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              {/* Edit Icon */}
              <div
                className="absolute bottom-0 right-0 rounded-full p-1.5 shadow-lg transition-colors"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Pencil className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold mb-1 truncate" style={{ color: theme.colors.text }}>
                {userData.siteUsername || userData.firstName || 'Kullanıcı'}
              </h1>

              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {userData.rank && (
                  <Badge className="text-xs font-semibold py-0.5 px-2" style={{ backgroundColor: userData.rank.color }}>
                    <span className="text-sm mr-0.5">{userData.rank.icon}</span>
                    {userData.rank.name}
                  </Badge>
                )}
                {userData.createdAt && (
                  <Badge
                    variant="outline"
                    className="py-0.5 px-2 text-xs"
                    style={{
                      borderColor: `${theme.colors.border}60`,
                      color: theme.colors.textMuted,
                      backgroundColor: `${theme.colors.backgroundSecondary}30`
                    }}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(userData.createdAt).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}
                  </Badge>
                )}
                {/* XP Badge */}
                <Badge
                  variant="outline"
                  className="py-0.5 px-2 text-xs font-semibold"
                  style={{
                    borderColor: `${theme.colors.accent}50`,
                    color: theme.colors.accent,
                    backgroundColor: `${theme.colors.accent}10`
                  }}
                >
                  <span className="mr-1">XP</span>
                  {userData.xp?.toLocaleString() || 0}
                </Badge>
                {/* Puan Badge */}
                <Badge
                  variant="outline"
                  className="py-0.5 px-2 text-xs font-semibold"
                  style={{
                    borderColor: `${theme.colors.warning}50`,
                    color: theme.colors.warning,
                    backgroundColor: `${theme.colors.warning}10`
                  }}
                >
                  <span className="mr-1">Puan</span>
                  {userData.points?.toLocaleString() || 0}
                </Badge>
              </div>
            </div>

            {/* Logout Button - Sağda */}
            <button
              onClick={handleLogout}
              className="flex-shrink-0 flex items-center gap-1.5 transition-colors text-xs sm:text-sm font-medium px-2 py-1.5 rounded-lg"
              style={{ color: theme.colors.error }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>

          {/* Message Statistics */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.colors.textSecondary }}>
              <MessageSquare className="w-4 h-4" />
              Mesaj İstatistikleri
            </h3>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <div
                className="border rounded-lg p-1.5 sm:p-2.5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}10, ${theme.colors.primary}15)`,
                  borderColor: `${theme.colors.primary}30`
                }}
              >
                <div className="text-sm sm:text-xl font-bold" style={{ color: theme.colors.primary }}>{userData.messageStats?.daily || 0}</div>
                <p className="text-[8px] sm:text-xs font-medium" style={{ color: theme.colors.textMuted }}>Günlük</p>
              </div>
              <div
                className="border rounded-lg p-1.5 sm:p-2.5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent}10, ${theme.colors.accent}15)`,
                  borderColor: `${theme.colors.accent}30`
                }}
              >
                <div className="text-sm sm:text-xl font-bold" style={{ color: theme.colors.accent }}>{userData.messageStats?.weekly || 0}</div>
                <p className="text-[8px] sm:text-xs font-medium" style={{ color: theme.colors.textMuted }}>Haftalık</p>
              </div>
              <div
                className="border rounded-lg p-1.5 sm:p-2.5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.gradientTo}10, ${theme.colors.gradientTo}15)`,
                  borderColor: `${theme.colors.gradientTo}30`
                }}
              >
                <div className="text-sm sm:text-xl font-bold" style={{ color: theme.colors.gradientTo }}>{userData.messageStats?.monthly || 0}</div>
                <p className="text-[8px] sm:text-xs font-medium" style={{ color: theme.colors.textMuted }}>Aylık</p>
              </div>
              <div
                className="border rounded-lg p-1.5 sm:p-2.5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.success}10, ${theme.colors.success}15)`,
                  borderColor: `${theme.colors.success}30`
                }}
              >
                <div className="text-sm sm:text-xl font-bold" style={{ color: theme.colors.success }}>{userData.messageStats?.total || 0}</div>
                <p className="text-[8px] sm:text-xs font-medium" style={{ color: theme.colors.textMuted }}>Tümü</p>
              </div>
            </div>
          </div>

          {/* Email & Password Actions */}
          {userData.email && (
            <div className="pt-3 space-y-2" style={{ borderTop: `1px solid ${theme.colors.border}50` }}>
              {/* Email Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: theme.colors.accent }} />
                  <span className="text-xs truncate" style={{ color: theme.colors.textMuted }}>{userData.email}</span>
                  {userData.emailVerified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.colors.success }} />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.colors.warning }} />
                  )}
                </div>
                {!userData.emailVerified && (
                  <Button
                    onClick={sendVerificationCode}
                    disabled={sendingCode}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    style={{
                      borderColor: `${theme.colors.accent}50`,
                      color: theme.colors.accent
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Doğrula
                  </Button>
                )}
              </div>

              {/* Password Change Button */}
              <Button
                onClick={() => setShowPasswordDialog(true)}
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                style={{
                  borderColor: `${theme.colors.warning}50`,
                  color: theme.colors.warning
                }}
              >
                <Key className="w-3 h-3 mr-1.5" />
                Şifre Değiştir
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Avatar Selection Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent
          className="border"
          style={{ backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: theme.colors.text }}>Avatar Seç</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-3 py-4">
            {AVATARS.map((avatar, index) => (
              <button
                key={avatar}
                onClick={() => changeAvatar(avatar)}
                disabled={changingAvatar}
                className="relative group aspect-square rounded-lg overflow-hidden border-2 transition-all"
                style={{ borderColor: theme.colors.border }}
              >
                <Image
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
                {userData.avatar === avatar && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: `${theme.colors.primary}30` }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent
          className="border"
          style={{ backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: theme.colors.text }}>Şifre Değiştir</AlertDialogTitle>
            <AlertDialogDescription style={{ color: theme.colors.textMuted }}>
              Güvenliğiniz için mevcut şifrenizi girin ve yeni şifrenizi belirleyin
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="current-password" style={{ color: theme.colors.text }}>Mevcut Şifre</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                placeholder="Mevcut şifreniz"
              />
            </div>
            <div>
              <Label htmlFor="new-password" style={{ color: theme.colors.text }}>Yeni Şifre</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                placeholder="En az 6 karakter"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" style={{ color: theme.colors.text }}>Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                placeholder="Yeni şifrenizi tekrar girin"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={button('secondary')}
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={changePassword}
              disabled={changingPassword}
              style={{ background: `linear-gradient(to right, ${theme.colors.warning}, ${theme.colors.error})` }}
            >
              {changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Verification Dialog */}
      <AlertDialog open={showEmailVerification} onOpenChange={setShowEmailVerification}>
        <AlertDialogContent
          className="border"
          style={{ backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: theme.colors.text }}>Email Doğrulama</AlertDialogTitle>
            <AlertDialogDescription style={{ color: theme.colors.textMuted }}>
              Email adresinize gönderilen 6 haneli kodu girin
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="verification-code" style={{ color: theme.colors.text }}>Doğrulama Kodu</Label>
            <Input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest border"
              style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
              placeholder="000000"
              maxLength={6}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={button('secondary')}
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={verifyEmail}
              disabled={verifying}
              className={button('primary')}
            >
              {verifying ? 'Doğrulanıyor...' : 'Doğrula'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
