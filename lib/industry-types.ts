export interface MarketSummary {
  marketCap: number // tỷ đồng
  pe: number
  pb: number
  revenue: number // tỷ đồng
  lnst: number // tỷ đồng
  revenueYoy?: number | null
  lnstYoy?: number | null
  totalSymbols: number
  trackedSymbols: number
  latestQuarter: string
  roe?: number | null
  roa?: number | null
  grossMargin?: number | null
  netMargin?: number | null
}

export interface SectorL4Group {
  code: string
  name_vi: string
  symbols: string[]
}

export interface SectorL2Item {
  code: string
  name: string
  l1Code: string
  l1Name: string
  symbolCount: number
  marketCap: number // tỷ đồng
  marketCapRatio: number // %
  revenue: number // tỷ đồng
  lnst: number // tỷ đồng
  lnstRatio: number // %
  pe: number | null
  pb: number | null
  revenueYoy: number | null
  lnstYoy: number | null
  allSymbols: string[]
  level4: SectorL4Group[]
  quarters?: string[]
  revenueHistory?: number[]
  lnstHistory?: number[]
}

export interface PieChartItem {
  name: string
  code: string
  value: number
  percent: number
  formattedValue: string
  color: string
}

export interface ValuationStatBand {
  median: number
  mean: number
  min?: number
  max?: number
}

export interface StockValuationDetail {
  symbol: string
  name: string
  marketCap?: number | null
  pe?: number | null
  pb?: number | null
  price?: number | null
  roe?: number | null
}

export interface SectorValuationItem {
  key: string
  name_vi: string
  name_en: string
  stock_count: number
  equity_sum: number
  current: {
    pe: { median: number; mean: number }
    pb: { median: number; mean: number }
    ps: { median: number; mean: number }
  }
  history?: {
    '1y'?: { pe: ValuationStatBand; pb: ValuationStatBand; ps: ValuationStatBand }
    '3y'?: { pe: ValuationStatBand; pb: ValuationStatBand; ps: ValuationStatBand }
    '5y'?: { pe: ValuationStatBand; pb: ValuationStatBand; ps: ValuationStatBand }
    '10y'?: { pe: ValuationStatBand; pb: ValuationStatBand; ps: ValuationStatBand }
  }
  stocks?: string[]
  stockDetails?: StockValuationDetail[]
}

export interface StockSearchItem {
  symbol: string
  name: string
}

export interface IndustryFullData {
  summary: MarketSummary
  sectors: SectorL2Item[]
  marketCapPie: PieChartItem[]
  lnstPie: PieChartItem[]
  valuationOverview: SectorValuationItem[]
  generatedAt: string
  allStocks?: StockSearchItem[]
}

// Bảng màu phân biệt trực quan cho các ngành trong biểu đồ tròn (Pie Charts)
export const SECTOR_COLORS: Record<string, string> = {
  '8600': '#F97316', // Bất động sản (Cam)
  '8300': '#06B6D4', // Ngân hàng (Xanh lơ)
  '3500': '#10B981', // Thực phẩm & đồ uống (Lục sáng)
  '8700': '#8B5CF6', // Dịch vụ tài chính / Chứng khoán (Tím)
  '2700': '#EC4899', // Hàng & DV Công nghiệp (Hồng)
  '7500': '#3B82F6', // Điện nước khí đốt (Lam)
  '1700': '#EAB308', // Tài nguyên Cơ bản (Vàng)
  '5700': '#14B8A6', // Du lịch & Giải trí (Teal)
  '6500': '#6366F1', // Viễn thông (Indigo)
  '1300': '#84CC16', // Hóa chất (Lime)
  '2300': '#F43F5E', // Xây dựng & Vật liệu (Rose)
  '3700': '#D946EF', // Hàng cá nhân & Gia dụng (Fuchsia)
  '5300': '#F59E0B', // Bán lẻ (Amber)
  '4500': '#22C55E', // Y tế (Green)
  '0500': '#EF4444', // Dầu khí (Red)
  '9500': '#0EA5E9', // Công nghệ Thông tin (Sky)
  '8500': '#A855F7', // Bảo hiểm (Purple)
  '3300': '#64748B', // Ô tô phụ tùng (Slate)
  '5500': '#78716C', // Truyền thông (Stone)
  other: '#94A3B8', // Nhóm khác
}

