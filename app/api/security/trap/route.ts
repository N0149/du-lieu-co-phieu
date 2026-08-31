import { NextRequest, NextResponse } from 'next/server'
import { blockIpInHoneypot, getClientIp } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * Honeypot Trap Route:
 * Được chèn vô hình trên giao diện website để bẫy các crawler/scraper tự động.
 * Người dùng thật không bao giờ click vào link này.
 * Bất kỳ client nào gọi tới route này sẽ bị block IP 24h.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers)
  const ua = request.headers.get('user-agent') || 'Unknown'

  console.warn(`🚨 [Honeypot Trap Triggered] IP: ${ip} | UA: ${ua} đã bị chặn 24h`)

  // Khóa IP trong 24 giờ
  blockIpInHoneypot(ip, `Crawler trap triggered with UA: ${ua.slice(0, 50)}`, 24)

  return NextResponse.json(
    {
      error: 'ACCESS_DENIED',
      message: 'Hành vi cào dữ liệu tự động bị nghiêm cấm theo chính sách sử dụng dịch vụ.',
    },
    {
      status: 403,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Retry-After': '86400',
      },
    }
  )
}

export async function POST(request: NextRequest) {
  return GET(request)
}
