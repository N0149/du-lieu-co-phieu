// ─────────────────────────────────────────────────────────────────────────────
// lib/rate-limiter.ts — Giới hạn số lượt hỏi AI (Upstash Redis Ratelimit)
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

/** 5 lượt / 24 giờ cho khách vãng lai (theo IP) */
export const publicRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 d'),
      prefix: '@ratelimit:public',
      analytics: true,
    })
  : null

/** 50 lượt / 24 giờ cho thành viên (dùng thử / VIP, theo User ID) */
export const userRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 d'),
      prefix: '@ratelimit:user',
      analytics: true,
    })
  : null

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Kiểm tra giới hạn số lượt hỏi AI.
 * - Khách vãng lai: 5 lượt / ngày (dựa theo IP).
 * - Thành viên (dùng thử / VIP): 50 lượt / ngày (dựa theo User ID).
 * - Nếu chưa cấu hình Upstash Redis trong .env: bypass mềm (success: true) để không gián đoạn local dev.
 */
export async function checkRateLimit(
  identifier: string,
  isMember: boolean
): Promise<RateLimitResult> {
  const limit = isMember ? 50 : 5
  const limiter = isMember ? userRateLimiter : publicRateLimiter

  if (!limiter) {
    // Soft bypass khi chưa cấu hình Redis
    return {
      success: true,
      limit,
      remaining: limit,
      reset: 0,
    }
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
    console.warn('[rate-limiter] Lỗi kết nối Upstash Redis:', err)
    // Cho phép tiếp tục nếu redis lỗi tạm thời
    return {
      success: true,
      limit,
      remaining: limit,
      reset: 0,
    }
  }
}
