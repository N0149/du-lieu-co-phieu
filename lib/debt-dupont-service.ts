import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface DebtDupontPoint {
  date: string
  displayDate: string
  quarterNum: number | null
  // 1. VAY VÀ NỢ THUÊ TÀI CHÍNH (Tỷ đồng)
  vayNganHan: number // Vay & nợ thuê TC ngắn hạn
  vayDaiHan: number // Vay & nợ thuê TC dài hạn
  traiPhieu: number // Trái phiếu chuyển đổi / phát hành
  thueTaiChinh: number // Thuê tài chính
  noDHKhac: number // Nợ dài hạn khác
  tongNoVay: number // Tổng nợ vay & thuê tài chính
  // 2. MÔ HÌNH PHÂN TÍCH DUPONT (ROE 3 nhân tố)
  roe: number // ROE (%) = LNST / VCSH * 100
  equityMultiplier: number // Đòn bẩy tài chính = Tổng tài sản / VCSH (lần)
  assetTurnover: number // Vòng quay tài sản = Doanh thu thuần / Tổng tài sản (lần)
  netMargin: number // Biên lợi nhuận ròng = LNST / Doanh thu thuần (%)
}

export interface DebtDupontPayload {
  symbol: string
  periodType: 'quarter' | 'annual'
  points: DebtDupontPoint[]
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
    console.error('[DebtDupontService] Lỗi kết nối DB:', err)
    return null
  }
}

function fmtPeriod(dateStr: string, isQuarter: boolean): string {
  if (!dateStr) return ''
  if (!isQuarter) return dateStr.slice(0, 4)
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const y = parts[0].slice(2)
  const m = parseInt(parts[1], 10)
  const q = Math.ceil(m / 3)
  return `Q${q}/${y}`
}

