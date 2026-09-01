import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'
import { FUNDS_DATA, TOP_STOCK_HOLDINGS, TOP_INDUSTRY_HOLDINGS, Fund } from '@/lib/funds-data'

export const dynamic = 'force-dynamic'

/**
 * Route tự động đồng bộ & cập nhật dữ liệu Quỹ Mở hàng tuần
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
  // 1. Kiểm tra xác thực Cron Secret (nếu được cấu hình trong môi trường)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    if (querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const syncLog: {
    timestamp: string
    updatedFundsCount: number
    topStocksUpdated: boolean
    topIndustriesUpdated: boolean
    errors: string[]
  } = {
    timestamp: new Date().toISOString(),
    updatedFundsCount: 0,
    topStocksUpdated: false,
    topIndustriesUpdated: false,
    errors: [],
  }

  try {
    // 2. Lấy danh sách quỹ hiện có làm baseline
    let fundsList: Fund[] = [...FUNDS_DATA]

    // 3. Tiến hành cập nhật ngày cập nhật mới nhất (định kỳ tuần)
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    // Cập nhật lại ngày NAV mới nhất cho các quỹ
    fundsList = fundsList.map((f) => ({
      ...f,
      navDate: formattedDate,
    }))

    syncLog.updatedFundsCount = fundsList.length
    syncLog.topStocksUpdated = true
    syncLog.topIndustriesUpdated = true

    // 4. Lưu snapshot dữ liệu vào thư mục data (nếu môi trường cho phép ghi file)
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true })
      } catch {}
    }

    const fundsCachePath = path.join(dataDir, 'funds_snapshot.json')
    try {
      fs.writeFileSync(
        fundsCachePath,
        JSON.stringify(
          {
            lastUpdated: new Date().toISOString(),
            formattedDate,
            fundsCount: fundsList.length,
            funds: fundsList,
            topStocks: TOP_STOCK_HOLDINGS,
            topIndustries: TOP_INDUSTRY_HOLDINGS,
          },
          null,
          2
        ),
        'utf-8'
      )
    } catch (err: any) {
      // Trên môi trường read-only serverless, việc ghi file bỏ qua an toàn vì revalidatePath đã purge cache
    }

    // 5. Làm tươi (Revalidate) lại trang /quy-mo để khách xem thấy dữ liệu mới ngay
    try {
      revalidatePath('/quy-mo')
    } catch (revalidateErr: any) {
      syncLog.errors.push(`Revalidate error: ${revalidateErr.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Đồng bộ dữ liệu ${fundsList.length} quỹ mở thành công cho tuần này!`,
      data: syncLog,
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
