import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface ProfitStructurePoint {
  date: string
  displayDate: string
  lnKDChinh: number // Lợi nhuận thuần từ HĐKD chính (tỷ đồng)
  lnTaiChinh: number // Lợi nhuận tài chính (tỷ đồng)
  lnLDLK: number // Lãi lỗ từ công ty LDLK (tỷ đồng)
  lnKhac: number // Lợi nhuận khác (*) (tỷ đồng)
  lntt: number // Lợi nhuận trước thuế (tỷ đồng - Đường line)
}

export interface ProfitStructurePayload {
  symbol: string
  periodType: 'quarter' | 'annual'
  points: ProfitStructurePoint[]
}

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'financial_statements.db')

let dbInstance: DatabaseSync | null = null

function getFinancialStatementsDb(): DatabaseSync | null {
  if (dbInstance) return dbInstance
  if (!fs.existsSync(DB_PATH)) return null
  try {
    const db = new DatabaseSync(DB_PATH, { readOnly: true })
    dbInstance = db
    return dbInstance
  } catch (err) {
    console.error('[ProfitStructureService] Lỗi kết nối financial_statements.db:', err)
    return null
  }
}

function fmtPeriod(dateStr: string, isQuarter: boolean): string {
  if (!dateStr) return ''
  if (!isQuarter) {
    return dateStr.slice(0, 4)
  }
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const y = parts[0].slice(2)
  const m = parseInt(parts[1], 10)
  const q = Math.ceil(m / 3)
  return `Q${q}/${y}`
}

export function getProfitStructureData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter'
): ProfitStructurePayload | null {
  try {
    const db = getFinancialStatementsDb()
    if (!db) return null

    const stmt = db.prepare(`
      SELECT fiscal_dates, kqkd
      FROM financial_statements
      WHERE symbol = ? AND period_type = ?
    `)

    const row = stmt.get(symbol.toUpperCase().trim(), periodType) as
      | { fiscal_dates: string; kqkd: string }
      | undefined

    if (!row || !row.fiscal_dates || !row.kqkd) return null

    const dates = JSON.parse(row.fiscal_dates) as string[]
    const kqkd = JSON.parse(row.kqkd) as any[][]

    if (!Array.isArray(dates) || !Array.isArray(kqkd) || kqkd.length === 0) return null

    const findRow = (name: string) =>
      kqkd.find((r) => r[0] && String(r[0]).toLowerCase().trim() === name.toLowerCase().trim())

    const rowLNGop = findRow('Lợi nhuận gộp')
    const rowCPBH = findRow('Chi phí bán hàng')
    const rowCPQL = findRow('Chi phí quản lý doanh nghiệp')
    const rowDTTC = findRow('Doanh thu hoạt động tài chính')
    const rowCPTC = findRow('Chi phí tài chính')
    const rowLDLK2015 = findRow('Lãi/(lỗ) từ công ty liên doanh (từ năm 2015)')
    const rowLDLK = findRow('Lãi/(lỗ) từ công ty liên doanh') || rowLDLK2015
    const rowLNKhac = findRow('Thu nhập khác, ròng')
    const rowLNTT = findRow('Lãi/(lỗ) trước thuế')

    if (!rowLNTT) return null

    const isQuarter = periodType === 'quarter'

    const points: ProfitStructurePoint[] = dates.map((d, i) => {
      // Mapping: dates[i] corresponds to row[i + 3]
      const col = i + 3

      const lnGop = (rowLNGop ? Number(rowLNGop[col]) || 0 : 0) / 1e9
      const cpBH = (rowCPBH ? Number(rowCPBH[col]) || 0 : 0) / 1e9
      const cpQL = (rowCPQL ? Number(rowCPQL[col]) || 0 : 0) / 1e9
      const dtTC = (rowDTTC ? Number(rowDTTC[col]) || 0 : 0) / 1e9
      const cpTC = (rowCPTC ? Number(rowCPTC[col]) || 0 : 0) / 1e9

      // Lãi liên doanh liên kết có thể nằm ở dòng 14 hoặc dòng 24
      const valLDLK1 = rowLDLK ? Number(rowLDLK[col]) || 0 : 0
      const valLDLK2 = rowLDLK2015 ? Number(rowLDLK2015[col]) || 0 : 0
      const ldlk = (valLDLK2 !== 0 ? valLDLK2 : valLDLK1) / 1e9

      const lnKhac = (rowLNKhac ? Number(rowLNKhac[col]) || 0 : 0) / 1e9
      const lntt = (rowLNTT ? Number(rowLNTT[col]) || 0 : 0) / 1e9

      // Trong BCTC, Chi phí bán hàng và Chi phí QLDN lưu dạng số âm
      const lnKDChinh = lnGop + cpBH + cpQL
      const lnTaiChinh = dtTC + cpTC

      return {
        date: d,
        displayDate: fmtPeriod(d, isQuarter),
        lnKDChinh: Math.round(lnKDChinh * 10) / 10,
        lnTaiChinh: Math.round(lnTaiChinh * 10) / 10,
        lnLDLK: Math.round(ldlk * 10) / 10,
        lnKhac: Math.round(lnKhac * 10) / 10,
        lntt: Math.round(lntt * 10) / 10,
      }
    })

    return {
      symbol: symbol.toUpperCase().trim(),
      periodType,
      points,
    }
  } catch (err) {
    console.error(`[ProfitStructureService] Lỗi xử lý cho ${symbol}:`, err)
    return null
  }
}
