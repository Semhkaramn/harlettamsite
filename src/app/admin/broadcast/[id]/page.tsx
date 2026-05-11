'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Ban,
  MessageSquareOff,
  UserX,
  ExternalLink,
  Filter,
  Eye
} from 'lucide-react'
import Link from 'next/link'

interface BroadcastRecipient {
  id: string
  telegramId: string
  telegramUsername: string | null
  firstName: string | null
  siteUsername: string | null
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  errorCode: string | null
  errorMessage: string | null
  failureReason: string | null
  personalizedMessage: string | null
  sentAt: string | null
  createdAt: string
}

interface BroadcastDetail {
  id: string
  message: string
  imageUrl: string | null
  buttons: Array<{ text: string, url: string }>
  sendToAll: boolean
  targetUserCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  queuedCount: number
  sentCount: number
  failedCount: number
  batchId: string | null
  adminUsername: string | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface StatusBreakdown {
  pending: number
  sent: number
  failed: number
  skipped: number
}

interface FailureBreakdown {
  [key: string]: { count: number, label: string }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusFilterOptions = [
  { value: 'all', label: 'Tümü', icon: Users },
  { value: 'sent', label: 'Gönderildi', icon: CheckCircle2 },
  { value: 'failed', label: 'Başarısız', icon: XCircle },
  { value: 'skipped', label: 'Atlandı', icon: AlertTriangle },
  { value: 'pending', label: 'Bekliyor', icon: Clock },
]

const failureReasonIcons: Record<string, any> = {
  'no_hadstart': MessageSquareOff,
  'banned_user': Ban,
  'no_telegram_id': UserX,
  'blocked_bot': Ban,
  'user_deactivated': UserX,
  'chat_not_found': AlertTriangle,
  'too_many_requests': Clock,
  'unknown': AlertTriangle
}

export default function BroadcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [broadcast, setBroadcast] = useState<BroadcastDetail | null>(null)
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({
    pending: 0, sent: 0, failed: 0, skipped: 0
  })
  const [failureBreakdown, setFailureBreakdown] = useState<FailureBreakdown>({})
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 50, total: 0, totalPages: 0
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [showMessagePreview, setShowMessagePreview] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadDetail(1, 'all')
  }, [])

  async function loadDetail(page: number, status: string, isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch(
        `/api/admin/broadcast/${resolvedParams.id}?page=${page}&limit=50&status=${status}`
      )
      const data = await response.json()

      if (data.success) {
        setBroadcast(data.broadcast)
        setRecipients(data.recipients)
        setStatusBreakdown(data.statusBreakdown)
        setFailureBreakdown(data.failureBreakdown)
        setPagination(data.pagination)
      } else {
        toast.error(data.error || 'Detaylar yüklenemedi')
        if (data.error === 'Mesaj bulunamadı') {
          router.push('/admin/broadcast/history')
        }
      }
    } catch (error) {
      console.error('Error loading detail:', error)
      toast.error('Detaylar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleStatusFilterChange(status: string) {
    setStatusFilter(status)
    loadDetail(1, status)
  }

  function handlePageChange(page: number) {
    loadDetail(page, statusFilter)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <CheckCircle2 className="w-4 h-4" />
            Tamamlandı
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Loader2 className="w-4 h-4 animate-spin" />
            Gönderiliyor
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            <XCircle className="w-4 h-4" />
            Başarısız
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <Clock className="w-4 h-4" />
            Bekliyor
          </span>
        )
    }
  }

  function getRecipientStatusBadge(status: string) {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
            <CheckCircle2 className="w-3 h-3" />
            Gönderildi
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
            <XCircle className="w-3 h-3" />
            Başarısız
          </span>
        )
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
            <AlertTriangle className="w-3 h-3" />
            Atlandı
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">
            <Clock className="w-3 h-3" />
            Bekliyor
          </span>
        )
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function truncateMessage(msg: string, maxLength = 200) {
    if (!msg) return '-'
    const plainText = msg.replace(/<[^>]*>/g, '')
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-inner">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-inner">
          <div className="text-center py-20">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Mesaj bulunamadı</p>
            <Link href="/admin/broadcast/history">
              <Button className="mt-4">Geçmişe Dön</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalRecipients = statusBreakdown.pending + statusBreakdown.sent + statusBreakdown.failed + statusBreakdown.skipped

  return (
    <div className="admin-page-container">
      <div className="admin-page-inner">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/broadcast/history">
              <Button
                variant="outline"
                size="icon"
                className="border-white/20 hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Mesaj Detayı</h1>
              <p className="text-gray-400 text-sm">{formatDate(broadcast.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(broadcast.status)}
            <Button
              variant="outline"
              onClick={() => loadDetail(pagination.page, statusFilter, true)}
              disabled={refreshing}
              className="border-white/20 hover:bg-white/10 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>

        {/* Message Content Card */}
        <Card className="admin-card p-5 border-white/10 mb-6">
          <div className="flex items-start gap-4">
            {broadcast.imageUrl && (
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                <img
                  src={broadcast.imageUrl}
                  alt="Mesaj görseli"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">Mesaj İçeriği</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMessagePreview(!showMessagePreview)}
                  className="text-gray-400 hover:text-white"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {showMessagePreview ? 'Gizle' : 'Tam Göster'}
                </Button>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                {showMessagePreview ? broadcast.message : truncateMessage(broadcast.message, 300)}
              </p>
              {broadcast.buttons && broadcast.buttons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {broadcast.buttons.map((btn, idx) => (
                    <a
                      key={idx}
                      href={btn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      {btn.text}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                <span>Gönderen: <span className="text-white">{broadcast.adminUsername || '-'}</span></span>
                <span>Hedef: <span className="text-white">{broadcast.sendToAll ? 'Tüm Kullanıcılar' : `${broadcast.targetUserCount} kişi`}</span></span>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="admin-card p-4 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalRecipients}</p>
                <p className="text-xs text-gray-400">Toplam Alıcı</p>
              </div>
            </div>
          </Card>
          <Card className="admin-card p-4 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{statusBreakdown.sent}</p>
                <p className="text-xs text-gray-400">Gönderildi</p>
              </div>
            </div>
          </Card>
          <Card className="admin-card p-4 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{statusBreakdown.failed}</p>
                <p className="text-xs text-gray-400">Başarısız</p>
              </div>
            </div>
          </Card>
          <Card className="admin-card p-4 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{statusBreakdown.skipped}</p>
                <p className="text-xs text-gray-400">Atlandı</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Failure Reasons Breakdown */}
        {Object.keys(failureBreakdown).length > 0 && (
          <Card className="admin-card p-5 border-white/10 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Başarısızlık Nedenleri
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(failureBreakdown).map(([reason, data]) => {
                const IconComponent = failureReasonIcons[reason] || AlertTriangle
                return (
                  <div
                    key={reason}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-red-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{data.count}</p>
                      <p className="text-gray-400 text-xs">{data.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {statusFilterOptions.map((option) => {
            const IconComponent = option.icon
            const count = option.value === 'all'
              ? totalRecipients
              : statusBreakdown[option.value as keyof StatusBreakdown] || 0
            return (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange(option.value)}
                className={`gap-1.5 ${
                  statusFilter === option.value
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'border-white/20 hover:bg-white/10'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {option.label}
                <span className="ml-1 px-1.5 py-0.5 rounded bg-black/20 text-xs">
                  {count}
                </span>
              </Button>
            )
          })}
        </div>

        {/* Recipients Table */}
        <Card className="admin-card border-white/10 overflow-hidden">
          {recipients.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Bu filtrede alıcı bulunamadı</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                        Kullanıcı
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                        Telegram
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                        Durum
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                        Neden
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">
                        Gönderim Zamanı
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recipients.map((recipient) => (
                      <tr key={recipient.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium text-sm">
                              {recipient.siteUsername || recipient.firstName || 'Kullanıcı'}
                            </p>
                            {recipient.siteUsername && recipient.firstName && (
                              <p className="text-gray-500 text-xs">{recipient.firstName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            {recipient.telegramUsername ? (
                              <p className="text-blue-300 text-sm">@{recipient.telegramUsername}</p>
                            ) : (
                              <p className="text-gray-500 text-sm">-</p>
                            )}
                            <p className="text-gray-500 text-xs">{recipient.telegramId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getRecipientStatusBadge(recipient.status)}
                        </td>
                        <td className="px-4 py-3">
                          {recipient.errorMessage ? (
                            <p className="text-red-300 text-sm">{recipient.errorMessage}</p>
                          ) : recipient.failureReason ? (
                            <p className="text-yellow-300 text-sm">
                              {failureBreakdown[recipient.failureReason]?.label || recipient.failureReason}
                            </p>
                          ) : (
                            <p className="text-gray-500 text-sm">-</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-gray-400 text-sm">
                            {recipient.sentAt ? formatDate(recipient.sentAt) : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    Toplam {pagination.total} kayıt, Sayfa {pagination.page}/{pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="border-white/20"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="border-white/20"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
