'use client'

import { useState, useEffect } from 'react'
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
  Eye
} from 'lucide-react'
import Link from 'next/link'

interface BroadcastHistory {
  id: string
  message: string
  imageUrl: string | null
  sendToAll: boolean
  targetUserCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  queuedCount: number
  sentCount: number
  failedCount: number
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function BroadcastHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [broadcasts, setBroadcasts] = useState<BroadcastHistory[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }
    loadHistory(1)
  }, [])

  async function loadHistory(page: number, isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch(`/api/admin/broadcast/history?page=${page}&limit=20`)
      const data = await response.json()

      if (data.success) {
        setBroadcasts(data.broadcasts)
        setPagination(data.pagination)
      } else {
        toast.error(data.error || 'Geçmiş yüklenemedi')
      }
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Geçmiş yüklenirken hata oluştu')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Tamamlandı
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Loader2 className="w-3 h-3 animate-spin" />
            Gönderiliyor
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            Başarısız
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
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

  function truncateMessage(msg: string, maxLength = 80) {
    if (!msg) return '-'
    const plainText = msg.replace(/<[^>]*>/g, '')
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength) + '...'
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-inner">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/broadcast">
              <Button
                variant="outline"
                size="icon"
                className="border-white/20 hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Mesaj Geçmişi</h1>
              <p className="text-gray-400">Gönderilen toplu mesajların geçmişi</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => loadHistory(pagination.page, true)}
            disabled={refreshing}
            className="border-white/20 hover:bg-white/10 gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>

        {/* History List */}
        <Card className="admin-card border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-20">
              <Send className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Henüz mesaj gönderilmemiş</p>
              <Link href="/admin/broadcast">
                <Button className="mt-4 bg-blue-500 hover:bg-blue-600">
                  İlk Mesajı Gönder
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/5">
                {broadcasts.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-4"
                    onClick={() => router.push(`/admin/broadcast/${broadcast.id}`)}
                  >
                    {/* Image Preview */}
                    {broadcast.imageUrl ? (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                        <img
                          src={broadcast.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center">
                        <Send className="w-5 h-5 text-gray-500" />
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {truncateMessage(broadcast.message)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{formatDate(broadcast.createdAt)}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {broadcast.sendToAll ? 'Tümü' : `${broadcast.targetUserCount} kişi`}
                        </span>
                        <span className="text-green-400">{broadcast.sentCount} gönderildi</span>
                        {broadcast.failedCount > 0 && (
                          <span className="text-red-400">{broadcast.failedCount} başarısız</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(broadcast.status)}
                    </div>

                    {/* Detail Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-gray-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/broadcast/${broadcast.id}`)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    Toplam {pagination.total} mesaj
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadHistory(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="border-white/20"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-400">
                      {pagination.page}/{pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadHistory(pagination.page + 1)}
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
