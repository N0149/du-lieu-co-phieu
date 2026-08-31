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
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  return '127.0.0.1'
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
  if (!referer) return true // Direct browser address bar visit

  if (host && referer.includes(host)) {
    return true
  }

  return false
}
