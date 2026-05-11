'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MonitorPlay, GripVertical, Eye, EyeOff, Share2, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Image from 'next/image'
import { optimizeCloudinaryImage } from '@/lib/utils'

interface Setting {
  id: string
  key: string
  value: string
  description: string
  category: string
}

interface Sponsor {
  id: string
  name: string
  logoUrl?: string
  websiteUrl?: string
  category: string
  isActive: boolean
  order: number
  showInBanner: boolean
}

interface SocialMedia {
  id: string
  name: string
  platform: string
  username: string
  isActive: boolean
  order: number
}

const SOCIAL_PLATFORMS = [
  { value: 'telegram', label: 'Telegram', icon: '📱' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { value: 'youtube', label: 'YouTube', icon: '📺' },
  { value: 'discord', label: 'Discord', icon: '💬' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'facebook', label: 'Facebook', icon: '👥' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💚' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'twitch', label: 'Twitch', icon: '🎮' }
]

export default function AdminAdsPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
    }
  }, [])

  return (
    <div className="admin-page-container">
      <div className="admin-page-inner">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <MonitorPlay className="w-8 h-8" />
              Reklam Alanı Yönetimi
            </h1>
            <p className="admin-page-subtitle">Sponsor banner, sosyal medya ve popup yönetimi</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="banner" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/5">
            <TabsTrigger value="banner">Kayan Banner</TabsTrigger>
            <TabsTrigger value="yataybanner">Yatay Banner</TabsTrigger>
            <TabsTrigger value="sidebanner">Yan Bannerlar</TabsTrigger>
            <TabsTrigger value="social">
              <Share2 className="w-4 h-4 mr-2" />
              Sosyal Medya
            </TabsTrigger>
            <TabsTrigger value="popup">Popup Ayarları</TabsTrigger>
          </TabsList>

          {/* Banner Tab */}
          <TabsContent value="banner" className="space-y-6 mt-6">
            <BannerSettings />
          </TabsContent>

          {/* Yatay Banner Tab */}
          <TabsContent value="yataybanner" className="space-y-6 mt-6">
            <YatayBannerSettings />
          </TabsContent>

          {/* Side Banner Tab */}
          <TabsContent value="sidebanner" className="space-y-6 mt-6">
            <SideBannerSettings />
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-6 mt-6">
            <SocialMediaSettings />
          </TabsContent>

          {/* Popup Tab */}
          <TabsContent value="popup" className="space-y-6 mt-6">
            <PopupSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Banner Settings Component
function BannerSettings() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [sponsorBannerEnabled, setSponsorBannerEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const token = localStorage.getItem('admin_token')
      const [sponsorsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/sponsors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const sponsorsData = await sponsorsRes.json()
      const settingsData = await settingsRes.json()

      // ✅ FIX: Sadece order'a göre sırala - kullanıcının belirlediği sıra korunur
      setSponsors((sponsorsData.sponsors || []).sort((a: Sponsor, b: Sponsor) => a.order - b.order))

      const bannerSetting = settingsData.settings.find((s: Setting) => s.key === 'sponsor_banner_enabled')
      setSponsorBannerEnabled(bannerSetting?.value === 'true')
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function toggleBanner() {
    const newValue = !sponsorBannerEnabled
    setSponsorBannerEnabled(newValue)
    setSaving(true)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'sponsor_banner_enabled', value: newValue.toString() })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(newValue ? 'Banner aktif edildi' : 'Banner kapatıldı')
      } else {
        setSponsorBannerEnabled(!newValue)
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      setSponsorBannerEnabled(!newValue)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSponsorInBanner(sponsorId: string, currentValue: boolean) {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/sponsors/${sponsorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showInBanner: !currentValue })
      })

      const data = await response.json()
      if (data.sponsor) {
        setSponsors(prev => prev.map(s =>
          s.id === sponsorId ? { ...s, showInBanner: !currentValue } : s
        ))
        toast.success(!currentValue ? 'Sponsor banner\'a eklendi' : 'Sponsor banner\'dan çıkarıldı')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  function handleDragStart(index: number) {
    setDraggedItem(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newSponsors = [...sponsors]
    const draggedSponsor = newSponsors[draggedItem]
    newSponsors.splice(draggedItem, 1)
    newSponsors.splice(index, 0, draggedSponsor)

    setSponsors(newSponsors)
    setDraggedItem(index)
  }

  async function handleDragEnd() {
    if (draggedItem === null) return

    try {
      const updates = sponsors.map((sponsor, index) => ({
        id: sponsor.id,
        order: index
      }))

      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/sponsors/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sponsors: updates })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Sıralama kaydedildi')
      } else {
        loadData()
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
      loadData()
    } finally {
      setDraggedItem(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const bannerSponsors = sponsors.filter(s => s.showInBanner && s.isActive && s.logoUrl)

  return (
    <>
      {/* Banner Toggle */}
      <Card className="admin-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Kayan Banner Durumu</h2>
            <p className="text-gray-400 text-sm">
              Banner açıkken seçili sponsorlar ana sayfada kayan şerit halinde görünür
            </p>
          </div>
          <Switch
            checked={sponsorBannerEnabled}
            onCheckedChange={toggleBanner}
            disabled={saving}
            className="ml-4 scale-125"
          />
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${sponsorBannerEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${sponsorBannerEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-white font-medium">
              {sponsorBannerEnabled ? `Banner Aktif - ${bannerSponsors.length} sponsor gösteriliyor` : 'Banner Kapalı'}
            </span>
          </div>
        </div>
      </Card>

      {/* Sponsors List */}
      <Card className="admin-card p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-2">Banner'da Gösterilecek Sponsorlar</h2>
          <p className="text-gray-400 text-sm">
            Sponsorları sürükleyerek sıralayın. İlk sponsor en sağdan başlayacak.
          </p>
        </div>

        {sponsors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-3">Henüz sponsor eklenmemiş</p>
            <Link href="/admin/sponsors">
              <Button className="admin-btn-primary">Sponsor Ekle</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sponsors.map((sponsor, index) => (
              <div
                key={sponsor.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-move ${
                  sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'admin-card'
                } ${draggedItem === index ? 'opacity-50' : ''} hover:border-blue-500/50`}
              >
                <GripVertical className="w-5 h-5 admin-text-muted" />
                <div className="text-white font-bold text-lg bg-white/10 rounded-full w-8 h-8 flex items-center justify-center">
                  {index + 1}
                </div>

                {sponsor.logoUrl && (
                  <div className={`w-24 h-12 rounded-lg overflow-hidden flex-shrink-0 ${
                    sponsor.category === 'vip'
                      ? 'border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-900/30 to-amber-800/30'
                      : 'border border-white/10 bg-white/5'
                  }`}>
                    <Image
                      src={optimizeCloudinaryImage(sponsor.logoUrl, 192, 96)}
                      alt={sponsor.name}
                      width={96}
                      height={48}
                      className="object-contain w-full h-full p-1"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{sponsor.name}</h3>
                    {sponsor.category === 'vip' && (
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                        VIP
                      </span>
                    )}
                    {!sponsor.isActive && (
                      <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30">
                        Pasif
                      </span>
                    )}
                    {!sponsor.logoUrl && (
                      <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded border border-orange-500/30">
                        Logo Yok
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl ? "default" : "outline"}
                  onClick={() => toggleSponsorInBanner(sponsor.id, sponsor.showInBanner)}
                  disabled={!sponsor.isActive || !sponsor.logoUrl}
                  className={sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl
                    ? "bg-green-600 hover:bg-green-700"
                    : "admin-btn-outline"
                  }
                >
                  {sponsor.showInBanner && sponsor.isActive && sponsor.logoUrl ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Banner'da
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Gizli
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="bg-blue-500/10 border-blue-500/30 p-4">
        <h4 className="text-blue-300 font-semibold mb-2">💡 Sponsor Yönetimi</h4>
        <p className="text-blue-200 text-sm mb-3">
          Sponsor eklemek, düzenlemek veya silmek için Sponsor Yönetimi sayfasına gidin
        </p>
        <Link href="/admin/sponsors">
          <Button className="admin-btn-primary">Sponsorları Yönet</Button>
        </Link>
      </Card>
    </>
  )
}

// Social Media Settings Component
function SocialMediaSettings() {
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SocialMedia | null>(null)
  const [form, setForm] = useState({
    name: '',
    platform: '',
    username: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const response = await fetch('/api/admin/social-media')
      const data = await response.json()
      setSocialMedia(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading social media:', error)
      toast.error('Sosyal medya bağlantıları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function saveItem() {
    if (!form.name || !form.platform || !form.username) {
      toast.error('Tüm alanları doldurun')
      return
    }

    setSaving(true)
    try {
      const url = editingItem
        ? `/api/admin/social-media/${editingItem.id}`
        : '/api/admin/social-media'

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isActive: true,
          order: editingItem?.order ?? socialMedia.length
        })
      })

      const data = await response.json()
      if (data.id) {
        toast.success(editingItem ? 'Güncellendi' : 'Eklendi')
        loadData()
        closeDialog()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/admin/social-media/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        toast.success('Silindi')
        loadData()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  async function toggleActive(id: string, currentValue: boolean) {
    try {
      const item = socialMedia.find(s => s.id === id)
      if (!item) return

      const response = await fetch(`/api/admin/social-media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: !currentValue })
      })

      const data = await response.json()
      if (data.id) {
        setSocialMedia(prev => prev.map(s =>
          s.id === id ? { ...s, isActive: !currentValue } : s
        ))
        toast.success(!currentValue ? 'Aktif edildi' : 'Pasif edildi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  function handleDragStart(index: number) {
    setDraggedItem(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newItems = [...socialMedia]
    const draggedItemData = newItems[draggedItem]
    newItems.splice(draggedItem, 1)
    newItems.splice(index, 0, draggedItemData)

    setSocialMedia(newItems)
    setDraggedItem(index)
  }

  async function handleDragEnd() {
    if (draggedItem === null) return

    try {
      const updates = socialMedia.map((item, index) => ({
        id: item.id,
        order: index
      }))

      const response = await fetch('/api/admin/social-media/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Sıralama kaydedildi')
      } else {
        loadData()
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
      loadData()
    } finally {
      setDraggedItem(null)
    }
  }

  function openDialog(item?: SocialMedia) {
    if (item) {
      setEditingItem(item)
      setForm({
        name: item.name,
        platform: item.platform,
        username: item.username
      })
    } else {
      setEditingItem(null)
      setForm({ name: '', platform: '', username: '' })
    }
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingItem(null)
    setForm({ name: '', platform: '', username: '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => openDialog()} className="admin-btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Sosyal Medya Ekle
        </Button>
      </div>

      <Card className="admin-card p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-2">Sosyal Medya Bağlantıları</h2>
          <p className="text-gray-400 text-sm">
            Aktif olanlar sidebar'ın en altında görünecektir. Sürükleyerek sıralayın.
          </p>
        </div>

        {socialMedia.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-3">Henüz sosyal medya bağlantısı eklenmemiş</p>
            <Button onClick={() => openDialog()} className="admin-btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Sosyal Medya Ekle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {socialMedia.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-move ${
                  item.isActive
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'admin-card'
                } ${draggedItem === index ? 'opacity-50' : ''} hover:border-blue-500/50`}
              >
                <GripVertical className="w-5 h-5 admin-text-muted" />
                <div className="text-white font-bold text-lg bg-white/10 rounded-full w-8 h-8 flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="text-2xl">{SOCIAL_PLATFORMS.find(p => p.value === item.platform)?.icon}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <span className="text-gray-400 text-xs bg-white/10 px-2 py-0.5 rounded">
                      {SOCIAL_PLATFORMS.find(p => p.value === item.platform)?.label}
                    </span>
                    {!item.isActive && (
                      <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{item.username}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={item.isActive ? "default" : "outline"}
                    onClick={() => toggleActive(item.id, item.isActive)}
                    className={`${item.isActive
                      ? "bg-green-600 hover:bg-green-700"
                      : "admin-btn-outline"
                    }`}
                  >
                    {item.isActive ? (
                      <>
                        <Eye className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Aktif</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Pasif</span>
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog(item)}
                    className="admin-btn-outline"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden md:inline ml-2">Düzenle</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteItem(item.id)}
                    className="border-red-500/30 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden md:inline ml-2">Sil</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="admin-text-primary">
              {editingItem ? 'Sosyal Medya Güncelle' : 'Yeni Sosyal Medya Ekle'}
            </DialogTitle>
            <DialogDescription className="admin-text-muted">
              {editingItem ? 'Mevcut sosyal medya bilgilerini güncelleyin' : 'Yeni sosyal medya bağlantısı ekleyin'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="admin-text-primary">Gösterilecek İsim</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Telegram Kanalımız"
                className="admin-card text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="platform" className="admin-text-primary">Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(value) => setForm(prev => ({ ...prev, platform: value }))}
              >
                <SelectTrigger className="admin-card text-white mt-2">
                  <SelectValue placeholder="Platform seçin" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {SOCIAL_PLATFORMS.map(platform => (
                    <SelectItem key={platform.value} value={platform.value} className="admin-text-primary">
                      {platform.icon} {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="username" className="admin-text-primary">Kullanıcı Adı / Link</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder={form.platform === 'telegram' ? 'lykibom' : 'kullaniciadi veya tam link'}
                className="admin-card text-white mt-2"
              />
              <p className="text-xs admin-page-subtitle">
                {form.platform === 'telegram'
                  ? '@ işareti olmadan sadece kullanıcı adı yazın'
                  : 'Kullanıcı adı veya tam link girebilirsiniz'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={saving}
              className="admin-btn-outline"
            >
              İptal
            </Button>
            <Button
              onClick={saveItem}
              disabled={saving}
              className="admin-btn-primary"
            >
              {saving ? 'Kaydediliyor...' : editingItem ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Side Banner Settings Component
function SideBannerSettings() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [leftBanner, setLeftBanner] = useState({ imageUrl: '', sponsorId: '', enabled: false })
  const [rightBanner, setRightBanner] = useState({ imageUrl: '', sponsorId: '', enabled: false })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const token = localStorage.getItem('admin_token')
      const [sponsorsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/sponsors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const sponsorsData = await sponsorsRes.json()
      const settingsData = await settingsRes.json()

      setSponsors(sponsorsData.sponsors || [])

      const leftBannerData = settingsData.settings.find((s: Setting) => s.key === 'left_banner_data')
      const rightBannerData = settingsData.settings.find((s: Setting) => s.key === 'right_banner_data')

      if (leftBannerData?.value) {
        try {
          setLeftBanner(JSON.parse(leftBannerData.value))
        } catch (e) {
          console.error('Error parsing left banner:', e)
        }
      }

      if (rightBannerData?.value) {
        try {
          setRightBanner(JSON.parse(rightBannerData.value))
        } catch (e) {
          console.error('Error parsing right banner:', e)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function saveBanner(side: 'left' | 'right') {
    const bannerData = side === 'left' ? leftBanner : rightBanner
    setSaving(true)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: `${side}_banner_data`,
          value: JSON.stringify(bannerData)
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`${side === 'left' ? 'Sol' : 'Sağ'} banner kaydedildi`)
      } else {
        toast.error(data.error || 'Banner kaydedilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(file: File, side: 'left' | 'right') {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.url) {
        const currentBanner = side === 'left' ? leftBanner : rightBanner
        const newBanner = { ...currentBanner, imageUrl: data.url }

        // Anlık kaydet
        if (side === 'left') {
          setLeftBanner(newBanner)
        } else {
          setRightBanner(newBanner)
        }

        // Auto-save
        const token = localStorage.getItem('admin_token')
        const saveResponse = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            key: `${side}_banner_data`,
            value: JSON.stringify(newBanner)
          })
        })

        const saveData = await saveResponse.json()
        if (saveData.success) {
          toast.success('Resim yüklendi ve kaydedildi')
        } else {
          toast.error('Resim yüklendi ama kaydedilemedi')
        }
      } else {
        toast.error(data.error || 'Resim yüklenemedi')
      }
    } catch (error) {
      toast.error('Resim yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  async function toggleBanner(side: 'left' | 'right') {
    const currentBanner = side === 'left' ? leftBanner : rightBanner
    const newEnabled = !currentBanner.enabled

    // Update state
    if (side === 'left') {
      setLeftBanner(prev => ({ ...prev, enabled: newEnabled }))
    } else {
      setRightBanner(prev => ({ ...prev, enabled: newEnabled }))
    }

    // Save immediately
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: `${side}_banner_data`,
          value: JSON.stringify({ ...currentBanner, enabled: newEnabled })
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`${side === 'left' ? 'Sol' : 'Sağ'} banner ${newEnabled ? 'aktif edildi' : 'kapatıldı'}`)
      } else {
        // Revert on error
        if (side === 'left') {
          setLeftBanner(prev => ({ ...prev, enabled: !newEnabled }))
        } else {
          setRightBanner(prev => ({ ...prev, enabled: !newEnabled }))
        }
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
      // Revert on error
      if (side === 'left') {
        setLeftBanner(prev => ({ ...prev, enabled: !newEnabled }))
      } else {
        setRightBanner(prev => ({ ...prev, enabled: !newEnabled }))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const renderBannerCard = (side: 'left' | 'right') => {
    const banner = side === 'left' ? leftBanner : rightBanner
    const setBanner = side === 'left' ? setLeftBanner : setRightBanner
    const selectedSponsor = sponsors.find(s => s.id === banner.sponsorId)

    return (
      <Card className="admin-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              {side === 'left' ? 'Sol' : 'Sağ'} Yan Banner
            </h2>
            <p className="text-gray-400 text-sm">
              Masaüstünde {side === 'left' ? 'sol' : 'sağ'} tarafta sabit banner
            </p>
          </div>
          <Switch
            checked={banner.enabled}
            onCheckedChange={() => toggleBanner(side)}
            className="scale-125"
          />
        </div>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label className="admin-text-primary">Banner Görseli (Dikey)</Label>
            <div className="mt-2 space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file, side)
                }}
                disabled={uploading}
                className="admin-card admin-text-primary"
              />
              <p className="text-xs admin-text-muted">
                Önerilen boyut: 160x600px veya 300x600px
              </p>

              {/* Preview */}
              {banner.imageUrl && (
                <div className="relative w-40 h-60 rounded-lg overflow-hidden border border-white/10 bg-white/5 mx-auto">
                  <Image
                    src={optimizeCloudinaryImage(banner.imageUrl, 320, 480)}
                    alt={`${side} banner`}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sponsor Selection */}
          <div>
            <Label className="admin-text-primary">Sponsor Seçin</Label>
            <Select
              value={banner.sponsorId}
              onValueChange={async (value) => {
                setBanner(prev => ({ ...prev, sponsorId: value }))
                // Auto-save when sponsor changes
                const newBanner = { ...banner, sponsorId: value }
                setSaving(true)
                try {
                  const token = localStorage.getItem('admin_token')
                  const response = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      key: `${side}_banner_data`,
                      value: JSON.stringify(newBanner)
                    })
                  })

                  const data = await response.json()
                  if (data.success) {
                    toast.success('Sponsor kaydedildi')
                  } else {
                    toast.error(data.error || 'İşlem başarısız')
                  }
                } catch (error) {
                  toast.error('Bir hata oluştu')
                } finally {
                  setSaving(false)
                }
              }}
            >
              <SelectTrigger className="admin-card text-white mt-2">
                <SelectValue placeholder="Sponsor seçin" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {sponsors.map(sponsor => (
                  <SelectItem key={sponsor.id} value={sponsor.id} className="admin-text-primary">
                    {sponsor.name} {sponsor.category === 'vip' ? '⭐' : ''} {!sponsor.isActive ? '(Devre Dışı)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs admin-page-subtitle">
              Banner'a tıklandığında bu sponsorun linkine gidilecek
            </p>
          </div>

          {/* Status */}
          <div className={`p-4 rounded-lg border ${banner.enabled && banner.imageUrl && banner.sponsorId ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${banner.enabled && banner.imageUrl && banner.sponsorId ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-white font-medium text-sm">
                {banner.enabled && banner.imageUrl && banner.sponsorId
                  ? `Aktif - ${selectedSponsor?.name || 'Sponsor seçilmedi'}`
                  : 'Pasif'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-blue-500/10 border-blue-500/30 p-4 mb-6">
        <h4 className="text-blue-300 font-semibold mb-2">ℹ️ Yan Banner Sistemi</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Bannerlar sadece masaüstünde görünür (mobilde gizlenir)</li>
          <li>• Sayfa daraldığında otomatik olarak gizlenir</li>
          <li>• Banner'a tıklandığında seçili sponsorun linkine yönlendirilir</li>
          <li>• Önerilen görsel boyutu: 160x600px veya 300x600px (dikey)</li>
        </ul>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBannerCard('left')}
        {renderBannerCard('right')}
      </div>
    </>
  )
}

// Popup Settings Component
function PopupSettings() {
  const [popupEnabled, setPopupEnabled] = useState(false)
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [popupForm, setPopupForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    sponsorId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const token = localStorage.getItem('admin_token')
      const [sponsorsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/sponsors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const sponsorsData = await sponsorsRes.json()
      const settingsData = await settingsRes.json()

      setSponsors(sponsorsData.sponsors || [])

      const popupEnabledSetting = settingsData.settings.find((s: Setting) => s.key === 'popup_enabled')
      setPopupEnabled(popupEnabledSetting?.value === 'true')

      const popupData = settingsData.settings.find((s: Setting) => s.key === 'popup_data')
      if (popupData?.value) {
        try {
          const parsed = JSON.parse(popupData.value)
          setPopupForm(parsed)
        } catch (e) {
          console.error('Error parsing popup data:', e)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function togglePopup() {
    const newValue = !popupEnabled
    setPopupEnabled(newValue)
    setSaving(true)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'popup_enabled', value: newValue.toString() })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(newValue ? 'Popup aktif edildi' : 'Popup kapatıldı')
      } else {
        setPopupEnabled(!newValue)
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      setPopupEnabled(!newValue)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function savePopupData() {
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'popup_data',
          value: JSON.stringify(popupForm)
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Popup ayarları kaydedildi')
      } else {
        toast.error(data.error || 'Ayarlar kaydedilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.url) {
        const newPopupForm = { ...popupForm, imageUrl: data.url }
        setPopupForm(newPopupForm)

        // Auto-save immediately
        const token = localStorage.getItem('admin_token')
        const saveResponse = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            key: 'popup_data',
            value: JSON.stringify(newPopupForm)
          })
        })

        const saveData = await saveResponse.json()
        if (saveData.success) {
          toast.success('Resim yüklendi ve kaydedildi')
        } else {
          toast.error('Resim yüklendi ama kaydedilemedi')
        }
      } else {
        toast.error(data.error || 'Resim yüklenemedi')
      }
    } catch (error) {
      toast.error('Resim yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const selectedSponsor = sponsors.find(s => s.id === popupForm.sponsorId)

  return (
    <>
      {/* Popup Toggle */}
      <Card className="admin-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Ana Sayfa Popup Durumu</h2>
            <p className="text-gray-400 text-sm">
              Popup açıkken kullanıcılar ana sayfayı ziyaret ettiğinde popup görecekler
            </p>
          </div>
          <Switch
            checked={popupEnabled}
            onCheckedChange={togglePopup}
            disabled={saving}
            className="ml-4 scale-125"
          />
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${popupEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${popupEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-white font-medium">
              {popupEnabled ? 'Popup Aktif' : 'Popup Kapalı'}
            </span>
          </div>
        </div>
      </Card>

      {/* Popup Content */}
      <Card className="admin-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Popup İçeriği</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="popup-title" className="admin-text-primary">Başlık (Kalın)</Label>
            <Input
              id="popup-title"
              value={popupForm.title}
              onChange={(e) => setPopupForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Popup başlığı"
              className="admin-card text-white mt-2"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="popup-description" className="admin-text-primary">Açıklama (Normal)</Label>
            <Textarea
              id="popup-description"
              value={popupForm.description}
              onChange={(e) => setPopupForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Popup açıklaması"
              className="admin-card text-white mt-2 min-h-[100px]"
            />
          </div>

          {/* Sponsor Selection */}
          <div>
            <Label htmlFor="popup-sponsor" className="admin-text-primary">Sponsor Seçin</Label>
            <Select
              value={popupForm.sponsorId}
              onValueChange={(value) => setPopupForm(prev => ({ ...prev, sponsorId: value }))}
            >
              <SelectTrigger className="admin-card text-white mt-2">
                <SelectValue placeholder="Sponsor seçin" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {sponsors.map(sponsor => (
                  <SelectItem key={sponsor.id} value={sponsor.id} className="admin-text-primary">
                    {sponsor.name} {sponsor.category === 'vip' ? '⭐' : ''} {!sponsor.isActive ? '(Devre Dışı)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs admin-page-subtitle">
              Popup'a tıklandığında bu sponsorun linkine gidilecek
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <Label htmlFor="popup-image" className="admin-text-primary">Resim (Opsiyonel)</Label>
            <div className="mt-2 space-y-2">
              <Input
                id="popup-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file)
                }}
                disabled={uploading}
                className="admin-card admin-text-primary"
              />
              <p className="text-xs admin-text-muted">
                Resim yüklenmezse seçili sponsorun logosu kullanılacak
              </p>

              {/* Preview */}
              {(popupForm.imageUrl || selectedSponsor?.logoUrl) && (
                <div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                  <Image
                    src={optimizeCloudinaryImage(popupForm.imageUrl || selectedSponsor?.logoUrl || '', 800, 384)}
                    alt="Popup preview"
                    fill
                    className="object-contain p-4"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={savePopupData}
            disabled={saving || uploading}
            className="w-full admin-btn-primary"
          >
            {saving ? 'Kaydediliyor...' : 'Popup Ayarlarını Kaydet'}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {popupForm.title && (
        <Card className="admin-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">Önizleme</h2>
          <div className="max-w-md mx-auto bg-gray-900 border-2 border-white/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-2xl font-bold text-white text-center">{popupForm.title}</h3>
            {popupForm.description && (
              <p className="text-gray-300 text-center whitespace-pre-wrap">{popupForm.description}</p>
            )}
            {(popupForm.imageUrl || selectedSponsor?.logoUrl) && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-white/5">
                <Image
                  src={optimizeCloudinaryImage(popupForm.imageUrl || selectedSponsor?.logoUrl || '', 800, 384)}
                  alt="Preview"
                  fill
                  className="object-contain p-4"
                />
              </div>
            )}
            {selectedSponsor && (
              <p className="text-gray-400 text-center text-sm">
                Tıklandığında: {selectedSponsor.name}
              </p>
            )}
          </div>
        </Card>
      )}
    </>
  )
}

// Yatay Banner Settings Component
function YatayBannerSettings() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [bannerData, setBannerData] = useState({
    imageUrl: '',
    mobileImageUrl: '',
    sponsorId: '',
    enabled: false
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const token = localStorage.getItem('admin_token')
      const [sponsorsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/sponsors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const sponsorsData = await sponsorsRes.json()
      const settingsData = await settingsRes.json()

      setSponsors(sponsorsData.sponsors || [])

      const yatayBannerData = settingsData.settings.find((s: Setting) => s.key === 'yatay_banner_data')

      if (yatayBannerData?.value) {
        try {
          setBannerData(JSON.parse(yatayBannerData.value))
        } catch (e) {
          console.error('Error parsing yatay banner:', e)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function saveBanner() {
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'yatay_banner_data',
          value: JSON.stringify(bannerData)
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Yatay banner kaydedildi')
      } else {
        toast.error(data.error || 'Banner kaydedilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(file: File, type: 'desktop' | 'mobile' = 'desktop') {
    if (type === 'mobile') {
      setUploadingMobile(true)
    } else {
      setUploading(true)
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.url) {
        const newBannerData = type === 'mobile'
          ? { ...bannerData, mobileImageUrl: data.url }
          : { ...bannerData, imageUrl: data.url }
        setBannerData(newBannerData)

        // Auto-save
        const token = localStorage.getItem('admin_token')
        const saveResponse = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            key: 'yatay_banner_data',
            value: JSON.stringify(newBannerData)
          })
        })

        const saveData = await saveResponse.json()
        if (saveData.success) {
          toast.success(`${type === 'mobile' ? 'Mobil' : 'Masaüstü'} resim yüklendi ve kaydedildi`)
        } else {
          toast.error('Resim yüklendi ama kaydedilemedi')
        }
      } else {
        toast.error(data.error || 'Resim yüklenemedi')
      }
    } catch (error) {
      toast.error('Resim yüklenirken hata oluştu')
    } finally {
      if (type === 'mobile') {
        setUploadingMobile(false)
      } else {
        setUploading(false)
      }
    }
  }

  async function toggleBanner() {
    const newEnabled = !bannerData.enabled
    setBannerData(prev => ({ ...prev, enabled: newEnabled }))

    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'yatay_banner_data',
          value: JSON.stringify({ ...bannerData, enabled: newEnabled })
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(newEnabled ? 'Yatay banner aktif edildi' : 'Yatay banner kapatıldı')
      } else {
        setBannerData(prev => ({ ...prev, enabled: !newEnabled }))
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      setBannerData(prev => ({ ...prev, enabled: !newEnabled }))
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const selectedSponsor = sponsors.find(s => s.id === bannerData.sponsorId)

  return (
    <>
      <Card className="bg-blue-500/10 border-blue-500/30 p-4 mb-6">
        <h4 className="text-blue-300 font-semibold mb-2">Yatay Banner Sistemi</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>Bu banner ana sayfa ve üye sayfalarında (mağaza, görevler, çark, bilet, etkinlik, liderlik) görünür</li>
          <li>GIF formatı desteklenir - animasyonlu bannerlar için idealdir</li>
          <li>Önerilen boyut: 1200x100px veya 1920x150px (yatay)</li>
          <li>Banner'a tıklandığında seçili sponsorun linkine yönlendirilir</li>
        </ul>
      </Card>

      {/* Banner Toggle */}
      <Card className="admin-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Yatay Banner Durumu</h2>
            <p className="text-gray-400 text-sm">
              Banner açıkken üye sayfalarında yatay banner görünür
            </p>
          </div>
          <Switch
            checked={bannerData.enabled}
            onCheckedChange={toggleBanner}
            disabled={saving}
            className="ml-4 scale-125"
          />
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${bannerData.enabled && bannerData.imageUrl ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${bannerData.enabled && bannerData.imageUrl ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-white font-medium">
              {bannerData.enabled && bannerData.imageUrl
                ? `Aktif - ${selectedSponsor?.name || 'Sponsor seçilmedi'}`
                : 'Pasif'}
            </span>
          </div>
        </div>
      </Card>

      {/* Banner Content */}
      <Card className="admin-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Banner İçeriği</h2>

        <div className="space-y-4">
          {/* Desktop Image Upload */}
          <div>
            <Label className="admin-text-primary">Masaüstü Banner Görseli (Yatay - GIF Desteklenir)</Label>
            <div className="mt-2 space-y-2">
              <Input
                type="file"
                accept="image/*,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file, 'desktop')
                }}
                disabled={uploading}
                className="admin-card admin-text-primary"
              />
              <p className="text-xs admin-text-muted">
                Önerilen boyut: 1200x100px veya 1920x150px. GIF dosyaları desteklenir.
              </p>

              {/* Preview */}
              {bannerData.imageUrl && (
                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                  <Image
                    src={bannerData.imageUrl}
                    alt="Masaüstü Banner Preview"
                    fill
                    className="object-contain"
                    unoptimized={bannerData.imageUrl.toLowerCase().endsWith('.gif')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Image Upload */}
          <div>
            <Label className="admin-text-primary">Mobil/Tablet Banner Görseli (Yatay - GIF Desteklenir)</Label>
            <div className="mt-2 space-y-2">
              <Input
                type="file"
                accept="image/*,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file, 'mobile')
                }}
                disabled={uploadingMobile}
                className="admin-card admin-text-primary"
              />
              <p className="text-xs admin-text-muted">
                Mobil ve tablet cihazlarda gösterilecek görsel. Önerilen boyut: 800x80px. Yüklenmezse masaüstü görseli kullanılır.
              </p>

              {/* Preview */}
              {bannerData.mobileImageUrl && (
                <div className="relative w-full h-20 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                  <Image
                    src={bannerData.mobileImageUrl}
                    alt="Mobil Banner Preview"
                    fill
                    className="object-contain"
                    unoptimized={bannerData.mobileImageUrl.toLowerCase().endsWith('.gif')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sponsor Selection */}
          <div>
            <Label className="admin-text-primary">Sponsor Seçin</Label>
            <Select
              value={bannerData.sponsorId}
              onValueChange={async (value) => {
                const newBannerData = { ...bannerData, sponsorId: value }
                setBannerData(newBannerData)

                // Auto-save
                setSaving(true)
                try {
                  const token = localStorage.getItem('admin_token')
                  const response = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      key: 'yatay_banner_data',
                      value: JSON.stringify(newBannerData)
                    })
                  })

                  const data = await response.json()
                  if (data.success) {
                    toast.success('Sponsor kaydedildi')
                  } else {
                    toast.error(data.error || 'İşlem başarısız')
                  }
                } catch (error) {
                  toast.error('Bir hata oluştu')
                } finally {
                  setSaving(false)
                }
              }}
            >
              <SelectTrigger className="admin-card text-white mt-2">
                <SelectValue placeholder="Sponsor seçin" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="" className="admin-text-primary">
                  Sponsor Seçilmedi
                </SelectItem>
                {sponsors.map(sponsor => (
                  <SelectItem key={sponsor.id} value={sponsor.id} className="admin-text-primary">
                    {sponsor.name} {sponsor.category === 'vip' ? '⭐' : ''} {!sponsor.isActive ? '(Devre Dışı)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs admin-page-subtitle">
              Banner'a tıklandığında bu sponsorun linkine gidilecek
            </p>
          </div>
        </div>
      </Card>

      {/* Live Preview */}
      {bannerData.imageUrl && (
        <Card className="admin-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">Canlı Önizleme</h2>
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-lg overflow-hidden">
            <div className="relative w-full h-16 sm:h-20 md:h-24">
              <Image
                src={bannerData.imageUrl}
                alt="Preview"
                fill
                className="object-contain"
                unoptimized={bannerData.imageUrl.toLowerCase().endsWith('.gif')}
              />
            </div>
          </div>
          {selectedSponsor && (
            <p className="text-gray-400 text-center text-sm mt-2">
              Tıklandığında: {selectedSponsor.name} ({selectedSponsor.websiteUrl || 'Link yok'})
            </p>
          )}
        </Card>
      )}
    </>
  )
}
