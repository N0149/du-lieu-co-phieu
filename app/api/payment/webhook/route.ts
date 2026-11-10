import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * VIP Webhook Handler tự động kích hoạt VIP khi có tiền vào tài khoản ngân hàng.
 * Tương thích chính thức với:
 * 1. SePay (sepay.vn - Miễn phí cho TPBank, MBBank, VCB...)
 * 2. Casso (casso.vn)
 * 3. App đẩy thông báo ngân hàng / Tự động hóa webhook
 *
 * Cú pháp chuyển khoản định danh: nap <ten_tai_khoan>
 * Ví dụ: "nap bigzero0149" hoặc "nap BigZero0149"
 */

// Bảng quy đổi gói VIP theo số tiền chuyển khoản
function resolveVipPlanByAmount(amount: number): {
  planId: string
  planName: string
  days: number
} {
  if (amount >= 890000) {
    return { planId: '1_year', planName: 'Gói 1 Năm (890.000 đ)', days: 365 }
  }
  if (amount >= 495000) {
    return { planId: '6_months', planName: 'Gói 6 Tháng (495.000 đ)', days: 180 }
  }
  // Mặc định hoặc từ 95.000 đ trở lên
  return { planId: '1_month', planName: 'Gói 1 Tháng (95.000 đ)', days: 30 }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    service: 'Dữ Liệu Đầu Tư - Automatic VIP Payment Webhook',
    supportedGateways: ['SePay', 'Casso', 'Manual Webhook'],
    syntaxRule: 'nap <tên_tài_khoản> (Ví dụ: nap bigzero0149)',
    plans: [
      { amount: 95000, duration: '30 ngày' },
      { amount: 495000, duration: '180 ngày (6 tháng)' },
      { amount: 890000, duration: '365 ngày (1 năm)' },
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra mã bảo mật Webhook Secret nếu đã cấu hình trong .env.local
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET
    if (webhookSecret) {
      const authHeader = req.headers.get('authorization') || ''
      const secretHeader = req.headers.get('x-api-key') || req.headers.get('x-sepay-key') || ''
      const urlSecret = req.nextUrl.searchParams.get('secret') || ''

      const isAuthorized =
        authHeader === `Bearer ${webhookSecret}` ||
        secretHeader === webhookSecret ||
        urlSecret === webhookSecret

      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'Truy cập Webhook bị từ chối: Sai mã xác thực secret' },
          { status: 401 }
        )
      }
    }

    const body = await req.json().catch(() => ({}))

    // 2. Trích xuất nội dung chuyển khoản và số tiền từ payload (Hỗ trợ cả SePay & Casso)
    const rawContent: string =
      body.content ||
      body.description ||
      body.data?.[0]?.description ||
      body.data?.[0]?.content ||
      ''

    const rawAmount: number = Number(
      body.transferAmount ||
      body.amount ||
      body.data?.[0]?.amount ||
      body.data?.[0]?.transferAmount ||
      0
    )

    if (!rawContent) {
      return NextResponse.json(
        { error: 'Không tìm thấy nội dung chuyển khoản trong body payload' },
        { status: 400 }
      )
    }

    // 3. Phân tích cú pháp: nap <ten_tai_khoan>
    // Regex linh hoạt: tìm "nap" đứng trước tên tài khoản (bất kể ngân hàng tự viết hoa hoa toàn bộ hay không)
    const match = rawContent.match(/(?:^|\s)nap\s+([a-zA-Z0-9_.-]+)/i)

    if (!match || !match[1]) {
      return NextResponse.json({
        success: false,
        message: 'Nội dung chuyển khoản không khớp cú pháp "nap <tên tài khoản>"',
        rawContent,
      })
    }

    const accountIdentifier = match[1].trim()

    // 4. Khởi tạo Supabase Admin Client
    const adminSb = createAdminClient()
    if (!adminSb) {
      return NextResponse.json(
        { error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên server' },
        { status: 500 }
      )
    }

    // 5. Tìm kiếm người dùng trong hệ thống Auth
    // Duyệt danh sách người dùng để so khớp username hoặc phần đầu email
    const { data: usersData, error: listErr } = await adminSb.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listErr || !usersData?.users) {
      return NextResponse.json(
        { error: 'Không thể truy vấn danh sách người dùng từ Supabase', detail: listErr },
        { status: 500 }
      )
    }

    const targetLower = accountIdentifier.toLowerCase()
    const matchedUser = usersData.users.find((u) => {
      const emailLower = (u.email || '').toLowerCase()
      const emailPrefix = emailLower.split('@')[0]
      const customUserName = ((u.user_metadata?.user_name || '') as string).toLowerCase()

      // Khớp theo tên tài khoản hoặc email prefix (không phân biệt chữ hoa/thường)
      return (
        customUserName === targetLower ||
        emailPrefix === targetLower ||
        emailLower === targetLower
      )
    })

    if (!matchedUser) {
      return NextResponse.json({
        success: false,
        message: `Đã tìm thấy cú pháp nap "${accountIdentifier}", nhưng không tìm thấy tài khoản tương ứng trong hệ thống.`,
        accountIdentifier,
      })
    }

    // 6. Tính toán thời hạn VIP được cộng thêm
    const planInfo = resolveVipPlanByAmount(rawAmount)

    // Nếu tài khoản đang còn hạn VIP thì cộng dồn tiếp từ hạn cũ
    const existingUntilStr =
      matchedUser.app_metadata?.vip_until ||
      matchedUser.user_metadata?.vip_until ||
      matchedUser.app_metadata?.expires_at ||
      matchedUser.user_metadata?.expires_at

    let baseTimestamp = Date.now()
    if (existingUntilStr && typeof existingUntilStr === 'string') {
      const existingTime = new Date(existingUntilStr).getTime()
      if (!Number.isNaN(existingTime) && existingTime > baseTimestamp) {
        baseTimestamp = existingTime
      }
    }

    const newVipUntil = new Date(baseTimestamp + planInfo.days * 24 * 60 * 60 * 1000)

    // 7. Cập nhật quyền VIP tức thì vào cả app_metadata và user_metadata
    const updatePayload = {
      is_vip: true,
      plan: planInfo.planId,
      status: 'active',
      vip_since: matchedUser.app_metadata?.vip_since || new Date().toISOString(),
      vip_until: newVipUntil.toISOString(),
      updated_at: new Date().toISOString(),
      last_payment: {
        amount: rawAmount,
        content: rawContent,
        gateway: body.gateway || 'BankTransfer',
        referenceCode: body.referenceCode || body.data?.[0]?.tid || null,
        paidAt: new Date().toISOString(),
      },
    }

    const { error: updateErr } = await adminSb.auth.admin.updateUserById(matchedUser.id, {
      app_metadata: {
        ...(matchedUser.app_metadata || {}),
        ...updatePayload,
      },
      user_metadata: {
        ...(matchedUser.user_metadata || {}),
        ...updatePayload,
      },
    })

    if (updateErr) {
      return NextResponse.json(
        { error: 'Lỗi cập nhật quyền VIP cho người dùng', detail: updateErr },
        { status: 500 }
      )
    }

    // Ghi log ra console server
    console.log(
      `[VIP PAYMENT WEBHOOK] Kích hoạt thành công gói ${planInfo.planName} cho user: ${matchedUser.email} (Hạn đến: ${newVipUntil.toLocaleDateString('vi-VN')})`
    )

    return NextResponse.json({
      success: true,
      message: `Kích hoạt thành công ${planInfo.planName} cho tài khoản ${matchedUser.email}`,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        accountIdentifier,
      },
      plan: planInfo.planId,
      daysAdded: planInfo.days,
      vipUntil: newVipUntil.toISOString(),
      vipUntilFormatted: newVipUntil.toLocaleDateString('vi-VN'),
    })
  } catch (error: any) {
    console.error('[VIP PAYMENT WEBHOOK] Lỗi xử lý:', error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi xử lý giao dịch Webhook', detail: error?.message },
      { status: 500 }
    )
  }
}
