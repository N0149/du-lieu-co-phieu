// ─────────────────────────────────────────────────────────────────────────────
// app/api/auth/session/route.ts — API session an toàn
//
//   GET  /api/auth/session  → { user, access }      (đọc session hiện tại)
//   POST /api/auth/session  → body { action, email?, name?, secretKey? }
//       action: 'start_trial'  → tạo tài khoản dùng thử 7 ngày (set signed cookie)
//               'activate'     → nâng cấp tài khoản thành VIP (CHỈ Quản trị viên được phép)
//               'logout'       → xóa session
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import {
  checkUserAccess,
  TRIAL_DAYS,
  type AccessResult,
  type UserProfile,
} from '@/lib/auth-check'
import {
  getCurrentUser,
  setSessionCookie,
  clearSessionCookie,
} from '@/lib/session'
import { isAdminEmail } from '@/lib/admin-auth'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

function nowIso(): string {
  return new Date().toISOString()
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString()
}

/** Đọc session hiện tại + trạng thái quyền truy cập. */
export async function GET() {
  const user = await getCurrentUser()
  const access: AccessResult = checkUserAccess(user)
  return NextResponse.json({ user, access })
}

type SessionBody = {
  action?: string
  email?: string
  name?: string
  secretKey?: string
}

/** Xử lý các hành động bắt đầu dùng thử / kích hoạt VIP / đăng xuất. */
export async function POST(request: Request) {
  let body: SessionBody
  try {
    body = (await request.json()) as SessionBody
  } catch {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Body không hợp lệ.' },
      { status: 400 },
    )
  }

  const action = body.action

  // ── Bắt đầu 7 ngày dùng thử ─────────────────────────────────────────────
  if (action === 'start_trial') {
    const email = body.email?.trim() || 'guest@dulieudautu.com'
    const now = nowIso()
    const user: UserProfile = {
      id: `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      email,
      name: body.name?.trim() || undefined,
      status: 'trial',
      trial_started_at: now,
      trial_ends_at: addDaysIso(TRIAL_DAYS),
      plan: 'free',
      activated_at: null,
      createdAt: now,
    }

    await setSessionCookie(user)
    const access: AccessResult = checkUserAccess(user)
    return NextResponse.json({ user, access })
  }

  // ── Nâng cấp tài khoản hiện tại thành VIP (BẢO MẬT: Chỉ Admin được phép) ──
  if (action === 'activate') {
    // 1. Kiểm tra quyền Quản trị viên
    let isCallerAdmin = false

    // A. Kiểm tra qua Supabase Session đăng nhập
    try {
      const supabase = await createSupabaseServerClient()
      if (supabase) {
        const { data: { user: sbUser } } = await supabase.auth.getUser()
        if (sbUser?.email && isAdminEmail(sbUser.email)) {
          isCallerAdmin = true
        }
      }
    } catch {}

    // B. Kiểm tra qua Secret Key bí mật (Admin API Key hoặc Cron Secret)
    const adminKey = typeof body.secretKey === 'string' ? body.secretKey.trim() : ''
    const validSecret = process.env.ADMIN_ACTIVATION_KEY || process.env.CRON_SECRET
    if (validSecret && validSecret.length >= 16 && adminKey === validSecret) {
      isCallerAdmin = true
    }

    if (!isCallerAdmin) {
      console.warn('[Security /api/auth/session] Từ chối yêu cầu kích hoạt VIP không có quyền Admin!')
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Hành động kích hoạt VIP yêu cầu quyền Quản trị viên.' },
        { status: 403 },
      )
    }

    const current = await getCurrentUser()
    if (!current) {
      return NextResponse.json(
        { error: 'UNAUTHENTICATED', message: 'Chưa có tài khoản để kích hoạt.' },
        { status: 401 },
      )
    }

    const upgraded: UserProfile = {
      ...current,
      status: 'active',
      plan: 'vip',
      activated_at: nowIso(),
    }

    await setSessionCookie(upgraded)
    const access: AccessResult = checkUserAccess(upgraded)
    return NextResponse.json({ user: upgraded, access })
  }

  // ── Đăng xuất ───────────────────────────────────────────────────────────
  if (action === 'logout') {
    await clearSessionCookie()
    return NextResponse.json({ user: null, access: checkUserAccess(null) })
  }

  return NextResponse.json(
    { error: 'INVALID_ACTION', message: 'Hành động không hợp lệ.' },
    { status: 400 },
  )
}
