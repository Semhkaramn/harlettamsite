'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { ThemedButton } from '@/components/ui/themed'

function RegisterModalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useUserTheme()

  const { showRegisterModal, setShowRegisterModal, setShowLoginModal, setShowChannelModal, refreshUser, returnUrl, setReturnUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    siteUsername: '',
    password: '',
    confirmPassword: ''
  })

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email })
    if (email.length > 0) {
      setEmailError(!validateEmail(email))
    } else {
      setEmailError(false)
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    return (
      formData.email.trim() !== '' &&
      validateEmail(formData.email) &&
      formData.siteUsername.trim() !== '' &&
      formData.password.trim() !== '' &&
      formData.confirmPassword.trim() !== '' &&
      formData.password === formData.confirmPassword &&
      formData.password.length >= 6
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.siteUsername || !formData.password) {
      toast.error('Lütfen zorunlu alanları doldurun')
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error('Lütfen geçerli bir email adresi girin')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          siteUsername: formData.siteUsername,
          password: formData.password
        })
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        toast.error('Sunucu yanıtı alınamadı')
        return
      }

      if (response.ok) {
        toast.success(data.message || 'Kayıt başarılı!')
        await refreshUser()
        setShowRegisterModal(false)

        // Telegram bağlama/kanal modal'ını aç
        setShowChannelModal(true)

        // Form'u temizle
        setFormData({
          email: '',
          siteUsername: '',
          password: '',
          confirmPassword: ''
        })
      } else {
        toast.error(data.error || 'Kayıt başarısız')
      }
    } catch (error) {
      console.error('Register error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const switchToLogin = () => {
    setShowRegisterModal(false)
    setShowLoginModal(true)
  }

  const dialogContentStyle = {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.cardBorder,
    color: theme.colors.text
  }

  const inputStyle = {
    backgroundColor: `${theme.colors.backgroundSecondary}80`,
    borderColor: theme.colors.border,
    color: theme.colors.text
  }

  return (
    <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
      <DialogContent className="sm:max-w-[425px]" style={dialogContentStyle}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full" style={{ backgroundColor: `${theme.colors.success}20` }}>
              <UserPlus className="w-8 h-8" style={{ color: theme.colors.success }} />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center" style={{ color: theme.colors.text }}>Kayıt Ol</DialogTitle>
          <DialogDescription className="text-center" style={{ color: theme.colors.textMuted }}>
            Yeni bir hesap oluşturun
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4 py-4 px-1">
              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: theme.colors.textSecondary }}>
                  Email <span style={{ color: theme.colors.error }}>*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full pl-10"
                    style={{
                      ...inputStyle,
                      borderColor: emailError ? theme.colors.error : theme.colors.border
                    }}
                    disabled={loading}
                    required
                  />
                </div>
                {emailError && (
                  <p className="text-xs" style={{ color: theme.colors.error }}>Lütfen geçerli bir email adresi girin</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUsername" style={{ color: theme.colors.textSecondary }}>
                  Kullanıcı Adı <span style={{ color: theme.colors.error }}>*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                  <Input
                    id="siteUsername"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="kullaniciadi"
                    value={formData.siteUsername}
                    onChange={(e) => setFormData({ ...formData, siteUsername: e.target.value })}
                    className="w-full pl-10"
                    style={inputStyle}
                    disabled={loading}
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: theme.colors.textSecondary }}>
                  Şifre <span style={{ color: theme.colors.error }}>*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10"
                    style={inputStyle}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" style={{ color: theme.colors.textSecondary }}>
                  Şifre Tekrar <span style={{ color: theme.colors.error }}>*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: theme.colors.textMuted }} />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-10"
                    style={inputStyle}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex flex-col gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
            <ThemedButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt yapılıyor...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Kayıt Ol
                </>
              )}
            </ThemedButton>

            <p className="text-center text-sm" style={{ color: theme.colors.textMuted }}>
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={switchToLogin}
                className="font-medium hover:opacity-80"
                style={{ color: theme.colors.primary }}
              >
                Giriş Yap
              </button>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function RegisterModal() {
  return (
    <Suspense fallback={<div />}>
      <RegisterModalContent />
    </Suspense>
  )
}
