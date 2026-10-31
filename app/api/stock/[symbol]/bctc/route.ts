import { NextRequest, NextResponse } from 'next/server'
import { getBctcReport, getAvailableBctcTickers, getAvailableBctcPeriods } from '@/lib/bctc-service'
import { getCompanyBctcDocuments } from '@/lib/bctc-document-service'
import { getCompanyWebsiteMeta } from '@/lib/company-website-service'

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
    const period = searchParams.get('period') || undefined

    const bctcDataHopNhat = getBctcReport(ticker, 'HopNhat', period)
    const bctcDataCongTyMe = getBctcReport(ticker, 'CongTyMe', period)
    const availableTickers = getAvailableBctcTickers()
    const availablePeriods = getAvailableBctcPeriods(ticker)
    const websiteMeta = getCompanyWebsiteMeta(ticker)
    const bctcDocuments = getCompanyBctcDocuments(ticker, websiteMeta?.website)

    return NextResponse.json(
      { bctcDataHopNhat, bctcDataCongTyMe, availableTickers, availablePeriods, bctcDocuments },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch (err) {
    console.error(`[BctcAPI] Lỗi lấy Thuyết minh BCTC cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
