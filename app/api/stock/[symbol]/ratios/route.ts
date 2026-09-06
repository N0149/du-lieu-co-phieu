import { NextResponse } from 'next/server'
import { getWiDataFinancialRatios } from '@/lib/financial-ratios-service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const ticker = symbol?.toUpperCase().trim()

    if (!ticker) {
      return NextResponse.json({ error: 'Missing ticker symbol' }, { status: 400 })
    }

    const data = await getWiDataFinancialRatios(ticker)
    if (!data) {
      return NextResponse.json(
        { error: `Không tìm thấy chỉ số tài chính cho ${ticker}` },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[api/stock/ratios] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    )
  }
}
