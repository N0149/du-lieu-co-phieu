// ─────────────────────────────────────────────────────────────────────────────
// lib/session.ts — Đọc/ghi session người dùng từ cookie (SERVER-ONLY)
//
// ⚠️ Module này import `next/headers` → CHỈ được import trong Server Component
//    hoặc Route Handler. KHÔNG import từ Client Component (sẽ lỗi build).
//    (Không dùng package `server-only` vì chưa được cài — giữ bằng kỷ luật.)
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, type UserProfile } from '@/lib/auth-check'

/** Cookie tồn tại tối đa 30 ngày (đủ cho 7 ngày dùng thử + thời gian gia hạn). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 ngày (giây)

/**
 * Parse chuỗi JSON trong cookie → `UserProfile`.
 * Trả `null` khi: cookie rỗng, JSON lỗi, hoặc thiếu các trường bắt buộc
 * (`id`, `email`, `status`). Giá trị thừa sẽ được lọc bớt để giữ payload an toàn.
 */
export function parseUserProfile(raw: string | undefined): UserProfile | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>

    const status = parsed.status
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.email !== 'string' ||
      (status !== 'active' && status !== 'trial' && status !== 'inactive')
    ) {
      return null
    }

    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      status,
      trial_started_at: parsed.trial_started_at ?? '',
      trial_ends_at: parsed.trial_ends_at ?? '',
      plan: parsed.plan,
      activated_at: parsed.activated_at ?? null,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

/**
 * Đọc người dùng hiện tại từ cookie session (dùng trong Server Component
 * hoặc Route Handler). Trả `null` nếu chưa đăng nhập / cookie không hợp lệ.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies()
  return parseUserProfile(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

/**
 * Ghi session cookie (chỉ gọi được trong Route Handler / Server Function —
 * nơi có thể set `Set-Cookie` header trên response).
 */
export async function setSessionCookie(user: UserProfile): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    path: '/',
    httpOnly: true, // client-side JS không đọc được → chống giả mạo qua XSS
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  })
}

/** Xóa session cookie (đăng xuất) — chỉ gọi được trong Route Handler / Server Function. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
