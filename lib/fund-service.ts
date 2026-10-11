import fs from 'fs'
import path from 'path'
import {
  Fund,
  FundCategory,
  FundHolding,
  StockHoldingStats,
  IndustryHoldingStats,
  FUNDS_DATA,
  TOP_STOCK_HOLDINGS,
  TOP_INDUSTRY_HOLDINGS,
  FUND_ISSUERS,
} from './funds-data'

export interface FundSnapshotData {
  lastUpdated: string
  formattedDate: string
  fundsCount: number
  funds: Fund[]
  topStocks: StockHoldingStats[]
  topIndustries: IndustryHoldingStats[]
  issuers: string[]
}

const STOCK_NAMES: Record<string, string> = {
  VIC: 'Tập đoàn Vingroup',
  VHM: 'CTCP Vinhomes',
  VRE: 'Vincom Retail',
  HPG: 'Tập đoàn Hòa Phát',
  HSG: 'Tập đoàn Hoa Sen',
  NKG: 'Thép Nam Kim',
  FPT: 'Tập đoàn FPT',
  MWG: 'Thế Giới Di Động',
  FRT: 'Bán lẻ FPT (Long Châu)',
  DGW: 'Thế Giới Số (Digiworld)',
  PNJ: 'Vàng bạc Phú Nhuận',
  MSN: 'Tập đoàn Masan',
  VNM: 'Vinamilk',
  SAB: 'Sabeco',
  KDC: 'Tập đoàn KIDO',
  QNS: 'Đường Quảng Ngãi',
  VCB: 'Vietcombank',
  BID: 'BIDV',
  CTG: 'VietinBank',
  TCB: 'Techcombank',
  MBB: 'Ngân hàng Quân Đội',
  ACB: 'Ngân hàng Á Châu',
  VPB: 'VPBank',
  STB: 'Sacombank',
  HDB: 'HDBank',
  TPB: 'TPBank',
  VIB: 'VIBank',
  SHB: 'SHB',
  LPB: 'LPBank',
  MSB: 'MSB',
  OCB: 'OCB',
  SSB: 'SeABank',
  EIB: 'Eximbank',
  SSI: 'Chứng khoán SSI',
  VND: 'Chứng khoán VNDIRECT',
  VCI: 'Chứng khoán Vietcap',
  HCM: 'Chứng khoán HSC',
  MBS: 'Chứng khoán MB',
  SHS: 'Chứng khoán SHS',
  FTS: 'Chứng khoán FPT',
  BSI: 'Chứng khoán BSC',
  CTS: 'Chứng khoán VietinBank',
  KDH: 'Nhà Khang Điền',
  NLG: 'Nam Long',
  DXG: 'Đất Xanh',
  PDR: 'Phát Đạt',
  DIG: 'DIC Corp',
  BCM: 'Becamex IDC',
  KBC: 'Kinh Bắc',
  IDC: 'Tổng Công ty IDICO',
  SZC: 'Sonadezi Châu Đức',
  VGC: 'Viglacera',
  GMD: 'Gemadept',
  HAH: 'Vận tải Hải An',
  VOS: 'Vận tải biển VN',
  PVT: 'Vận tải Dầu khí',
  GAS: 'Tổng công ty Khí VN',
  PLX: 'Petrolimex',
  PVD: 'Khoan Dầu khí',
  PVS: 'Dịch vụ Kỹ thuật Dầu khí',
  BSR: 'Lọc hóa dầu Bình Sơn',
  POW: 'PV Power',
  REE: 'Cơ Điện Lạnh',
  GEG: 'Điện Gia Lai',
  PC1: 'Tập đoàn PC1',
  HDG: 'Hà Đô Group',
  DGC: 'Hóa chất Đức Giang',
  DCM: 'Đạm Cà Mau',
  DPM: 'Đạm Phú Mỹ',
  CSV: 'Hóa chất Cơ bản Miền Nam',
  VHC: 'Thủy sản Vĩnh Hoàn',
  ANV: 'Thủy sản Nam Việt',
  FMC: 'Thực phẩm Sao Ta',
  CTR: 'Công trình Viettel',
  VGI: 'Viettel Global',
  BVH: 'Tập đoàn Bảo Việt',
  BMI: 'Bảo hiểm Bảo Minh',
  PVI: 'Bảo hiểm PVI',
  BMP: 'Nhựa Bình Minh',
  NTP: 'Nhựa Tiền Phong',
}

