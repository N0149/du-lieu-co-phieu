import manifestRaw from '@/data/longlive_manifest.json'
import indicesRaw from '@/data/longlive_indices.json'
import { getLiveStockQuote } from './live-quote-service'

export type StockManifestItem = {
  t: string // Ticker (e.g. "HPG")
  n: string // Company Name
  s: string // Detailed sector (e.g. "Thép")
  e: string // Exchange (e.g. "HOSE", "HNX", "UPCOM")
  et: 'bank' | 'insurance' | 'stock' | 'nonbank' // Entity Type
  px: number | null // Price in k VND (e.g. 22.1 = 22,100 VND)
  cap: number | null // Market cap in billion VND (e.g. 186590)
  pe: number | null // P/E
  pb: number | null // P/B
  roe: number | null // ROE %
  port: boolean // Port indicator (cảng biển)
  g: string // ICB Level 1 Group (e.g. "Nguyên vật liệu", "Tài chính")
  s2: string // ICB Level 2 Sector (e.g. "Tài nguyên Cơ bản", "Ngân hàng")
  w1: number | null // 1-week change %
  d: string // Date YYYY-MM-DD
  div: number | null // Dividend cash VND
  dvy?: number | null // Dividend year
  dy: number | null // Dividend Yield %
  spark?: number[] // 12-point sparkline
  st?: 'active' | 'suspended' | 'delisted' | 'inactive' // Status
}

export type MarketIndexItem = {
  id: string
  label: string
  price: number
  chg: number
  d: string
  unit: string
  stale?: boolean
}

export type MarketIndicesData = {
  updated: string
  items: MarketIndexItem[]
}

export type MarketManifestData = {
  count: number
  asof: string
  breadth: {
    up: number
    down: number
    flat: number
  }
  groups: {
    g: string
    chg: number
    n: number
  }[]
  items: StockManifestItem[]
}

export type StockFinancialYear = {
  year: number
  revenue: number | null
  profit: number | null
  assets: number | null
  equity: number | null
  liabilities: number | null
  eps: number | null
  bvps: number | null
  roe: number | null
  roa: number | null
  gross_margin: number | null
  net_margin: number | null
  current_ratio: number | null
  debt_to_equity: number | null
  revenue_growth: number | null
  npat_growth: number | null
  z_score?: number | null
  dividend?: number | null
  src?: string
}

export type CoreSegmentItem = {
  segment: string
  description: string
  role: string
  tag: string
}

export type CoreBentoCard = {
  title: string
  items: string[]
}

export type CoreCardData = {
  monogram?: string
  logoUrl?: string | null
  companyName?: string | null
  subtitle?: string | null
  mainMarketTag?: string | null
  segments?: CoreSegmentItem[]
  bentoCards?: CoreBentoCard[]
  citation?: string | null
  snippet?: string | null
  pills?: string[]
}

export type PriceWeeklyItem = {
  d: string // Date YYYY-MM-DD
  c: number // Close price (k VND)
  v: number // Volume
}

export type PortThroughputItem = {
  year: number
  dwt?: number | null
  vessels?: number | null
}

export type StockDetailData = {
  ticker: string
  company: {
    name: string
    exchange: string
    sector: string
    entity_type: string
    status: string
    status_note: string | null
    status_date: string | null
    business_lines?: string[]
    icb_code?: string
    icb_l1?: string
    icb_l2?: string
  }
  profile: string
  market: {
    price: number | null
    market_cap_ty: number | null
    shares_m: number | null
    foreign_pct: number | null
    state_pct: number | null
    high_1y: number | null
    low_1y: number | null
  }
  valuation: {
    eps: number | null
    bvps: number | null
    pe: number | null
    pb: number | null
    dividend: number | null
  }
  financials: StockFinancialYear[]
  shareholders?: {
    name: string
    shares: number
    pct: number
  }[]
  price_weekly?: PriceWeeklyItem[]
  throughput?: PortThroughputItem[]
  is_port?: boolean
  coreCard?: CoreCardData | null
}

export function getManifestData(): MarketManifestData {
  return manifestRaw as unknown as MarketManifestData
}

