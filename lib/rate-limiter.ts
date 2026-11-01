// ─────────────────────────────────────────────────────────────────────────────
// lib/rate-limiter.ts — Giới hạn số lượt hỏi AI & MCP (Upstash Redis + In-Memory Fallback)
// ─────────────────────────────────────────────────────────────────────────────

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

/** Giới hạn 40 lượt hỏi / ngày (24 giờ) cho người dùng miễn phí */
export const FREE_DAILY_LIMIT = 40

/** Giới hạn 150 lượt hỏi / ngày cho thành viên VIP */
export const VIP_DAILY_LIMIT = 150

export const freeRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(FREE_DAILY_LIMIT, '1 d'),
      prefix: '@ratelimit:free',
      analytics: true,
    })
  : null

export const vipRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(VIP_DAILY_LIMIT, '1 d'),
      prefix: '@ratelimit:vip',
      analytics: true,
    })
  : null

export const mcpRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(FREE_DAILY_LIMIT, '1 d'),
      prefix: '@ratelimit:mcp',
      analytics: true,
    })
  : null

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// In-Memory Fallback đảm bảo luôn giới hạn được kể cả khi chưa cấu hình Redis
type InMemoryUsage = {
  count: number
  windowStart: number
}
const inMemoryUsageMap = new Map<string, InMemoryUsage>()

// Dọn dẹp cache RAM cũ mỗi 30 phút
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of inMemoryUsageMap.entries()) {
      if (now - record.windowStart > 24 * 60 * 60 * 1000) {
        inMemoryUsageMap.delete(key)
      }
    }
  }, 30 * 60 * 1000)
}

function checkInMemoryFallback(identifier: string, limit: number): RateLimitResult {
  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000 // 24 giờ
  let record = inMemoryUsageMap.get(identifier)

  if (!record || now - record.windowStart >= windowMs) {
    record = { count: 1, windowStart: now }
    inMemoryUsageMap.set(identifier, record)
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    }
  }

  record.count += 1
  const remaining = Math.max(0, limit - record.count)
  const reset = Math.ceil((record.windowStart + windowMs) / 1000)

  if (record.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
    }
  }

  return {
    success: true,
    limit,
    remaining,
    reset,
  }
}

/**
 * Kiểm tra giới hạn số lượt hỏi AI trên website.
 * - Người dùng miễn phí (Khách vãng lai / Dùng thử): 40 lượt / 24 giờ.
 * - Thành viên VIP: 150 lượt / 24 giờ.
 */
export async function checkRateLimit(
  identifier: string,
  isVip: boolean = false
): Promise<RateLimitResult> {
  const limit = isVip ? VIP_DAILY_LIMIT : FREE_DAILY_LIMIT
  const limiter = isVip ? vipRateLimiter : freeRateLimiter

  if (!limiter) {
    return checkInMemoryFallback(`ai:${identifier}`, limit)
  }

  try {
    const res = await limiter.limit(identifier)
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    }
  } catch (err) {
    console.warn('[rate-limiter] Lỗi kết nối Upstash Redis, fallback in-memory:', err)
    return checkInMemoryFallback(`ai:${identifier}`, limit)
  }
}

/**
 * Kiểm tra giới hạn số lượt hỏi MCP (Google Gemini, Claude, v.v.).
 * - Miễn phí: 40 lượt / 24 giờ.
 * - VIP: 150 lượt / 24 giờ.
 */
export async function checkMcpDailyLimit(
  identifier: string,
  isVip: boolean = false
): Promise<RateLimitResult> {
  const limit = isVip ? VIP_DAILY_LIMIT : FREE_DAILY_LIMIT
  const limiter = isVip ? vipRateLimiter : mcpRateLimiter

  if (!limiter) {
    return checkInMemoryFallback(`mcp:${identifier}`, limit)
  }

  try {
    const res = await limiter.limit(`mcp:${identifier}`)
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    }
  } catch (err) {
    console.warn('[rate-limiter] Lỗi kết nối Upstash Redis cho MCP, fallback in-memory:', err)
    return checkInMemoryFallback(`mcp:${identifier}`, limit)
  }
}
