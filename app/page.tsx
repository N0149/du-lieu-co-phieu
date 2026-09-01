import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { NewsDashboard, NewsSnapshotItem } from '@/components/news/news-dashboard'
import { getCachedNews, fetchAllRssFeeds } from '@/lib/rss-news-service'
import manifestRaw from '@/data/longlive_manifest.json'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tổng Hợp Tin Tức Thị Trường & Công Bố Doanh Nghiệp Mới Nhất',
  description:
    'Cổng tổng hợp tin tức tài chính, kinh tế vĩ mô và doanh nghiệp niêm yết theo thời gian thực từ Vietnambiz, VnEconomy, TinNhanhCK, CafeF, VietnamFinance. Tự động bóc tách mã cổ phiếu & biến động giá.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Tổng Hợp Tin Tức Thị Trường & Công Bố Doanh Nghiệp | Dữ Liệu Đầu Tư',
    description:
      'Dòng tin trực tiếp cập nhật liên tục từ các nguồn báo tài chính hàng đầu. Bóc tách mã cổ phiếu và giá realtime.',
    url: '/',
    type: 'website',
  },
}

async function getInitialNews(): Promise<NewsSnapshotItem[]> {
  try {
    const cached = getCachedNews()
    if (cached && cached.length > 0) {
      // Trigger background update if stale
      fetchAllRssFeeds(false).catch(() => {})
      return cached
    }
    return await fetchAllRssFeeds(false)
  } catch (err) {
    console.warn('[HomePage] Fallback to cached:', err)
    return getCachedNews()
  }
}

function getStockPriceMap(): Record<string, { px: number | null; w1: number | null }> {
  const map: Record<string, { px: number | null; w1: number | null }> = {}
  try {
    const items = (manifestRaw as any)?.items || []
    for (const it of items) {
      if (it.t) {
        map[it.t.toUpperCase()] = {
          px: it.px ?? null,
          w1: it.w1 ?? null,
        }
      }
    }
  } catch (err) {
    console.warn('[HomePage] Failed to build stockPriceMap:', err)
  }
  return map
}

export default async function HomePage() {
  const initialNews = await getInitialNews()
  const stockPriceMap = getStockPriceMap()

  // Calculate trending tickers
  const tickerCounts: Record<string, number> = {}
  initialNews.forEach((item) => {
    if (item.ticker) {
      tickerCounts[item.ticker] = (tickerCounts[item.ticker] || 0) + 1
    }
    if (item.tickers) {
      item.tickers.forEach((t) => {
        tickerCounts[t] = (tickerCounts[t] || 0) + 1
      })
    }
  })

  const initialTrending = Object.entries(tickerCounts)
    .map(([t, count]) => ({ ticker: t, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0d11]">
      <SiteHeader />
      <main className="flex-1">
        <NewsDashboard
          initialNews={initialNews}
          initialTrending={initialTrending}
          stockPriceMap={stockPriceMap}
        />
      </main>
    </div>
  )
}