export function getIndicesData(): MarketIndicesData {
  return indicesRaw as unknown as MarketIndicesData
}

export function getAllStocks(): StockManifestItem[] {
  const data = getManifestData()
  return data.items || []
}

export function getStockByTicker(ticker: string): StockManifestItem | undefined {
  const tNorm = ticker.toUpperCase().trim()
  return getAllStocks().find((s) => s.t.toUpperCase() === tNorm)
}

/** Chuẩn hóa xâu tìm kiếm không dấu */
export function removeVietnameseAccents(str: string): string {
  try {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
  } catch {
    return (str || '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()
  }
}

/**
 * Phân tích bóc tách khối core-card từ HTML trang stock của longlivestock
 */
export function parseCoreCardFromHtml(html: string, ticker: string): CoreCardData | null {
  if (!html || !html.includes('core-card')) return null

  try {
    const monoMatch = html.match(/<div class="core-mono"[^>]*>(.*?)<\/div>/)
    const logoMatch = html.match(/<img class="core-logo"[^>]*src="([^"]+)"[^>]*>/)
    const idMatch = html.match(/<div class="core-id">\s*<b>(.*?)<\/b>\s*<span>(.*?)<\/span>/)
    const tagMatch = html.match(/<div class="core-tag">(.*?)<\/div>/)
    const citeMatch = html.match(/<div class="core-cite">([\s\S]*?)<\/div>/)
    const snippetMatch = html.match(/<p class="core-snippet">([\s\S]*?)<\/p>/)

    const rows: CoreSegmentItem[] = []
    const tbodyMatch = html.match(/<table class="core-table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)
    if (tbodyMatch) {
      const rowMatches = tbodyMatch[1].matchAll(
        /<tr>\s*<td class="core-seg">\s*<b>(.*?)<\/b>\s*<small>([\s\S]*?)<\/small>\s*<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>\s*<span class="core-pill">(.*?)<\/span>\s*<\/td>\s*<\/tr>/g
      )
      for (const m of rowMatches) {
        rows.push({
          segment: m[1].trim(),
          description: m[2].trim(),
          role: m[3].trim(),
          tag: m[4].trim(),
        })
      }
    }

    const miniMatches = Array.from(
      html.matchAll(/<div class="core-mini">\s*<h4>(.*?)<\/h4>\s*<ul>([\s\S]*?)<\/ul>\s*<\/div>/g)
    )
    const bentoCards: CoreBentoCard[] = miniMatches.map((m) => {
      const title = m[1].trim()
      const items = Array.from(m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)).map((li) => li[1].trim())
      return { title, items }
    })

    const pillsMatch = html.match(/<div class="core-bl">([\s\S]*?)<\/div>/)
    let pills: string[] = []
    if (pillsMatch) {
      pills = Array.from(pillsMatch[1].matchAll(/<span class="core-pill">(.*?)<\/span>/g)).map((m) =>
        m[1].trim()
      )
    }

    return {
      monogram: monoMatch ? monoMatch[1] : ticker ? ticker[0] : '',
      logoUrl: logoMatch ? logoMatch[1] : null,
      companyName: idMatch ? idMatch[1] : null,
      subtitle: idMatch ? idMatch[2] : null,
      mainMarketTag: tagMatch ? tagMatch[1] : null,
      segments: rows,
      bentoCards: bentoCards,
      citation: citeMatch ? citeMatch[1] : null,
      snippet: snippetMatch ? snippetMatch[1] : null,
      pills: pills,
    }
  } catch (err) {
    console.error(`Error parsing coreCard for ${ticker}:`, err)
    return null
  }
}

/**
 * Tải toàn bộ dữ liệu chi tiết cổ phiếu gồm tài chính, giá tuần, sản lượng cảng và mảng kinh doanh cốt lõi
 */
