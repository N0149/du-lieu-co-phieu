import { NextRequest, NextResponse } from 'next/server'
import { getStockPriceHistory } from '@/lib/stock-price-history-service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const ticker = symbol?.toUpperCase().trim()

  if (!ticker) {
    return NextResponse.json({ error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const years = parseInt(searchParams.get('years') || '3', 10)
  const format = searchParams.get('format')

  try {
    if (format === 'candles') {
      const { getLocalStockCandles, getStockCandles } = await import('@/lib/stock-price-history-service')
      // Chuẩn WiData: Ưu tiên đọc cache nội bộ 0ms, không gọi API ngoài khi đang phục vụ người dùng
      let candles = getLocalStockCandles(ticker)
      if (!candles || candles.length === 0) {
        candles = await getStockCandles(ticker, years)
      }
      const hasData = Array.isArray(candles) && candles.length > 0
      return NextResponse.json({ symbol: ticker, candles: candles || [] }, {
        headers: {
          'Cache-Control': hasData
            ? 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400'
            : 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const data = await getStockPriceHistory(ticker, years)
    if (!data) {
      return NextResponse.json(
        { error: `Không có dữ liệu lịch sử giá cho mã ${ticker}` },
        { status: 404 }
      )
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error(`[PriceHistoryAPI] Lỗi nạp giá cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
