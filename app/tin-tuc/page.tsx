import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { NewsDashboard, NewsSnapshotItem } from '@/components/news/news-dashboard'
import { getCachedNews, fetchAllRssFeeds } from '@/lib/rss-news-service'
import { getRecentMarketDisclosures } from '@/lib/disclosures'
import { getUserWatchlist } from '@/lib/watchlist-service'
import { getInsiderActions } from '@/lib/insider-actions-service'
import manifestRaw from '@/data/longlive_manifest.json'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tổng Hợp Tin Tức Thị Trường & Công Bố Doanh Nghiệp Mới Nhất',
  description:
    'Cổng tổng hợp tin tức tài chính, kinh tế vĩ mô và doanh nghiệp niêm yết theo thời gian thực từ Stockbiz, Tin Nhanh CK, Vietstock, Vietnambiz, VnEconomy, CafeF, VietnamFinance. Tự động bóc tách mã cổ phiếu & biến động giá.',
  alternates: {
    canonical: '/tin-tuc',
  },
  openGraph: {
    title: 'Tổng Hợp Tin Tức Thị Trường & Công Bố Doanh Nghiệp | Dữ Liệu Đầu Tư',
    description:
      'Dòng tin trực tiếp cập nhật liên tục từ các nguồn báo tài chính hàng đầu: Stockbiz, Tin Nhanh CK, Vietstock, CafeF, VnEconomy, Vietnambiz. Bóc tách mã cổ phiếu và giá realtime.',
    url: '/tin-tuc',
    type: 'website',
  },
}

async function getInitialNews(): Promise<NewsSnapshotItem[]> {
  try {
    const cached = getCachedNews()
    if (cached && cached.length > 0) {
      return cached
    }
    return await fetchAllRssFeeds(false)
  } catch (err) {
    console.warn('[NewsPage] Fallback to cached:', err)
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
    console.warn('[NewsPage] Failed to build stockPriceMap:', err)
  }
  return map
}

interface NewsPageProps {
  searchParams?: Promise<{ tab?: string }>
}

export default async function NewsPage(props: NewsPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const rawTab = searchParams?.tab
  let defaultTab: any = 'cong-bo'
  if (rawTab === 'giao-dich-noi-bo' || rawTab === 'insider' || rawTab === 'noi-bo') {
    defaultTab = 'giao-dich-noi-bo'
  }

  const [initialNews, userWatchlistResult, initialInsiderActions] = await Promise.all([
    getInitialNews(),
    getUserWatchlist(),
    getInsiderActions({ limit: 80 }).catch(() => []),
  ])
  const initialDisclosures = getRecentMarketDisclosures({ limit: 200 })
  const initialWatchlist = userWatchlistResult.items.map((it) => it.ticker)
  const stockPriceMap = getStockPriceMap()

  // Calculate trending tickers
  const tickerCounts: Record<string, number> = {}
  initialNews.forEach((item) => {
    const rawList = [item.ticker, ...(item.tickers || [])]
    rawList.forEach((t) => {
      const code = typeof t === 'string' ? t.toUpperCase().trim() : null
      if (code && /^[A-Z0-9]{3}$/.test(code) && !code.includes('OBJECT')) {
        tickerCounts[code] = (tickerCounts[code] || 0) + 1
      }
    })
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
          initialInsiderActions={initialInsiderActions}
          initialTrending={initialTrending}
          stockPriceMap={stockPriceMap}
          defaultTab={defaultTab}
          initialWatchlist={initialWatchlist}
        />
      </main>
    </div>
  )
}
