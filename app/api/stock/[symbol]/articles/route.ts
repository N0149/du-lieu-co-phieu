import { NextRequest, NextResponse } from 'next/server'
import { getStockArticles } from '@/lib/stock-articles-service'
import { getStockByTicker } from '@/lib/longlivestock'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const ticker = symbol?.toUpperCase().trim()
    if (!ticker) {
      return NextResponse.json({ success: false, error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
    }

    const manifestStock = getStockByTicker(ticker)
    const articles = getStockArticles(ticker, manifestStock?.n || '')

    return NextResponse.json({
      success: true,
      data: articles,
      asOf: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[API /api/stock/[symbol]/articles] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi xử lý bài viết' },
      { status: 500 }
    )
  }
}
