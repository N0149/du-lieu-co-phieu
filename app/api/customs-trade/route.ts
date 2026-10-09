import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
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
  status?: 'SO_BO' | 'CHINH_THUC'
  dim_kind?: 'commodity' | 'country' | 'matrix' | 'province' | 'transport'
  name: string
  unit: string | null
  quantity: number | null // Lượng kỳ báo cáo
  value_usd: number | null // Trị giá kỳ báo cáo (USD)
  quantity_acc?: number | null // Lượng lũy kế
  value_acc?: number | null // Trị giá lũy kế (USD)
  code?: string | null
  category?: string | null
  iso_code?: string | null
  continent?: string | null
  dataset_category?: 'main' | 'fdi' | 'matrix' | 'province' | 'transport'
}

interface PrecomputedCache {
  raw: string
  gzip: Buffer
  etag: string
  mtime: number
}

const COMMODITY_PATH = path.join(process.cwd(), 'data', 'customs_commodity_snapshot.json')
const FULL_PATH = path.join(process.cwd(), 'data', 'customs_trade_snapshot.json')
const MATRIX_PATH = path.join(process.cwd(), 'data', 'customs_matrix_detail.json')

let cachedCommodity: PrecomputedCache | null = null
let cachedFull: PrecomputedCache | null = null

function getPrecomputedPayload(type: 'commodity' | 'full' = 'commodity'): PrecomputedCache {
  let fileName = type === 'full' ? 'customs_trade_snapshot.json' : 'customs_commodity_snapshot.json'
  let filePath = path.join(process.cwd(), 'data', fileName)

  // Fallback nếu file commodity chưa được build thì dùng file trade snapshot
  if (!fs.existsSync(filePath)) {
    fileName = 'customs_trade_snapshot.json'
    filePath = path.join(process.cwd(), 'data', fileName)
  }

  const stats = fs.statSync(filePath)
  const cacheRef = type === 'full' ? cachedFull : cachedCommodity

  if (!cacheRef || stats.mtimeMs > cacheRef.mtime) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const gzip = zlib.gzipSync(Buffer.from(raw), { level: 6 })
    const etag = `W/"${stats.size}-${Math.round(stats.mtimeMs)}"`
    const item: PrecomputedCache = {
      raw,
      gzip,
      etag,
      mtime: stats.mtimeMs,
    }
    if (type === 'full') {
      cachedFull = item
    } else {
      cachedCommodity = item
    }
    return item
  }

  return cacheRef
}

/**
 * API phục vụ snapshot thống kê XNK (xuất từ scripts/customs_etl).
 * - Mặc định: Phục vụ customs_commodity_snapshot.json (chỉ 495KB gzip, tải siêu nhanh <50ms)
 * - Tham số full=1: Phục vụ toàn bộ customs_trade_snapshot.json (bao gồm số liệu tỉnh/thành, phương thức vận tải)
 * - Tích hợp HTTP ETag (304 Not Modified) và Cache-Control (30 phút trong trình duyệt)
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const limiter = checkInMemoryRateLimit(`rl:trade:${ip}`, {
    windowMs: 60_000,
    max: 100,
  })

  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Tần suất yêu cầu quá nhanh. Vui lòng thử lại sau 1 phút.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-Robots-Tag': 'noindex' } }
    )
  }

  const includeMatrix = req.nextUrl.searchParams.get('include_matrix') === '1'
  const isFull = req.nextUrl.searchParams.get('full') === '1'

  // Trình duyệt cache 30 phút, stale-while-revalidate 1 ngày
  const cacheControlHeader = 'public, max-age=1800, stale-while-revalidate=86400'

  if (!includeMatrix) {
    const { raw, gzip, etag } = getPrecomputedPayload(isFull ? 'full' : 'commodity')

    // Conditional request: Nếu trình duyệt đã có version này, trả 304 ngay lập tức (0 bytes transferred)
    const ifNoneMatch = req.headers.get('if-none-match')
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': cacheControlHeader,
          'X-Robots-Tag': 'noindex',
        },
      })
    }

    const acceptsGzip = req.headers.get('accept-encoding')?.includes('gzip')
    if (acceptsGzip) {
      return new NextResponse(gzip as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Encoding': 'gzip',
          ETag: etag,
          'Cache-Control': cacheControlHeader,
          'X-Robots-Tag': 'noindex',
        },
      })
    }

    return new NextResponse(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ETag: etag,
        'Cache-Control': cacheControlHeader,
        'X-Robots-Tag': 'noindex',
      },
    })
  }

  // Chế độ include_matrix: load payload và ghép matrix_rows
  try {
    const { raw } = getPrecomputedPayload('full')
    let payload = JSON.parse(raw) as CustomsTradeSnapshot
    if (fs.existsSync(MATRIX_PATH)) {
      const matrixRaw = fs.readFileSync(MATRIX_PATH, 'utf-8')
      const matrixData = JSON.parse(matrixRaw)
      payload = { ...payload, matrix_rows: matrixData.matrix_rows }
    }
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Không thể tải dữ liệu ma trận chi tiết.' },
      { status: 500 }
    )
  }
}
