import fs from 'node:fs'
import path from 'node:path'
import {
  type MarketSummary,
  type SectorL2Item,
  type PieChartItem,
  type SectorValuationItem,
  type IndustryFullData,
  SECTOR_COLORS,
  formatBillionVnd,
  formatQuarterLabel,
} from './industry-types'

export async function getIndustryFullData(): Promise<IndustryFullData> {
  const dir = path.join(process.cwd(), 'data', 'industry')

  // Đọc file icb_hierarchy.json
  const hierarchyPath = path.join(dir, 'icb_hierarchy.json')
  const summaryPath = path.join(dir, 'sector_icb_summary.json')
  const marketKqkdPath = path.join(dir, 'kqkd', 'market.json')

  if (!fs.existsSync(hierarchyPath) || !fs.existsSync(summaryPath) || !fs.existsSync(marketKqkdPath)) {
    throw new Error('Chưa tìm thấy dữ liệu ngành. Vui lòng chạy lệnh "pnpm sync-industry" trước.')
  }

  const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'))
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
  const marketKqkd = JSON.parse(fs.readFileSync(marketKqkdPath, 'utf-8'))

  // 1. Thị trường tổng quan
  const totalMarketCap = summary.market?.market_cap_bn ?? 0
  const latestRev = marketKqkd.revenue?.at(-1) ?? 0
  const latestLnst = marketKqkd.lnst?.at(-1) ?? 0
  const latestQuarter = marketKqkd.quarters?.at(-1) ?? ''

  const marketSummary: MarketSummary = {
    marketCap: totalMarketCap,
    pe: summary.market?.pe ?? 0,
    pb: summary.market?.pb ?? 0,
    revenue: latestRev,
    lnst: latestLnst,
    revenueYoy: marketKqkd.revenueYoy?.at(-1) ?? null,
    lnstYoy: marketKqkd.lnstYoy?.at(-1) ?? null,
    totalSymbols: hierarchy.total_symbols ?? 1932,
    trackedSymbols: summary.market?.data_count ?? 1470,
    latestQuarter: formatQuarterLabel(latestQuarter),
  }

  // 2. Xử lý từng ngành L2
  const sectors: SectorL2Item[] = []
  for (const l1 of hierarchy.level1 || []) {
    for (const l2 of l1.level2 || []) {
      const sum = summary.l2_sectors?.[l2.code] || {}
      let kqkd = null
      const kqkdFile = path.join(dir, 'kqkd', `${l2.code}.json`)
      if (fs.existsSync(kqkdFile)) {
        try {
          kqkd = JSON.parse(fs.readFileSync(kqkdFile, 'utf-8'))
        } catch {}
      }

      const marketCap = sum.market_cap_bn ?? 0
      const rev = kqkd?.revenue?.at(-1) ?? 0
      const lnst = kqkd?.lnst?.at(-1) ?? 0

      sectors.push({
        code: l2.code,
        name: l2.name_vi,
        l1Code: l1.code,
        l1Name: l1.name_vi,
        symbolCount: sum.data_count || sum.symbol_count || (l2.all_symbols?.length ?? 0),
        marketCap,
        marketCapRatio: totalMarketCap > 0 ? (marketCap / totalMarketCap) * 100 : 0,
        revenue: rev,
        lnst,
        lnstRatio: latestLnst > 0 && lnst > 0 ? (lnst / latestLnst) * 100 : 0,
        pe: sum.pe ?? null,
        pb: sum.pb ?? null,
        revenueYoy: kqkd?.revenueYoy?.at(-1) ?? null,
        lnstYoy: kqkd?.lnstYoy?.at(-1) ?? null,
        allSymbols: l2.all_symbols || (l2.level4 || []).flatMap((l4: any) => l4.symbols || []),
        level4: (l2.level4 || []).map((l4: any) => ({
          code: l4.code,
          name_vi: l4.name_vi,
          symbols: l4.symbols || [],
        })),
        quarters: (kqkd?.quarters || []).map((q: string) => formatQuarterLabel(q)),
        revenueHistory: kqkd?.revenue || [],
        lnstHistory: kqkd?.lnst || [],
      })
    }
  }

  // Sắp xếp mặc định theo vốn hóa giảm dần
  sectors.sort((a, b) => b.marketCap - a.marketCap)

  // 3. Biểu đồ tròn Vốn hóa (Top 8 + Khác)
  const topCap = sectors.slice(0, 8)
  const otherCapSum = sectors.slice(8).reduce((acc, cur) => acc + cur.marketCap, 0)
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
      percent: parseFloat(((otherCapSum / totalMarketCap) * 100).toFixed(1)),
      formattedValue: formatBillionVnd(otherCapSum),
      color: SECTOR_COLORS.other,
    })
  }

  // 4. Biểu đồ tròn LNST (Chỉ lấy các ngành có LNST > 0, Top 8 + Khác)
  const positiveLnstSectors = [...sectors].filter((s) => s.lnst > 0).sort((a, b) => b.lnst - a.lnst)
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

  // 5. Danh sách tất cả cổ phiếu từ manifest
  let allStocks: Array<{ symbol: string; name: string }> = []
  const manifestMap = new Map<string, any>()
  const manifestPath = path.join(process.cwd(), 'data', 'longlive_manifest.json')
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      if (Array.isArray(manifest.items)) {
        for (const item of manifest.items) {
          const sym = String(item.t || '').toUpperCase().trim()
          if (sym) {
            manifestMap.set(sym, item)
            allStocks.push({ symbol: sym, name: item.n || '' })
          }
        }
      }
    } catch {}
  }
  if (!allStocks.length && hierarchy.all_symbols) {
    allStocks = (hierarchy.all_symbols || []).map((s: string) => ({
      symbol: s.toUpperCase(),
      name: s,
    }))
  }

  // 6. Đọc sector_stocks.json để map danh sách cổ phiếu theo từng ngành định giá
  const sectorStocksMap = new Map<string, string[]>()
  const sectorStocksPath = path.join(dir, 'sector_stocks.json')
  if (fs.existsSync(sectorStocksPath)) {
    try {
      const ssData = JSON.parse(fs.readFileSync(sectorStocksPath, 'utf-8'))
      if (Array.isArray(ssData.sectors)) {
        for (const sec of ssData.sectors) {
          if (sec.key && Array.isArray(sec.stocks)) {
            sectorStocksMap.set(sec.key, sec.stocks)
          }
        }
      }
    } catch {}
  }

  // 7. Đọc sector_valuation_overview.json (Tab Định giá) & gán danh sách cổ phiếu kèm thông tin chi tiết
  let valuationOverview: SectorValuationItem[] = []
  const valPath = path.join(dir, 'sector_valuation_overview.json')
  if (fs.existsSync(valPath)) {
    try {
      const valData = JSON.parse(fs.readFileSync(valPath, 'utf-8'))
      const rawSectors = valData.sectors || []
      valuationOverview = rawSectors.map((s: SectorValuationItem) => {
        const stocks = sectorStocksMap.get(s.key) || []
        const stockDetails = stocks.map((sym: string) => {
          const m = manifestMap.get(sym.toUpperCase())
          return {
            symbol: sym.toUpperCase(),
            name: m?.n || sym,
            marketCap: m?.cap ?? null,
            pe: m?.pe ?? null,
            pb: m?.pb ?? null,
            price: m?.px ?? null,
            roe: m?.roe ?? null,
          }
        })
        // Sắp xếp cổ phiếu theo vốn hóa giảm dần
        stockDetails.sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0))

        return {
          ...s,
          stocks,
          stockDetails,
        }
      })
    } catch {}
  }

  return {
    summary: marketSummary,
    sectors,
    marketCapPie,
    lnstPie,
    valuationOverview,
    generatedAt: summary.generated_at || new Date().toISOString(),
    allStocks,
  }
}