let memoryCache: { data: FundSnapshotData; expiresAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 giờ trong RAM

/**
 * Lấy snapshot dữ liệu quỹ mở (từ RAM cache -> File cache -> Fmarket API -> Baseline data)
 */
export async function getFundsSnapshot(): Promise<FundSnapshotData> {
  const now = Date.now()

  // 1. Kiểm tra RAM cache
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.data
  }

  // 2. Kiểm tra File cache (data/funds_snapshot.json)
  const dataDir = path.join(process.cwd(), 'data')
  const snapshotPath = path.join(dataDir, 'funds_snapshot.json')

  if (fs.existsSync(snapshotPath)) {
    try {
      const raw = fs.readFileSync(snapshotPath, 'utf-8')
      const parsed = JSON.parse(raw) as FundSnapshotData
      if (parsed && Array.isArray(parsed.funds) && parsed.funds.length > 0) {
        memoryCache = {
          data: parsed,
          expiresAt: now + CACHE_TTL_MS,
        }
        return parsed
      }
    } catch (err) {
      console.error('[getFundsSnapshot] Error reading snapshot file:', err)
    }
  }

  // 3. Fallback: sử dụng dữ liệu baseline đầy đủ 69 quỹ từ FUNDS_DATA
  const baselineDate = new Date()
  const formattedDate = `${String(baselineDate.getDate()).padStart(2, '0')}/${String(baselineDate.getMonth() + 1).padStart(2, '0')}/${baselineDate.getFullYear()}`

  const fallbackData: FundSnapshotData = {
    lastUpdated: baselineDate.toISOString(),
    formattedDate,
    fundsCount: FUNDS_DATA.length,
    funds: FUNDS_DATA,
    topStocks: TOP_STOCK_HOLDINGS,
    topIndustries: TOP_INDUSTRY_HOLDINGS,
    issuers: FUND_ISSUERS,
  }

  memoryCache = {
    data: fallbackData,
    expiresAt: now + CACHE_TTL_MS,
  }

  return fallbackData
}

/**
 * Đồng bộ dữ liệu trực tiếp từ Fmarket API, tính toán lại toàn bộ Top Stocks & Top Industries
 */
