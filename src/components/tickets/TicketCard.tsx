'use client'

import { useUserTheme } from '@/components/providers/user-theme-provider'
import { Badge } from '@/components/ui/badge'
import { ThemedButton } from '@/components/ui/themed'
import { TicketCheck, Users, Calendar, Trophy, Clock, Eye, Sparkles, Ticket } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface TicketEvent {
  id: string
  title: string
  description: string
  status?: string
  sponsor: {
    id: string
    name: string
    logoUrl?: string
    description?: string
  }
  totalTickets: number
  ticketPrice: number
  soldTickets: number
  endDate: string
  prizes: Array<{
    id?: string
    prizeAmount: number
    winnerCount: number
  }>
  _count?: {
    ticketNumbers: number
  }
  uniqueParticipants?: number
}

interface TicketCardProps {
  event: TicketEvent
  type?: 'user' | 'admin'
  formatAmount: (amount: number) => string
  formatDateTR: (date: string | Date) => string
  onJoinClick?: (event: TicketEvent) => void
}

export function TicketCard({ event, type = 'user', formatAmount, formatDateTR, onJoinClick }: TicketCardProps) {
  const router = useRouter()
  const { theme, card } = useUserTheme()
  const totalPrizePool = event.prizes.reduce((sum, p) => sum + (p.prizeAmount * p.winnerCount), 0)
  const basePath = type === 'admin' ? '/admin/tickets' : '/tickets'

  const handleDetailClick = () => {
    router.push(`${basePath}/${event.id}`)
  }

  const handleJoinClick = () => {
    if (onJoinClick) {
      onJoinClick(event)
    } else {
      router.push(`${basePath}/${event.id}`)
    }
  }

  // Kalan süreyi hesapla
  const getTimeRemaining = () => {
    const now = new Date().getTime()
    const end = new Date(event.endDate).getTime()
    const diff = end - now

    if (diff <= 0) return 'Sona erdi'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days} gun ${hours} saat`
    if (hours > 0) return `${hours} saat ${minutes} dk`
    return `${minutes} dakika`
  }

  // Doluluk oranı
  const fillPercentage = event.totalTickets > 0 ? (event.soldTickets / event.totalTickets) * 100 : 0

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: `0 8px 32px ${theme.colors.gradientFrom}08, 0 2px 8px rgba(0,0,0,0.12)`
      }}
    >
      {/* Top accent line */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientVia || theme.colors.gradientTo}, ${theme.colors.gradientTo})`
        }}
      />

      <div className="p-5 space-y-4">
        {/* Header: Logo + Title + Type Badge */}
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-14 h-14 relative rounded-xl overflow-hidden"
            style={{
              background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary}, ${theme.colors.background})`,
              border: `1px solid ${theme.colors.border}`,
              boxShadow: `0 4px 12px ${theme.colors.gradientFrom}12`
            }}
          >
            {event.sponsor.logoUrl ? (
              <Image
                src={event.sponsor.logoUrl}
                alt={event.sponsor.name}
                fill
                sizes="56px"
                loading="lazy"
                className="object-contain p-2"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Ticket className="w-6 h-6" style={{ color: theme.colors.textMuted }} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold line-clamp-2 leading-snug mb-2" style={{ color: theme.colors.text }}>
              {event.title}
            </h3>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.accent}15, ${theme.colors.primary}10)`,
                color: theme.colors.accent,
                border: `1px solid ${theme.colors.accent}25`
              }}
            >
              <Sparkles className="w-3 h-3" />
              Cekilis
            </span>
          </div>
        </div>

        {/* Toplam Ödül - Büyük Yeşil */}
        {totalPrizePool > 0 && (
          <div
            className="py-3 px-4 rounded-xl text-center"
            style={{
              background: `linear-gradient(145deg, ${theme.colors.success}10, ${theme.colors.success}05)`,
              border: `1px solid ${theme.colors.success}20`
            }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: theme.colors.text }}
            >
              Toplam Odul
            </div>
            <div
              className="text-3xl leading-none font-black"
              style={{ color: theme.colors.success }}
            >
              {formatAmount(totalPrizePool)}TL
            </div>
          </div>
        )}

        {/* Stats Grid - 3 columns like events */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="p-3.5 rounded-xl text-center"
            style={{
              background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary}80, ${theme.colors.background}60)`,
              border: `1px solid ${theme.colors.border}60`
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Trophy className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.text }}>Bilet</span>
            </div>
            <div className="text-2xl font-black" style={{ color: theme.colors.text }}>
              {event.totalTickets}
            </div>
          </div>
          <div
            className="p-3.5 rounded-xl text-center"
            style={{
              background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary}80, ${theme.colors.background}60)`,
              border: `1px solid ${theme.colors.border}60`
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Users className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.text }}>Satilan</span>
            </div>
            <div className="text-2xl font-black" style={{ color: theme.colors.text }}>
              {event.soldTickets}
            </div>
          </div>
          <div
            className="p-3.5 rounded-xl text-center"
            style={{
              background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary}80, ${theme.colors.background}60)`,
              border: `1px solid ${theme.colors.border}60`
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Ticket className="w-4 h-4" style={{ color: theme.colors.textMuted }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.text }}>Fiyat</span>
            </div>
            <div className="text-lg font-black" style={{ color: theme.colors.text }}>
              {formatAmount(event.ticketPrice)}TL
            </div>
          </div>
        </div>

        {/* Doluluk Oranı - Aktif durumda */}
        {event.status === 'active' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium" style={{ color: theme.colors.text }}>Doluluk Orani</span>
              <span className="font-bold" style={{ color: theme.colors.text }}>{Math.round(fillPercentage)}%</span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: `${theme.colors.border}40` }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${fillPercentage}%`,
                  background: `linear-gradient(90deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`
                }}
              />
            </div>
          </div>
        )}

        {/* Time Remaining - styled like events */}
        {event.status === 'active' && (
          <div
            className="flex items-center justify-between py-3 px-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}08, ${theme.colors.primary}04)`,
              border: `1px solid ${theme.colors.primary}20`
            }}
          >
            <span className="text-sm font-medium" style={{ color: theme.colors.text }}>Kalan Sure</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="text-base font-bold" style={{ color: theme.colors.primary }}>{getTimeRemaining()}</span>
            </div>
          </div>
        )}

        {/* Butonlar */}
        {event.status === 'active' ? (
          <div className="grid grid-cols-2 gap-3">
            <ThemedButton
              onClick={handleDetailClick}
              variant="secondary"
              size="md"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Detay
            </ThemedButton>
            <ThemedButton
              onClick={handleJoinClick}
              variant="primary"
              size="md"
            >
              <TicketCheck className="w-4 h-4 mr-1.5" />
              Katil
            </ThemedButton>
          </div>
        ) : (
          event.status === 'waiting_draw' ? (
            <ThemedButton
              onClick={handleDetailClick}
              variant="primary"
              size="lg"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Cekilis Bekliyor
            </ThemedButton>
          ) : (
            <ThemedButton
              onClick={handleDetailClick}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Detaylari Gor
            </ThemedButton>
          )
        )}
      </div>
    </div>
  )
}
