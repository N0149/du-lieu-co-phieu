// ─────────────────────────────────────────────────────────────────────────────
// lib/security.ts — Bộ công cụ Phòng thủ & Chống cào dữ liệu (Anti-Scraping)
// ─────────────────────────────────────────────────────────────────────────────

/** Danh sách regex nhận diện các công cụ cào, crawler và headless browser */
export const SCRAPER_USER_AGENTS = [
  /python-requests/i,
  /aiohttp/i,
  /httpx/i,
  /scrapy/i,
  /beautifulsoup/i,
  /curl\//i,
  /wget\//i,
  /httpclient/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /okhttp/i,
  /urllib/i,
  /node-fetch/i,
  /axios\//i,
  /postmanruntime/i,
  /pycurl/i,
  /httrack/i,
  /mechanize/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /nightmare/i,
  /electron/i,
  /bytespider/i,
  /gptbot/i,
  /ccbot/i,
  /claude-web/i,
  /anthropic-ai/i,
  /diffbot/i,
  /webcopier/i,
  /teleport/i,
]

/** Whitelist các bot tìm kiếm hợp pháp cho SEO */
export const ALLOWED_SEARCH_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /telegrambot/i,
  /applebot/i,
  /linkedinbot/i,
  /slackbot/i,
  /whatsapp/i,
]

/**
 * Kiểm tra xem User-Agent có phải là bot cào trái phép không
 */
export function isScraperUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length === 0) return true // Chặn request không có User-Agent

  // 1. Nếu là bot tìm kiếm chính thống -> Cho phép
  if (ALLOWED_SEARCH_BOTS.some((regex) => regex.test(ua))) {
    return false
  }

  // 2. Nếu khớp mẫu scraper -> Chặn
  if (SCRAPER_USER_AGENTS.some((regex) => regex.test(ua))) {
    return true
  }

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Honeypot Blocklist (Chặn IP dính bẫy 24h)
// ─────────────────────────────────────────────────────────────────────────────

type BlockEntry = {
  expiresAt: number
  reason: string
}

// Global cache lưu IP bị khóa trên node runtime
const honeypotBlacklist = new Map<string, BlockEntry>()

export function blockIpInHoneypot(ip: string, reason = 'Triggered Honeypot Trap', durationHours = 24) {
  const expiresAt = Date.now() + durationHours * 60 * 60 * 1000
  honeypotBlacklist.set(ip, { expiresAt, reason })
}

export function isIpBlockedByHoneypot(ip: string): boolean {
  const entry = honeypotBlacklist.get(ip)
  if (!entry) return false

  if (Date.now() > entry.expiresAt) {
    honeypotBlacklist.delete(ip)
    return false
  }

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Rate Limiter (Sliding Window) cho API & Edge Middleware
// ─────────────────────────────────────────────────────────────────────────────

type RateLimitRecord = {
  count: number
  windowStart: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

// Dọn dẹp cache quá hạn
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
      if (now - record.windowStart > 120_000) {
        rateLimitMap.delete(key)
      }
    }
    for (const [ip, entry] of honeypotBlacklist.entries()) {
      if (now > entry.expiresAt) {
        honeypotBlacklist.delete(ip)
      }
    }
  }, 10 * 60 * 1000)
}

export type RateLimitOptions = {
  windowMs?: number // Mặc định 60.000 ms (1 phút)
  max?: number // Mặc định 60 requests / phút
}

/**
 * Kiểm tra và tăng số lượng request của một IP / Client
 */
export function checkInMemoryRateLimit(
  key: string,
  options: RateLimitOptions = {}
): {
  success: boolean
  limit: number
  remaining: number
  reset: number
} {
  const windowMs = options.windowMs || 60_000
  const max = options.max || 60
  const now = Date.now()

  let record = rateLimitMap.get(key)

  if (!record || now - record.windowStart >= windowMs) {
    record = { count: 1, windowStart: now }
    rateLimitMap.set(key, record)
    return {
      success: true,
      limit: max,
      remaining: max - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    }
  }

  record.count += 1
  const remaining = Math.max(0, max - record.count)
  const reset = Math.ceil((record.windowStart + windowMs) / 1000)

  if (record.count > max) {
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset,
    }
  }

  return {
    success: true,
    limit: max,
    remaining,
    reset,
  }
}

/**
 * Lấy IP thực của Client từ Request Headers (hỗ trợ Vercel, Cloudflare, Reverse Proxies)
 */
