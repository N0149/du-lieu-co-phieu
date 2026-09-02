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

export function getDashboardSummary() {
  const filePath = path.join(DATA_DIR, 'dashboard_summary.json')
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Error reading dashboard_summary.json:', error)
    return null
  }
}

export function getNationalTraffic() {
  const filePath = path.join(DATA_DIR, 'national_traffic.json')
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Error reading national_traffic.json:', error)
    return null
  }
}

export function getNationalMap() {
  const filePath = path.join(DATA_DIR, 'national_map.json')
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as NationalMapData
  } catch (error) {
    console.error('Error reading national_map.json:', error)
    return null
  }
}

export function getAllStocksIntel(): Record<string, StockIntelDetail> {
  const filePath = path.join(DATA_DIR, 'stocks_intel.json')
  if (!fs.existsSync(filePath)) {
    return {}
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Error reading stocks_intel.json:', error)
    return {}
  }
}

export function getStockIntel(ticker: string): StockIntelDetail | null {
  const all = getAllStocksIntel()
  const upper = ticker.toUpperCase()
  return all[upper] || null
}

export function getFreightRates(): import('./maritime-types').FreightRatesData | null {
  const filePath = path.join(DATA_DIR, 'freight_rates.json')
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Error reading freight_rates.json:', error)
    return null
  }
}
