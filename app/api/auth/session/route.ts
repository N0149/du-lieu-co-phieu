// ─────────────────────────────────────────────────────────────────────────────
// app/api/auth/session/route.ts — API session (bản demo/dev)
//
//   GET  /api/auth/session  → { user, access }      (đọc session hiện tại)
//   POST /api/auth/session  → body { action, email?, name? }
//       action: 'start_trial'  → tạo tài khoản dùng thử 7 ngày (set cookie)
//               'activate'     → nâng cấp tài khoản hiện tại thành VIP (cho chủ sở hữu)
//               'logout'       → xóa session
//
// ⚠️ ĐÂY LÀ CƠ CHẾ DEMO — khi tích hợp auth backend thật (Supabase/Firebase/custom),
//    hãy thay POST này bằng luồng đăng nhập thật và chỉ ghi cookie sau khi xác
//    thực danh tính. `activate` chỉ dành cho admin (sau khi nhận chuyển khoản).
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

  // ── Nâng cấp tài khoản hiện tại thành VIP (admin kích hoạt sau chuyển khoản) ──
  if (action === 'activate') {
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