export async function syncFundsFromFmarket(): Promise<FundSnapshotData> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch('https://api.fmarket.vn/res/products/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        types: ['NEW_FUND', 'TRADING_FUND'],
        pageSize: 100,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`Fmarket HTTP Error ${res.status}: ${res.statusText}`)
    }

    const json = await res.json()
    const rows = json?.data?.rows
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Fmarket returned empty fund rows')
    }

    // Tải chi tiết từng quỹ theo batch 10 quỹ song song để lấy Top Holdings & Industries
    const details: Record<number, any> = {}
    for (let i = 0; i < rows.length; i += 10) {
      const chunk = rows.slice(i, i + 10)
      const results = await Promise.all(
        chunk.map(async (f: any) => {
          try {
            const detailRes = await fetch(`https://api.fmarket.vn/res/products/${f.id}`, {
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            })
            if (detailRes.ok) {
              const d = await detailRes.json()
              return d?.data
            }
          } catch {}
          return null
        })
      )
      for (let j = 0; j < chunk.length; j++) {
        details[chunk[j].id] = results[j]
      }
    }

    const stockCounts: Record<
      string,
      { symbol: string; name: string; industry: string; fundCount: number; totalWeight: number }
    > = {}
    const industryStats: Record<string, { industry: string; fundCount: number; totalWeight: number }> = {}

    const funds: Fund[] = rows.map((r: any) => {
      const det = details[r.id]

      let cat: FundCategory = 'equity'
      const typeCode = r.dataFundAssetType?.code
      if (typeCode === 'BOND') cat = 'bond'
      else if (typeCode === 'BALANCED') cat = 'balanced'

      const stockHoldings: FundHolding[] = (det?.productTopHoldingList || [])
        .filter((h: any) => Boolean(h.stockCode))
        .map((h: any) => ({
          symbol: h.stockCode,
          name: STOCK_NAMES[h.stockCode] || h.stockCode,
          industry: h.industry || 'Khác',
          weight: Number((h.netAssetPercent || 0).toFixed(2)),
        }))

      const bondHoldings: FundHolding[] = (det?.productTopHoldingBondList || [])
        .filter((h: any) => Boolean(h.stockCode))
        .map((h: any) => ({
          symbol: h.stockCode,
          name: h.stockCode,
          industry: h.industry || 'Trái phiếu',
          weight: Number((h.netAssetPercent || 0).toFixed(2)),
        }))

      const holdings = [...stockHoldings, ...bondHoldings]

      // Thống kê cổ phiếu
      for (const h of stockHoldings) {
        if (!stockCounts[h.symbol]) {
          stockCounts[h.symbol] = {
            symbol: h.symbol,
            name: h.name,
            industry: h.industry,
            fundCount: 0,
            totalWeight: 0,
          }
        }
        stockCounts[h.symbol].fundCount++
        stockCounts[h.symbol].totalWeight += h.weight
      }

      // Thống kê phân bổ ngành
      if (det?.productIndustriesHoldingList?.length > 0) {
        for (const ind of det.productIndustriesHoldingList) {
          if (ind.industry) {
            if (!industryStats[ind.industry]) {
              industryStats[ind.industry] = {
                industry: ind.industry,
                fundCount: 0,
                totalWeight: 0,
              }
            }
            industryStats[ind.industry].fundCount++
            industryStats[ind.industry].totalWeight += ind.assetPercent || 0
          }
        }
      }

      // Ngày cập nhật NAV
      let navDate = ''
      const updateTs = r.productNavChange?.updateAt || r.updateAt
      if (updateTs) {
        const d = new Date(updateTs)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        navDate = `${day}/${month}/${year}`
      }

      let inception = ''
      if (r.firstIssueAt) {
        const d = new Date(r.firstIssueAt)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        inception = `${day}/${month}/${year}`
      }

      // Tính YTD chuẩn xác
      let ytd: number | null = r.productNavChange?.navToLastYear ?? null
      if (ytd == null && r.lastYearNav > 0 && r.nav > 0) {
        ytd = Number((((r.nav - r.lastYearNav) / r.lastYearNav) * 100).toFixed(2))
      } else if (ytd == null && r.firstIssueAt) {
        const year = new Date(r.firstIssueAt).getFullYear()
        if (year === new Date().getFullYear()) {
          ytd = r.productNavChange?.navToEstablish != null ? Number(r.productNavChange.navToEstablish.toFixed(2)) : null
        }
      }

      return {
        id: r.shortName.toLowerCase(),
        fmarketId: r.id,
        code: r.shortName,
        name: r.name,
        category: cat,
        issuer: r.owner?.shortName || r.owner?.name || 'Khác',
        issuerFullName: r.owner?.name || '',
        nav: r.nav || 0,
        navDate: navDate || '09/10/2026',
        ytdReturn: ytd != null ? Number(ytd.toFixed(2)) : null,
        return1Y: r.productNavChange?.navTo12Months != null ? Number(r.productNavChange.navTo12Months.toFixed(2)) : null,
        return3Y: r.productNavChange?.navTo36Months != null ? Number(r.productNavChange.navTo36Months.toFixed(2)) : null,
        returnInception: r.productNavChange?.navToEstablish != null ? Number(r.productNavChange.navToEstablish.toFixed(2)) : null,
        aumBillionVnd: r.issueValue ? Math.round(r.issueValue / 1e9) : undefined,
        managementFee: r.managementFee || 0,
        inceptionDate: inception,
        description: r.description || '',
        holdings,
      }
    })

    // Top 10 cổ phiếu
    const topStocks: StockHoldingStats[] = Object.values(stockCounts)
      .map((item, idx) => ({
        rank: idx + 1,
        symbol: item.symbol,
        name: item.name,
        industry: item.industry,
        fundCount: item.fundCount,
        avgWeight: Number((item.totalWeight / item.fundCount).toFixed(2)),
      }))
      .sort((a, b) => b.fundCount - a.fundCount || b.avgWeight - a.avgWeight)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }))

    // Top 10 ngành
    const topIndustries: IndustryHoldingStats[] = Object.values(industryStats)
      .map((item, idx) => ({
        rank: idx + 1,
        industry: item.industry,
        fundCount: item.fundCount,
        avgWeight: Number((item.totalWeight / item.fundCount).toFixed(2)),
      }))
      .sort((a, b) => b.fundCount - a.fundCount || b.avgWeight - a.avgWeight)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }))

    const issuers = ['Tất cả tổ chức', ...new Set(funds.map((f) => f.issuer).filter(Boolean))]

    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    const snapshot: FundSnapshotData = {
      lastUpdated: now.toISOString(),
      formattedDate,
      fundsCount: funds.length,
      funds,
      topStocks,
      topIndustries,
      issuers,
    }

    // Lưu vào file cache nếu có quyền
    try {
      const dataDir = path.join(process.cwd(), 'data')
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(path.join(dataDir, 'funds_snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf-8')
    } catch (saveErr) {
      console.warn('[syncFundsFromFmarket] Failed to save snapshot file:', saveErr)
    }

    // Lưu vào RAM cache
    memoryCache = {
      data: snapshot,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }

    return snapshot
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('[syncFundsFromFmarket] Error:', err)
    throw err
  }
}
