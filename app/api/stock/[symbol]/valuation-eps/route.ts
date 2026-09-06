import { NextRequest, NextResponse } from 'next/server'
import { getValuationEpsData } from '@/lib/valuation-eps-service'

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

  try {
    const data = await getValuationEpsData(ticker, years)
    if (!data) {
      return NextResponse.json(
        { error: `Không có dữ liệu định giá EPS cho mã ${ticker}` },
        { status: 404 }
      )
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error(`[ValuationEpsAPI] Lỗi nạp định giá cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
