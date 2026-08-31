import { NextRequest, NextResponse } from 'next/server'
import {
  fetchAllFinancialNews,
  filterNewsItems,
  getTrendingTickers,
  NewsFilterTab,
} from '@/lib/news-service'

export const dynamic = 'force-dynamic'
export const revalidate = 180 // 3 minutes revalidation

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = (searchParams.get('tab') as NewsFilterTab) || 'all'
    const search = searchParams.get('q') || ''
    const source = searchParams.get('source') || 'all'
    const ticker = searchParams.get('ticker') || ''
    const forceRefresh = searchParams.get('refresh') === 'true'
    const savedParam = searchParams.get('saved') || ''
    const savedIds = savedParam ? savedParam.split(',') : []

    // Fetch news (with in-memory cache)
    const allNews = await fetchAllFinancialNews(forceRefresh)

    // Filter items
    const filteredNews = filterNewsItems(allNews, {
      tab,
      search,
      source,
      ticker,
      savedIds,
    })

    // Get trending tickers
    const trendingTickers = getTrendingTickers(allNews, 15)

    // Count by tab
    const tabCounts = {
      all: allNews.length,
      market: allNews.filter((i) => i.category === 'market').length,
      stock: allNews.filter((i) => i.category === 'stock' || i.tickers.length > 0).length,
      global: allNews.filter((i) => i.category === 'global').length,
    }

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
      total: filteredNews.length,
      tabCounts,
      trendingTickers,
      items: filteredNews,
    })
  } catch (error: any) {
    console.error('[API /api/tin-tuc] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải dữ liệu tin tức',
        items: [],
      },
      { status: 500 }
    )
  }
}
