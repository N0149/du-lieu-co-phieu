import { NextRequest, NextResponse } from 'next/server'
import { fetchStockDetailData, type StockDetailData } from '@/lib/longlivestock'
import { getClientIp, checkInMemoryRateLimit } from '@/lib/security'

export const dynamic = 'force-dynamic'

const cache = new Map<string, { data: StockDetailData; timestamp: number }>()
const CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes cache

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const ticker = symbol?.toUpperCase().trim()
  const ip = getClientIp(request.headers)

  // Giới hạn tần suất tra cứu API mã cổ phiếu (tối đa 60 mã / phút / IP)
  const limiter = checkInMemoryRateLimit(`rl:stock:${ip}`, {
    windowMs: 60_000,
    max: 60,
  })

  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Tần suất tra cứu quá nhanh. Vui lòng thử lại sau 1 phút.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-Robots-Tag': 'noindex',
        },
      }
    )
  }

  if (!ticker) {
    return NextResponse.json({ error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
  }

  // Check memory cache
  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        'X-Robots-Tag': 'noindex',
      },
    })
  }

  try {
    const data = await fetchStockDetailData(ticker)
    if (!data) {
      return NextResponse.json(
        { error: `Không tìm thấy dữ liệu chi tiết cho mã ${ticker}` },
        { status: 404 }
      )
    }

    cache.set(ticker, { data, timestamp: Date.now() })
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (error: any) {
    console.error(`[API stock/${ticker}] Error fetching data:`, error)
    return NextResponse.json(
      { error: 'Lỗi tải dữ liệu cổ phiếu từ hệ thống' },
      { status: 500 }
    )
  }
}
