'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, ImagePlus, X, Sparkles, Crown } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

// Sabit mavi tema renkleri
const theme = {
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  gradientFrom: '#3b82f6',
  gradientTo: '#1d4ed8',
  success: '#22c55e',
  warning: '#f59e0b',
  card: 'rgba(30, 41, 59, 0.8)',
  border: 'rgba(71, 85, 105, 0.5)',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  background: '#0f172a',
  backgroundSecondary: '#1e293b',
}

interface Sponsor {
  id: string
  name: string
  logoUrl?: string
}

export default function CreateEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sponsors, setSponsors] = useState<Sponsor[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    imagePublicId: '',
    sponsorId: '',
    participantLimit: 10,
    participationType: 'limited' as 'limited' | 'raffle',
    endDate: ''
  })

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      router.push('/admin')
      return
    }
    loadSponsors()
  }, [])

  async function loadSponsors() {
    try {
      const res = await fetch('/api/admin/sponsors', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSponsors(data.sponsors || [])
    } catch {
      toast.error('Sponsorlar yüklenemedi')
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu en fazla 5MB olabilir')
      return
    }

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'events')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Yükleme başarısız')
      }

      const data = await res.json()

      setFormData(prev => ({
        ...prev,
        imageUrl: data.url,
        imagePublicId: data.publicId
      }))
      toast.success('Görsel yüklendi')
    } catch (error: any) {
      toast.error(error.message || 'Görsel yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title || !formData.sponsorId || !formData.endDate) {
      toast.error('Lütfen tüm gerekli alanları doldurun')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Hata oluştu')
      }

      toast.success('Etkinlik oluşturuldu')
      router.push('/admin/events')
    } catch (error: any) {
      toast.error(error.message || 'Etkinlik oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="h-10 px-4 rounded-xl transition-all duration-200"
            style={{
              color: theme.textSecondary,
              background: `${theme.backgroundSecondary}50`
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: theme.text }}>Yeni Etkinlik Oluştur</h1>
            <p className="text-xs" style={{ color: theme.textMuted }}>Yeni bir etkinlik ekle</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="p-6 space-y-6 rounded-2xl"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              boxShadow: `0 8px 32px ${theme.gradientFrom}08, 0 2px 8px rgba(0,0,0,0.12)`
            }}
          >
            {/* Görsel */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Etkinlik Görseli</Label>
              {formData.imageUrl ? (
                <div
                  className="relative w-full h-44 rounded-xl overflow-hidden"
                  style={{
                    background: theme.backgroundSecondary,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '', imagePublicId: '' }))}
                    className="absolute top-2 right-2 p-1.5 rounded-lg transition-all"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      color: theme.textSecondary
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center w-full h-44 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-80"
                  style={{
                    background: `${theme.backgroundSecondary}80`,
                    border: `2px dashed ${theme.border}`
                  }}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    {uploading ? (
                      <Loader2 className="w-10 h-10 mb-2 animate-spin" style={{ color: theme.primary }} />
                    ) : (
                      <ImagePlus className="w-10 h-10 mb-2" style={{ color: theme.textMuted }} />
                    )}
                    <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>
                      {uploading ? 'Yükleniyor...' : 'Görsel yüklemek için tıklayın'}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: theme.textMuted }}>Max 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Başlık */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Başlık *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Etkinlik başlığı"
                className="h-11 text-sm rounded-xl"
                style={{
                  background: theme.backgroundSecondary,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
                required
              />
            </div>

            {/* Açıklama */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Etkinlik açıklaması (isteğe bağlı)"
                className="text-sm rounded-xl min-h-[100px] resize-none"
                style={{
                  background: theme.backgroundSecondary,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
                rows={4}
              />
            </div>

            {/* Sponsor */}
            <div className="space-y-2">
              <Label htmlFor="sponsor" className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Sponsor *</Label>
              <Select
                value={formData.sponsorId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorId: value }))}
              >
                <SelectTrigger
                  className="h-11 text-sm rounded-xl"
                  style={{
                    background: theme.backgroundSecondary,
                    border: `1px solid ${theme.border}`,
                    color: theme.text
                  }}
                >
                  <SelectValue placeholder="Sponsor seçin" />
                </SelectTrigger>
                <SelectContent
                  className="rounded-xl"
                  style={{
                    background: theme.backgroundSecondary,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  {sponsors.map(sponsor => (
                    <SelectItem
                      key={sponsor.id}
                      value={sponsor.id}
                      className="text-sm"
                      style={{ color: theme.text }}
                    >
                      {sponsor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Etkinlik Tipi */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Etkinlik Tipi *</Label>
              <Select
                value={formData.participationType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, participationType: value as 'limited' | 'raffle' }))}
              >
                <SelectTrigger
                  className="h-11 text-sm rounded-xl"
                  style={{
                    background: theme.backgroundSecondary,
                    border: `1px solid ${theme.border}`,
                    color: theme.text
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="rounded-xl"
                  style={{
                    background: theme.backgroundSecondary,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  <SelectItem value="limited" className="text-sm" style={{ color: theme.text }}>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" style={{ color: theme.success }} />
                      İlk Gelenler
                    </div>
                  </SelectItem>
                  <SelectItem value="raffle" className="text-sm" style={{ color: theme.text }}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: theme.primary }} />
                      Çekiliş
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px]" style={{ color: theme.textMuted }}>
                {formData.participationType === 'raffle'
                  ? 'Sınırsız katılımcı katılabilir, süre sonunda çekiliş yapılır'
                  : 'İlk belirtilen sayıda kişi otomatik kazanır'}
              </p>
            </div>

            {/* Kazanan Sayısı */}
            <div className="space-y-2">
              <Label htmlFor="limit" className="text-xs font-semibold" style={{ color: theme.textSecondary }}>
                Kazanan Sayısı *
              </Label>
              <Input
                id="limit"
                type="number"
                min="1"
                value={formData.participantLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, participantLimit: parseInt(e.target.value) || 1 }))}
                className="h-11 text-sm rounded-xl"
                style={{
                  background: theme.backgroundSecondary,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
                required
              />
              <p className="text-[11px]" style={{ color: theme.textMuted }}>
                {formData.participationType === 'raffle'
                  ? 'Çekilişte kaç kişi kazanacak?'
                  : 'İlk kaç kişi kazanacak?'}
              </p>
            </div>

            {/* Bitiş Tarihi */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Bitiş Tarihi *</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="h-11 text-sm rounded-xl"
                style={{
                  background: theme.backgroundSecondary,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1 h-11 text-sm rounded-xl"
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.textSecondary
                }}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 h-11 text-sm rounded-xl border-0 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                  color: 'white',
                  boxShadow: `0 4px 16px ${theme.gradientFrom}40`
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  'Etkinlik Oluştur'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
