// app/api/admin/overview/route.ts
// API trả về toàn bộ dữ liệu thống kê Quản trị viên (Chỉ trungnhat232@gmail.com)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'
import {
  getAllUsers,
  getTrafficOverview,
  getTopWatchlistStocks,
  recordUserSession,
} from '@/lib/analytics-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase chưa được cấu hình biến môi trường.' },
        { status: 500 }
      )
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập tài khoản Quản trị viên.' },
        { status: 401 }
      )
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        {
          error: `Tài khoản ${user.email} không có quyền truy cập trang quản trị. Chỉ trungnhat232@gmail.com mới có quyền này.`,
        },
        { status: 403 }
      )
    }

    // Ghi nhận phiên làm việc của admin
    recordUserSession(user)

    // Lấy dữ liệu song song
    const [userRes, traffic, topStocks] = await Promise.all([
      getAllUsers(),
      getTrafficOverview(),
      getTopWatchlistStocks(),
    ])

    return NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || 'Quản trị viên',
      },
      hasServiceRoleKey: userRes.hasServiceRoleKey,
      usersSource: userRes.source,
      users: userRes.users,
      traffic,
      topStocks,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[API /api/admin/overview] Lỗi:', err)
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý máy chủ' },
      { status: 500 }
    )
  }
}
