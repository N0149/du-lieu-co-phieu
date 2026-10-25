// app/api/analytics/track/route.ts
// Nhận beacon/event ghi nhận lượt xem trang ẩn danh

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordPageView } from '@/lib/analytics-service'
import { getClientIp, isScraperUserAgent } from '@/lib/security'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''

    // Không ghi nhận bot / scraper cào dữ liệu
    if (isScraperUserAgent(userAgent)) {
      return NextResponse.json({ skipped: true }, { status: 200 })
    }

    const ip = getClientIp(request.headers)
    const body = await request.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path : '/'
    const referrer = typeof body.referrer === 'string' ? body.referrer : ''

    // Lấy thông tin user nếu có session
    let userId: string | null = null
    let userEmail: string | null = null

    try {
      const supabase = await createClient()
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          userId = user.id
          userEmail = user.email || null
        }
      }
    } catch {}

    // Ghi nhận lượt xem trang
    await recordPageView({
      path,
      referrer,
      userAgent,
      ip,
      userId,
      userEmail,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
