import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/admin-middleware'

export async function GET(request: NextRequest) {
  const authCheck = await requirePermission(request, 'canAccessBroadcast')
  if (authCheck.error) return authCheck.error

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [broadcasts, total] = await Promise.all([
      prisma.broadcastHistory.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.broadcastHistory.count(),
    ])

    return NextResponse.json({
      success: true,
      broadcasts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching broadcast history:', error)
    return NextResponse.json({
      success: false,
      error: 'Mesaj geçmişi yüklenirken hata oluştu'
    }, { status: 500 })
  }
}
