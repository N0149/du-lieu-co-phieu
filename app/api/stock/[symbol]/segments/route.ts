import { NextRequest, NextResponse } from 'next/server'
import { getCompanySegmentData } from '@/lib/company-segment-service'

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

  const data = getCompanySegmentData(ticker)
  if (!data) {
    return NextResponse.json({ error: `Chưa có dữ liệu bóc tách cho ${ticker}` }, { status: 404 })
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
