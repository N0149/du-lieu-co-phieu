import { NextRequest, NextResponse } from 'next/server'
import { fetchAllRssFeeds, getCachedNews, getLastFetchedTime, type RawNewsItem } from '@/lib/rss-news-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Cho phép Next.js serverless chạy tối đa 30s khi quét RSS

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker') || ''
    const source = searchParams.get('source') || ''
    const query = searchParams.get('q') || searchParams.get('search') || ''
    const category = searchParams.get('category') || searchParams.get('tab') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'force'

    // Lấy dữ liệu tin tức (tự động fetch RSS mới nếu quá 3 phút hoặc khi forceRefresh)
    let items: RawNewsItem[] = []
    if (forceRefresh) {
      items = await fetchAllRssFeeds(true)
    } else {
      // Background revalidation: Lấy cached trước nếu có, kích hoạt fetch mới nếu hết TTL
      const cached = getCachedNews()
      if (cached && cached.length > 0) {
        items = cached
        // Kích hoạt fetch ngầm nếu quá 3 phút mà không block response
        fetchAllRssFeeds(false).catch((e) => console.warn('[API /api/news] Background fetch error:', e))
      } else {
        items = await fetchAllRssFeeds(false)
      }
    }

    // 1. Lọc theo danh mục
    if (category && category !== 'all') {
      if (category === 'doanh-nghiep' || category === 'stock' || category === 'co-phieu') {
        items = items.filter((item) => item.category === 'doanh-nghiep' || item.ticker || (item.tickers && item.tickers.length > 0))
      } else if (category === 'thi-truong' || category === 'market') {
        items = items.filter((item) => item.category === 'thi-truong' || item.category === 'quoc-te')
      } else if (category === 'quoc-te' || category === 'global') {
        items = items.filter((item) => item.category === 'quoc-te')
      }
    }

    // 2. Lọc theo mã cổ phiếu
    if (ticker) {
      const tNorm = ticker.toUpperCase().trim()
      items = items.filter(
        (item) =>
          (item.ticker && item.ticker.toUpperCase() === tNorm) ||
          (item.tickers && item.tickers.some((t) => t.toUpperCase() === tNorm)) ||
          item.title.toUpperCase().includes(tNorm)
      )
    }

    // 3. Lọc theo nguồn tin
    if (source && source !== 'all') {
      const sNorm = source.toLowerCase().trim()
      items = items.filter((item) => item.source.toLowerCase().includes(sNorm))
    }

    // 4. Tìm kiếm từ khóa
    if (query && query.trim()) {
      const q = query.toLowerCase().trim()
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.summary && item.summary.toLowerCase().includes(q)) ||
          (item.ticker && item.ticker.toLowerCase() === q) ||
          (item.tickers && item.tickers.some((t) => t.toLowerCase() === q))
      )
    }

    const total = items.length
    const startIndex = (page - 1) * limit
    const paginatedItems = items.slice(startIndex, startIndex + limit)

    // Thống kê danh mục và ticker hot
    const tickerCounts: Record<string, number> = {}
    items.forEach((item) => {
      if (item.ticker) {
        tickerCounts[item.ticker] = (tickerCounts[item.ticker] || 0) + 1
      }
      if (item.tickers) {
        item.tickers.forEach((t) => {
          tickerCounts[t] = (tickerCounts[t] || 0) + 1
        })
      }
    })

    const trendingTickers = Object.entries(tickerCounts)
      .map(([t, count]) => ({ ticker: t, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      lastUpdated: getLastFetchedTime() || Date.now(),
      trendingTickers,
      items: paginatedItems,
    })
  } catch (error: any) {
    console.error('[API /api/news] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Lỗi khi tải dữ liệu tin tức',
        items: [],
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const items = await fetchAllRssFeeds(true)
    return NextResponse.json({
      success: true,
      message: `Đã làm mới thành công ${items.length} tin tức từ các nguồn RSS`,
      total: items.length,
      lastUpdated: getLastFetchedTime(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi làm mới RSS' },
      { status: 500 }
    )
  }
}
