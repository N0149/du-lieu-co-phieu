import { NextRequest, NextResponse } from 'next/server'
import { getCompanyFullProfile } from '@/lib/company-profile-service'

export const revalidate = 3600

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
    return NextResponse.json(
      { symbol: ticker, data: profile },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (err) {
    console.error(`[ProfileAPI] Lỗi lấy hồ sơ cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
