import { NextRequest, NextResponse } from 'next/server'
import { getAgmReport, getAvailableAgmTickers } from '@/lib/agm-service'

export const revalidate = 60

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const ticker = symbol?.toUpperCase().trim()

  if (!ticker) {
    return NextResponse.json({ error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
  }

  try {
    const agmData = getAgmReport(ticker, 2026)
    const availableTickers = getAvailableAgmTickers(2026)

    return NextResponse.json(
      { agmData, availableTickers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error(`[AgmAPI] Lỗi lấy ĐHĐCĐ cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
