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

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

// Chuẩn bị sẵn buffer nén gzip để trả về ngay tức thì (<1ms), giảm kích thước từ 13MB xuống còn 1.26MB
let cachedRawJson: string | null = null
let cachedGzipBuffer: Buffer | null = null
let cachedMtime: number = 0

function getPrecomputedPayload(): { raw: string; gzip: Buffer } {
  try {
    const filePath = path.join(process.cwd(), 'data', 'customs_trade_snapshot.json')
    const stats = fs.statSync(filePath)
    if (!cachedRawJson || !cachedGzipBuffer || stats.mtimeMs > cachedMtime) {
      cachedMtime = stats.mtimeMs
      cachedRawJson = fs.readFileSync(filePath, 'utf-8')
      cachedGzipBuffer = zlib.gzipSync(Buffer.from(cachedRawJson), { level: 6 })
    }
  } catch {
    if (!cachedRawJson || !cachedGzipBuffer) {
      cachedRawJson = JSON.stringify(snapshot)
      cachedGzipBuffer = zlib.gzipSync(Buffer.from(cachedRawJson), { level: 6 })
    }
  }
  return {
    raw: cachedRawJson ?? JSON.stringify(snapshot),
    gzip: cachedGzipBuffer ?? zlib.gzipSync(Buffer.from(JSON.stringify(snapshot)), { level: 6 }),
  }
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
  if (!includeMatrix) {
    const acceptsGzip = req.headers.get('accept-encoding')?.includes('gzip')
    const { raw, gzip } = getPrecomputedPayload()

    const cacheControlHeader =
      process.env.NODE_ENV === 'development'
        ? 'no-cache, no-store, must-revalidate'
        : 'public, s-maxage=300, stale-while-revalidate=1800'

    if (acceptsGzip) {
      return new NextResponse(gzip as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Encoding': 'gzip',
          'Cache-Control': cacheControlHeader,
          'X-Robots-Tag': 'noindex',
        },
      })
    }

    return new NextResponse(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': cacheControlHeader,
        'X-Robots-Tag': 'noindex',
      },
    })
  }

  let payload = snapshot as unknown as CustomsTradeSnapshot
  try {
    const matrixFile = require('@/data/customs_matrix_detail.json')
    payload = { ...payload, matrix_rows: matrixFile.matrix_rows }
  } catch {
    // Giữ nguyên payload snapshot chính
  }

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  })
}

