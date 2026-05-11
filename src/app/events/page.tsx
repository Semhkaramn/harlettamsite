'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Calendar, Gift, Trophy, Loader2, Eye, CheckCircle, Sparkles, Clock, Crown } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useVerification } from '@/lib/hooks/useVerification'
import VerificationRequiredModal from '@/components/VerificationRequiredModal'
import {
  ThemedCard,
  ThemedBadge,
  ThemedButton,
  ThemedEmptyState,
  ThemedProgress,
} from '@/components/ui/themed'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Event {
  id: string
  title: string
  imageUrl?: string
  sponsor: { id: string; name: string; logoUrl?: string; identifierType?: string }
  participantLimit: number
  participationType: 'limited' | 'raffle'
  participantCount: number
  endDate: string
  createdAt: string
  status: 'active' | 'pending' | 'completed'
  participants?: Array<{ userId?: string }>
  winners?: Array<{
    user: {
      id: string
      siteUsername?: string
      email?: string
      telegramUsername?: string
      firstName?: string
    }
  }>
  _count?: { participants: number; winners: number }
}

export default function EventsPage() {
  const router = useRouter()
  const { user, setShowLoginModal, refreshUser } = useAuth()
  const { theme, card, button, badge, tab } = useUserTheme()
  const {
    isFullyVerified,
    showVerificationModal,
    actionName,
    closeVerificationModal,
    requireVerification
  } = useVerification()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null)
  const [joinedEvents, setJoinedEvents] = useState<Set<string>>(new Set())

  // Sponsor form popup state'leri
  const [showSponsorForm, setShowSponsorForm] = useState(false)
  const [sponsorInfo, setSponsorInfo] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [savingSponsor, setSavingSponsor] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [user])

  async function loadEvents() {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      setEvents(data.events || [])

      // Kullanıcının katıldığı eventleri takip et
      if (user && data.events) {
        const joined = new Set<string>()
        data.events.forEach((event: Event) => {
          if (event.participants?.some(p => p.userId === user.id)) {
            joined.add(event.id)
          }
        })
        setJoinedEvents(joined)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  async function joinEventDirectly(event: Event) {
    try {
      const res = await fetch(`/api/events/${event.id}/join`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      toast.success(data.message || 'Katıldınız!')
      setJoinedEvents(prev => new Set([...prev, event.id]))
      loadEvents()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function handleJoinEvent(event: Event) {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    // Telegram ve email doğrulaması kontrolü
    if (!requireVerification(() => {
      // Doğrulama tamamlandıktan sonra tekrar dene
      handleJoinEventAfterVerification(event)
    }, 'etkinliğe katılmak')) {
      setSelectedEvent(event)
      return
    }

    await handleJoinEventAfterVerification(event)
  }

  async function handleJoinEventAfterVerification(event: Event) {
    setJoiningEventId(event.id)

    try {
      // Önce sponsor bilgisini kontrol et
      const sponsorRes = await fetch('/api/user/sponsor-info')
      const sponsorData = await sponsorRes.json()
      const sponsorInfoData = sponsorData.sponsorInfos?.find((info: any) => info.sponsorId === event.sponsor.id)

      if (!sponsorInfoData) {
        // Sponsor bilgisi yoksa popup aç
        setSelectedEvent(event)
        setShowSponsorForm(true)
        setJoiningEventId(null)
        return
      }

      // Sponsor bilgisi varsa direkt katıl
      await joinEventDirectly(event)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setJoiningEventId(null)
    }
  }

  async function saveSponsorInfo() {
    if (!sponsorInfo.trim() || !selectedEvent) return toast.error('Bilgi gerekli')

    try {
      setSavingSponsor(true)
      const res = await fetch('/api/user/sponsor-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorId: selectedEvent.sponsor.id,
          identifier: sponsorInfo.trim()
        })
      })

      if (!res.ok) throw new Error('Kaydedilemedi')

      toast.success('Sponsor bilgisi kaydedildi!')

      // Kaydettikten sonra otomatik katıl
      await joinEventDirectly(selectedEvent)

      // Formu kapat ve temizle
      setShowSponsorForm(false)
      setSponsorInfo('')
      setSelectedEvent(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingSponsor(false)
    }
  }

  const activeEvents = events.filter(e => e.status === 'active')
  const pastEvents = events
    .filter(e => e.status === 'completed' || e.status === 'pending')
    .sort((a, b) => {
      // Beklemede olanlar her zaman en üstte
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      // Aynı durumdaysa yeniden eskiye sırala (endDate'e göre)
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    })

  const EventCard = ({ event }: { event: Event }) => {
    const participated = user && (event.participants?.some(p => p.userId === user.id) || joinedEvents.has(event.id))
    const won = user && event.winners?.some(w => w.user.id === user.id)
    const progress = (event.participantCount / event.participantLimit) * 100
    const isRaffle = event.participationType === 'raffle'
    const winnersCount = event._count?.winners || 0
    const isCompleted = event.status === 'completed' || event.status === 'pending'
    const isJoining = joiningEventId === event.id
    // Çekiliş tipinde limit kontrolü yok - participantLimit sadece kazanan sayısını belirtir
    // Sadece "limited" (ilk gelen alır) tipinde doluluk kontrolü yapılır
    const isFull = !isRaffle && event.participantCount >= event.participantLimit
    const isExpired = new Date(event.endDate) < new Date()
    const canJoin = event.status === 'active' && !isFull && !isExpired && !participated

    const handleDetailClick = () => {
      router.push(`/events/${event.id}`)
    }

    const handleJoinClick = () => {
      handleJoinEvent(event)
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
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) return `${days}g ${hours}s ${minutes}dk`
      if (hours > 0) return `${hours}s ${minutes}dk ${seconds}sn`
      return `${minutes}dk ${seconds}sn`
    }

    return (
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: `0 8px 32px ${theme.colors.gradientFrom}08, 0 2px 8px rgba(0,0,0,0.12)`
        }}
      >
        {/* Elegant top accent line */}
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
              <Image
                src={event.imageUrl || event.sponsor.logoUrl || '/logo.webp'}
                alt={event.title}
                fill
                sizes="56px"
                className="object-contain p-2"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold line-clamp-2 leading-snug mb-2" style={{ color: theme.colors.text }}>
                {event.title}
              </h3>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: isRaffle
                    ? `linear-gradient(135deg, ${theme.colors.accent}15, ${theme.colors.primary}10)`
                    : `linear-gradient(135deg, ${theme.colors.success}15, ${theme.colors.success}08)`,
                  color: isRaffle ? theme.colors.accent : theme.colors.success,
                  border: `1px solid ${isRaffle ? theme.colors.accent : theme.colors.success}25`
                }}
              >
                {isRaffle ? <Sparkles className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                {isRaffle ? 'Cekilis' : 'Ilk Gelen'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-3.5 rounded-xl text-center"
              style={{
                background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary}80, ${theme.colors.background}60)`,
                border: `1px solid ${theme.colors.border}60`
              }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <Trophy className="w-4 h-4" style={{ color: theme.colors.primary }} />
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: theme.colors.text }}>Kazanacak</span>
              </div>
              <div className="text-2xl font-black" style={{ color: theme.colors.text }}>
                {event.participantLimit}
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
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: theme.colors.text }}>Katılımcı</span>
              </div>
              <div className="text-2xl font-black" style={{ color: theme.colors.text }}>
                {event.participantCount}
              </div>
            </div>
          </div>

          {/* Progress Bar for Limited Events */}
          {!isRaffle && !isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium" style={{ color: theme.colors.text }}>Doluluk</span>
                <span className="font-bold" style={{ color: theme.colors.text }}>{Math.round(progress)}%</span>
              </div>
              <div
                className="h-2.5 rounded-full overflow-hidden"
                style={{ background: `${theme.colors.border}40` }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`
                  }}
                />
              </div>
            </div>
          )}

          {/* Time Remaining */}
          {!isCompleted && (
            <div
              className="flex items-center justify-between py-2.5 px-3.5 rounded-xl"
              style={{
                background: `${theme.colors.backgroundSecondary}60`,
                border: `1px solid ${theme.colors.border}40`
              }}
            >
              <span className="text-xs font-medium" style={{ color: theme.colors.text }}>Kalan Sure</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: theme.colors.primary }} />
                <span className="text-sm font-bold" style={{ color: theme.colors.text }}>{getTimeRemaining()}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isCompleted ? (
            <ThemedButton
              onClick={handleDetailClick}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Detaylari Gor
            </ThemedButton>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ThemedButton
                onClick={handleDetailClick}
                variant="secondary"
                size="md"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Detay
              </ThemedButton>
              {participated ? (
                <ThemedButton
                  disabled
                  variant="primary"
                  size="md"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.success}cc)`,
                    boxShadow: `0 4px 16px ${theme.colors.success}30`,
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Katildiniz
                </ThemedButton>
              ) : (
                <ThemedButton
                  onClick={handleJoinClick}
                  disabled={!canJoin || isJoining}
                  variant="primary"
                  size="md"
                >
                  {isJoining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFull ? (
                    'Doldu'
                  ) : isExpired ? (
                    'Bitti'
                  ) : (
                    'Katil'
                  )}
                </ThemedButton>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout showYatayBanner={true}>
      {loading ? (
        <LoadingSpinner />
      ) : (
      <div className="user-page-container">
        <div className="user-page-inner space-y-4">

        <Tabs defaultValue="active" className="w-full">
            <div
              className="flex gap-1.5 p-1.5 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.backgroundSecondary}90, ${theme.colors.card}90)`,
                border: `1px solid ${theme.colors.border}`,
                backdropFilter: 'blur(8px)'
              }}
            >
              <TabsTrigger
                value="active"
                className="flex-1 transition-all rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:shadow-lg data-[state=inactive]:opacity-70"
                style={{
                  color: theme.colors.text,
                }}
              >
                <Gift className="w-4 h-4 mr-2" />
                Aktif ({activeEvents.length})
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="flex-1 transition-all rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:shadow-lg data-[state=inactive]:opacity-70"
                style={{
                  color: theme.colors.text,
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Gecmis ({pastEvents.length})
              </TabsTrigger>
            </div>

            <TabsContent value="active" className="space-y-3 mt-4">
              {activeEvents.length === 0 ? (
                <ThemedEmptyState
                  icon={<Gift className="w-12 h-12" />}
                  title="Aktif etkinlik yok"
                  description="Yakinda yeni etkinlikler eklenecek!"
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {activeEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3 mt-4">
              {pastEvents.length === 0 ? (
                <ThemedEmptyState
                  icon={<Calendar className="w-12 h-12" />}
                  title="Geçmiş etkinlik yok"
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      )}

      {/* Sponsor Info Dialog - Popup */}
      <AlertDialog open={showSponsorForm} onOpenChange={(open) => {
        if (!open) {
          setShowSponsorForm(false)
          setSponsorInfo('')
          setSelectedEvent(null)
        }
      }}>
        <AlertDialogContent
          className="rounded-2xl border-2"
          style={{
            background: `linear-gradient(145deg, ${theme.colors.card}, ${theme.colors.background})`,
            borderColor: `${theme.colors.gradientFrom}30`
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold" style={{ color: theme.colors.text }}>
              Sponsor Bilgisi Gerekli
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: theme.colors.textSecondary }}>
              <span className="space-y-4 block">
                <span className="flex items-center gap-4">
                  {selectedEvent?.sponsor.logoUrl && (
                    <span
                      className="w-32 h-16 rounded-xl overflow-hidden relative inline-block ring-2"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.gradientFrom}20, ${theme.colors.gradientTo}20)`,
                        '--tw-ring-color': `${theme.colors.gradientFrom}40`
                      } as React.CSSProperties}
                    >
                      <Image
                        src={selectedEvent.sponsor.logoUrl}
                        alt={selectedEvent.sponsor.name}
                        fill
                        className="object-contain p-2"
                      />
                    </span>
                  )}
                  <span className="block">
                    <span className="font-bold text-lg block" style={{ color: theme.colors.text }}>{selectedEvent?.sponsor.name}</span>
                    <span className="text-sm block" style={{ color: theme.colors.textMuted }}>{selectedEvent?.title}</span>
                  </span>
                </span>

                <span className="space-y-3 py-2 block">
                  <span className="text-sm block" style={{ color: theme.colors.textSecondary }}>
                    Bu etkinlige katilabilmek icin sponsor bilginizi eklemeniz gerekmektedir.
                  </span>
                  <span className="space-y-2 block">
                    <Label className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                      {selectedEvent?.sponsor.identifierType === 'username' ? 'Kullanici Adi' :
                       selectedEvent?.sponsor.identifierType === 'phone' ? 'Telefon Numarasi' :
                       selectedEvent?.sponsor.identifierType === 'email' ? 'E-posta' : 'ID'}
                    </Label>
                    <Input
                      value={sponsorInfo}
                      onChange={(e) => setSponsorInfo(e.target.value)}
                      placeholder={
                        selectedEvent?.sponsor.identifierType === 'username' ? 'Kullanici adinizi girin' :
                        selectedEvent?.sponsor.identifierType === 'phone' ? 'Telefon numaranizi girin' :
                        selectedEvent?.sponsor.identifierType === 'email' ? 'E-posta adresinizi girin' : 'ID girin'
                      }
                      className="rounded-xl border-2"
                      style={{
                        background: theme.colors.backgroundSecondary,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }}
                      disabled={savingSponsor}
                    />
                  </span>
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <ThemedButton
              onClick={() => setShowSponsorForm(false)}
              variant="secondary"
              size="md"
              disabled={savingSponsor}
            >
              Iptal
            </ThemedButton>
            <ThemedButton
              onClick={saveSponsorInfo}
              disabled={savingSponsor || !sponsorInfo.trim()}
              variant="primary"
              size="md"
            >
              {savingSponsor ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet ve Katil'
              )}
            </ThemedButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Required Modal */}
      <VerificationRequiredModal
        isOpen={showVerificationModal}
        onClose={closeVerificationModal}
        onSuccess={() => {
          closeVerificationModal()
          refreshUser()
          // Doğrulama tamamlandıktan sonra seçili etkinlik varsa katılım işlemini başlat
          if (selectedEvent) {
            handleJoinEventAfterVerification(selectedEvent)
          }
        }}
        actionName={actionName}
      />
    </DashboardLayout>
  )
}