export async function fetchStockDetailData(tickerUpper: string): Promise<StockDetailData | null> {
  const ticker = tickerUpper.toUpperCase().trim()
  const manifestItem = getStockByTicker(ticker)

  let jsonData: Partial<StockDetailData> | null = null
  let coreCardData: CoreCardData | null = null

  // Chạy song song fetch JSON data, HTML stock page và Live Quote
  const [jsonRes, htmlRes, liveQuote] = await Promise.all([
    fetch(`https://longlivestock.com/data/${ticker}_data.json`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then(async (r) => (r.ok ? await r.json() : null))
      .catch(() => null),
    fetch(`https://longlivestock.com/stock/${ticker}`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
      .then(async (r) => (r.ok ? await r.text() : null))
      .catch(() => null),
    getLiveStockQuote(ticker).catch(() => null),
  ])

  if (jsonRes) {
    jsonData = jsonRes
  }

  if (htmlRes) {
    try {
      coreCardData = parseCoreCardFromHtml(htmlRes, ticker)
    } catch (e) {
      console.error(`Error parsing HTML for ${ticker}:`, e)
    }
  }

  if (!jsonData && !manifestItem) {
    return null
  }

  // Cập nhật chuỗi price_weekly với giá phiên hôm nay nếu có
  const weeklyPrices = [...(jsonData?.price_weekly || [])]
  if (liveQuote && weeklyPrices.length > 0) {
    const parts = liveQuote.tradingDate?.split('/') // DD/MM/YYYY
    const todayIso = parts && parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : null
    if (todayIso) {
      const last = weeklyPrices[weeklyPrices.length - 1]
      if (last.d < todayIso) {
        weeklyPrices.push({
          d: todayIso,
          c: liveQuote.priceK,
          v: liveQuote.volume ?? last.v,
        })
      } else if (last.d === todayIso) {
        last.c = liveQuote.priceK
        if (liveQuote.volume) last.v = liveQuote.volume
      }
    }
  }

  // Tạo kết quả tổng hợp
  const result: StockDetailData = {
    ticker: jsonData?.ticker || manifestItem?.t || ticker,
    company: {
      name: jsonData?.company?.name || manifestItem?.n || ticker,
      exchange: jsonData?.company?.exchange || manifestItem?.e || '',
      sector: jsonData?.company?.sector || manifestItem?.s || '',
      entity_type: jsonData?.company?.entity_type || manifestItem?.et || 'nonbank',
      status: jsonData?.company?.status || manifestItem?.st || 'active',
      status_note: jsonData?.company?.status_note || null,
      status_date: jsonData?.company?.status_date || null,
      business_lines: jsonData?.company?.business_lines || [],
      icb_l1: jsonData?.company?.icb_l1 || manifestItem?.g,
      icb_l2: jsonData?.company?.icb_l2 || manifestItem?.s2,
    },
    profile: jsonData?.profile || `${manifestItem?.n || ticker} là doanh nghiệp niêm yết thuộc ngành ${manifestItem?.s || ''}.`,
    market: {
      price: liveQuote?.priceK ?? jsonData?.market?.price ?? manifestItem?.px ?? null,
      market_cap_ty: jsonData?.market?.market_cap_ty ?? manifestItem?.cap ?? null,
      shares_m: jsonData?.market?.shares_m ?? null,
      foreign_pct: jsonData?.market?.foreign_pct ?? null,
      state_pct: jsonData?.market?.state_pct ?? null,
      high_1y: jsonData?.market?.high_1y ?? null,
      low_1y: jsonData?.market?.low_1y ?? null,
    },
    valuation: {
      eps: jsonData?.valuation?.eps ?? null,
      bvps: jsonData?.valuation?.bvps ?? null,
      pe: jsonData?.valuation?.pe ?? manifestItem?.pe ?? null,
      pb: jsonData?.valuation?.pb ?? manifestItem?.pb ?? null,
      dividend: jsonData?.valuation?.dividend ?? manifestItem?.div ?? null,
    },
    financials: jsonData?.financials || [],
    shareholders: jsonData?.shareholders || [],
    price_weekly: weeklyPrices,
    throughput: jsonData?.throughput || [],
    is_port: jsonData?.is_port ?? manifestItem?.port ?? false,
    coreCard: coreCardData,
  }

  return result
}
