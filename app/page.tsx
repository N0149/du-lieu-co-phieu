import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { NewsDashboard, NewsSnapshotItem } from '@/components/news/news-dashboard'
import { getCachedNews, fetchAllRssFeeds } from '@/lib/rss-news-service'
import { getRecentMarketDisclosures } from '@/lib/disclosures'
import manifestRaw from '@/data/longlive_manifest.json'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Công Bố Thông Tin 3 Sàn & Tin Tức Doanh Nghiệp Realtime | Dữ Liệu Đầu Tư',
  description:
    'Cổng tổng hợp công bố thông tin 3 sàn (HOSE, HNX, UPCOM) và dòng tin tức tài chính, kinh tế vĩ mô thời gian thực. Cập nhật BCTC, nghị quyết HĐQT, giải trình KQKD, cổ tức và biến động giá.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Công Bố Thông Tin 3 Sàn & Tin Tức Doanh Nghiệp | Dữ Liệu Đầu Tư',
    description:
      'Dòng công bố thông tin 3 sàn và tin tức doanh nghiệp niêm yết trực tiếp cập nhật liên tục từ các sở giao dịch và báo tài chính.',
    url: '/',
    type: 'website',
  },
}

async function getInitialNews(): Promise<NewsSnapshotItem[]> {
  try {
    const cached = getCachedNews()
    if (cached && cached.length > 0) {
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
  const initialDisclosures = getRecentMarketDisclosures({ limit: 200 })
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
          initialDisclosures={initialDisclosures}
          initialTrending={initialTrending}
          stockPriceMap={stockPriceMap}
          defaultTab="cong-bo"
        />
      </main>
    </div>
  )
}

