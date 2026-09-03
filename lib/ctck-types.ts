export interface MarginSummaryItem {
  period: string // e.g. "2026-Q2"
  label: string // e.g. "2026 Q2"
  margin_debt_bn: number
  vcsh_bn: number
  co_phieu_bn: number
  trai_phieu_bn: number
  du_dia_bn: number
  margin_vcsh_pct: number
  ctck_reported: number
  qoq_growth?: number
  yoy_growth?: number
}

export interface CompanyPeriodItem {
  period: string
  label: string
  margin_debt: number
  vcsh: number
  co_phieu: number
  trai_phieu: number
  du_dia: number
  margin_vcsh_pct: number
  qoq_growth?: number
  yoy_growth?: number
}

export interface Top10CompanyItem {
  symbol: string
  margin_debt_bn: number
  market_share_pct: number
}

export interface Top10PeriodItem {
  period: string
  companies: Top10CompanyItem[]
  total_bn: number
}

export interface BrokerageRow {
  label: string // "Q2 2026"
  year: number
  quarter: number
  [brokerCode: string]: any
}

export interface BrokerItem {
  name: string
  code: string
}

export interface CtckFullData {
  overview: {
    marginDebtBn: number
    marginDebtFormatted: string
    vcshBn: number
    vcshFormatted: string
    marginVcshPct: number
    duDiaBn: number
    duDiaFormatted: string
    ctckReported: number
    latestPeriod: string
  }
  ctckSymbols: string[]
  marketSummary: MarginSummaryItem[]
  top10ByPeriod: Top10PeriodItem[]
  companies: {
    symbol: string
    periods: CompanyPeriodItem[]
  }[]
  brokerageShare: {
    brokers: BrokerItem[]
    rows: BrokerageRow[]
    latestPeriod: string
    latestShares: { code: string; name: string; share: number }[]
  }
}

// Bảng màu nhận diện thương hiệu các CTCK
export const CTCK_COLORS: Record<string, string> = {
  TCX: '#1982c4',
  SSI: '#e63946',
  VPX: '#f72585',
  VCK: '#7b2d8b',
  HCM: '#e9c46a',
  VCI: '#2a9d8f',
  MBS: '#52b788',
  VIX: '#3a86ff',
  VND: '#f4a261',
  SHS: '#264653',
  BSI: '#8ac926',
  FTS: '#4cc9f0',
  CTS: '#ff6b6b',
  BVS: '#457b9d',
  DSC: '#b5179e',
  VPS: '#10b981',
  TCBS: '#0284c7',
  HSC: '#e9c46a',
  VNDS: '#f97316',
  MAS: '#6366f1',
  KIS: '#ec4899',
  Khác: '#64748b',
}

/** Lọc danh sách kỳ theo timeRange: 1Y (4 quý), 3Y (12 quý), 5Y (20 quý), All (34 quý) */
export function filterPeriodsByRange<T>(items: T[], range = 'all'): T[] {
  if (!items || items.length === 0) return []
  if (range === '1y') return items.slice(-4)
  if (range === '3y') return items.slice(-12)
  if (range === '5y') return items.slice(-20)
  return items
}
