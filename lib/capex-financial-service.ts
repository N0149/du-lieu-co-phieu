import { getFinancialStatements, type RawFinancialStatementData } from './financial-statements-db'

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

export function buildCapexFinancialData(
  symbol: string,
  periodType: 'quarter' | 'annual',
  data: RawFinancialStatementData | null | undefined
): CapexFinancialPayload | null {
  if (!data || !data.fiscalDates) return null
  const dates = data.fiscalDates
  const cdkt = data.cdkt || []
  const kqkd = data.kqkd || []
  const lctt = data.lctt || []

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
    // Kiểm tra colIdx: nếu mảng có header (tên cột ở đầu) thì thường là i + 3 hoặc i + 1
    // Giữ nguyên logic an toàn phát hiện index
    const parseNum = (rowItem: any[] | undefined) => {
      if (!rowItem) return 0
      // Thử cả i + 3 và i + 1 nếu i + 1 không phải số
      let val = rowItem[i + 3]
      if (val === undefined || isNaN(Number(val))) {
        val = rowItem[i + 1]
      }
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
}

export async function getCapexFinancialData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter',
  rawStmt?: RawFinancialStatementData | null
): Promise<CapexFinancialPayload | null> {
  try {
    const stmt = rawStmt || (await getFinancialStatements(symbol, periodType))
    return buildCapexFinancialData(symbol, periodType, stmt)
  } catch (err) {
    console.error(`[CapexFinancialService] Lỗi trích xuất dữ liệu ${symbol} (${periodType}):`, err)
    return null
  }
}
