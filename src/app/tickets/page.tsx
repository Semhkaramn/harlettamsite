'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { TicketCard } from '@/components/tickets/TicketCard'
import { TicketRequestForm } from '@/components/tickets/TicketRequestForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TicketCheck, Clock, CheckCircle, XCircle, Filter, Gift, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { useUserTheme } from '@/components/providers/user-theme-provider'
import { useVerification } from '@/lib/hooks/useVerification'
import VerificationRequiredModal from '@/components/VerificationRequiredModal'
import {
  ThemedEmptyState,
} from '@/components/ui/themed'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ThemedButton } from '@/components/ui/themed'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

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
    identifierType?: string
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

interface TicketRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  investmentAmount: number
  ticketCount: number
  note?: string
  createdAt: string
  event: TicketEvent
  ticketNumbers: Array<{ ticketNumber: number }>
}

export default function TicketsPage() {
  const router = useRouter()
  const { user, setShowLoginModal, refreshUser } = useAuth()
  const { theme, button } = useUserTheme()
  const {
    isFullyVerified,
    showVerificationModal,
    actionName,
    closeVerificationModal,
    requireVerification
  } = useVerification()
  const [activeFilter, setActiveFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [myRequests, setMyRequests] = useState<TicketRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [eventFilter, setEventFilter] = useState<string>('all')

  // Join modal states
  const [selectedEvent, setSelectedEvent] = useState<TicketEvent | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showSponsorForm, setShowSponsorForm] = useState(false)
  const [sponsorInfo, setSponsorInfo] = useState('')
  const [savingSponsorInfo, setSavingSponsorInfo] = useState(false)

  const formatDateTR = (date: string | Date) => {
    const d = new Date(date)
    return d.toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('tr-TR')
  }

  useEffect(() => {
    loadData()
  }, [activeFilter])

  useEffect(() => {
    if (activeFilter === 'my-requests' && user) {
      loadMyRequests()
    }
  }, [activeFilter, user])

  async function loadData() {
    try {
      setLoading(true)
      let url = '/api/tickets'

      if (activeFilter === 'pending') {
        url = '/api/tickets?status=waiting_draw'
      } else if (activeFilter === 'history') {
        url = '/api/tickets/history'
      } else if (activeFilter === 'my-requests') {
        setLoading(false)
        return
      }

      const res = await fetch(url)
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veri yuklenirken hata olustu')
    } finally {
      setLoading(false)
    }
  }

  async function loadMyRequests() {
    try {
      setRequestsLoading(true)
      const res = await fetch('/api/tickets/my-requests')
      const data = await res.json()
      setMyRequests(data.requests || [])
    } catch (error) {
      console.error('Error loading requests:', error)
      toast.error('Talepler yuklenirken hata olustu')
    } finally {
      setRequestsLoading(false)
    }
  }

  async function handleJoinClick(event: TicketEvent) {
    if (!user) {
      toast.error('Bilet almak icin giris yapmalisiniz')
      setShowLoginModal(true)
      return
    }

    // Telegram ve email doğrulaması kontrolü
    if (!requireVerification(() => {
      handleJoinClickAfterVerification(event)
    }, 'bilet talep etmek')) {
      setSelectedEvent(event)
      return
    }

    await handleJoinClickAfterVerification(event)
  }

  async function handleJoinClickAfterVerification(event: TicketEvent) {
    setSelectedEvent(event)

    try {
      const res = await fetch('/api/user/sponsor-info')
      const data = await res.json()
      const sponsorInfoData = data.sponsorInfos?.find((info: any) => info.sponsorId === event.sponsor.id)

      if (!sponsorInfoData) {
        setShowSponsorForm(true)
        toast.info(`Lutfen ${event.sponsor.name} bilginizi girin`)
        return
      }

      setSponsorInfo(sponsorInfoData.identifier || '')
      setShowRequestForm(true)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function saveSponsorInfoAndContinue() {
    if (!sponsorInfo.trim()) {
      toast.error('Bilgi gerekli')
      return
    }

    try {
      setSavingSponsorInfo(true)
      const res = await fetch('/api/user/sponsor-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorId: selectedEvent?.sponsor.id,
          identifier: sponsorInfo.trim()
        })
      })

      if (!res.ok) throw new Error('Kaydedilemedi')

      toast.success('Kaydedildi!')
      setShowSponsorForm(false)
      setShowRequestForm(true)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingSponsorInfo(false)
    }
  }

  const filters = user
    ? [
        { value: 'active', label: 'Aktif' },
        { value: 'pending', label: 'Bekleyen' },
        { value: 'history', label: 'Gecmis' },
        { value: 'my-requests', label: 'Taleplerim' }
      ]
    : [
        { value: 'active', label: 'Aktif' },
        { value: 'pending', label: 'Bekleyen' },
        { value: 'history', label: 'Gecmis' }
      ]

  const filteredRequests = myRequests
    .filter(r => eventFilter === 'all' || r.event.id === eventFilter)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const uniqueEvents = Array.from(new Map(myRequests.map(r => [r.event.id, r.event])).values())

  return (
    <DashboardLayout showYatayBanner={true}>
      {loading ? (
        <LoadingSpinner />
      ) : (
      <div className="user-page-container">
        <div className="user-page-inner space-y-4">

        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          {/* Tabs styled like events page */}
          <div
            className="flex gap-1.5 p-1.5 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.backgroundSecondary}90, ${theme.colors.card}90)`,
              border: `1px solid ${theme.colors.border}`,
              backdropFilter: 'blur(8px)'
            }}
          >
            {filters.map((filter) => (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className="flex-1 transition-all rounded-lg px-4 py-2.5 text-sm font-semibold data-[state=active]:shadow-lg data-[state=inactive]:opacity-70"
                style={{
                  color: theme.colors.text,
                }}
              >
                {filter.value === 'active' && <Gift className="w-4 h-4 mr-2" />}
                {filter.value === 'pending' && <Clock className="w-4 h-4 mr-2" />}
                {filter.value === 'history' && <Calendar className="w-4 h-4 mr-2" />}
                {filter.value === 'my-requests' && <TicketCheck className="w-4 h-4 mr-2" />}
                {filter.label}
              </TabsTrigger>
            ))}
          </div>

          <TabsContent value={activeFilter} className="space-y-3 mt-4">
            {activeFilter === 'my-requests' ? (
              requestsLoading ? (
                <LoadingSpinner fullscreen={false} className="py-12" />
              ) : myRequests.length === 0 ? (
                <ThemedEmptyState
                  icon={<TicketCheck className="w-12 h-12" />}
                  title="Henuz bilet talebiniz yok"
                />
              ) : (
                <div className="space-y-3">
                  {/* Etkinlik Filtresi */}
                  {uniqueEvents.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" style={{ color: theme.colors.textMuted }} />
                      <select
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                        className="text-sm rounded-xl px-3 py-2 focus:outline-none border"
                        style={{
                          background: theme.colors.backgroundSecondary,
                          borderColor: theme.colors.border,
                          color: theme.colors.text
                        }}
                      >
                        <option value="all">Tum Etkinlikler</option>
                        {uniqueEvents.map(event => (
                          <option key={event.id} value={event.id}>{event.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Talep Listesi */}
                  <div className="space-y-2">
                    {filteredRequests.map(request => {
                      const ticketCount = request.ticketNumbers?.length || request.ticketCount || 0
                      return (
                        <div
                          key={request.id}
                          className="relative overflow-hidden rounded-xl"
                          style={{
                            background: theme.colors.card,
                            border: `1px solid ${theme.colors.border}`,
                            boxShadow: `0 4px 16px ${theme.colors.gradientFrom}08`
                          }}
                        >
                          {/* Üst renk çizgisi - duruma göre */}
                          <div
                            className="h-1"
                            style={{
                              background: request.status === 'pending'
                                ? `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primary})`
                                : request.status === 'approved'
                                ? `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primary})`
                                : `linear-gradient(90deg, ${theme.colors.error}, ${theme.colors.error})`
                            }}
                          />

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap mb-2">
                                  <h4 className="font-bold text-sm" style={{ color: theme.colors.text }}>
                                    {request.event.title}
                                  </h4>

                                  {request.status === 'approved' && request.ticketNumbers && request.ticketNumbers.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {request.ticketNumbers.map(t => (
                                        <span
                                          key={t.ticketNumber}
                                          className="px-2 py-0.5 text-xs rounded-lg font-mono"
                                          style={{
                                            background: `${theme.colors.primary}15`,
                                            color: theme.colors.primary,
                                            border: `1px solid ${theme.colors.primary}30`
                                          }}
                                        >
                                          #{t.ticketNumber}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs" style={{ color: theme.colors.text }}>
                                  <span>Yatirim: <span style={{ color: theme.colors.text }} className="font-medium">{formatAmount(request.investmentAmount)}TL</span></span>
                                  <span>Bilet: <span style={{ color: theme.colors.text }} className="font-medium">{ticketCount} adet</span></span>
                                  <span>Tarih: <span style={{ color: theme.colors.text }} className="font-medium">{formatDateTR(request.createdAt)}</span></span>
                                </div>
                              </div>

                              <span
                                className="flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs"
                                style={{
                                  background: request.status === 'pending'
                                    ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}cc)`
                                    : request.status === 'approved'
                                    ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}cc)`
                                    : `linear-gradient(135deg, ${theme.colors.error}, ${theme.colors.error}cc)`,
                                  color: 'white',
                                  boxShadow: request.status === 'pending'
                                    ? `0 4px 12px ${theme.colors.primary}30`
                                    : request.status === 'approved'
                                    ? `0 4px 12px ${theme.colors.primary}30`
                                    : `0 4px 12px ${theme.colors.error}30`
                                }}
                              >
                                {request.status === 'pending' ? 'Bekliyor' : request.status === 'approved' ? 'Onaylandi' : 'Reddedildi'}
                              </span>
                            </div>

                            {request.status === 'rejected' && request.note && (
                              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.colors.border}40` }}>
                                <p className="text-xs flex items-start gap-1.5" style={{ color: theme.colors.error }}>
                                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                  <span>Red Sebebi: {request.note}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            ) : events.length === 0 ? (
              <ThemedEmptyState
                icon={<TicketCheck className="w-12 h-12" />}
                title={
                  activeFilter === 'active' ? 'Aktif bilet etkinliği yok' :
                  activeFilter === 'pending' ? 'Çekilişi bekleyen etkinlik yok' :
                  'Geçmiş etkinlik yok'
                }
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {events.map(event => (
                  <TicketCard
                    key={event.id}
                    event={event}
                    type="user"
                    formatAmount={formatAmount}
                    formatDateTR={formatDateTR}
                    onJoinClick={handleJoinClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
      )}

      {/* Request Form */}
      {showRequestForm && selectedEvent && (
        <TicketRequestForm
          event={selectedEvent}
          sponsorInfo={sponsorInfo}
          onClose={() => {
            setShowRequestForm(false)
            setSelectedEvent(null)
            setSponsorInfo('')
          }}
          onSuccess={() => {
            setShowRequestForm(false)
            setSelectedEvent(null)
            setSponsorInfo('')
            if (activeFilter === 'my-requests') {
              loadMyRequests()
            }
          }}
          formatAmount={formatAmount}
        />
      )}

      {/* Sponsor Info Dialog */}
      <AlertDialog open={showSponsorForm} onOpenChange={(open) => {
        if (!open) {
          setShowSponsorForm(false)
          setSponsorInfo('')
        }
      }}>
        <AlertDialogContent
          className="rounded-2xl border"
          style={{
            background: theme.colors.card,
            borderColor: theme.colors.border
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold" style={{ color: theme.colors.text }}>Sponsor Bilgisi Gerekli</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4" style={{ color: theme.colors.textSecondary }}>
                <div className="flex items-center gap-4">
                  {selectedEvent?.sponsor.logoUrl && (
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden relative"
                      style={{
                        background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary}, ${theme.colors.background})`,
                        border: `1px solid ${theme.colors.border}`
                      }}
                    >
                      <Image
                        src={selectedEvent.sponsor.logoUrl}
                        alt={selectedEvent.sponsor.name}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-bold" style={{ color: theme.colors.text }}>{selectedEvent?.sponsor.name}</p>
                    <p className="text-sm" style={{ color: theme.colors.textMuted }}>{selectedEvent?.title}</p>
                  </div>
                </div>

                <div className="space-y-3 py-2">
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    Bu etkinlige katilabilmek icin sponsor bilginizi eklemeniz gerekmektedir.
                  </p>
                  <div className="space-y-2">
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
                      className="rounded-xl"
                      style={{
                        background: theme.colors.backgroundSecondary,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }}
                      disabled={savingSponsorInfo}
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <ThemedButton
              onClick={() => setShowSponsorForm(false)}
              variant="secondary"
              size="md"
              disabled={savingSponsorInfo}
            >
              Iptal
            </ThemedButton>
            <ThemedButton
              onClick={saveSponsorInfoAndContinue}
              disabled={savingSponsorInfo || !sponsorInfo.trim()}
              variant="primary"
              size="md"
            >
              {savingSponsorInfo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet ve Devam Et'
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
          // Doğrulama tamamlandıktan sonra seçili etkinlik varsa işlemi devam ettir
          if (selectedEvent) {
            handleJoinClickAfterVerification(selectedEvent)
          }
        }}
        actionName={actionName}
      />
    </DashboardLayout>
  )
}
