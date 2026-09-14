import { NextRequest, NextResponse } from 'next/server'
import { getStockArticles } from '@/lib/stock-articles-service'
import { getStockByTicker } from '@/lib/longlivestock'
import { fetchLiveDisclosuresForSymbol } from '@/lib/disclosures'

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
    let articles = getStockArticles(ticker, manifestStock?.n || '')

    // Nếu mã này chưa có disclosure nào hoặc các disclosure chưa có direct link từ CafeF,
    // tự động fetch trực tiếp từ CafeF (~150ms) để nạp link văn bản chính thống
    const hasDirectLinks = articles.items.some(
      (it) => it.type === 'disclosure' && it.link && it.link.includes('cafef.vn/du-lieu/')
    )

    if (!hasDirectLinks || articles.disclosureCount === 0) {
      try {
        await fetchLiveDisclosuresForSymbol(ticker)
        articles = getStockArticles(ticker, manifestStock?.n || '')
      } catch (e) {
        console.warn(`[ArticlesRoute] Live disclosure fetch fallback for ${ticker}:`, e)
      }
    }

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

