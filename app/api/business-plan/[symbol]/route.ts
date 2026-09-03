import { NextRequest, NextResponse } from 'next/server'
import { getBusinessPlan } from '@/lib/business-plan-db'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params

  if (!symbol) {
    return NextResponse.json({ error: 'Thiếu mã cổ phiếu' }, { status: 400 })
  }

  try {
    const data = await getBusinessPlan(symbol)
    if (!data) {
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        data: [],
        message: 'Chưa có dữ liệu kế hoạch kinh doanh',
      })
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error(`Lỗi API kế hoạch kinh doanh [${symbol}]:`, error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
