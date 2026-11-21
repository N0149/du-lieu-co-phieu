import { NextRequest, NextResponse } from 'next/server'
import { getBctnReport, getAvailableBctnTickers } from '@/lib/bctn-service'

export const revalidate = 86400 // Cache 24 giờ

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
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam, 10) : 2025

    const bctnData = getBctnReport(ticker, year)
    const availableTickers = getAvailableBctnTickers(year)

    return NextResponse.json(
      { bctnData, availableTickers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch (err) {
    console.error(`[BctnAPI] Lỗi lấy Báo Cáo Thường Niên cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