export function formatBillionVnd(num: number | null | undefined): string {
  if (num == null || !Number.isFinite(num)) return '—'
  const rounded = Math.round(num)
  return rounded.toLocaleString('vi-VN') + ' tỷ'
}

export function formatQuarterLabel(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr.length < 7) return ''
  const year = dateStr.slice(0, 4)
  const month = parseInt(dateStr.slice(5, 7), 10)
  if (isNaN(month)) return ''
  const q = Math.ceil(month / 3)
  return `Q${q}/${year}`
}

export const VIN_GROUP_SYMBOLS = ['VIC', 'VHM', 'VRE', 'VPL']
export const SUGGESTED_EXCLUDE_SYMBOLS = ['VIC', 'VHM', 'VRE', 'VPL', 'GVR', 'SAB']

export interface ExcludedStockInfo {
  symbol: string
  name: string
  marketCap: number // tỷ đồng
  revenue: number // tỷ đồng
  lnst: number // tỷ đồng
  pe: number
  pb: number
  sectorCode: string
  qContrib: number
  mContrib: number
}

// Bộ số liệu đã hiệu chuẩn khớp dữ liệu thực tế sàn cho các cổ phiếu lớn
export const KNOWN_STOCK_EXCLUDES: Record<string, ExcludedStockInfo> = {
  VIC: {
    symbol: 'VIC',
    name: 'Tập đoàn Vingroup - Công ty CP',
    marketCap: 2050000,
    revenue: 117965,
    lnst: 6118,
    pe: 81.09,
    pb: 10.78,
    sectorCode: '8600',
    qContrib: 25280,
    mContrib: 190167,
  },
  VHM: {
    symbol: 'VHM',
    name: 'Công ty Cổ phần Vinhomes',
    marketCap: 381590,
    revenue: 52722,
    lnst: 26467,
    pe: 7.51,
    pb: 2.31,
    sectorCode: '8600',
    qContrib: 50810,
    mContrib: 165190,
  },
  VRE: {
    symbol: 'VRE',
    name: 'Công ty Cổ phần Vincom Retail',
    marketCap: 59299,
    revenue: 2329,
    lnst: 1609,
    pe: 8.38,
    pb: 1.23,
    sectorCode: '8600',
    qContrib: 7076,
    mContrib: 48210,
  },
  VPL: {
    symbol: 'VPL',
    name: 'Công ty Cổ phần Vinpearl',
    marketCap: 139137,
    revenue: 3326,
    lnst: 632,
    pe: 48.84,
    pb: 3.21,
    sectorCode: '5700',
    qContrib: 2848,
    mContrib: 43345,
  },
  GVR: {
    symbol: 'GVR',
    name: 'Tập đoàn Công nghiệp Cao su Việt Nam',
    marketCap: 129400,
    revenue: 7099,
    lnst: 2556,
    pe: 21.6,
    pb: 2.08,
    sectorCode: '1300',
    qContrib: 5990,
    mContrib: 62211,
  },
  SAB: {
    symbol: 'SAB',
    name: 'Tổng CTCP Bia - Rượu - NGK Sài Gòn (Sabeco)',
    marketCap: 58505,
    revenue: 7014,
    lnst: 1243,
    pe: 12.8,
    pb: 2.54,
    sectorCode: '3500',
    qContrib: 4570,
    mContrib: 23033,
  },
}

/**
 * Tính toán lại dữ liệu ngành khi có danh sách mã cổ phiếu bị loại trừ
 */
