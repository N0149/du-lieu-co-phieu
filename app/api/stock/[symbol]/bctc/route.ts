import { NextRequest, NextResponse } from 'next/server'
import { getBctcReport, getAvailableBctcTickers } from '@/lib/bctc-service'
import { getCompanyBctcDocuments } from '@/lib/bctc-document-service'
import { getCompanyWebsiteMeta } from '@/lib/company-website-service'

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
    const bctcDataHopNhat = getBctcReport(ticker, 'HopNhat')
    const bctcDataCongTyMe = getBctcReport(ticker, 'CongTyMe')
    const availableTickers = getAvailableBctcTickers()
    const websiteMeta = getCompanyWebsiteMeta(ticker)
    const bctcDocuments = getCompanyBctcDocuments(ticker, websiteMeta?.website)

    return NextResponse.json(
      { bctcDataHopNhat, bctcDataCongTyMe, availableTickers, bctcDocuments },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error(`[BctcAPI] Lỗi lấy Thuyết minh BCTC cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
