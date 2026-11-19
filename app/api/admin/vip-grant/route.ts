import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * API Kích Hoạt / Nâng Cấp VIP Thủ Công Nhanh Dành Cho Quản Trị Viên (Admin)
 * Hỗ trợ cả 2 cách dùng:
 * 1. Gọi POST từ trang /admin
 * 2. Gọi GET trực tiếp từ trình duyệt điện thoại qua link:
 *    https://dulieudautu.com/api/admin/vip-grant?account=bigzero0149&months=6
 */

function resolveDays(planId?: string, months?: number, customDays?: number): { days: number; plan: string } {
  if (customDays && customDays > 0) {
    return { days: customDays, plan: 'custom' }
  }
  if (months === 12 || planId === '1_year') {
    return { days: 365, plan: '1_year' }
  }
  if (months === 6 || planId === '6_months') {
    return { days: 180, plan: '6_months' }
  }
  return { days: 30, plan: '1_month' }
}

async function verifyAdminAccess(req: NextRequest): Promise<boolean> {
  // 1. Kiểm tra session đăng nhập admin từ cookie
  try {
    const supabase = await createServerClient()
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && isAdminEmail(user.email)) {
        return true
      }
    }
  } catch {}

  // 2. Kiểm tra mã bí mật secret query param hoặc header (tiện cho link bookmark trên điện thoại)
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET
  if (webhookSecret) {
    const secretQuery = req.nextUrl.searchParams.get('secret')
    const secretHeader = req.headers.get('x-admin-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
    if (secretQuery === webhookSecret || secretHeader === webhookSecret) {
      return true
    }
  }

  return false
}

async function executeVipGrant(accountQuery: string, days: number, plan: string) {
  const adminSb = createAdminClient()
  if (!adminSb) {
    throw new Error('Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên server')
  }

  const { data: usersData, error: listErr } = await adminSb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listErr || !usersData?.users) {
    throw new Error(`Không thể lấy danh sách người dùng: ${listErr?.message}`)
  }

  const target = accountQuery.trim().toLowerCase()
  const matchedUser = usersData.users.find((u) => {
    const email = (u.email || '').toLowerCase()
    const emailPrefix = email.split('@')[0]
    const customName = ((u.user_metadata?.user_name || '') as string).toLowerCase()
    return customName === target || emailPrefix === target || email === target
  })

  if (!matchedUser) {
    return {
      success: false,
      message: `Không tìm thấy tài khoản nào khớp với "${accountQuery}". Vui lòng kiểm tra lại email hoặc tên tài khoản.`,
    }
  }

  // Cộng dồn thời hạn nếu đang còn VIP
  const existingUntilStr =
    matchedUser.app_metadata?.vip_until ||
    matchedUser.user_metadata?.vip_until

  let baseTime = Date.now()
  if (existingUntilStr && typeof existingUntilStr === 'string') {
    const oldTime = new Date(existingUntilStr).getTime()
    if (!Number.isNaN(oldTime) && oldTime > baseTime) {
      baseTime = oldTime
    }
  }

  const newVipUntil = new Date(baseTime + days * 24 * 60 * 60 * 1000)

  const payload = {
    is_vip: true,
    plan,
    status: 'active',
    vip_since: matchedUser.app_metadata?.vip_since || new Date().toISOString(),
    vip_until: newVipUntil.toISOString(),
    updated_at: new Date().toISOString(),
    granted_by: 'admin_manual',
  }

  const { error: updateErr } = await adminSb.auth.admin.updateUserById(matchedUser.id, {
    app_metadata: {
      ...(matchedUser.app_metadata || {}),
      ...payload,
    },
    user_metadata: {
      ...(matchedUser.user_metadata || {}),
      ...payload,
    },
  })

  if (updateErr) {
    throw new Error(`Lỗi cập nhật người dùng: ${updateErr.message}`)
  }

  return {
    success: true,
    message: `Đã kích hoạt VIP thành công cho ${matchedUser.email} (+${days} ngày, hạn đến ${newVipUntil.toLocaleDateString('vi-VN')})`,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.user_metadata?.full_name || matchedUser.email?.split('@')[0],
    },
    plan,
    daysAdded: days,
    vipUntil: newVipUntil.toISOString(),
    vipUntilFormatted: newVipUntil.toLocaleDateString('vi-VN'),
  }
}

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAccess(req)
  if (!isAuth) {
    return NextResponse.json(
      { error: 'Từ chối truy cập: Bạn cần đăng nhập tài khoản Quản trị viên (trungnhat232@gmail.com) hoặc có mã secret.' },
      { status: 403 }
    )
  }

  const account = req.nextUrl.searchParams.get('account') || req.nextUrl.searchParams.get('email') || ''
  if (!account) {
    return NextResponse.json({
      service: 'Admin Quick VIP Grant Tool',
      usage: 'GET /api/admin/vip-grant?account=<tentaikhoan_hoac_email>&months=1|6|12',
    })
  }

  const months = Number(req.nextUrl.searchParams.get('months') || 1)
  const { days, plan } = resolveDays(undefined, months)

  try {
    const result = await executeVipGrant(account, days, plan)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAccess(req)
  if (!isAuth) {
    return NextResponse.json(
      { error: 'Từ chối truy cập: Bạn cần đăng nhập tài khoản Quản trị viên.' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const account = body.account || body.email || ''
    if (!account) {
      return NextResponse.json({ error: 'Thiếu tên tài khoản hoặc email cần nâng cấp' }, { status: 400 })
    }

    const months = Number(body.months || 0)
    const { days, plan } = resolveDays(body.planId, months || undefined, body.customDays)

    const result = await executeVipGrant(account, days, plan)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
