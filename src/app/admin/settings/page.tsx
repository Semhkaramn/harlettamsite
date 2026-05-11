'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Settings, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

interface Setting {
  id: string
  key: string
  value: string
  description: string
  category: string
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Bildirim ayarları
  const [notifyOrderApproved, setNotifyOrderApproved] = useState(false)
  const [notifyLevelUp, setNotifyLevelUp] = useState(false)
  const [notifyWheelReset, setNotifyWheelReset] = useState(false)

  // Roll sistemi
  const [rollEnabled, setRollEnabled] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadSettings(token)
  }, [])

  async function loadSettings(token: string) {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data.settings || [])

      // Bildirim ayarlarını yükle
      const orderApprovedNotify = data.settings.find((s: Setting) => s.key === 'notify_order_approved')
      setNotifyOrderApproved(orderApprovedNotify?.value === 'true')

      const levelUpNotify = data.settings.find((s: Setting) => s.key === 'notify_level_up')
      setNotifyLevelUp(levelUpNotify?.value === 'true')

      const wheelResetNotify = data.settings.find((s: Setting) => s.key === 'notify_wheel_reset')
      setNotifyWheelReset(wheelResetNotify?.value === 'true')

      // Roll sistemi ayarını yükle
      const rollEnabledSetting = data.settings.find((s: Setting) => s.key === 'roll_enabled')
      setRollEnabled(rollEnabledSetting?.value === 'true')

    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }



  async function toggleNotificationSetting(key: string, currentValue: boolean, setterFunction: (value: boolean) => void) {
    const newValue = !currentValue

    // Optimistic update - önce UI'ı güncelle
    setterFunction(newValue)

    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue.toString() })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Ayar güncellendi')
        // Settings state'ini de güncelle - önemli!
        setSettings(prev =>
          prev.map(s => s.key === key ? { ...s, value: newValue.toString() } : s)
        )
      } else {
        // Hata varsa geri al
        setterFunction(currentValue)
        toast.error(data.error || 'Ayar kaydedilemedi')
      }
    } catch (error) {
      // Hata varsa geri al
      setterFunction(currentValue)
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }





  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }



  return (
    <div className="admin-page-container">
      <div className="admin-page-inner space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Sistem Ayarları
            </h1>
            <p className="admin-page-subtitle">Bot davranışlarını ve sistem parametrelerini yönetin</p>
          </div>
        </div>

        {/* Bildirim Ayarları */}
        <Card className="admin-card p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Bildirim Ayarları
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Bota start yapmış kullanıcılara gönderilecek otomatik bildirimler
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-white font-medium">Sipariş Onay Bildirimi</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Market siparişleri onaylandığında kullanıcılara özelden mesaj gönderilsin
                </p>
              </div>
              <Switch
                checked={notifyOrderApproved}
                onCheckedChange={() => toggleNotificationSetting('notify_order_approved', notifyOrderApproved, setNotifyOrderApproved)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-white font-medium">Seviye Atlama Bildirimi</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Kullanıcı seviye atladığında grupta bildirim mesajı gönderilsin
                </p>
              </div>
              <Switch
                checked={notifyLevelUp}
                onCheckedChange={() => toggleNotificationSetting('notify_level_up', notifyLevelUp, setNotifyLevelUp)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-white font-medium">Çark Sıfırlama Bildirimi</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Şans çarkı sıfırlandığında kullanıcılara özelden bildirim gönderilsin
                </p>
              </div>
              <Switch
                checked={notifyWheelReset}
                onCheckedChange={() => toggleNotificationSetting('notify_wheel_reset', notifyWheelReset, setNotifyWheelReset)}
                disabled={saving}
              />
            </div>
          </div>
        </Card>

        {/* Roll Sistemi Ayarları */}
        <Card className="admin-card p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            🎲 Roll Sistemi
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Telegram grubunda roll sistemi komutlarını aktif/deaktif edin
          </p>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex-1">
              <h3 className="text-white font-medium">Roll Sistemini Aktifleştir</h3>
              <p className="text-gray-400 text-sm mt-1">
                Roll komutları (/başlat, /kaydet, /durum vs.) kullanılabilsin
              </p>
            </div>
            <Switch
              checked={rollEnabled}
              onCheckedChange={() => toggleNotificationSetting('roll_enabled', rollEnabled, setRollEnabled)}
              disabled={saving}
            />
          </div>
        </Card>


      </div>
    </div>
  )
}
