import { NextRequest, NextResponse } from 'next/server'
import { getConsensusTargetPriceData } from '@/lib/consensus-target-price-service'

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
    const data = await getConsensusTargetPriceData(ticker, 3)
    if (!data) {
      return NextResponse.json(
        { error: `Không có dữ liệu giá khuyến nghị cho mã ${ticker}` },
        { status: 404 }
      )
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error(`[ConsensusAPI] Lỗi lấy dữ liệu cho ${ticker}:`, err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
