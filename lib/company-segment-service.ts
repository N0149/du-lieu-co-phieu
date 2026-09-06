import fs from 'node:fs'
import path from 'node:path'

export interface BrandRevenueItem {
  year: string
  tgdd: number
  dmx: number
  bhx: number
  khac: number
  total: number
}

export interface SectorRevenueItem {
  year: string
  thietBi: number
  fmcg: number
  khac: number
  total: number
}

export interface SectorGrossProfitItem {
  year: string
  thietBi: number
  fmcg: number
  khac: number
  total: number
}

export interface CompanySegmentData {
  symbol: string
  name: string
  note: string
  byBrand: BrandRevenueItem[]
  bySectorRevenue: SectorRevenueItem[]
  bySectorGrossProfit: SectorGrossProfitItem[]
}

const SEGMENTS_DIR = path.join(process.cwd(), 'data', 'segments')

export function getCompanySegmentData(symbol: string): CompanySegmentData | null {
  const sym = symbol.toUpperCase().trim()
  const filePath = path.join(SEGMENTS_DIR, `${sym}.json`)

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      return data as CompanySegmentData
    } catch (e) {
      console.error(`[CompanySegmentService] Lỗi đọc segment cho ${sym}:`, e)
    }
  }

  return null
}
