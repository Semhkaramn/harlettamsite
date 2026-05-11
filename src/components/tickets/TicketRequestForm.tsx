'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TicketCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useUserTheme } from '@/components/providers/user-theme-provider'

interface TicketEvent {
  id: string
  title: string
  ticketPrice: number
  sponsor: {
    id: string
    name: string
  }
}

interface TicketRequestFormProps {
  event: TicketEvent
  sponsorInfo: string
  onClose: () => void
  onSuccess: () => void
  formatAmount: (amount: number) => string
}

export function TicketRequestForm({
  event,
  sponsorInfo,
  onClose,
  onSuccess,
  formatAmount
}: TicketRequestFormProps) {
  const { theme } = useUserTheme()
  const [requestData, setRequestData] = useState({
    sponsorInfo: sponsorInfo,
    investmentAmount: event.ticketPrice,
    investmentDate: getTurkeyDateTime(),
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function getTurkeyDateTime() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  async function submitRequest() {
    if (requestData.investmentAmount < event.ticketPrice) {
      toast.error(`Minimum yatırım tutarı ${formatAmount(event.ticketPrice)} TL olmalıdır`)
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/tickets/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          ...requestData,
        }),
      })

      if (res.ok) {
        toast.success('Bilet talebiniz gönderildi')
        onSuccess()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Bilet talebi gönderilemedi')
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Bilet talebi gönderilirken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-2 animate-in fade-in duration-200"
      style={{ backgroundColor: `${theme.colors.background}CC` }}
    >
      <Card
        className="w-full max-w-md backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden"
        style={{
          backgroundColor: `${theme.colors.card}F0`,
          borderColor: theme.colors.cardBorder
        }}
      >
        <div className="p-4 space-y-3">
          <div
            className="pb-2"
            style={{ borderBottomWidth: 1, borderColor: theme.colors.cardBorder }}
          >
            <h3 className="text-lg font-bold mb-0.5" style={{ color: theme.colors.text }}>{event.title}</h3>
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>Bilet Talebi Oluştur</p>
          </div>

          <div>
            <Label className="font-medium mb-1 block text-xs select-none pointer-events-none" style={{ color: theme.colors.text }}>Sponsor Kullanıcı Bilgisi</Label>
            <Input
              value={requestData.sponsorInfo}
              disabled
              className="rounded-lg text-xs select-none"
              style={{
                backgroundColor: `${theme.colors.backgroundSecondary}80`,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
              placeholder="Örn: username123"
            />
          </div>

          <div>
            <Label className="font-medium mb-1 block text-xs" style={{ color: theme.colors.text }}>Yatırım Tutarı (TL)</Label>
            <Input
              type="text"
              value={requestData.investmentAmount > 0 ? formatAmount(requestData.investmentAmount) : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setRequestData({...requestData, investmentAmount: Number(value) || 0})
              }}
              className="rounded-lg text-xs"
              style={{
                backgroundColor: `${theme.colors.backgroundSecondary}80`,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
              placeholder="0"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs flex items-center gap-1" style={{ color: theme.colors.textMuted }}>
                <TicketCheck className="w-3 h-3" style={{ color: theme.colors.primary }} />
                Yaklaşık {Math.floor(requestData.investmentAmount / event.ticketPrice)} bilet
              </p>
              {requestData.investmentAmount < event.ticketPrice && (
                <p className="text-xs font-medium" style={{ color: theme.colors.error }}>
                  Min: {formatAmount(event.ticketPrice)} TL
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="font-medium mb-1 block text-xs" style={{ color: theme.colors.text }}>Yatırım Tarihi ve Saati</Label>
            <Input
              type="datetime-local"
              value={requestData.investmentDate}
              onChange={(e) => setRequestData({...requestData, investmentDate: e.target.value})}
              className="rounded-lg text-xs"
              style={{
                backgroundColor: `${theme.colors.backgroundSecondary}80`,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            />
          </div>

          <div>
            <Label className="font-medium mb-1 block text-xs" style={{ color: theme.colors.text }}>Not (Opsiyonel)</Label>
            <textarea
              value={requestData.note}
              onChange={(e) => setRequestData({...requestData, note: e.target.value})}
              className="w-full rounded-lg text-xs p-2 min-h-[60px] resize-none"
              style={{
                backgroundColor: `${theme.colors.backgroundSecondary}80`,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                borderWidth: 1
              }}
              placeholder="Eklemek istediğiniz notları buraya yazabilirsiniz..."
              rows={3}
            />
          </div>

          <div
            className="flex gap-2 pt-2"
            style={{ borderTopWidth: 1, borderColor: theme.colors.cardBorder }}
          >
            <Button
              onClick={submitRequest}
              disabled={submitting || requestData.investmentAmount < event.ticketPrice}
              className="flex-1 rounded-lg text-xs py-1.5 disabled:opacity-50 text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02] disabled:hover:brightness-100 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(to right, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`
              }}
            >
              {submitting ? 'Gönderiliyor...' : 'Talep Gönder'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg text-xs py-1.5 transition-all duration-200 hover:opacity-80 hover:scale-[1.02]"
              style={{
                backgroundColor: `${theme.colors.backgroundSecondary}50`,
                color: theme.colors.textSecondary,
                borderColor: theme.colors.border
              }}
            >
              İptal
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