export function getDebtDupontData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter'
): DebtDupontPayload | null {
  try {
    const db = getFinancialStatementsDb()
    if (!db) return null

    const stmt = db.prepare(`
      SELECT fiscal_dates, cdkt, kqkd
      FROM financial_statements
      WHERE symbol = ? AND period_type = ?
    `)

    const row = stmt.get(symbol.toUpperCase().trim(), periodType) as
      | { fiscal_dates: string; cdkt: string; kqkd: string }
      | undefined

    if (!row || !row.fiscal_dates) return null

    const dates = JSON.parse(row.fiscal_dates) as string[]
    const cdkt = row.cdkt ? (JSON.parse(row.cdkt) as any[][]) : []
    const kqkd = row.kqkd ? (JSON.parse(row.kqkd) as any[][]) : []

    if (!Array.isArray(dates) || dates.length === 0) return null

    const findRow = (arr: any[][], names: string | string[]) => {
      const list = Array.isArray(names) ? names : [names]
      for (const n of list) {
        const target = n.toLowerCase().trim()
        const r = arr.find((x) => x[0] && String(x[0]).toLowerCase().trim() === target)
        if (r) return r
      }
      for (const n of list) {
        const target = n.toLowerCase().trim()
        const r = arr.find((x) => x[0] && String(x[0]).toLowerCase().trim().includes(target))
        if (r) return r
      }
      return null
    }

    // Các chỉ tiêu nợ vay
    const rVayNH = findRow(cdkt, ['Vay ngắn hạn', 'Vay và nợ thuê tài chính ngắn hạn'])
    const rVayDH = findRow(cdkt, ['Vay dài hạn', 'Vay và nợ thuê tài chính dài hạn'])
    const rTraiPhieu = findRow(cdkt, ['Trái phiếu chuyển đổi', 'Trái phiếu phát hành'])
    const rThueTC = findRow(cdkt, ['GTCL tài sản thuê tài chính'])
    const rNoDHKhac = findRow(cdkt, ['Phải trả dài hạn khác', 'Nợ dài hạn khác'])

    // Các chỉ tiêu mô hình DuPont
    const rTongTS = findRow(cdkt, ['TỔNG CỘNG TÀI SẢN', 'Tổng tài sản'])
    const rVCSH = findRow(cdkt, ['Vốn chủ sở hữu', 'VỐN CHỦ SỞ HỮU'])
    const rDoanhThu = findRow(kqkd, ['Doanh thu thuần', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', 'Doanh thu bán hàng và cung cấp dịch vụ'])
    const rLNST = findRow(kqkd, ['Lãi/(lỗ) thuần sau thuế', 'Lợi nhuận sau thuế của Cổ đông của Công ty mẹ', 'Lợi nhuận sau thuế thu nhập doanh nghiệp'])

    const isQuarter = periodType === 'quarter'
    const points: DebtDupontPoint[] = []

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const colIdx = i + 1

      const parseNum = (rowItem: any[] | undefined | null) => {
        if (!rowItem) return 0
        const val = rowItem[colIdx]
        if (val === null || val === undefined || isNaN(Number(val))) return 0
        return Number(val)
      }

      // Nợ vay (Tỷ đồng)
      const rawVayNH = parseNum(rVayNH)
      const vayNganHan = Math.round((Math.abs(rawVayNH) / 1e9) * 10) / 10

      const rawVayDH = parseNum(rVayDH)
      const vayDaiHan = Math.round((Math.abs(rawVayDH) / 1e9) * 10) / 10

      const rawTraiPhieu = parseNum(rTraiPhieu)
      const traiPhieu = Math.round((Math.abs(rawTraiPhieu) / 1e9) * 10) / 10

      const rawThueTC = parseNum(rThueTC)
      const thueTaiChinh = Math.round((Math.abs(rawThueTC) / 1e9) * 10) / 10

      const rawNoDHKhac = parseNum(rNoDHKhac)
      const noDHKhac = Math.round((Math.abs(rawNoDHKhac) / 1e9) * 10) / 10

      const tongNoVay = Math.round((vayNganHan + vayDaiHan + traiPhieu + thueTaiChinh) * 10) / 10

      // DuPont components
      const rawTongTS = parseNum(rTongTS)
      const rawVCSH = parseNum(rVCSH)
      const rawDT = parseNum(rDoanhThu)
      const rawLNST = parseNum(rLNST)

      // 1. Biên lợi nhuận ròng (%): LNST / DT * 100
      const netMargin = rawDT > 0 ? Math.round(((rawLNST / rawDT) * 100) * 10) / 10 : 0

      // 2. Vòng quay tài sản (lần): Doanh thu / Tổng tài sản
      const assetTurnover = rawTongTS > 0 ? Math.round((rawDT / rawTongTS) * 100) / 100 : 0

      // 3. Đòn bẩy tài chính (lần): Tổng tài sản / VCSH
      const equityMultiplier = rawVCSH > 0 ? Math.round((rawTongTS / rawVCSH) * 100) / 100 : 0

      // 4. ROE (%): LNST / VCSH * 100
      const roe = rawVCSH > 0 ? Math.round(((rawLNST / rawVCSH) * 100) * 10) / 10 : 0

      let quarterNum: number | null = null
      if (isQuarter) {
        const parts = date.split('-')
        if (parts.length >= 2) {
          quarterNum = Math.ceil(parseInt(parts[1], 10) / 3)
        }
      }

      points.push({
        date,
        displayDate: fmtPeriod(date, isQuarter),
        quarterNum,
        vayNganHan,
        vayDaiHan,
        traiPhieu,
        thueTaiChinh,
        noDHKhac,
        tongNoVay,
        roe,
        equityMultiplier,
        assetTurnover,
        netMargin,
      })
    }

    return {
      symbol: symbol.toUpperCase(),
      periodType,
      points,
    }
  } catch (err) {
    console.error(`[DebtDupontService] Lỗi trích xuất dữ liệu ${symbol} (${periodType}):`, err)
    return null
  }
}
