import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface CapexFinancialPoint {
  date: string
  displayDate: string
  quarterNum: number | null
  // 1. CAPEX VÀ KHẤU HAO (Tỷ đồng)
  capex: number // Tiền chi để mua sắm, xây dựng TSCĐ (dương)
  khauHao: number // Khấu hao TSCĐ (âm dưới 0 để vẽ cột cắm xuống hoặc đối sánh)
  khauHaoAbs: number // Giá trị tuyệt đối cho tooltip
  // 2. DỰ PHÒNG (Tỷ đồng - âm dưới 0)
  dpPhaiThuNH: number // Dự phòng nợ khó đòi (ngắn hạn)
  dpHangTonKho: number // Dự phòng giảm giá hàng tồn kho
  dpPhaiThuDH: number // Dự phòng phải thu dài hạn
  dpDauTuTC: number // Dự phòng giảm giá đầu tư dài hạn / đơn vị khác
  tongDuPhong: number // Tổng dự phòng trích lập
  // 3. DOANH THU & CHI PHÍ TÀI CHÍNH (Tỷ đồng)
  dtTaiChinh: number // Doanh thu hoạt động tài chính (Line)
  cpLaiVay: number // Chi phí lãi vay (Stacked Bar)
  cpTaiChinhKhac: number // Chi phí tài chính khác (Stacked Bar)
  tongCPTaiChinh: number // Tổng chi phí tài chính
}

export interface CapexFinancialPayload {
  symbol: string
  periodType: 'quarter' | 'annual'
  points: CapexFinancialPoint[]
}

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'financial_statements.db')

let dbInstance: DatabaseSync | null = null

function getFinancialStatementsDb(): DatabaseSync | null {
  if (dbInstance) return dbInstance
  try {
    const db = new DatabaseSync(DB_PATH)
    dbInstance = db
    return dbInstance
  } catch (err) {
    console.error('[CapexFinancialService] Lỗi kết nối DB:', err)
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

export function getCapexFinancialData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter'
): CapexFinancialPayload | null {
  try {
    const db = getFinancialStatementsDb()
    if (!db) return null

    const stmt = db.prepare(`
      SELECT fiscal_dates, cdkt, kqkd, lctt
      FROM financial_statements
      WHERE symbol = ? AND period_type = ?
    `)

    const row = stmt.get(symbol.toUpperCase().trim(), periodType) as
      | { fiscal_dates: string; cdkt: string; kqkd: string; lctt: string }
      | undefined

    if (!row || !row.fiscal_dates) return null

    const dates = JSON.parse(row.fiscal_dates) as string[]
    const cdkt = row.cdkt ? (JSON.parse(row.cdkt) as any[][]) : []
    const kqkd = row.kqkd ? (JSON.parse(row.kqkd) as any[][]) : []
    const lctt = row.lctt ? (JSON.parse(row.lctt) as any[][]) : []

    if (!Array.isArray(dates) || dates.length === 0) return null

    const findRow = (arr: any[][], name: string) =>
      arr.find((r) => r[0] && String(r[0]).toLowerCase().trim() === name.toLowerCase().trim())

    // 1. LCTT items: Capex & Khấu hao
    const rMuaSamTSCD =
      findRow(lctt, 'Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác') ||
      findRow(lctt, 'Tiền chi mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác')
    const rKhauHao = findRow(lctt, 'Khấu hao TSCĐ và BĐSĐT') || findRow(lctt, 'Khấu hao tài sản cố định')

    // 2. CDKT items: Dự phòng (ghi giảm tài sản - âm)
    const rDPNHT = findRow(cdkt, 'Dự phòng nợ khó đòi') || findRow(cdkt, 'Dự phòng phải thu ngắn hạn khó đòi')
    const rDPHTK = findRow(cdkt, 'Dự phòng giảm giá hàng tồn kho')
    const rDPDHT = findRow(cdkt, 'Dự phòng phải thu dài hạn')
    const rDPDTD = findRow(cdkt, 'Dự phòng giảm giá đầu tư dài hạn') || findRow(cdkt, 'Dự phòng tổn thất đầu tư vào đơn vị khác')

    // 3. KQKD items: Doanh thu & Chi phí tài chính
    const rDTHDTC = findRow(kqkd, 'Doanh thu hoạt động tài chính')
    const rCPTC = findRow(kqkd, 'Chi phí tài chính')
    const rCPLV = findRow(kqkd, 'Chi phí lãi vay')

    const isQuarter = periodType === 'quarter'
    const points: CapexFinancialPoint[] = []

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const colIdx = i + 1

      const parseNum = (rowItem: any[] | undefined) => {
        if (!rowItem) return 0
        const val = rowItem[colIdx]
        if (val === null || val === undefined || isNaN(Number(val))) return 0
        return Number(val)
      }

      // Capex & Khấu hao (Tỷ đồng)
      const rawMuaSam = parseNum(rMuaSamTSCD)
      const capex = Math.round((Math.abs(rawMuaSam) / 1e9) * 10) / 10

      const rawKhauHao = parseNum(rKhauHao)
      const khauHaoAbs = Math.round((Math.abs(rawKhauHao) / 1e9) * 10) / 10
      const khauHao = -khauHaoAbs // Biểu diễn âm dưới trục 0 như chuẩn WiData

      // Dự phòng (Tỷ đồng - âm dưới trục 0)
      const rawDPNHT = parseNum(rDPNHT)
      const dpPhaiThuNH = rawDPNHT !== 0 ? -Math.round((Math.abs(rawDPNHT) / 1e9) * 10) / 10 : 0

      const rawDPHTK = parseNum(rDPHTK)
      const dpHangTonKho = rawDPHTK !== 0 ? -Math.round((Math.abs(rawDPHTK) / 1e9) * 10) / 10 : 0

      const rawDPDHT = parseNum(rDPDHT)
      const dpPhaiThuDH = rawDPDHT !== 0 ? -Math.round((Math.abs(rawDPDHT) / 1e9) * 10) / 10 : 0

      const rawDPDTD = parseNum(rDPDTD)
      const dpDauTuTC = rawDPDTD !== 0 ? -Math.round((Math.abs(rawDPDTD) / 1e9) * 10) / 10 : 0

      const tongDuPhong = Math.round((dpPhaiThuNH + dpHangTonKho + dpPhaiThuDH + dpDauTuTC) * 10) / 10

      // Doanh thu & Chi phí tài chính (Tỷ đồng)
      const rawDTTC = parseNum(rDTHDTC)
      const dtTaiChinh = Math.round((Math.abs(rawDTTC) / 1e9) * 10) / 10

      const rawCPTC = parseNum(rCPTC)
      const tongCPTaiChinh = Math.round((Math.abs(rawCPTC) / 1e9) * 10) / 10

      const rawCPLV = parseNum(rCPLV)
      const cpLaiVay = Math.round((Math.abs(rawCPLV) / 1e9) * 10) / 10

      const cpTaiChinhKhac = Math.max(0, Math.round((tongCPTaiChinh - cpLaiVay) * 10) / 10)

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
        capex,
        khauHao,
        khauHaoAbs,
        dpPhaiThuNH,
        dpHangTonKho,
        dpPhaiThuDH,
        dpDauTuTC,
        tongDuPhong,
        dtTaiChinh,
        cpLaiVay,
        cpTaiChinhKhac,
        tongCPTaiChinh,
      })
    }

    return {
      symbol: symbol.toUpperCase(),
      periodType,
      points,
    }
  } catch (err) {
    console.error(`[CapexFinancialService] Lỗi trích xuất dữ liệu ${symbol} (${periodType}):`, err)
    return null
  }
}
