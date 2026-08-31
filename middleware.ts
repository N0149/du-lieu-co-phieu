import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isScraperUserAgent,
  isIpBlockedByHoneypot,
  checkInMemoryRateLimit,
  getClientIp,
} from '@/lib/security'

// Bỏ qua các file tĩnh, favicon, static image và next internal bundle
export const config = {
  matcher: [
    /*
     * Khớp tất cả request đường dẫn TRỪ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg, robots.txt, sitemap.xml
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)',
  ],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  const ip = getClientIp(request.headers)

  // 1. Kiểm tra nếu IP đã dính bẫy Honeypot -> Chặn ngay lập tức
  if (isIpBlockedByHoneypot(ip)) {
    return new NextResponse(
      JSON.stringify({
        error: 'FORBIDDEN_IP',
        message: 'Địa chỉ IP của bạn tạm thời bị khóa do phát hiện hành vi quét cào dữ liệu tự động.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    )
  }

  // 2. Kiểm tra User-Agent cào dữ liệu trái phép (trừ các bot tìm kiếm hợp pháp)
  if (isScraperUserAgent(userAgent)) {
    console.warn(`[Anti-Scraping] Blocked scraper UA: "${userAgent.slice(0, 60)}" from IP: ${ip} on path: ${pathname}`)
    return new NextResponse(
      JSON.stringify({
        error: 'BOT_ACCESS_DENIED',
        message: 'Truy cập qua các công cụ cào tự động (Scrapers / Crawlers) bị từ chối.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    )
  }

  // 3. Rate Limiting cho API Endpoints (tối đa 60 requests / phút / IP)
  if (pathname.startsWith('/api/')) {
    // Không rate-limit honeypot trap để cho bot chạy thẳng vào bẫy
    if (pathname !== '/api/security/trap') {
      const apiLimiter = checkInMemoryRateLimit(`rl:api:${ip}`, {
        windowMs: 60_000,
        max: 60,
      })

      if (!apiLimiter.success) {
        console.warn(`[RateLimit Exceeded] IP: ${ip} gọi API quá 60 req/phút trên ${pathname}`)
        return new NextResponse(
          JSON.stringify({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Tần suất gửi yêu cầu quá cao. Vui lòng thử lại sau 1 phút.',
            retryAfter: apiLimiter.reset,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Retry-After': String(apiLimiter.reset),
              'X-RateLimit-Limit': String(apiLimiter.limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }
  } else {
    // 4. Rate Limiting cho Web Pages (tối đa 150 requests / phút / IP để chống spam reload)
    const pageLimiter = checkInMemoryRateLimit(`rl:page:${ip}`, {
      windowMs: 60_000,
      max: 150,
    })

    if (!pageLimiter.success) {
      console.warn(`[RateLimit Exceeded] IP: ${ip} tải trang quá nhanh trên ${pathname}`)
      return new NextResponse(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Yêu cầu bị tạm dừng (429 Too Many Requests)</h2>
          <p>Hệ thống ghi nhận quá nhiều lượt tải trang trong thời gian ngắn từ thiết bị của bạn.</p>
          <p>Vui lòng chờ giây lát và tải lại trang.</p>
        </body></html>`,
        {
          status: 429,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // Tiếp tục xử lý request bình thường
  const response = NextResponse.next()

  // Bổ sung Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  return response
}
