import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-middleware'
import { telegramQueue } from '@/lib/telegram/queue'

// GET - Kuyruk istatistiklerini getir
export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessBroadcast')
  if (authCheck.error) return authCheck.error

  try {
    const stats = await telegramQueue.getStats()

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Kuyruk istatistikleri alınamadı'
    }, { status: 500 })
  }
}

// POST - Bozuk verileri temizle (eski sistemden kalan)
export async function POST(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessBroadcast')
  if (authCheck.error) return authCheck.error

  try {
    const removedCount = await telegramQueue.cleanupCorrupted()
    const stats = await telegramQueue.getStats()

    return NextResponse.json({
      success: true,
      removedCount,
      stats,
      message: `${removedCount} eski/bozuk veri temizlendi.`
    })
  } catch (error) {
    console.error('Error cleaning up queue:', error)
    return NextResponse.json({
      success: false,
      error: 'Kuyruk temizlenirken hata oluştu'
    }, { status: 500 })
  }
}

// DELETE - Tüm kuyruğu tamamen temizle
export async function DELETE(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessBroadcast')
  if (authCheck.error) return authCheck.error

  try {
    // Önce cleanup yap (eski sistem key'lerini temizler)
    await telegramQueue.cleanupCorrupted()

    // Sonra tüm kuyruğu temizle
    await telegramQueue.clearQueue()

    const stats = await telegramQueue.getStats()

    return NextResponse.json({
      success: true,
      stats,
      message: 'Tüm kuyruk ve eski veriler tamamen temizlendi.'
    })
  } catch (error) {
    console.error('Error clearing queue:', error)
    return NextResponse.json({
      success: false,
      error: 'Kuyruk temizlenirken hata oluştu'
    }, { status: 500 })
  }
}
