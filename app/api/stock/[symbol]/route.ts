import { NextRequest, NextResponse } from 'next/server'
import type { StockDetailData } from '@/lib/longlivestock'

export const dynamic = 'force-dynamic'

const cache = new Map<string, { data: StockDetailData; timestamp: number }>()
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes cache

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const ticker = symbol?.toUpperCase().trim()

  if (!ticker) {
    return NextResponse.json({ error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
  }

  // Check memory cache
  const cached = cache.get(ticker)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data)
  }

  try {
    const res = await fetch(`https://longlivestock.com/data/${ticker}_data.json`, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Không tìm thấy dữ liệu chi tiết cho mã ${ticker}` },
        { status: res.status }
      )
    }

    const data: StockDetailData = await res.json()
    cache.set(ticker, { data, timestamp: Date.now() })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error(`[API stock/${ticker}] Error fetching data:`, error)
    return NextResponse.json(
      { error: 'Lỗi tải dữ liệu cổ phiếu từ hệ thống' },
      { status: 500 }
    )
  }
}