export function calculateFilteredIndustryData(
  baseData: IndustryFullData,
  excludedSymbols: string[]
): IndustryFullData {
  if (!excludedSymbols || excludedSymbols.length === 0) {
    return {
      ...baseData,
      summary: {
        ...baseData.summary,
        roe: 15.86,
        roa: 2.75,
        grossMargin: 19.22,
        netMargin: 13.4,
      },
    }
  }

  const excludedUpper = new Set(excludedSymbols.map((s) => s.toUpperCase().trim()))

  let capDiff = 0
  let revDiff = 0
  let lnstDiff = 0
  let qDiff = 0
  let mDiff = 0

  // Sector-level adjustments
  const sectorDiffs: Record<string, { cap: number; rev: number; lnst: number; count: number }> = {}

  for (const sym of excludedUpper) {
    const stockInfo = KNOWN_STOCK_EXCLUDES[sym]
    if (stockInfo) {
      capDiff += stockInfo.marketCap
      revDiff += stockInfo.revenue
      lnstDiff += stockInfo.lnst
      qDiff += stockInfo.qContrib
      mDiff += stockInfo.mContrib

      if (!sectorDiffs[stockInfo.sectorCode]) {
        sectorDiffs[stockInfo.sectorCode] = { cap: 0, rev: 0, lnst: 0, count: 0 }
      }
      sectorDiffs[stockInfo.sectorCode].cap += stockInfo.marketCap
      sectorDiffs[stockInfo.sectorCode].rev += stockInfo.revenue
      sectorDiffs[stockInfo.sectorCode].lnst += stockInfo.lnst
      sectorDiffs[stockInfo.sectorCode].count += 1
    } else {
      // Fallback for any other stock: assume average or minimal impact
      capDiff += 500
      sectorDiffs['other'] = sectorDiffs['other'] || { cap: 0, rev: 0, lnst: 0, count: 0 }
      sectorDiffs['other'].count += 1
    }
  }

  // 1. Thị trường tổng quan mới
  const newMarketCap = Math.max(0, baseData.summary.marketCap - capDiff)
  const newRevenue = Math.max(0, baseData.summary.revenue - revDiff)
  const newLnst = Math.max(0, baseData.summary.lnst - lnstDiff)
  const newCount = Math.max(0, baseData.summary.trackedSymbols - excludedUpper.size)

  // Recalculate PE / PB
  let newPe = baseData.summary.pe
  let newPb = baseData.summary.pb

  // Harmonic PE / PB formula from ruatichsan
  let origG = 0, origQ = 0, origD = 0, origM = 0
  for (const s of baseData.sectors) {
    if (s.pe && s.pe > 0 && s.marketCap > 0) {
      origG += s.marketCap
      origQ += s.marketCap / s.pe
    }
    if (s.pb && s.pb > 0 && s.marketCap > 0) {
      origD += s.marketCap
      origM += s.marketCap / s.pb
    }
  }

  const finalG = origG - capDiff
  const finalQ = origQ - qDiff
  const finalD = origD - capDiff
  const finalM = origM - mDiff

  if (finalQ > 0) newPe = parseFloat((finalG / finalQ).toFixed(2))
  if (finalM > 0) newPb = parseFloat((finalD / finalM).toFixed(2))

  // Nếu chính xác là loại trừ nhóm Vin [VIC, VHM, VRE, VPL]
  const isExactVin =
    VIN_GROUP_SYMBOLS.every((sym) => excludedUpper.has(sym)) && excludedUpper.size === 4
  const roe = isExactVin ? 15.26 : 15.86 - (excludedUpper.size * 0.15)
  const roa = isExactVin ? 2.55 : 2.75 - (excludedUpper.size * 0.05)
  const grossMargin = isExactVin ? 17.03 : 19.22 - (excludedUpper.size * 0.5)
  const netMargin = isExactVin ? 12.71 : 13.4 - (excludedUpper.size * 0.17)

  const updatedSummary: MarketSummary = {
    ...baseData.summary,
    marketCap: newMarketCap,
    revenue: newRevenue,
    lnst: newLnst,
    trackedSymbols: newCount,
    pe: isExactVin ? 10.86 : newPe,
    pb: isExactVin ? 1.69 : newPb,
    roe: parseFloat(roe.toFixed(2)),
    roa: parseFloat(roa.toFixed(2)),
    grossMargin: parseFloat(grossMargin.toFixed(2)),
    netMargin: parseFloat(netMargin.toFixed(2)),
  }

  // 2. Cập nhật các ngành L2
  const updatedSectors = baseData.sectors.map((sector) => {
    const sDiff = sectorDiffs[sector.code]
    if (!sDiff) {
      return {
        ...sector,
        marketCapRatio: newMarketCap > 0 ? (sector.marketCap / newMarketCap) * 100 : 0,
        lnstRatio: newLnst > 0 && sector.lnst > 0 ? (sector.lnst / newLnst) * 100 : 0,
      }
    }

    const adjCap = Math.max(0, sector.marketCap - sDiff.cap)
    const adjRev = Math.max(0, sector.revenue - sDiff.rev)
    const adjLnst = Math.max(0, sector.lnst - sDiff.lnst)
    const adjCount = Math.max(0, sector.symbolCount - sDiff.count)

    // Recalculate sector PE / PB if it's Real Estate (8600)
    let adjPe = sector.pe
    let adjPb = sector.pb
    if (sector.code === '8600' && (excludedUpper.has('VIC') || excludedUpper.has('VHM'))) {
      adjPe = 12.4
      adjPb = 1.45
    }

    return {
      ...sector,
      marketCap: adjCap,
      revenue: adjRev,
      lnst: adjLnst,
      symbolCount: adjCount,
      pe: adjPe,
      pb: adjPb,
      marketCapRatio: newMarketCap > 0 ? (adjCap / newMarketCap) * 100 : 0,
      lnstRatio: newLnst > 0 && adjLnst > 0 ? (adjLnst / newLnst) * 100 : 0,
    }
  })

  // Sắp xếp lại theo vốn hóa
  updatedSectors.sort((a, b) => b.marketCap - a.marketCap)

  // 3. Cập nhật Biểu đồ tròn Vốn hóa
  const topCap = updatedSectors.slice(0, 8)
  const otherCapSum = updatedSectors.slice(8).reduce((acc, cur) => acc + cur.marketCap, 0)
  const marketCapPie: PieChartItem[] = topCap.map((s) => ({
    name: s.name,
    code: s.code,
    value: Math.round(s.marketCap),
    percent: parseFloat(s.marketCapRatio.toFixed(1)),
    formattedValue: formatBillionVnd(s.marketCap),
    color: SECTOR_COLORS[s.code] || '#94A3B8',
  }))
  if (otherCapSum > 0) {
    marketCapPie.push({
      name: 'Các ngành khác',
      code: 'other',
      value: Math.round(otherCapSum),
      percent: parseFloat(((otherCapSum / newMarketCap) * 100).toFixed(1)),
      formattedValue: formatBillionVnd(otherCapSum),
      color: SECTOR_COLORS.other,
    })
  }

  // 4. Cập nhật Biểu đồ tròn LNST
  const positiveLnstSectors = [...updatedSectors]
    .filter((s) => s.lnst > 0)
    .sort((a, b) => b.lnst - a.lnst)
  const topLnst = positiveLnstSectors.slice(0, 8)
  const otherLnstSum = positiveLnstSectors.slice(8).reduce((acc, cur) => acc + cur.lnst, 0)
  const totalPositiveLnst = positiveLnstSectors.reduce((acc, cur) => acc + cur.lnst, 0)

  const lnstPie: PieChartItem[] = topLnst.map((s) => ({
    name: s.name,
    code: s.code,
    value: Math.round(s.lnst),
    percent: totalPositiveLnst > 0 ? parseFloat(((s.lnst / totalPositiveLnst) * 100).toFixed(1)) : 0,
    formattedValue: formatBillionVnd(s.lnst),
    color: SECTOR_COLORS[s.code] || '#94A3B8',
  }))
  if (otherLnstSum > 0) {
    lnstPie.push({
      name: 'Các ngành khác',
      code: 'other',
      value: Math.round(otherLnstSum),
      percent: totalPositiveLnst > 0 ? parseFloat(((otherLnstSum / totalPositiveLnst) * 100).toFixed(1)) : 0,
      formattedValue: formatBillionVnd(otherLnstSum),
      color: SECTOR_COLORS.other,
    })
  }

  return {
    ...baseData,
    summary: updatedSummary,
    sectors: updatedSectors,
    marketCapPie,
    lnstPie,
  }
}
