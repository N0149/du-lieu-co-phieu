import manifestRaw from '@/data/longlive_manifest.json'
import indicesRaw from '@/data/longlive_indices.json'

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
  price_history?: {
    date: string
    close: number
    volume: number
  }[]
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
