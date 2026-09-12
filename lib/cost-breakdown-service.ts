import { getFinancialStatements, type RawFinancialStatementData } from './financial-statements-db'

export interface CostBreakdownPoint {
  date: string
  displayDate: string
  quarterNum: number | null
  doanhThuThuan: number // Doanh thu thuần (tỷ đồng - Đường line)
  // 1. Số tiền chi phí (Tỷ đồng)
  giaVon: number // Giá vốn hàng bán (COGS)
  cpBanHang: number // Chi phí bán hàng
  cpQuanLy: number // Chi phí quản lý doanh nghiệp
  cpLaiVay: number // Chi phí lãi vay
  tongChiPhi: number // Tổng 4 chi phí
  // 2. Tỷ trọng trên Doanh thu thuần (%)
  pctGiaVon: number | null
  pctBanHang: number | null
  pctQuanLy: number | null
  pctLaiVay: number | null
}

export interface CostBreakdownPayload {
  symbol: string
  periodType: 'quarter' | 'annual'
  points: CostBreakdownPoint[]
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

export function buildCostBreakdownData(
  symbol: string,
  periodType: 'quarter' | 'annual',
  data: RawFinancialStatementData | null | undefined
): CostBreakdownPayload | null {
  if (!data || !data.fiscalDates || !data.kqkd) return null
  const dates = data.fiscalDates
  const kqkd = data.kqkd

  if (!Array.isArray(dates) || !Array.isArray(kqkd) || kqkd.length === 0) return null

  const findRow = (name: string) =>
    kqkd.find((r) => r[0] && String(r[0]).toLowerCase().trim() === name.toLowerCase().trim())

  const rowDT = findRow('Doanh thu thuần')
  const rowGV = findRow('Giá vốn hàng bán')
  const rowBH = findRow('Chi phí bán hàng')
  const rowQL = findRow('Chi phí quản lý doanh nghiệp')
  const rowLV = findRow('Chi phí lãi vay')

  if (!rowDT || !rowGV) return null

  const isQuarter = periodType === 'quarter'

  const points: CostBreakdownPoint[] = dates.map((d, i) => {
    const col = i + 3
    const dt = (rowDT ? Number(rowDT[col]) || 0 : 0) / 1e9
    const gv = Math.abs(rowGV ? Number(rowGV[col]) || 0 : 0) / 1e9
    const bh = Math.abs(rowBH ? Number(rowBH[col]) || 0 : 0) / 1e9
    const ql = Math.abs(rowQL ? Number(rowQL[col]) || 0 : 0) / 1e9
    const lv = Math.abs(rowLV ? Number(rowLV[col]) || 0 : 0) / 1e9
    const tong = gv + bh + ql + lv

    const qNum = isQuarter ? Math.ceil(parseInt(d.split('-')[1], 10) / 3) : null

    const round1 = (n: number) => Math.round(n * 10) / 10

    const pctGV = dt > 0 ? round1((gv / dt) * 100) : null
    const pctBH = dt > 0 ? round1((bh / dt) * 100) : null
    const pctQL = dt > 0 ? round1((ql / dt) * 100) : null
    const pctLV = dt > 0 ? round1((lv / dt) * 100) : null

    return {
      date: d,
      displayDate: fmtPeriod(d, isQuarter),
      quarterNum: qNum,
      doanhThuThuan: round1(dt),
      giaVon: round1(gv),
      cpBanHang: round1(bh),
      cpQuanLy: round1(ql),
      cpLaiVay: round1(lv),
      tongChiPhi: round1(tong),
      pctGiaVon: pctGV,
      pctBanHang: pctBH,
      pctQuanLy: pctQL,
      pctLaiVay: pctLV,
    }
  })

  return {
    symbol: symbol.toUpperCase().trim(),
    periodType,
    points,
  }
}

export async function getCostBreakdownData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter',
  rawStmt?: RawFinancialStatementData | null
): Promise<CostBreakdownPayload | null> {
  try {
    const stmt = rawStmt || (await getFinancialStatements(symbol, periodType))
    return buildCostBreakdownData(symbol, periodType, stmt)
  } catch (err) {
    console.error(`[CostBreakdownService] Lỗi xử lý chi phí cho ${symbol}:`, err)
    return null
  }
}
