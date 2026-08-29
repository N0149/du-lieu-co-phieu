import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { StockDetailView } from '@/components/stock-detail-view'
import {
  getAllStocks,
  getStockByTicker,
  type StockDetailData,
} from '@/lib/longlivestock'
import { getReportsForTicker } from '@/lib/report-stocks'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>
}): Promise<Metadata> {
  const { symbol } = await params
  const ticker = symbol.toUpperCase().trim()
  const manifestStock = getStockByTicker(ticker)

  if (!manifestStock) {
    return {
      title: `${ticker} · Tra Cứu Cổ Phiếu Việt Nam`,
    }
  }

  return {
    title: `${ticker} · ${manifestStock.n} · Phân Tích Chuyên Sâu & BCTC 16 Năm`,
    description: `Hồ sơ tài chính, báo cáo tài chính đa năm, P/E, P/B, ROE, cơ cấu cổ đông của ${ticker} (${manifestStock.n}) - ngành ${manifestStock.s}.`,
  }
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const ticker = symbol.toUpperCase().trim()

  const allStocks = getAllStocks()
  const manifestItem = allStocks.find((s) => s.t.toUpperCase() === ticker)

  // Fetch detailed data from LongLiveStock or internal cache
  let stockData: StockDetailData | null = null
  try {
    const res = await fetch(`https://longlivestock.com/data/${ticker}_data.json`, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (res.ok) {
      stockData = await res.json()
    }
  } catch (err) {
    console.error(`Error loading stock detail for ${ticker}:`, err)
  }

  // If live fetch failed but we have manifestItem, create a minimal fallback
  if (!stockData) {
    if (!manifestItem) notFound()

    stockData = {
      ticker: manifestItem.t,
      company: {
        name: manifestItem.n,
        exchange: manifestItem.e,
        sector: manifestItem.s,
        entity_type: manifestItem.et,
        status: manifestItem.st || 'active',
        status_note: null,
        status_date: null,
        icb_l1: manifestItem.g,
        icb_l2: manifestItem.s2,
      },
      profile: `${manifestItem.n} (${manifestItem.t}) là doanh nghiệp niêm yết thuộc ngành ${manifestItem.s}.`,
      market: {
        price: manifestItem.px,
        market_cap_ty: manifestItem.cap,
        shares_m: null,
        foreign_pct: null,
        state_pct: null,
        high_1y: null,
        low_1y: null,
      },
      valuation: {
        eps: null,
        bvps: null,
        pe: manifestItem.pe,
        pb: manifestItem.pb,
        dividend: manifestItem.div,
      },
      financials: [],
    }
  }

  // Lấy các bài báo cáo phân tích thực tế của mã từ kho dữ liệu
  const reports = getReportsForTicker(ticker)

  // Find related stocks in same sector or group
  const relatedStocks = allStocks
    .filter(
      (s) =>
        s.t !== ticker &&
        !s.st &&
        (s.s === stockData?.company.sector || s.g === stockData?.company.icb_l1),
    )
    .sort((a, b) => (b.cap || 0) - (a.cap || 0))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <StockDetailView
        stockData={stockData}
        relatedStocks={relatedStocks}
        reports={reports}
      />
    </div>
  )
}
