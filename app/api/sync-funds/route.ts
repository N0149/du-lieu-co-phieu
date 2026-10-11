import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { syncFundsFromFmarket } from '@/lib/fund-service'

export const dynamic = 'force-dynamic'

/**
 * Route tự động đồng bộ & cập nhật dữ liệu Quỹ Mở hàng tuần từ Fmarket
 * Kích hoạt bởi:
 * 1. Vercel Cron Job hàng tuần (ví dụ: 20:00 tối Chủ Nhật)
 * 2. Gọi thủ công: GET /api/sync-funds?secret=YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  return handleSyncFunds(request)
}

export async function POST(request: NextRequest) {
  return handleSyncFunds(request)
}

async function handleSyncFunds(request: NextRequest) {
  // 1. Kiểm tra xác thực Cron Secret để ngăn chặn truy cập trái phép
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Trên môi trường production hoặc khi đã cấu hình CRON_SECRET: bắt buộc phải khớp xác thực
  if (process.env.NODE_ENV === 'production' || cronSecret) {
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    const isAuthorized =
      Boolean(cronSecret) &&
      (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret)

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Yêu cầu mã xác thực CRON_SECRET hợp lệ.' },
        { status: 401 }
      )
    }
  }

  const startTime = Date.now()
  try {
    // 2. Đồng bộ trực tiếp từ Fmarket API và tính toán lại toàn bộ Top Holdings
    const snapshot = await syncFundsFromFmarket()

    // 3. Làm tươi (Revalidate) lại trang /quy-mo để khách xem thấy dữ liệu mới ngay
    try {
      revalidatePath('/quy-mo')
    } catch (revalidateErr: any) {
      console.warn('[Sync Funds] Revalidate warning:', revalidateErr)
    }

    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${snapshot.funds.length} quỹ mở thực tế từ hệ thống Fmarket!`,
      data: {
        timestamp: snapshot.lastUpdated,
        formattedDate: snapshot.formattedDate,
        updatedFundsCount: snapshot.funds.length,
        topStocksCount: snapshot.topStocks.length,
        topIndustriesCount: snapshot.topIndustries.length,
        durationMs,
      },
    })
  } catch (error: any) {
    console.error('[Sync Funds] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Lỗi không xác định khi đồng bộ dữ liệu quỹ mở',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
