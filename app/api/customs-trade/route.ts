import { NextRequest, NextResponse } from 'next/server'
import snapshot from '@/data/customs_trade_snapshot.json'
import { getClientIp, checkInMemoryRateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

/** Một điểm trong chuỗi Cán cân thương mại theo kỳ (khớp scripts/customs_etl/analysis.py). */
export type TradeBalancePoint = {
  period_type: 'KY_1' | 'KY_2' | 'THANG' | 'QUY'
  period_date: string // ISO YYYY-MM-DD (ngày đầu kỳ)
  label: string
  export: number // USD
  import: number // USD
  balance: number // USD
  export_fdi: number
  import_fdi: number
  balance_fdi: number
  export_domestic: number
  import_domestic: number
  balance_domestic: number
}

export type CustomsTradeSnapshot = {
  generated_at: string
  rows: CustomsTradeRow[]
  matrix_rows?: CustomsTradeRow[]
  trade_balance: TradeBalancePoint[]
}

/** Kiểu dữ liệu 1 dòng thống kê XNK (khớp scripts/customs_etl/parser.py ParsedRow.to_dict()). */
export type CustomsTradeRow = {
  period_type: 'KY_1' | 'KY_2' | 'THANG' | 'QUY'
  period_date: string // ISO YYYY-MM-DD (ngày đầu kỳ)
  trade_type: 'EXPORT' | 'IMPORT'
  status: 'SO_BO' | 'CHINH_THUC'
  dim_kind: 'commodity' | 'country' | 'matrix' | 'province' | 'transport'
  name: string
  unit: string | null
  quantity: number | null // Lượng kỳ báo cáo
  value_usd: number | null // Trị giá kỳ báo cáo (USD)
  quantity_acc: number | null // Lượng lũy kế
  value_acc: number | null // Trị giá lũy kế (USD)
  code: string | null
  category: string | null
  iso_code: string | null
  continent: string | null
  dataset_category: 'main' | 'fdi' | 'matrix' | 'province' | 'transport'
}

/**
 * API phục vụ snapshot thống kê XNK (xuất từ scripts/customs_etl).
 * Snapshot được tạo bằng: `python scripts/customs_etl/main.py --export-json`
 * → ghi `data/customs_trade_snapshot.json`, rồi commit + push để Vercel cập nhật.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const limiter = checkInMemoryRateLimit(`rl:trade:${ip}`, {
    windowMs: 60_000,
    max: 40,
  })

  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Tần suất yêu cầu quá nhanh. Vui lòng thử lại sau 1 phút.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-Robots-Tag': 'noindex' } }
    )
  }

  const includeMatrix = req.nextUrl.searchParams.get('include_matrix') === '1'
  const data = snapshot as unknown as CustomsTradeSnapshot
  const payload = !includeMatrix
    ? (({ matrix_rows: _omit, ...rest }) => rest)(data)
    : data

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  })
}
