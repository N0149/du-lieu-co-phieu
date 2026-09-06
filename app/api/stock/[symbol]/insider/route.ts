import { NextRequest, NextResponse } from 'next/server'
import { getCompanyFullProfile } from '@/lib/company-profile-service'

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

  try {
    const profile = await getCompanyFullProfile(ticker)
    const trades = profile?.insiderTrades || []

    return NextResponse.json(
      { symbol: ticker, trades },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (err) {
    console.error(`[InsiderAPI] Lỗi lấy giao dịch nội bộ cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
