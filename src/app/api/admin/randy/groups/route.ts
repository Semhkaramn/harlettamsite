import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/admin-middleware'
import { getTelegramGroups } from '@/lib/site-config'

// Telegram gruplarını getir
export async function GET(req: NextRequest) {
  const authCheck = await requirePermission(req, 'canAccessRandy')
  if (authCheck.error) return authCheck.error

  try {
    const groups = getTelegramGroups()
    return NextResponse.json(groups)
  } catch (error) {
    console.error('Telegram grupları hatası:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
