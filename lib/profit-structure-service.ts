import { getFinancialStatements, type RawFinancialStatementData } from './financial-statements-db'

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

export function buildProfitStructureData(
  symbol: string,
  periodType: 'quarter' | 'annual',
  data: RawFinancialStatementData | null | undefined
): ProfitStructurePayload | null {
  if (!data || !data.fiscalDates || !data.kqkd) return null
  const dates = data.fiscalDates
  const kqkd = data.kqkd

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
    const col = i + 3

    const lnGop = (rowLNGop ? Number(rowLNGop[col]) || 0 : 0) / 1e9
    const cpBH = (rowCPBH ? Number(rowCPBH[col]) || 0 : 0) / 1e9
    const cpQL = (rowCPQL ? Number(rowCPQL[col]) || 0 : 0) / 1e9
    const dtTC = (rowDTTC ? Number(rowDTTC[col]) || 0 : 0) / 1e9
    const cpTC = (rowCPTC ? Number(rowCPTC[col]) || 0 : 0) / 1e9

    const valLDLK1 = rowLDLK ? Number(rowLDLK[col]) || 0 : 0
    const valLDLK2 = rowLDLK2015 ? Number(rowLDLK2015[col]) || 0 : 0
    const ldlk = (valLDLK2 !== 0 ? valLDLK2 : valLDLK1) / 1e9

    const lnKhac = (rowLNKhac ? Number(rowLNKhac[col]) || 0 : 0) / 1e9
    const lntt = (rowLNTT ? Number(rowLNTT[col]) || 0 : 0) / 1e9

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
}

export async function getProfitStructureData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter',
  rawStmt?: RawFinancialStatementData | null
): Promise<ProfitStructurePayload | null> {
  try {
    const stmt = rawStmt || (await getFinancialStatements(symbol, periodType))
    return buildProfitStructureData(symbol, periodType, stmt)
  } catch (err) {
    console.error(`[ProfitStructureService] Lỗi xử lý cho ${symbol}:`, err)
    return null
  }
}
