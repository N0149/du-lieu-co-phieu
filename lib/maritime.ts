import fs from 'fs'
import path from 'path'
import {
  PortAuthority,
  MaritimeStock,
  LivePortCall,
  NationalMapData,
  StockIntelDetail,
} from './maritime-types'

export * from './maritime-types'

const DATA_DIR = path.join(process.cwd(), 'data', 'maritime')
const maritimeCache = new Map<string, { data: any; mtimeMs: number }>()

function readMaritimeJson<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return defaultValue
  }
  try {
    const stats = fs.statSync(filePath)
    const cached = maritimeCache.get(filename)
    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.data as T
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw) as T
    maritimeCache.set(filename, { data, mtimeMs: stats.mtimeMs })
    return data
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return defaultValue
  }
}

export function getDashboardSummary(): any {
  return readMaritimeJson<any>('dashboard_summary.json', null)
}

export function getNationalTraffic(): any {
  return readMaritimeJson<any>('national_traffic.json', null)
}

export function getNationalMap() {
  return readMaritimeJson<NationalMapData | null>('national_map.json', null)
}

export function getAllStocksIntel(): Record<string, StockIntelDetail> {
  return readMaritimeJson<Record<string, StockIntelDetail>>('stocks_intel.json', {})
}

export function getStockIntel(ticker: string): StockIntelDetail | null {
  const all = getAllStocksIntel()
  const upper = ticker.toUpperCase()
  return all[upper] || null
}

export function getFreightRates(): import('./maritime-types').FreightRatesData | null {
  return readMaritimeJson<import('./maritime-types').FreightRatesData | null>('freight_rates.json', null)
}
