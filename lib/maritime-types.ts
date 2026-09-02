export interface MonthlyRecord {
  ym: string
  in?: number
  out?: number
  dwt_in?: number
  dwt_out?: number
  partial?: boolean
  est?: boolean
}

export interface PortAuthority {
  id: string
  name: string
  short?: string
  short_code?: string
  region: string
  lat: number
  lon: number
  calls_30d: number
  dwt_30d: number
  calls_all?: number
  dwt_all?: number
  latest?: string
  latest_date?: string
  by_month?: Array<{ m: string; calls: number; dwt: number }>
}

export interface MaritimeStock {
  ticker: string
  name: string
  region?: string
  category?: string
  pure_play: boolean | number
  scope_note?: string
  total_calls?: number
  total_dwt?: number
}

export interface LivePortCall {
  id?: number
  vessel_id?: string
  vessel_name: string
  authority_id: string
  berth_name?: string
  berth_slug?: string
  stock_ticker?: string
  call_direction: 'in' | 'out' | 'shift' | 'channel'
  call_date: string
  scheduled_time?: string
  draft?: number
  loa?: number
  dwt?: number
  gt?: number
  origin_port?: string
  dest_port?: string
  agent_name?: string
  pilot_name?: string
  notes?: string
  source?: string
}

export interface NationalMapData {
  viewBox: [number, number, number, number]
  bounds: { lon0: number; lon1: number; lat0: number; lat1: number }
  mainland: string
  islands: string[]
  bien_dong: [number, number]
  hoangsa: { label: [number, number]; dots: [number, number][] }
  truongsa: { label: [number, number]; dots: [number, number][] }
}

export interface FreightIndexHistoryPoint {
  date: string
  value: number
  change_val: number
  change_pct: number
}

export interface FreightIndexItem {
  symbol: string
  name: string
  vietnamese_name: string
  category: string
  unit: string
  affected_stocks: string[]
  summary: string
  source: string
  latest_date: string
  latest_value: number
  previous_value: number
  change_val: number
  change_pct: number
  history: FreightIndexHistoryPoint[]
}

export interface FreightRatesData {
  status: string
  updated_at: string
  indices: Record<string, FreightIndexItem>
}

export interface StockIntelDetail {
  ticker: string
  name: string
  region?: string
  category?: string
  pure_play?: boolean
  scope_note?: string
  berths?: string[]
  berth_nav?: Array<{ name: string; slug: string; cangvu: string }>
  free?: {
    monthly?: Array<{
      ym: string
      in?: number
      out?: number
      dwt_in?: number
      dwt_out?: number
      partial?: boolean
      est?: boolean
    }>
    carrier_teaser?: any[]
    fleet?: any[]
    holding_units?: any[]
  }
}

export function formatDWT(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ DWT'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M DWT'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k DWT'
  return n.toLocaleString('vi-VN') + ' DWT'
}

export function formatCalls(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('vi-VN') + ' lượt'
}