export function getClientIp(headers: Headers): string {
  // 1. Cloudflare header (đáng tin cậy nhất và không thể bị giả mạo khi qua Cloudflare Proxy)
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  // 2. Vercel / Standard reverse proxy
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  return '127.0.0.1'
}

/**
 * Kết quả thẩm định quyền truy cập API nội bộ
 */
export type ApiOriginVerificationResult = {
  allowed: boolean
  redirectUrl?: string
  reason?: string
}

/**
 * Thẩm định truy cập API nội bộ:
 * - Cho phép request cùng origin (từ chính frontend React trên website)
 * - Chuyển hướng người dùng vào trang giao diện nếu gõ thẳng URL API vào thanh địa chỉ trình duyệt
 * - Chặn đứng các script cào tự động từ bên ngoài (Python, curl, Postman, cross-site fetch)
 */
export function verifyApiOriginAccess(
  pathname: string,
  headers: Headers,
  host: string | null
): ApiOriginVerificationResult {
  // 1. Ngoại lệ các route hệ thống, auth callback, cron job và bẫy honeypot
  if (
    pathname === '/api/security/trap' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/sync-')
  ) {
    return { allowed: true }
  }

  const secFetchSite = headers.get('sec-fetch-site')
  const secFetchDest = headers.get('sec-fetch-dest')
  const secFetchMode = headers.get('sec-fetch-mode')
  const referer = headers.get('referer')
  const origin = headers.get('origin')
  const accept = headers.get('accept') || ''

  // 2. Nếu người dùng gõ/paste thẳng link API vào thanh địa chỉ trình duyệt
  // (sec-fetch-dest === 'document', sec-fetch-mode === 'navigate', hoặc browser gửi accept: text/html)
  if (secFetchDest === 'document' || secFetchMode === 'navigate' || accept.startsWith('text/html')) {
    // Nếu là API cổ phiếu (vd: /api/stock/HPG/..., /api/financials/HPG, /api/business-plan/HPG)
    // Tự động chuyển hướng về trang giao diện /stock/HPG để xem trực tiếp
    const match = pathname.match(/\/(?:stock|financials|business-plan|reports\/company)\/([A-Za-z0-9]{3,4})/i)
    if (match && match[1]) {
      return { allowed: false, redirectUrl: `/stock/${match[1].toUpperCase()}` }
    }
    return { allowed: false, redirectUrl: '/' }
  }

  // 3. Chặn các request Cross-Site (từ trang web đối thủ gọi sang trộm API)
  if (secFetchSite === 'cross-site') {
    return { allowed: false, reason: 'CROSS_SITE_API_REQUEST_BLOCKED' }
  }

  // 4. Kiểm tra hợp lệ Same-Origin:
  // - Trình duyệt chuẩn gửi sec-fetch-site: 'same-origin' hoặc 'same-site'
  const hasSameOriginSec = secFetchSite === 'same-origin' || secFetchSite === 'same-site'

  // - Hoặc có referer hợp lệ trỏ từ host của website
  let isMatchingReferer = false
  if (referer && host) {
    try {
      const refUrl = new URL(referer)
      if (refUrl.host === host || refUrl.host.endsWith(host)) {
        isMatchingReferer = true
      }
    } catch {}
  }

  // - Hoặc origin trùng khớp host
  let isMatchingOrigin = false
  if (origin && host) {
    try {
      const originUrl = new URL(origin)
      if (originUrl.host === host || originUrl.host.endsWith(host)) {
        isMatchingOrigin = true
      }
    } catch {}
  }

  if (hasSameOriginSec || isMatchingReferer || isMatchingOrigin) {
    return { allowed: true }
  }

  // 5. Nếu không có bất kỳ dấu hiệu xác nhận Same-Origin nào -> Script ngoài (Python, curl, Postman, crawler)
  return { allowed: false, reason: 'EXTERNAL_SCRAPER_OR_DIRECT_CALL' }
}

/**
 * Kiểm tra xem request có phải đến từ cùng origin của website hay không
 */
export function isSameOriginOrDirect(headers: Headers, host: string | null): boolean {
  const secFetchSite = headers.get('sec-fetch-site')
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
    return true
  }

  const referer = headers.get('referer')
  if (referer && host && referer.includes(host)) {
    return true
  }

  const origin = headers.get('origin')
  if (origin && host && origin.includes(host)) {
    return true
  }

  return false
}
