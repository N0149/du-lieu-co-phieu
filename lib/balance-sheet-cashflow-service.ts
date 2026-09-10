import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface DetailedBalanceSheetPoint {
  date: string
  displayDate: string
  quarterNum: number | null
  // 1. TÀI SẢN (Tỷ đồng)
  tien: number // Tiền và tương đương tiền
  dtnh: number // Đầu tư tài chính ngắn hạn
  pt: number // Các khoản phải thu
  tk: number // Hàng tồn kho
  tscd: number // Tài sản cố định
  dtdh: number // Đầu tư tài chính dài hạn
  tsKhac: number // Tài sản khác
  tongTS: number // Tổng cộng tài sản
  // 2. NGUỒN VỐN (Tỷ đồng)
  vcsh: number // Vốn chủ sở hữu
  nmtt: number // Người mua trả trước
  ptnb: number // Phải trả người bán
  vdh: number // Vay và thuê tài chính dài hạn
  vnh: number // Vay và thuê tài chính ngắn hạn
  nvKhac: number // Nguồn vốn khác
  tongNV: number // Tổng cộng nguồn vốn
  // 3. LƯU CHUYỂN TIỀN (Tỷ đồng)
  ocf: number // LCTT từ hoạt động kinh doanh
  icf: number // LCTT từ hoạt động đầu tư
  cff: number // LCTT từ hoạt động tài chính
  netCash: number // Lưu chuyển tiền thuần trong kỳ
}

export interface DetailedBalanceSheetPayload {
  symbol: string
  periodType: 'quarter' | 'annual'
  points: DetailedBalanceSheetPoint[]
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
    console.error('[BalanceSheetCashflowService] Lỗi kết nối DB:', err)
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

export function getDetailedBalanceSheetCashFlowData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter'
): DetailedBalanceSheetPayload | null {
  try {
    const db = getFinancialStatementsDb()
    if (!db) return null

    const stmt = db.prepare(`
      SELECT fiscal_dates, cdkt, lctt
      FROM financial_statements
      WHERE symbol = ? AND period_type = ?
    `)

    const row = stmt.get(symbol.toUpperCase().trim(), periodType) as
      | { fiscal_dates: string; cdkt: string; lctt: string }
      | undefined

    if (!row || !row.fiscal_dates || !row.cdkt) return null

    const dates = JSON.parse(row.fiscal_dates) as string[]
    const cdkt = JSON.parse(row.cdkt) as any[][]
    const lctt = row.lctt ? (JSON.parse(row.lctt) as any[][]) : []

    if (!Array.isArray(dates) || !Array.isArray(cdkt) || cdkt.length === 0) return null

    const findRow = (arr: any[][], name: string) =>
      arr.find((r) => r[0] && String(r[0]).toLowerCase().trim() === name.toLowerCase().trim())

    // Tài sản
    const rTien = findRow(cdkt, 'Tiền và tương đương tiền')
    const rDTNH = findRow(cdkt, 'Đầu tư ngắn hạn')
    const rPT = findRow(cdkt, 'Các khoản phải thu')
    const rTK = findRow(cdkt, 'Hàng tồn kho, ròng') || findRow(cdkt, 'Hàng tồn kho')
    const rTSCD = findRow(cdkt, 'Tài sản cố định')
    const rDTDH = findRow(cdkt, 'Đầu tư dài hạn')
    const rTongTS = findRow(cdkt, 'TỔNG CỘNG TÀI SẢN')

    // Nguồn vốn
    const rVayNH = findRow(cdkt, 'Vay ngắn hạn')
    const rVayDH = findRow(cdkt, 'Vay dài hạn')
    const rPTNB = findRow(cdkt, 'Phải trả người bán')
    const rNMTT = findRow(cdkt, 'Người mua trả tiền trước')
    const rVCSH = findRow(cdkt, 'Vốn chủ sở hữu')
    const rTongNV = findRow(cdkt, 'Tổng cộng nguồn vốn')

    // Lưu chuyển tiền
    const rOCF = findRow(lctt, 'Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh')
    const rICF = findRow(lctt, 'Lưu chuyển tiền thuần từ hoạt động đầu tư')
    const rCFF = findRow(lctt, 'Lưu chuyển tiền thuần từ hoạt động tài chính')
    const rNet = findRow(lctt, 'Lưu chuyển tiền thuần trong kỳ')

    const isQuarter = periodType === 'quarter'
    const toBillion = (val: any) => Math.round((Number(val) || 0) / 1e8) / 10

    const points: DetailedBalanceSheetPoint[] = dates.map((d, i) => {
      const col = i + 3
      const qNum = isQuarter ? Math.ceil(parseInt(d.split('-')[1], 10) / 3) : null

      // Tài sản
      const tien = toBillion(rTien ? rTien[col] : 0)
      const dtnh = toBillion(rDTNH ? rDTNH[col] : 0)
      const pt = toBillion(rPT ? rPT[col] : 0)
      const tk = toBillion(rTK ? rTK[col] : 0)
      const tscd = toBillion(rTSCD ? rTSCD[col] : 0)
      const dtdh = toBillion(rDTDH ? rDTDH[col] : 0)
      const tongTS = toBillion(rTongTS ? rTongTS[col] : 0)
      const tsKhac = Math.max(0, Math.round((tongTS - (tien + dtnh + pt + tk + tscd + dtdh)) * 10) / 10)

      // Nguồn vốn
      const vnh = toBillion(rVayNH ? rVayNH[col] : 0)
      const vdh = toBillion(rVayDH ? rVayDH[col] : 0)
      const ptnb = toBillion(rPTNB ? rPTNB[col] : 0)
      const nmtt = toBillion(rNMTT ? rNMTT[col] : 0)
      const vcsh = toBillion(rVCSH ? rVCSH[col] : 0)
      const tongNV = toBillion(rTongNV ? rTongNV[col] : 0)
      const nvKhac = Math.max(0, Math.round((tongNV - (vnh + vdh + ptnb + nmtt + vcsh)) * 10) / 10)

      // Lưu chuyển tiền
      const ocf = toBillion(rOCF ? rOCF[col] : 0)
      const icf = toBillion(rICF ? rICF[col] : 0)
      const cff = toBillion(rCFF ? rCFF[col] : 0)
      const netCash = toBillion(rNet ? rNet[col] : 0)

      return {
        date: d,
        displayDate: fmtPeriod(d, isQuarter),
        quarterNum: qNum,
        tien,
        dtnh,
        pt,
        tk,
        tscd,
        dtdh,
        tsKhac,
        tongTS,
        vcsh,
        nmtt,
        ptnb,
        vdh,
        vnh,
        nvKhac,
        tongNV,
        ocf,
        icf,
        cff,
        netCash,
      }
    })

    return {
      symbol: symbol.toUpperCase().trim(),
      periodType,
      points,
    }
  } catch (err) {
    console.error(`[BalanceSheetCashflowService] Lỗi xử lý cho ${symbol}:`, err)
    return null
  }
}
