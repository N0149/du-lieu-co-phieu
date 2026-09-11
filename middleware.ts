import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isScraperUserAgent,
  isIpBlockedByHoneypot,
  checkInMemoryRateLimit,
  getClientIp,
  verifyApiOriginAccess,
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

  // 0. Nếu URL chứa mã xác thực auth code mà không ở /auth/callback -> Tự động chuyển hướng về /auth/callback
  if (pathname !== '/auth/callback' && request.nextUrl.searchParams.has('code')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.search = request.nextUrl.search
    return NextResponse.redirect(callbackUrl)
  }

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

  // 3. Khóa van bảo vệ API nội bộ (Anti-Scraping / Direct API Access Gatekeeper)
  if (pathname.startsWith('/api/')) {
    const host = request.headers.get('host') || request.nextUrl.host
    const apiGuard = verifyApiOriginAccess(pathname, request.headers, host)

    // A. Nếu người dùng gõ/paste trực tiếp URL API vào thanh địa chỉ trình duyệt -> Chuyển hướng về trang giao diện UI
    if (!apiGuard.allowed && apiGuard.redirectUrl) {
      return NextResponse.redirect(new URL(apiGuard.redirectUrl, request.url))
    }

    // B. Nếu là script ngoài (Python, curl, Postman, web clone) -> Chặn đứng 403 Forbidden
    if (!apiGuard.allowed) {
      console.warn(`[Anti-Scraping] Blocked external API call to ${pathname} from IP: ${ip} (${apiGuard.reason})`)
      return new NextResponse(
        JSON.stringify({
          error: 'DIRECT_API_ACCESS_FORBIDDEN',
          message: 'Truy cập trực tiếp vào API nội bộ bị từ chối. Dữ liệu chỉ được hiển thị trên giao diện dulieudautu.com.',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Robots-Tag': 'noindex, nofollow, noarchive',
          },
        }
      )
    }

    // Rate Limiting cho API Endpoints (tối đa 60 requests / phút / IP)
    // Không rate-limit honeypot trap để cho bot chạy thẳng vào bẫy
    // Miễn rate-limit cho localhost/development
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || process.env.NODE_ENV !== 'production'
    if (pathname !== '/api/security/trap' && !isLocalhost) {
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
    // 4. Chống cào hàng loạt trang cổ phiếu (Bulk Stock Scraping: tối đa 25 mã / phút / IP)
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || process.env.NODE_ENV !== 'production'
    if (pathname.startsWith('/stock/') && !isLocalhost) {
      const stockLimiter = checkInMemoryRateLimit(`rl:stock:${ip}`, {
        windowMs: 60_000,
        max: 25,
      })

      if (!stockLimiter.success) {
        console.warn(`[Anti-Scraping] IP: ${ip} cào duyệt quá 25 mã cổ phiếu / phút trên ${pathname}`)
        return new NextResponse(
          `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Yêu cầu tra cứu bị tạm dừng (429)</h2>
            <p>Hệ thống ghi nhận bạn đang tra cứu số lượng lớn mã cổ phiếu với tốc độ bất thường.</p>
            <p>Vui lòng chờ 1 phút trước khi tiếp tục tra cứu.</p>
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

    // 5. Rate Limiting chung cho Web Pages (tối đa 150 requests / phút / IP để chống spam reload)
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
