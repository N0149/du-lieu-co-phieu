import { NextRequest, NextResponse } from 'next/server'
import { getLiveStockQuote } from '@/lib/live-quote-service'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const ticker = symbol?.toUpperCase().trim()

  if (!ticker) {
    return NextResponse.json({ error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
  }

  try {
    const quote = await getLiveStockQuote(ticker)
    if (!quote) {
      return NextResponse.json(
        { error: `Không tìm thấy giá trực tiếp cho mã ${ticker}` },
        { status: 404 }
      )
    }

    return NextResponse.json(quote, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (err: any) {
    console.error(`[API live-quote/${ticker}] Error:`, err)
    return NextResponse.json(
      { error: 'Lỗi tải giá trực tiếp từ hệ thống' },
      { status: 500 }
    )
  }
}
