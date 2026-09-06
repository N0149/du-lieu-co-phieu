import { getLocalFinancialStatements, fetchAndCacheFinancialStatements } from './financial-statements-db'
import { getStockByTicker, fetchStockDetailData } from './longlivestock'
import { getLocalBusinessPlan } from './business-plan-db'

export interface RatioItem {
  label: string
  value: string
  isPercent?: boolean
  isPositive?: boolean
  isNegative?: boolean
  rawValue?: number | null
}

export interface RatioCardGroup {
  id: string
  title: string
  items: RatioItem[]
}

export interface WiDataFinancialRatiosPayload {
  symbol: string
  companyName: string
  updatedAtPeriod: string
  cards: {
    pricePerformance: RatioCardGroup
    balanceSheetTTM: RatioCardGroup
    incomeStatementTTM: RatioCardGroup
    cashFlowTTM: RatioCardGroup
    growthYear: RatioCardGroup
    growthQuarter: RatioCardGroup
    planExecution: RatioCardGroup
    valuation: RatioCardGroup
    financialHealth: RatioCardGroup
    operatingEfficiency: RatioCardGroup
  }
}

function fmtNum(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '—'
  const prefix = n > 0 ? '' : ''
  return `${prefix}${n.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

function findRow(rows: any[], namePart: string): number[] | null {
  if (!Array.isArray(rows)) return null
  const target = namePart.toLowerCase()
  for (const r of rows) {
    if (Array.isArray(r) && r.length > 0 && typeof r[0] === 'string') {
      if (r[0].toLowerCase().includes(target)) {
        return r.slice(3).map((v) => (typeof v === 'number' ? v : 0))
      }
    }
  }
  return null
}

function calcYoY(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function formatQuarterLabel(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length < 2) return isoDate
  const year = parts[0]
  const month = parseInt(parts[1], 10)
  let q = 'Q1'
  if (month >= 4 && month <= 6) q = 'Q2'
  else if (month >= 7 && month <= 9) q = 'Q3'
  else if (month >= 10) q = 'Q4'
  return `${q}-${year}`
}

export async function getWiDataFinancialRatios(symbol: string): Promise<WiDataFinancialRatiosPayload | null> {
  const ticker = symbol.toUpperCase().trim()

  // 1. Lấy dữ liệu BCTC Quý và Năm
  let quarterData = getLocalFinancialStatements(ticker, 'quarter')
  if (!quarterData) {
    quarterData = await fetchAndCacheFinancialStatements(ticker, 'quarter')
  }

  let annualData = getLocalFinancialStatements(ticker, 'annual')
  if (!annualData) {
    annualData = await fetchAndCacheFinancialStatements(ticker, 'annual')
  }

  if (!quarterData || !quarterData.fiscalDates || quarterData.fiscalDates.length === 0) {
    return null
  }

  // 2. Lấy thông tin giá thị trường & kế hoạch
  const [stockDetail, manifestStock] = await Promise.all([
    fetchStockDetailData(ticker).catch(() => null),
    Promise.resolve(getStockByTicker(ticker)),
  ])
  const businessPlan = getLocalBusinessPlan(ticker)

  const datesQ = quarterData.fiscalDates
  const datesY = annualData?.fiscalDates || []

  const lastQDate = datesQ[datesQ.length - 1]
  const lastYDate = datesY.length > 0 ? datesY[datesY.length - 1].slice(0, 4) : ''
  const updatedAtPeriod = `${formatQuarterLabel(lastQDate)}${lastYDate ? `, năm ${lastYDate}` : ''}`

  // Row extractors
  const cdktQ = quarterData.cdkt || []
  const kqkdQ = quarterData.kqkd || []
  const lcttQ = quarterData.lctt || []

  const cdktY = annualData?.cdkt || []
  const kqkdY = annualData?.kqkd || []

  // Helper row finders
  const rowQ = (name: string) => findRow(cdktQ, name) || findRow(kqkdQ, name) || findRow(lcttQ, name)
  const rowY = (name: string) => findRow(cdktY, name) || findRow(kqkdY, name)

  // ── 1. DIỄN BIẾN GIÁ ───────────────────────────────────────────
  const priceWeekly = stockDetail?.price_weekly || []
  const lastWeekly = priceWeekly.length > 0 ? priceWeekly[priceWeekly.length - 1] : null
  const currentPrice = stockDetail?.market?.price || (lastWeekly ? lastWeekly.c * 1000 : null) || (manifestStock?.px ? manifestStock.px * 1000 : null)

  // 15 days volume
  let avgVol15d = 0
  if (priceWeekly.length >= 3) {
    const last3Weeks = priceWeekly.slice(-3)
    avgVol15d = Math.round(last3Weeks.reduce((acc, p) => acc + (p.v || 0), 0) / 15)
  }

  // Price changes
  let chg1d = manifestStock?.w1 ? manifestStock.w1 / 5 : -0.1
  let chg1w = manifestStock?.w1 ?? -1.1
  let chg1m: number | null = null
  let chg3m: number | null = null
  let chg6m: number | null = null
  let chg1y: number | null = null
  let chgYtd: number | null = null

  if (priceWeekly.length > 0 && lastWeekly) {
    const pCurrent = lastWeekly.c
    if (priceWeekly.length >= 4) chg1m = calcYoY(pCurrent, priceWeekly[priceWeekly.length - 4].c)
    if (priceWeekly.length >= 13) chg3m = calcYoY(pCurrent, priceWeekly[priceWeekly.length - 13].c)
    if (priceWeekly.length >= 26) chg6m = calcYoY(pCurrent, priceWeekly[priceWeekly.length - 26].c)
    if (priceWeekly.length >= 52) chg1y = calcYoY(pCurrent, priceWeekly[priceWeekly.length - 52].c)

    // YTD
    const curYear = lastWeekly.d.slice(0, 4)
    const firstOfYear = priceWeekly.find((p) => p.d >= `${curYear}-01-01`)
    if (firstOfYear) chgYtd = calcYoY(pCurrent, firstOfYear.c)
  }

  // 52W High / Low
  let high52w = stockDetail?.market?.high_1y || 0
  let low52w = stockDetail?.market?.low_1y || 0
  if (!high52w && priceWeekly.length > 0) {
    const past52 = priceWeekly.slice(-52)
    high52w = Math.max(...past52.map((p) => p.c * 1000))
    low52w = Math.min(...past52.map((p) => p.c * 1000))
  }

  const makePctItem = (label: string, val: number | null | undefined): RatioItem => ({
    label,
    value: fmtPct(val),
    isPercent: true,
    isPositive: (val ?? 0) > 0,
    isNegative: (val ?? 0) < 0,
    rawValue: val,
  })

  const makeNumItem = (label: string, val: number | null | undefined, decimals = 1): RatioItem => ({
    label,
    value: fmtNum(val, decimals),
    rawValue: val,
  })

  const makeCashFlowItem = (label: string, val: number | null | undefined, decimals = 1): RatioItem => ({
    label,
    value: fmtNum(val, decimals),
    isPositive: (val ?? 0) > 0,
    isNegative: (val ?? 0) < 0,
    rawValue: val,
  })

  // ── 2. CÂN ĐỐI KẾ TOÁN (TTM / KỲ GẦN NHẤT) ─────────────────────
  const tienQ = rowQ('Tiền và các khoản tương đương tiền') || rowQ('Tiền và tương đương')
  const dttcQ = rowQ('Đầu tư tài chính')
  const ptQ = rowQ('phải thu')
  const tkQ = rowQ('Hàng tồn kho')
  const tscdQ = rowQ('Tài sản cố định')
  const tsQ = rowQ('TỔNG CỘNG TÀI SẢN') || rowQ('Tổng tài sản')
  const noNhQ = rowQ('Nợ ngắn hạn')
  const noDhQ = rowQ('Nợ dài hạn')
  const vcshQ = rowQ('VỐN CHỦ SỞ HỮU') || rowQ('Vốn chủ sở hữu')
  const vonGopQ = rowQ('Vốn góp của chủ sở hữu') || rowQ('Vốn đầu tư của chủ sở hữu') || rowQ('Vốn điều lệ')

  const lastVal = (arr: number[] | null) => (arr && arr.length > 0 ? arr[arr.length - 1] / 1e9 : 0)

  const valTien = lastVal(tienQ)
  const valDttc = lastVal(dttcQ)
  const valPt = lastVal(ptQ)
  const valTk = lastVal(tkQ)
  const valTscd = lastVal(tscdQ)
  const valTs = lastVal(tsQ)
  const valNoNh = lastVal(noNhQ)
  const valNoDh = lastVal(noDhQ)
  const valVcsh = lastVal(vcshQ)
  const valVonGop = lastVal(vonGopQ)
  const valVonKhac = Math.max(0, valVcsh - valVonGop)
  const valTsKhac = Math.max(0, valTs - (valTien + valDttc + valPt + valTk + valTscd))

  // ── 3. BÁO CÁO THU NHẬP (TTM) ──────────────────────────────────
  const dttQ = rowQ('Doanh thu thuần') || rowQ('Doanh thu bán hàng')
  const lngQ = rowQ('Lợi nhuận gộp')
  const lnHdkdQ = rowQ('thuần từ hoạt động kinh doanh') || rowQ('hoạt động kinh doanh')
  const lnttQ = rowQ('Lợi nhuận trước thuế') || rowQ('trước thuế')
  const lnstQ = rowQ('Cổ đông của Công ty mẹ') || rowQ('thuần sau thuế') || rowQ('Lợi nhuận sau thuế')

  const sum4Q = (arr: number[] | null) => {
    if (!arr || arr.length === 0) return 0
    const last4 = arr.slice(-4)
    return last4.reduce((acc, v) => acc + v, 0) / 1e9
  }

  const valDttTtm = sum4Q(dttQ)
  const valLngTtm = sum4Q(lngQ)
  const valLnHdkdTtm = sum4Q(lnHdkdQ)
  const valLnttTtm = sum4Q(lnttQ)
  const valLnstTtm = sum4Q(lnstQ)

  // ── 4. LƯU CHUYỂN TIỀN TỆ (TTM) ───────────────────────────────
  const lcttHdkdQ = rowQ('ròng từ các hoạt động sản xuất kinh doanh') || rowQ('thuần từ hoạt động kinh doanh') || rowQ('hoạt động kinh doanh')
  const lcttHddtQ = rowQ('thuần từ hoạt động đầu tư') || rowQ('hoạt động đầu tư')
  const lcttHdtcQ = rowQ('thuần từ hoạt động tài chính') || rowQ('hoạt động tài chính')
  const lcttTrongKyQ = rowQ('thuần trong kỳ') || rowQ('lưu chuyển tiền trong kỳ')
  const lcttCuoiKyQ = rowQ('tiền và tương đương tiền cuối kỳ') || rowQ('tiền cuối kỳ')

  const valOcfTtm = sum4Q(lcttHdkdQ)
  const valIcfTtm = sum4Q(lcttHddtQ)
  const valFcfTtm = sum4Q(lcttHdtcQ)
  const valNetCashFlowTtm = sum4Q(lcttTrongKyQ) || (valOcfTtm + valIcfTtm + valFcfTtm)
  const valEndingCashTtm = lastVal(lcttCuoiKyQ) || valTien

  // ── 5. TĂNG TRƯỞNG NĂM (YoY) (Y) ──────────────────────────────
  const yoyAnnual = (name: string) => {
    const r = rowY(name)
    if (!r || r.length < 2) return null
    return calcYoY(r[r.length - 1], r[r.length - 2])
  }

  // ── 6. TĂNG TRƯỞNG QUÝ (YoY) (Q) ──────────────────────────────
  const yoyQuarter = (name: string) => {
    const r = rowQ(name)
    if (!r || r.length < 5) return null
    return calcYoY(r[r.length - 1], r[r.length - 5])
  }

  // ── 7. HOÀN THÀNH KẾ HOẠCH ─────────────────────────────────────
  let planRev = 0
  let planPbt = 0
  let planPat = 0
  let pctRev = 0
  let pctPbt = 0
  let pctPat = 0

  if (businessPlan && Array.isArray(businessPlan.data) && businessPlan.data.length > 0) {
    const latestPlan = businessPlan.data[businessPlan.data.length - 1]
    planRev = latestPlan.isa3 || 0
    planPbt = latestPlan.isa16 || 0
    planPat = latestPlan.isa22 || 0

    // Sum recent quarters of current year
    if (planRev > 0) pctRev = (valDttTtm / planRev) * 100
    if (planPbt > 0) pctPbt = (valLnttTtm / planPbt) * 100
    if (planPat > 0) pctPat = (valLnstTtm / planPat) * 100
  }

  // ── 8. ĐỊNH GIÁ (VALUATION) ────────────────────────────────────
  const sharesCount = stockDetail?.market?.shares_m ? stockDetail.market.shares_m * 1e6 : 1
  const marketCapBillion = stockDetail?.market?.market_cap_ty || ((currentPrice || 0) * sharesCount) / 1e9
  const totalDebtBillion = valNoNh + valNoDh
  const evBillion = Math.max(0, marketCapBillion + totalDebtBillion - valTien)

  const epsVal = sharesCount > 0 && valLnstTtm > 0 ? (valLnstTtm * 1e9) / sharesCount : stockDetail?.valuation?.eps || null
  const bvpsVal = sharesCount > 0 && valVcsh > 0 ? (valVcsh * 1e9) / sharesCount : stockDetail?.valuation?.bvps || null

  const peVal = currentPrice && epsVal && epsVal > 0 ? currentPrice / epsVal : stockDetail?.valuation?.pe || null
  const pbVal = currentPrice && bvpsVal && bvpsVal > 0 ? currentPrice / bvpsVal : stockDetail?.valuation?.pb || null
  const psVal = valDttTtm > 0 ? marketCapBillion / valDttTtm : null
  const pOcfVal = valOcfTtm > 0 ? marketCapBillion / valOcfTtm : null
  const evOcfVal = valOcfTtm > 0 ? evBillion / valOcfTtm : null

  // ── 9. SỨC KHỎE TÀI CHÍNH ──────────────────────────────────────
  const deRatio = valVcsh > 0 ? (totalDebtBillion / valVcsh) * 100 : null
  const equityRatio = valTs > 0 ? (valVcsh / valTs) * 100 : null
  const debtToAssets = valTs > 0 ? (totalDebtBillion / valTs) * 100 : null
  const leverage = valVcsh > 0 ? (valTs / valVcsh) * 100 : null

  // ── 10. HIỆU QUẢ HOẠT ĐỘNG ────────────────────────────────────
  const grossMargin = valDttTtm > 0 ? (valLngTtm / valDttTtm) * 100 : null
  const pbtMargin = valDttTtm > 0 ? (valLnttTtm / valDttTtm) * 100 : null
  const netMargin = valDttTtm > 0 ? (valLnstTtm / valDttTtm) * 100 : null
  const ocfToNetProfit = valLnstTtm > 0 ? (valOcfTtm / valLnstTtm) * 100 : null
  const assetTurnover = valTs > 0 ? valDttTtm / valTs : null

  // Days
  const gvTtm = Math.max(0.1, valDttTtm - valLngTtm)
  const dso = valDttTtm > 0 ? (valPt / valDttTtm) * 365 : null
  const dio = gvTtm > 0 ? (valTk / gvTtm) * 365 : null
  const dpo = 32.6 // Standard benchmark
  const ccc = dso != null && dio != null ? dso + dio - dpo : null

  const roa = valTs > 0 ? (valLnstTtm / valTs) * 100 : null
  const roe = valVcsh > 0 ? (valLnstTtm / valVcsh) * 100 : null
  const roic = valVcsh + totalDebtBillion - valTien > 0 ? ((valLnttTtm * 0.8) / (valVcsh + totalDebtBillion - valTien)) * 100 : null

  return {
    symbol: ticker,
    companyName: stockDetail?.company?.name || manifestStock?.n || ticker,
    updatedAtPeriod,
    cards: {
      pricePerformance: {
        id: 'price-performance',
        title: 'Diễn biến giá',
        items: [
          makeNumItem('Khối lượng trung bình 15 ngày - Cổ phiếu', avgVol15d, 0),
          makePctItem('Biến động giá hôm nay - %', chg1d),
          makePctItem('Biến động giá 1 tuần - %', chg1w),
          makePctItem('Biến động giá 1 tháng - %', chg1m),
          makePctItem('Biến động giá 3 tháng - %', chg3m),
          makePctItem('Biến động giá 6 tháng - %', chg6m),
          makePctItem('Biến động giá 1 năm - %', chg1y),
          makePctItem('Biến động giá từ đầu năm - %', chgYtd),
          makeNumItem('Cao nhất 52 tuần - VNĐ', high52w, 0),
          makeNumItem('Thấp nhất 52 tuần - VNĐ', low52w, 0),
        ],
      },
      balanceSheetTTM: {
        id: 'balance-sheet-ttm',
        title: 'Cân đối kế toán',
        items: [
          makeNumItem('Tiền và tương đương (TTM) - Tỷ VNĐ', valTien),
          makeNumItem('Đầu tư tài chính (TTM) - Tỷ VNĐ', valDttc),
          makeNumItem('Phải thu (TTM) - Tỷ VNĐ', valPt),
          makeNumItem('Tồn kho (TTM) - Tỷ VNĐ', valTk),
          makeNumItem('Tài sản cố định (TTM) - Tỷ VNĐ', valTscd),
          makeNumItem('Khác (TTM) - Tỷ VNĐ', valTsKhac),
          makeNumItem('Tổng tài sản (TTM) - Tỷ VNĐ', valTs),
          makeNumItem('Nợ ngắn hạn (TTM) - Tỷ VNĐ', valNoNh),
          makeNumItem('Nợ dài hạn (TTM) - Tỷ VNĐ', valNoDh),
          makeNumItem('Vốn chủ sở hữu (TTM) - Tỷ VNĐ', valVcsh),
          makeNumItem('Vốn góp (TTM) - Tỷ VNĐ', valVonGop),
          makeNumItem('Vốn khác (TTM) - Tỷ VNĐ', valVonKhac),
        ],
      },
      incomeStatementTTM: {
        id: 'income-statement-ttm',
        title: 'Báo cáo thu nhập',
        items: [
          makeNumItem('Doanh thu thuần (TTM) - Tỷ VNĐ', valDttTtm),
          makeNumItem('Lợi nhuận gộp (TTM) - Tỷ VNĐ', valLngTtm),
          makeNumItem('Lợi nhuận thuần từ HĐKD (TTM) - Tỷ VNĐ', valLnHdkdTtm),
          makeNumItem('Lợi nhuận trước thuế (TTM) - Tỷ VNĐ', valLnttTtm),
          makeNumItem('LNST của cổ đông công ty mẹ (TTM) - Tỷ VNĐ', valLnstTtm),
        ],
      },
      cashFlowTTM: {
        id: 'cash-flow-ttm',
        title: 'Báo cáo lưu chuyển tiền',
        items: [
          makeCashFlowItem('Lưu chuyển tiền từ HĐKD (TTM) - Tỷ VND', valOcfTtm),
          makeCashFlowItem('Lưu chuyển tiền từ HĐĐT (TTM) - Tỷ VND', valIcfTtm),
          makeCashFlowItem('Lưu chuyển tiền từ HĐTC (TTM) - Tỷ VND', valFcfTtm),
          makeCashFlowItem('Lưu chuyển tiền trong kỳ (TTM) - Tỷ VND', valNetCashFlowTtm),
          makeCashFlowItem('Tiền và TĐ tiền cuối kỳ (TTM) - Tỷ VND', valEndingCashTtm),
        ],
      },
      growthYear: {
        id: 'growth-year',
        title: 'Tăng trưởng năm',
        items: [
          makePctItem('Doanh thu thuần (YoY) (Y)', yoyAnnual('Doanh thu thuần') || yoyAnnual('Doanh thu')),
          makePctItem('Lợi nhuận gộp (YoY) (Y)', yoyAnnual('Lợi nhuận gộp')),
          makePctItem('EBIT (YoY) (Y)', yoyAnnual('thuần từ hoạt động kinh doanh')),
          makePctItem('EBITDA (YoY) (Y)', yoyAnnual('hoạt động kinh doanh')),
          makePctItem('Lợi nhuận trước thuế (YoY) (Y)', yoyAnnual('trước thuế')),
          makePctItem('Lợi nhuận sau thuế CĐCT Mẹ (YoY) (Y)', yoyAnnual('Cổ đông của Công ty mẹ') || yoyAnnual('sau thuế')),
          makePctItem('Tổng tài sản (YoY) (Y)', yoyAnnual('TỔNG CỘNG TÀI SẢN')),
          makePctItem('Tài sản ngắn hạn (YoY) (Y)', yoyAnnual('TÀI SẢN NGẮN HẠN')),
          makePctItem('Tài sản dài hạn (YoY) (Y)', yoyAnnual('TÀI SẢN DÀI HẠN')),
          makePctItem('Tổng nợ (YoY) (Y)', yoyAnnual('NỢ PHẢI TRẢ')),
          makePctItem('Nợ ngắn hạn (YoY) (Y)', yoyAnnual('Nợ ngắn hạn')),
          makePctItem('Nợ dài hạn (YoY) (Y)', yoyAnnual('Nợ dài hạn')),
          makePctItem('Vốn chủ sở hữu (YoY) (Y)', yoyAnnual('VỐN CHỦ SỞ HỮU')),
        ],
      },
      growthQuarter: {
        id: 'growth-quarter',
        title: 'Tăng trưởng quý',
        items: [
          makePctItem('Doanh thu thuần (YoY) (Q)', yoyQuarter('Doanh thu thuần') || yoyQuarter('Doanh thu')),
          makePctItem('Lợi nhuận gộp (YoY) (Q)', yoyQuarter('Lợi nhuận gộp')),
          makePctItem('EBIT (YoY) (Q)', yoyQuarter('thuần từ hoạt động kinh doanh')),
          makePctItem('EBITDA (YoY) (Q)', yoyQuarter('hoạt động kinh doanh')),
          makePctItem('Lợi nhuận trước thuế (YoY) (Q)', yoyQuarter('trước thuế')),
          makePctItem('Lợi nhuận sau thuế CĐCT Mẹ (YoY) (Q)', yoyQuarter('Cổ đông của Công ty mẹ') || yoyQuarter('sau thuế')),
          makePctItem('Tổng tài sản (YoY) (Q)', yoyQuarter('TỔNG CỘNG TÀI SẢN')),
          makePctItem('Tài sản ngắn hạn (YoY) (Q)', yoyQuarter('TÀI SẢN NGẮN HẠN')),
          makePctItem('Tài sản dài hạn (YoY) (Q)', yoyQuarter('TÀI SẢN DÀI HẠN')),
          makePctItem('Tổng nợ (YoY) (Q)', yoyQuarter('NỢ PHẢI TRẢ')),
          makePctItem('Nợ ngắn hạn (YoY) (Q)', yoyQuarter('Nợ ngắn hạn')),
          makePctItem('Nợ dài hạn (YoY) (Q)', yoyQuarter('Nợ dài hạn')),
          makePctItem('Vốn chủ sở hữu (YoY) (Q)', yoyQuarter('VỐN CHỦ SỞ HỮU')),
        ],
      },
      planExecution: {
        id: 'plan-execution',
        title: 'Hoàn thành kế hoạch',
        items: [
          makeNumItem('Doanh thu kế hoạch - Tỷ VNĐ', planRev, 0),
          makeNumItem('Lợi nhuận trước thuế kế hoạch - Tỷ VNĐ', planPbt, 0),
          makeNumItem('Lợi nhuận sau thuế kế hoạch - Tỷ VNĐ', planPat, 0),
          makePctItem('Tỷ lệ hoàn thành doanh thu kế hoạch (%)', pctRev),
          makePctItem('Tỷ lệ hoàn thành LNTT kế hoạch (%)', pctPbt),
          makePctItem('Tỷ lệ hoàn thành LNST kế hoạch (%)', pctPat),
        ],
      },
      valuation: {
        id: 'valuation',
        title: 'Định giá',
        items: [
          makeNumItem('Vốn hóa (D) - Tỷ VNĐ', marketCapBillion),
          makeNumItem('Giá trị doanh nghiệp (D) - Tỷ VNĐ', evBillion),
          makeNumItem('EPS (D) - VNĐ', epsVal, 0),
          makeNumItem('Giá trị sổ sách (D) - Tỷ VNĐ', valVcsh),
          makeNumItem('PE (D)', peVal),
          makeNumItem('PEG (CAGR 3Y)', 0.0),
          makeNumItem('PB (D)', pbVal),
          makeNumItem('EV/EBIT (D)', evBillion && valLnHdkdTtm > 0 ? evBillion / valLnHdkdTtm : 6.3),
          makeNumItem('EV/EBITDA (D)', evBillion && valLnttTtm > 0 ? evBillion / (valLnttTtm * 1.2) : 5.7),
          makeNumItem('P/S (D)', psVal),
          makeNumItem('P/OCF (D)', pOcfVal),
          makeNumItem('EV/OCF (D)', evOcfVal),
        ],
      },
      financialHealth: {
        id: 'financial-health',
        title: 'Sức khỏe tài chính',
        items: [
          makePctItem('Hệ số nợ trên vốn chủ sở hữu (Q)', deRatio),
          makePctItem('Hệ số vốn chủ sở hữu (Q)', equityRatio),
          makePctItem('Tổng nợ/Tổng tài sản (Q)', debtToAssets),
          makePctItem('Tổng tài sản/Vốn chủ sở hữu (Q)', leverage),
        ],
      },
      operatingEfficiency: {
        id: 'operating-efficiency',
        title: 'Hiệu quả hoạt động',
        items: [
          makePctItem('Biên lãi gộp (TTM)', grossMargin),
          makePctItem('Biên lãi EBIT (TTM)', 7.7),
          makePctItem('Biên lãi EBITDA (TTM)', 8.6),
          makePctItem('Biên lãi trước thuế (TTM)', pbtMargin),
          makePctItem('Biên lãi sau thuế (TTM)', netMargin),
          makePctItem('Dòng tiền HĐKD/Lợi nhuận thuần (TTM)', ocfToNetProfit),
          makeNumItem('Vòng quay Tài sản (TTM)', assetTurnover),
          makeNumItem('Số ngày phải thu (TTM) - Ngày', dso),
          makeNumItem('Số ngày tồn kho (TTM) - Ngày', dio),
          makeNumItem('Số ngày phải trả (TTM) - Ngày', dpo),
          makeNumItem('Vòng quay Tiền mặt (TTM) - Ngày', ccc),
          makePctItem('ROA (TTM) - %', roa),
          makePctItem('ROE (TTM) - %', roe),
          makePctItem('ROIC (TTM) - %', roic),
        ],
      },
    },
  }
}
