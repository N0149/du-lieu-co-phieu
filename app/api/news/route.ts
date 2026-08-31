import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import newsSnapshotRaw from '@/data/news_snapshot.json'

export const dynamic = 'force-dynamic'

export type RawNewsItem = {
  id: string
  title: string
  link: string
  pubDate: string
  source: string
  ticker: string | null
  tickers?: string[]
  category: string
  summary: string
}

function loadNewsSnapshot(): RawNewsItem[] {
  try {
    const filePath = path.join(process.cwd(), 'data', 'news_snapshot.json')
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (err) {
    console.warn('[API /api/news] Reading from file failed, using bundled JSON:', err)
  }
  return (newsSnapshotRaw as unknown as RawNewsItem[]) || []
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker') || ''
    const source = searchParams.get('source') || ''
    const query = searchParams.get('q') || searchParams.get('search') || ''
    const category = searchParams.get('category') || searchParams.get('tab') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    let items = loadNewsSnapshot()

    // 1. Lọc theo danh mục
    if (category && category !== 'all') {
      if (category === 'doanh-nghiep' || category === 'stock') {
        items = items.filter((item) => item.category === 'doanh-nghiep' || item.ticker || (item.tickers && item.tickers.length > 0))
      } else if (category === 'thi-truong' || category === 'market') {
        items = items.filter((item) => item.category === 'thi-truong')
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
          (item.ticker && item.ticker.toLowerCase() === q)
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
