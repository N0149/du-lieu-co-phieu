// app/api/admin/vip/route.ts
// API Kích hoạt / Gia hạn / Hủy VIP nhanh theo Email (Chỉ dành cho Quản trị viên)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

const VIP_PLANS: Record<string, { label: string; days: number }> = {
  '1_month': { label: 'Gói 1 Tháng (95.000đ)', days: 30 },
  '6_months': { label: 'Gói 6 Tháng (495.000đ)', days: 180 },
  '1_year': { label: 'Gói 1 Năm (890.000đ)', days: 365 },
}

async function findUserByEmail(adminSb: NonNullable<ReturnType<typeof createAdminClient>>, emailLower: string) {
  const perPage = 1000
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await adminSb.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(error.message || 'Lỗi truy vấn danh sách người dùng Supabase')
    }
    const users = data?.users || []
    const matched = users.find((u) => (u.email || '').trim().toLowerCase() === emailLower)
    if (matched) return matched
    if (users.length < perPage) break
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực phiên Quản trị viên
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase chưa được cấu hình biến môi trường.' },
        { status: 500 }
      )
    }

    const {
      data: { user: adminUser },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !adminUser) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập tài khoản Quản trị viên.' },
        { status: 401 }
      )
    }

    if (!isAdminEmail(adminUser.email)) {
      return NextResponse.json(
        { error: `Tài khoản ${adminUser.email} không có quyền nâng cấp VIP.` },
        { status: 403 }
      )
    }

    // 2. Đọc tham số từ request
    const body = await req.json().catch(() => ({}))
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const action: 'activate' | 'revoke' = body.action === 'revoke' ? 'revoke' : 'activate'
    const planId: string = typeof body.planId === 'string' ? body.planId : '1_month'
    const extendFromExisting: boolean = body.extendFromExisting !== false
    const note: string = typeof body.note === 'string' ? body.note.trim() : ''

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập địa chỉ email hợp lệ của khách hàng.' },
        { status: 400 }
      )
    }

    // 3. Khởi tạo Supabase Admin Client
    const adminSb = createAdminClient()
    if (!adminSb) {
      return NextResponse.json(
        { error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên server.' },
        { status: 500 }
      )
    }

    // 4. Tìm tài khoản theo Email
    const targetUser = await findUserByEmail(adminSb, rawEmail)
    if (!targetUser) {
      return NextResponse.json(
        {
          error: `Không tìm thấy tài khoản nào có email "${rawEmail}". Hãy kiểm tra lại chính tả hoặc nhắc khách bấm Đăng nhập Google vào web trước 1 lần.`,
        },
        { status: 404 }
      )
    }

    const nowIso = new Date().toISOString()

    // 5A. Thu hồi quyền VIP
    if (action === 'revoke') {
      const revokePayload = {
        is_vip: false,
        plan: 'free',
        status: 'inactive',
        vip_until: null,
        expires_at: null,
        updated_at: nowIso,
        revoked_by: adminUser.email,
        revoked_at: nowIso,
      }

      const { error: updateErr } = await adminSb.auth.admin.updateUserById(targetUser.id, {
        app_metadata: {
          ...(targetUser.app_metadata || {}),
          ...revokePayload,
        },
        user_metadata: {
          ...(targetUser.user_metadata || {}),
          ...revokePayload,
        },
      })

      if (updateErr) {
        return NextResponse.json(
          { error: 'Không thể cập nhật trạng thái VIP: ' + updateErr.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Đã thu hồi quyền VIP của tài khoản ${targetUser.email}.`,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.user_metadata?.full_name || targetUser.email?.split('@')[0] || 'Thành viên',
          isVip: false,
          plan: 'free',
          vipUntil: null,
          vipUntilFormatted: null,
        },
      })
    }

    // 5B. Kích hoạt / Gia hạn VIP
    const preset = VIP_PLANS[planId]
    const days = preset ? preset.days : Math.floor(Number(body.days) || 0)

    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return NextResponse.json(
        { error: 'Số ngày kích hoạt VIP phải từ 1 đến 3650 ngày.' },
        { status: 400 }
      )
    }

    const planLabel = preset ? preset.label : `Tùy chỉnh (${days} ngày)`
    const resolvedPlanId = preset ? planId : `custom_${days}d`

    // Cộng dồn nếu tài khoản vẫn đang còn hạn VIP
    const existingUntilStr =
      targetUser.app_metadata?.vip_until ||
      targetUser.user_metadata?.vip_until ||
      targetUser.app_metadata?.expires_at ||
      targetUser.user_metadata?.expires_at

    let baseTimestamp = Date.now()
    if (extendFromExisting && existingUntilStr && typeof existingUntilStr === 'string') {
      const existingTime = new Date(existingUntilStr).getTime()
      if (!Number.isNaN(existingTime) && existingTime > baseTimestamp) {
        baseTimestamp = existingTime
      }
    }

    const newVipUntil = new Date(baseTimestamp + days * DAY_MS)
    const vipUntilFormatted = newVipUntil.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    const activatePayload = {
      is_vip: true,
      plan: resolvedPlanId,
      status: 'active',
      vip_since: targetUser.app_metadata?.vip_since || targetUser.user_metadata?.vip_since || nowIso,
      vip_until: newVipUntil.toISOString(),
      expires_at: newVipUntil.toISOString(),
      updated_at: nowIso,
      last_manual_activation: {
        by: adminUser.email,
        planId: resolvedPlanId,
        planLabel,
        days,
        note: note || 'Admin kích hoạt tay sau khi nhận chuyển khoản',
        activatedAt: nowIso,
      },
    }

    const { error: updateErr } = await adminSb.auth.admin.updateUserById(targetUser.id, {
      app_metadata: {
        ...(targetUser.app_metadata || {}),
        ...activatePayload,
      },
      user_metadata: {
        ...(targetUser.user_metadata || {}),
        ...activatePayload,
      },
    })

    if (updateErr) {
      return NextResponse.json(
        { error: 'Lỗi cập nhật quyền VIP trên Supabase: ' + updateErr.message },
        { status: 500 }
      )
    }

    console.log(
      `[ADMIN VIP] ${adminUser.email} đã kích hoạt ${planLabel} cho ${targetUser.email} (Hạn đến: ${vipUntilFormatted})`
    )

    return NextResponse.json({
      success: true,
      message: `Đã kích hoạt ${planLabel} cho ${targetUser.email} • Hạn VIP đến ${vipUntilFormatted}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.user_metadata?.full_name || targetUser.email?.split('@')[0] || 'Thành viên',
        isVip: true,
        plan: resolvedPlanId,
        vipUntil: newVipUntil.toISOString(),
        vipUntilFormatted,
      },
    })
  } catch (err: any) {
    console.error('[API /api/admin/vip] Lỗi:', err)
    return NextResponse.json(
      { error: err?.message || 'Lỗi máy chủ khi cập nhật VIP.' },
      { status: 500 }
    )
  }
}
