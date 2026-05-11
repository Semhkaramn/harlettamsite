'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordModal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setShowLoginModal } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const resetToken = searchParams.get('reset_token')
    if (resetToken) {
      setToken(resetToken)
      setIsOpen(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.password || !formData.confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (!token) {
      toast.error('Geçersiz sıfırlama linki')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: formData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-bold">Şifre Başarıyla Değiştirildi!</div>
              <div className="text-sm">Şimdi giriş yapabilirsiniz</div>
            </div>
          </div>,
          { duration: 3000 }
        )

        // Modal'ı kapat
        setIsOpen(false)
        setFormData({ password: '', confirmPassword: '' })

        // URL'den token'ı temizle
        router.push('/')

        // Login modal'ını aç
        setTimeout(() => {
          setShowLoginModal(true)
        }, 500)
      } else {
        toast.error(data.error || 'Şifre sıfırlama başarısız')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setFormData({ password: '', confirmPassword: '' })
    router.push('/')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-500/10 rounded-full">
              <Lock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Şifre Sıfırlama</DialogTitle>
          <DialogDescription className="text-gray-400 text-center">
            Yeni şifrenizi belirleyin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Yeni Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">
                Yeni Şifre (Tekrar)
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>• Şifre en az 6 karakter olmalıdır</p>
              <p>• Şifreler eşleşmelidir</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Şifre Değiştiriliyor...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Şifreyi Değiştir
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-400">
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-400 font-medium"
              >
                İptal
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
