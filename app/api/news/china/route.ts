import { NextRequest, NextResponse } from 'next/server'
import { getCachedChinaNews } from '@/lib/china-news-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const query = (searchParams.get('q') || '').toLowerCase().trim()

    const snapshot = getCachedChinaNews()
    let filteredItems = snapshot.items || []

    // 1. Lọc theo chuyên mục
    if (category && category !== 'all') {
      filteredItems = filteredItems.filter((it) => it.category === category)
    }

    // 2. Lọc theo từ khóa tìm kiếm
    if (query) {
      filteredItems = filteredItems.filter((it) => {
        const inTitleVi = it.titleVi?.toLowerCase().includes(query)
        const inTitleOriginal = it.titleOriginal?.toLowerCase().includes(query)
        const inSource = it.source?.toLowerCase().includes(query)
        const inTags = it.tags?.some((t) => t.toLowerCase().includes(query))
        const inTakeaways = it.takeaways?.some((tw) => tw.toLowerCase().includes(query))
        return inTitleVi || inTitleOriginal || inSource || inTags || inTakeaways
      })
    }

    // Thống kê số lượng theo từng category
    const categoryCounts = {
      all: snapshot.items.length,
      ai: snapshot.items.filter((i) => i.category === 'ai').length,
      tech: snapshot.items.filter((i) => i.category === 'tech').length,
      economy: snapshot.items.filter((i) => i.category === 'economy').length,
      investment: snapshot.items.filter((i) => i.category === 'investment').length,
    }

    return NextResponse.json({
      success: true,
      lastUpdated: snapshot.lastUpdated,
      dateStr: snapshot.dateStr,
      total: filteredItems.length,
      categoryCounts,
      items: filteredItems,
    })
  } catch (error: any) {
    console.error('[API /api/news/china] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Lỗi khi tải dữ liệu tin tức Trung Quốc',
        items: [],
      },
      { status: 500 }
    )
  }
}
