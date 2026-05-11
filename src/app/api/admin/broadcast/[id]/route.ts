import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requirePermission(request, 'canAccessBroadcast')
  if (authCheck.error) return authCheck.error

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Pagination for recipients
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Filter by status
    const statusFilter = searchParams.get('status') // 'all', 'sent', 'failed', 'skipped', 'pending'

    // Get broadcast with stats
    const broadcast = await prisma.broadcastHistory.findUnique({
      where: { id },
    })

    if (!broadcast) {
      return NextResponse.json({
        success: false,
        error: 'Mesaj bulunamadı'
      }, { status: 404 })
    }

    // Build where clause for recipients
    const whereClause: any = { broadcastId: id }
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter
    }

    // Get recipients with pagination
    const [recipients, totalRecipients] = await Promise.all([
      prisma.broadcastRecipient.findMany({
        where: whereClause,
        orderBy: [
          { status: 'asc' }, // pending first, then sent, then failed, then skipped
          { createdAt: 'desc' }
        ],
        skip,
        take: limit,
      }),
      prisma.broadcastRecipient.count({ where: whereClause })
    ])

    // Get status breakdown
    const statusCounts = await prisma.broadcastRecipient.groupBy({
      by: ['status'],
      where: { broadcastId: id },
      _count: { status: true }
    })

    const statusBreakdown = {
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0
    }

    for (const item of statusCounts) {
      if (item.status in statusBreakdown) {
        statusBreakdown[item.status as keyof typeof statusBreakdown] = item._count.status
      }
    }

    // Get failure reason breakdown
    const failureReasonCounts = await prisma.broadcastRecipient.groupBy({
      by: ['failureReason'],
      where: {
        broadcastId: id,
        failureReason: { not: null }
      },
      _count: { failureReason: true }
    })

    const failureBreakdown: Record<string, { count: number, label: string }> = {}
    const failureReasonLabels: Record<string, string> = {
      'no_hadstart': 'Bot başlatılmamış',
      'banned_user': 'Kullanıcı banlı',
      'no_telegram_id': 'Telegram ID yok',
      'blocked_bot': 'Bot engellendi',
      'user_deactivated': 'Hesap deaktif',
      'chat_not_found': 'Sohbet bulunamadı',
      'too_many_requests': 'Çok fazla istek',
      'unknown': 'Bilinmeyen hata'
    }

    for (const item of failureReasonCounts) {
      if (item.failureReason) {
        failureBreakdown[item.failureReason] = {
          count: item._count.failureReason,
          label: failureReasonLabels[item.failureReason] || item.failureReason
        }
      }
    }

    // Parse buttons if exists
    let buttons = []
    if (broadcast.buttons) {
      try {
        buttons = JSON.parse(broadcast.buttons)
      } catch (e) {
        // Invalid JSON
      }
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        ...broadcast,
        buttons
      },
      recipients,
      statusBreakdown,
      failureBreakdown,
      pagination: {
        page,
        limit,
        total: totalRecipients,
        totalPages: Math.ceil(totalRecipients / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching broadcast detail:', error)
    return NextResponse.json({
      success: false,
      error: 'Mesaj detayları yüklenirken hata oluştu'
    }, { status: 500 })
  }
}
