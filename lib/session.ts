// ─────────────────────────────────────────────────────────────────────────────
// lib/session.ts — Đọc/ghi session người dùng từ cookie (SERVER-ONLY)
//
// ⚠️ Module này import `next/headers` → CHỈ được import trong Server Component
//    hoặc Route Handler. KHÔNG import từ Client Component (sẽ lỗi build).
//    (Không dùng package `server-only` vì chưa được cài — giữ bằng kỷ luật.)
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { SESSION_COOKIE_NAME, type UserProfile } from '@/lib/auth-check'

/** Cookie tồn tại tối đa 30 ngày (đủ cho 7 ngày dùng thử + thời gian gia hạn). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 ngày (giây)

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  'dulieudautu-session-secret-salt-2026'

/**
 * Ký dữ liệu session bằng HMAC SHA256 chống giả mạo
 */
export function signSessionPayload(payload: string): string {
  const b64 = Buffer.from(payload, 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url')
  return `s_${b64}.${sig}`
}

/**
 * Xác thực chữ ký HMAC và giải mã payload
 */
export function verifySessionSignature(raw: string): string | null {
  if (!raw || !raw.startsWith('s_')) return null
  const content = raw.slice(2)
  const parts = content.split('.')
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url')
  if (sig !== expectedSig) return null
  try {
    return Buffer.from(b64, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/**
 * Parse chuỗi trong cookie → `UserProfile`.
 * - Hỗ trợ chuỗi đã ký số HMAC `s_<base64>.<sig>`.
 * - Tương thích ngược có chọn lọc với chuỗi JSON thô: KHÔNG chấp nhận quyền 'active' chưa ký số để chống giả mạo VIP.
 */
export function parseUserProfile(raw: string | undefined): UserProfile | null {
  if (!raw) return null

  let jsonStr: string | null = null

  if (raw.startsWith('s_')) {
    jsonStr = verifySessionSignature(raw)
    if (!jsonStr) {
      console.warn('[Session] Chữ ký HMAC session cookie không hợp lệ hoặc đã bị can thiệp!')
      return null
    }
  } else {
    // Cookie JSON thô cũ (chưa ký)
    jsonStr = raw
  }

  try {
    const parsed = JSON.parse(jsonStr) as Partial<UserProfile>

    let status = parsed.status
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.email !== 'string' ||
      (status !== 'active' && status !== 'trial' && status !== 'inactive')
    ) {
      return null
    }

    // Nếu là cookie cũ chưa ký số mà khai báo 'active' (VIP) -> ép về 'trial' để chống giả mạo
    if (!raw.startsWith('s_') && status === 'active') {
      console.warn(`[Session] Phát hiện cookie chưa ký số yêu cầu quyền active: ${parsed.email}. Hạ cấp về trial.`)
      status = 'trial'
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
  const raw =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get('dulieucophieu_session')?.value
  return parseUserProfile(raw)
}

/**
 * Ghi session cookie (chỉ gọi được trong Route Handler / Server Function —
 * nơi có thể set `Set-Cookie` header trên response).
 */
export async function setSessionCookie(user: UserProfile): Promise<void> {
  const cookieStore = await cookies()
  const signed = signSessionPayload(JSON.stringify(user))
  cookieStore.set(SESSION_COOKIE_NAME, signed, {
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
