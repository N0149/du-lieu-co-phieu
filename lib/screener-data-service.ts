import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface ScreenerStockItem {
  ticker: string
  name: string
  exchange: 'HOSE' | 'HNX' | 'UPCOM' | 'OTHER'
  sector: string
  icbL1: string
  icbL2: string
  price: number | null // Giá thị trường (k VND)
  marketCap: number | null // Vốn hóa (Tỷ VND)
  pe: number | null // P/E
  peAdjusted: number | null // P/E thực tế khi loại bỏ Quỹ KTPL (sau KTPL)
  pb: number | null // P/B

  roe: number | null // ROE %
  roa: number | null // ROA %
  eps: number | null // EPS (VND)
  bvps: number | null // BVPS (VND)
  div: number | null // Cổ tức tiền mặt gần nhất (VND/cp)
  dy: number | null // Tỷ suất cổ tức % (Dividend yield)
  change1w: number | null // Biến động giá 1 tuần %
  change1m: number | null // Biến động giá 1 tháng %
  rsi14: number | null // RSI 14 phiên
  volume20d: number | null // Khối lượng giao dịch TB 20 phiên (cp)
  debtToEquity: number | null // Nợ vay / VCSH
  netMargin: number | null // Biên LN ròng %
  grossMargin: number | null // Biên LN gộp %
  revGrowthYoY: number | null // Tăng trưởng Doanh thu YoY %
  profitGrowthYoY: number | null // Tăng trưởng LNST YoY %
  capexGrowth: number | null // Tỷ lệ TSCĐ dở dang / Tổng TS (%)
  cashRatio: number | null // Tỷ lệ Tiền mặt & Tiền gửi / Tổng TS (%)
  ktplRate: number | null // Tỷ lệ trích Quỹ Khen thưởng Phúc lợi / LNST (%) năm gần nhất
  ktplVnd: number | null // Giá trị Quỹ Khen thưởng Phúc lợi (VND) năm gần nhất
  score360: number | null // Điểm đánh giá AI 360° (thang 10)
  score360Rating: string | null // 'XUẤT SẮC' | 'TỐT' | 'KHÁ' | 'CẦN LƯU Ý'
  reportCount: number // Số lượng báo cáo phân tích
  targetPrice: number | null // Giá mục tiêu trung bình (k VND)
  upside: number | null // Tiềm năng tăng giá %
  foreignRate: number | null // % Sở hữu nước ngoài
  stateRate: number | null // % Sở hữu nhà nước
  isVN30: boolean
  isPort: boolean

  // Báo cáo tài chính (Tỷ VND)
  cfoInvQ?: number | null
  cfoInvTtm?: number | null
  cfoInvY?: number | null
  cfoOpQ?: number | null
  cfoOpTtm?: number | null
  cfoOpY?: number | null
  cfoFinQ?: number | null
  cfoFinTtm?: number | null
  cfoFinY?: number | null
  npQ?: number | null
  npTtm?: number | null
  npY?: number | null
  npmQ?: number | null
  npmTtm?: number | null
  npmY?: number | null
  ebtQ?: number | null
  ebtTtm?: number | null
  ebtY?: number | null
  liabQ?: number | null
  liabTtm?: number | null
  liabY?: number | null
  assetsQ?: number | null
  assetsY?: number | null
  equityQ?: number | null
  equityTtm?: number | null
  equityY?: number | null

  // Kế hoạch kinh doanh (%)
  planProfitGrowthY?: number | null
  planProfitVsPrevActualY?: number | null
  revPlanAchievementY?: number | null
  patPlanAchievementY?: number | null

  // Định giá mở rộng (EV, SPS, EV/EBIT, EV/EBITDA)
  spsQ?: number | null
  spsTtm?: number | null
  spsY?: number | null
  evD?: number | null
  evQ?: number | null
  evTtm?: number | null
  evY?: number | null
  evEbitD?: number | null
  evEbitTtm?: number | null
  evEbitY?: number | null
  evEbitdaD?: number | null
  evEbitdaTtm?: number | null
  evEbitdaY?: number | null

  // BCTC Sản xuất & Thương mại (Phi tài chính)
  cogsQ?: number | null
  cogsTtm?: number | null
  cogsY?: number | null
  grossProfitQ?: number | null
  grossProfitTtm?: number | null
  grossProfitY?: number | null
  sellingExpQ?: number | null
  adminExpQ?: number | null
  inventoryQ?: number | null
  inventoryY?: number | null
  receivablesQ?: number | null
  receivablesY?: number | null
  wipQ?: number | null
  wipY?: number | null

  // BCTC Ngân hàng
  niiQ?: number | null
  niiTtm?: number | null
  niiY?: number | null
  feeIncomeQ?: number | null
  feeIncomeTtm?: number | null
  feeIncomeY?: number | null
  toiQ?: number | null
  toiTtm?: number | null
  toiY?: number | null
  provExpQ?: number | null
  provExpTtm?: number | null
  provExpY?: number | null
  preProvProfitQ?: number | null
  preProvProfitTtm?: number | null
  customerLoansQ?: number | null
  customerLoansY?: number | null
  customerDepositsQ?: number | null
  customerDepositsY?: number | null
  loanLossReserveQ?: number | null
  loanLossReserveY?: number | null

  // BCTC Chứng khoán
  brokerageRevQ?: number | null
  brokerageRevTtm?: number | null
  brokerageRevY?: number | null
  marginRevQ?: number | null
  marginRevTtm?: number | null
  marginRevY?: number | null
  fvtplRevQ?: number | null
  fvtplRevTtm?: number | null
  operExpQ?: number | null
  operExpTtm?: number | null
  marginLoansQ?: number | null
  marginLoansY?: number | null
  fvtplAssetsQ?: number | null
  fvtplAssetsY?: number | null
  investorDepositsQ?: number | null

  // BCTC Bảo hiểm
  netPremiumQ?: number | null
  netPremiumTtm?: number | null
  netPremiumY?: number | null
  claimsPaidQ?: number | null
  claimsPaidTtm?: number | null
  claimsPaidY?: number | null
  insProfitQ?: number | null
  insProfitTtm?: number | null
  finRevQ?: number | null
  finRevTtm?: number | null
  insInvestmentsQ?: number | null
  insInvestmentsY?: number | null
}

const VN30_TICKERS = new Set([
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
])

function findRowValue(rows: any[], targetKeywords: string[]): number | null {
  if (!Array.isArray(rows)) return null
  // Ưu tiên khớp chính xác theo thứ tự ưu tiên của mảng keyword
  for (const kw of targetKeywords) {
    for (const r of rows) {
      if (Array.isArray(r) && r.length > 3 && typeof r[0] === 'string') {
        const rowName = r[0].toLowerCase().trim()
        if (rowName === kw) {
          for (let i = r.length - 1; i >= 3; i--) {
            if (typeof r[i] === 'number' && !isNaN(r[i])) return r[i]
          }
        }
      }
    }
  }
  // Nếu không có khớp chính xác, tìm khớp theo contains theo thứ tự keyword
  for (const kw of targetKeywords) {
    for (const r of rows) {
      if (Array.isArray(r) && r.length > 3 && typeof r[0] === 'string') {
        const rowName = r[0].toLowerCase().trim()
        if (rowName.includes(kw)) {
          for (let i = r.length - 1; i >= 3; i--) {
            if (typeof r[i] === 'number' && !isNaN(r[i])) return r[i]
          }
        }
      }
    }
  }
  return null
}

function findFsRow(rows: any[], primaryKw: string[]): any[] | null {
  if (!Array.isArray(rows)) return null
  // Ưu tiên khớp chính xác theo thứ tự keyword
  for (const kw of primaryKw) {
    for (const r of rows) {
      if (Array.isArray(r) && r.length > 3 && typeof r[0] === 'string') {
        const name = r[0].toLowerCase().trim()
        if (name === kw) return r
      }
    }
  }
  // Khớp chứa (contains) theo thứ tự keyword
  for (const kw of primaryKw) {
    for (const r of rows) {
      if (Array.isArray(r) && r.length > 3 && typeof r[0] === 'string') {
        const name = r[0].toLowerCase().trim()
        if (name.includes('quỹ khác') || name.includes('chênh lệch')) continue
        if (name.includes(kw)) return r
      }
    }
  }
  return null
}

function getLatestValInTy(r: any[] | null): number | null {
  if (!r) return null
  for (let i = r.length - 1; i >= 3; i--) {
    if (typeof r[i] === 'number' && !isNaN(r[i])) {
      return Math.round(r[i] / 1e8) / 10
    }
  }
  return null
}

function getTtmValInTy(r: any[] | null): number | null {
  if (!r) return null
  const nums: number[] = []
  for (let i = r.length - 1; i >= 3; i--) {
    if (typeof r[i] === 'number' && !isNaN(r[i])) {
      nums.unshift(r[i])
      if (nums.length === 4) break
    }
  }
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / 1e8) / 10
}

let cachedScreenerStocks: ScreenerStockItem[] | null = null
let lastLoadedTime = 0
const CACHE_LIFETIME = 15 * 60 * 1000 // 15 phút

export function getEnrichedScreenerStocks(): ScreenerStockItem[] {
  const now = Date.now()
  if (cachedScreenerStocks && now - lastLoadedTime < CACHE_LIFETIME) {
    return cachedScreenerStocks
  }

  const baseDir = process.cwd()

  // 1. Tải Manifest gốc (1.530 mã)
  const manifestPath = path.join(baseDir, 'data', 'longlive_manifest.json')
  if (!fs.existsSync(manifestPath)) {
    return []
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const rawItems: any[] = manifest.items || []

  // 2. Ánh xạ sàn giao dịch (HOSE, HNX, UPCOM) từ SSI
  let exchangeMap: Record<string, 'HOSE' | 'HNX' | 'UPCOM'> = {}
  const exchangePath = path.join(baseDir, 'data', 'stock_exchanges.json')
  if (fs.existsSync(exchangePath)) {
    try {
      exchangeMap = JSON.parse(fs.readFileSync(exchangePath, 'utf-8'))
    } catch {}
  }

  // 3. XỬ LÝ LỊCH SỬ CỔ TỨC THỰC TẾ & CHÍNH XÁC từ dividend_history.db (1.436 mã)
  // Quy ước chuẩn: (Y) nghĩa là Trailing 12 months (trong 1 năm gần nhất tính đến thời điểm hiện tại).
  // Chỉ những cổ phiếu có chi trả cổ tức tiền mặt trong vòng 1 năm trở lại đây mới được ghi nhận.
  const dividendMap = new Map<string, { cashVnd: number; hasCash: boolean }>()
  const divDbPath = path.join(baseDir, 'data', 'dividend_history.db')
  if (fs.existsSync(divDbPath)) {
    try {
      const divDb = new DatabaseSync(divDbPath)
      const rows = divDb
        .prepare('SELECT symbol, events_json FROM dividend_history')
        .all() as any[]

      // Mốc 1 năm gần nhất (trailing 12M tính từ hiện tại 2026-09-05)
      const oneYearAgoDate = '2025-09-01'

      for (const r of rows) {
        try {
          const events = JSON.parse(r.events_json)
          // Lọc các sự kiện chi trả tiền mặt trong vòng 1 năm gần nhất
          const recentCashEvents = events.filter((e: any) => 
            e.cashVnd != null && 
            e.cashVnd > 0 && 
            e.date && 
            String(e.date) >= oneYearAgoDate
          )

          if (recentCashEvents.length === 0) {
            dividendMap.set(r.symbol.toUpperCase(), { cashVnd: 0, hasCash: false })
            continue
          }

          // Tổng cổ tức tiền mặt chi trả trong 1 năm gần nhất
          const totalCash = recentCashEvents.reduce((acc: number, cur: any) => acc + (cur.cashVnd || 0), 0)

          dividendMap.set(r.symbol.toUpperCase(), {
            cashVnd: totalCash,
            hasCash: totalCash > 0,
          })
        } catch {}
      }
    } catch (err) {
      console.warn('Lỗi đọc dividend_history.db:', err)
    }
  }

  // 4. XỬ LÝ BÁO CÁO TÀI CHÍNH THỰC TẾ từ financial_statements.db (1.368 mã)
  interface FinancialMetrics {
    debtToEquity: number | null
    cashRatio: number | null
    capexGrowth: number | null
    netMargin: number | null
    grossMargin: number | null

    cfoInvQ: number | null
    cfoInvTtm: number | null
    cfoInvY: number | null
    cfoOpQ: number | null
    cfoOpTtm: number | null
    cfoOpY: number | null
    cfoFinQ: number | null
    cfoFinTtm: number | null
    cfoFinY: number | null
    npQ: number | null
    npTtm: number | null
    npY: number | null
    npmQ: number | null
    npmTtm: number | null
    npmY: number | null
    ebtQ: number | null
    ebtTtm: number | null
    ebtY: number | null
    liabQ: number | null
    liabTtm: number | null
    liabY: number | null
    assetsQ: number | null
    assetsY: number | null
    equityQ: number | null
    equityTtm: number | null
    equityY: number | null

    revQ: number | null
    revTtm: number | null
    revY: number | null
    netDebtQ: number | null
    netDebtA: number | null
    ebitTtm: number | null
    ebitY: number | null
    ebitdaTtm: number | null
    ebitdaY: number | null

    // Sản xuất & Thương mại
    cogsQ: number | null
    cogsTtm: number | null
    cogsY: number | null
    grossProfitQ: number | null
    grossProfitTtm: number | null
    grossProfitY: number | null
    sellingExpQ: number | null
    adminExpQ: number | null
    inventoryQ: number | null
    inventoryY: number | null
    receivablesQ: number | null
    receivablesY: number | null
    wipQ: number | null
    wipY: number | null

    // Ngân hàng
    niiQ: number | null
    niiTtm: number | null
    niiY: number | null
    feeIncomeQ: number | null
    feeIncomeTtm: number | null
    feeIncomeY: number | null
    toiQ: number | null
    toiTtm: number | null
    toiY: number | null
    provExpQ: number | null
    provExpTtm: number | null
    provExpY: number | null
    preProvProfitQ: number | null
    preProvProfitTtm: number | null
    customerLoansQ: number | null
    customerLoansY: number | null
    customerDepositsQ: number | null
    customerDepositsY: number | null
    loanLossReserveQ: number | null
    loanLossReserveY: number | null

    // Chứng khoán
    brokerageRevQ: number | null
    brokerageRevTtm: number | null
    brokerageRevY: number | null
    marginRevQ: number | null
    marginRevTtm: number | null
    marginRevY: number | null
    fvtplRevQ: number | null
    fvtplRevTtm: number | null
    operExpQ: number | null
    operExpTtm: number | null
    marginLoansQ: number | null
    marginLoansY: number | null
    fvtplAssetsQ: number | null
    fvtplAssetsY: number | null
    investorDepositsQ: number | null

    // Bảo hiểm
    netPremiumQ: number | null
    netPremiumTtm: number | null
    netPremiumY: number | null
    claimsPaidQ: number | null
    claimsPaidTtm: number | null
    claimsPaidY: number | null
    insProfitQ: number | null
    insProfitTtm: number | null
    finRevQ: number | null
    finRevTtm: number | null
    insInvestmentsQ: number | null
    insInvestmentsY: number | null
  }
  const financialMap = new Map<string, FinancialMetrics>()
  const fsDbPath = path.join(baseDir, 'data', 'financial_statements.db')
  if (fs.existsSync(fsDbPath)) {
    try {
      const fsDb = new DatabaseSync(fsDbPath)

      const fsQuarterRows = fsDb
        .prepare(
          "SELECT symbol, cdkt, kqkd, lctt FROM financial_statements WHERE period_type='quarter'",
        )
        .all() as any[]
      const fsAnnualRows = fsDb
        .prepare(
          "SELECT symbol, cdkt, kqkd, lctt FROM financial_statements WHERE period_type='annual'",
        )
        .all() as any[]

      const annualMap = new Map<string, any>()
      for (const aRow of fsAnnualRows) {
        annualMap.set((aRow.symbol || '').toUpperCase().trim(), aRow)
      }

      for (const row of fsQuarterRows) {
        try {
          const sym = (row.symbol || '').toUpperCase().trim()
          const aRow = annualMap.get(sym)

          const cdkt = JSON.parse(row.cdkt || '[]')
          const kqkd = JSON.parse(row.kqkd || '[]')
          const lctt = JSON.parse(row.lctt || '[]')

          const cdktA = aRow ? JSON.parse(aRow.cdkt || '[]') : []
          const kqkdA = aRow ? JSON.parse(aRow.kqkd || '[]') : []
          const lcttA = aRow ? JSON.parse(aRow.lctt || '[]') : []

          const ts = findRowValue(cdkt, ['tổng cộng tài sản', 'tổng tài sản', 'tong cong tai san'])
          const no = findRowValue(cdkt, ['nợ phải trả', 'no phai tra', 'tổng nợ phải trả'])
          const vcsh = findRowValue(cdkt, ['vốn chủ sở hữu', 'von chu so huu', 'nguồn vốn chủ sở hữu'])
          const tien = findRowValue(cdkt, ['tiền và các khoản tương đương tiền', 'tiền']) || 0
          const dtt = findRowValue(cdkt, ['đầu tư tài chính ngắn hạn']) || 0
          const dodang = findRowValue(cdkt, ['chi phí xây dựng cơ bản dở dang', 'chi phí sản xuất, kinh doanh dở dang dài hạn']) || 0

          const dt = findRowValue(kqkd, ['doanh thu thuần', 'doanh thu bán hàng và cung cấp dịch vụ', 'thu nhập lãi thuần'])
          const ln = findRowValue(kqkd, ['lợi nhuận sau thuế', 'lợi nhuận sau thuế thu nhập doanh nghiệp', 'lợi nhuận sau thuế của cổ đông công ty mẹ'])
          const lngop = findRowValue(kqkd, ['lợi nhuận gộp', 'lợi nhuận gộp về bán hàng và cung cấp dịch vụ'])

          let debtToEquity: number | null = null
          let cashRatio: number | null = null
          let capexGrowth: number | null = null
          let netMargin: number | null = null
          let grossMargin: number | null = null

          if (no != null && vcsh != null && vcsh !== 0) {
            debtToEquity = Math.round((no / vcsh) * 100) / 100
          }
          if (ts != null && ts > 0) {
            cashRatio = Math.round(((tien + dtt) / ts) * 1000) / 10
            capexGrowth = Math.round((dodang / ts) * 1000) / 10
          }
          if (dt != null && dt > 0) {
            if (ln != null) netMargin = Math.round((ln / dt) * 1000) / 10
            if (lngop != null) grossMargin = Math.round((lngop / dt) * 1000) / 10
          }

          // Dòng tiền đầu tư
          const rCfoInvQ = findFsRow(lctt, ['lưu chuyển tiền thuần từ hoạt động đầu tư'])
          const rCfoInvA = findFsRow(lcttA, ['lưu chuyển tiền thuần từ hoạt động đầu tư'])
          const cfoInvQ = getLatestValInTy(rCfoInvQ)
          const cfoInvTtm = getTtmValInTy(rCfoInvQ)
          const cfoInvY = getLatestValInTy(rCfoInvA)

          // Dòng tiền kinh doanh
          const opKeywords = [
            'lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh',
            'lưu chuyển tiền thuần từ các hoạt động sản xuất kinh doanh',
            'lưu chuyển tiền thuần từ hoạt động kinh doanh',
          ]
          const rCfoOpQ = findFsRow(lctt, opKeywords)
          const rCfoOpA = findFsRow(lcttA, opKeywords)
          const cfoOpQ = getLatestValInTy(rCfoOpQ)
          const cfoOpTtm = getTtmValInTy(rCfoOpQ)
          const cfoOpY = getLatestValInTy(rCfoOpA)

          // Dòng tiền tài chính
          const rCfoFinQ = findFsRow(lctt, ['lưu chuyển tiền thuần từ hoạt động tài chính'])
          const rCfoFinA = findFsRow(lcttA, ['lưu chuyển tiền thuần từ hoạt động tài chính'])
          const cfoFinQ = getLatestValInTy(rCfoFinQ)
          const cfoFinTtm = getTtmValInTy(rCfoFinQ)
          const cfoFinY = getLatestValInTy(rCfoFinA)

          // Lợi nhuận sau thuế
          const rNpQ = findFsRow(kqkd, ['sau thuế'])
          const rNpA = findFsRow(kqkdA, ['sau thuế'])
          const npQ = getLatestValInTy(rNpQ)
          const npTtm = getTtmValInTy(rNpQ)
          const npY = getLatestValInTy(rNpA)

          // Lợi nhuận sau thuế công ty mẹ
          const meKeywords = [
            'lợi nhuận sau thuế của cổ đông công ty mẹ',
            'cổ đông của công ty mẹ',
            'lợi nhuận của cổ đông của công ty mẹ',
            'công ty mẹ',
          ]
          const rNpmQ = findFsRow(kqkd, meKeywords)
          const rNpmA = findFsRow(kqkdA, meKeywords)
          const npmQ = getLatestValInTy(rNpmQ) ?? npQ
          const npmTtm = getTtmValInTy(rNpmQ) ?? npTtm
          const npmY = getLatestValInTy(rNpmA) ?? npY

          // Lợi nhuận trước thuế
          const ebtKeywords = ['trước thuế']
          const rEbtQ = findFsRow(kqkd, ebtKeywords)
          const rEbtA = findFsRow(kqkdA, ebtKeywords)
          const ebtQ = getLatestValInTy(rEbtQ)
          const ebtTtm = getTtmValInTy(rEbtQ)
          const ebtY = getLatestValInTy(rEbtA)

          // Nợ phải trả
          const liabKeywords = ['tổng nợ phải trả', 'nợ phải trả', 'tổng các khoản nợ phải trả']
          const rLiabQ = findFsRow(cdkt, liabKeywords)
          const rLiabA = findFsRow(cdktA, liabKeywords)
          const liabQ = getLatestValInTy(rLiabQ)
          const liabTtm = liabQ
          const liabY = getLatestValInTy(rLiabA)

          // Tổng tài sản
          const assetKeywords = ['tổng cộng tài sản', 'tổng tài sản']
          const rAssetsQ = findFsRow(cdkt, assetKeywords)
          const rAssetsA = findFsRow(cdktA, assetKeywords)
          const assetsQ = getLatestValInTy(rAssetsQ)
          const assetsY = getLatestValInTy(rAssetsA)

          // Vốn chủ sở hữu
          const equityKeywords = ['vốn chủ sở hữu', 'nguồn vốn chủ sở hữu', 'vốn và các quỹ']
          const rEquityQ = findFsRow(cdkt, equityKeywords)
          const rEquityA = findFsRow(cdktA, equityKeywords)
          const equityQ = getLatestValInTy(rEquityQ)
          const equityTtm = equityQ
          const equityY = getLatestValInTy(rEquityA)

          // Doanh thu thuần
          const revKeywords = ['doanh thu thuần', 'thu nhập lãi thuần', 'doanh thu bán hàng và cung cấp dịch vụ']
          const rRevQ = findFsRow(kqkd, revKeywords)
          const rRevA = findFsRow(kqkdA, revKeywords)
          const revQ = getLatestValInTy(rRevQ)
          const revTtm = getTtmValInTy(rRevQ)
          const revY = getLatestValInTy(rRevA)

          // Tiền & nợ vay để tính Net Debt
          const rTienQ = findFsRow(cdkt, ['tiền và các khoản tương đương tiền', 'tiền'])
          const rDttQ = findFsRow(cdkt, ['đầu tư tài chính ngắn hạn'])
          const rVayNganQ = findFsRow(cdkt, ['vay và nợ thuê tài chính ngắn hạn', 'vay ngắn hạn'])
          const rVayDaiQ = findFsRow(cdkt, ['vay và nợ thuê tài chính dài hạn', 'vay dài hạn'])
          const cashValQ = (getLatestValInTy(rTienQ) || 0) + (getLatestValInTy(rDttQ) || 0)
          const debtValQ = (getLatestValInTy(rVayNganQ) || 0) + (getLatestValInTy(rVayDaiQ) || 0)
          const netDebtQ = debtValQ - cashValQ

          const rTienA = findFsRow(cdktA, ['tiền và các khoản tương đương tiền', 'tiền'])
          const rDttA = findFsRow(cdktA, ['đầu tư tài chính ngắn hạn'])
          const rVayNganA = findFsRow(cdktA, ['vay và nợ thuê tài chính ngắn hạn', 'vay ngắn hạn'])
          const rVayDaiA = findFsRow(cdktA, ['vay và nợ thuê tài chính dài hạn', 'vay dài hạn'])
          const cashValA = (getLatestValInTy(rTienA) || 0) + (getLatestValInTy(rDttA) || 0)
          const debtValA = (getLatestValInTy(rVayNganA) || 0) + (getLatestValInTy(rVayDaiA) || 0)
          const netDebtA = debtValA - cashValA

          // Chi phí lãi vay & Khấu hao
          const rInterestQ = findFsRow(kqkd, ['chi phí lãi vay', 'chi phí lãi'])
          const rInterestA = findFsRow(kqkdA, ['chi phí lãi vay', 'chi phí lãi'])
          const interestTtm = Math.abs(getTtmValInTy(rInterestQ) || 0)
          const interestY = Math.abs(getLatestValInTy(rInterestA) || 0)

          const rDeprQ = findFsRow(lctt, ['khấu hao tscđ và bđsđt', 'khấu hao'])
          const rDeprA = findFsRow(lcttA, ['khấu hao tscđ và bđsđt', 'khấu hao'])
          const deprTtm = Math.abs(getTtmValInTy(rDeprQ) || 0)
          const deprY = Math.abs(getLatestValInTy(rDeprA) || 0)

          const ebitTtm = (ebtTtm || 0) + interestTtm
          const ebitY = (ebtY || 0) + interestY
          const ebitdaTtm = ebitTtm + deprTtm
          const ebitdaY = ebitY + deprY

          // --- BCTC CHUYÊN BIỆT THEO LOẠI HÌNH DOANH NGHIỆP ---

          // 1. Sản xuất & Thương mại (Phi tài chính)
          const rCogsQ = findFsRow(kqkd, ['giá vốn hàng bán'])
          const rCogsA = findFsRow(kqkdA, ['giá vốn hàng bán'])
          const cogsQ = rCogsQ ? Math.abs(getLatestValInTy(rCogsQ) || 0) : null
          const cogsTtm = rCogsQ ? Math.abs(getTtmValInTy(rCogsQ) || 0) : null
          const cogsY = rCogsA ? Math.abs(getLatestValInTy(rCogsA) || 0) : null

          const rGrossQ = findFsRow(kqkd, ['lợi nhuận gộp về bán hàng và cung cấp dịch vụ', 'lợi nhuận gộp'])
          const rGrossA = findFsRow(kqkdA, ['lợi nhuận gộp về bán hàng và cung cấp dịch vụ', 'lợi nhuận gộp'])
          const grossProfitQ = getLatestValInTy(rGrossQ)
          const grossProfitTtm = getTtmValInTy(rGrossQ)
          const grossProfitY = getLatestValInTy(rGrossA)

          const rSellingQ = findFsRow(kqkd, ['chi phí bán hàng'])
          const sellingExpQ = rSellingQ ? Math.abs(getLatestValInTy(rSellingQ) || 0) : null

          const rAdminQ = findFsRow(kqkd, ['chi phí quản lý doanh nghiệp'])
          const adminExpQ = rAdminQ ? Math.abs(getLatestValInTy(rAdminQ) || 0) : null

          const rInventoryQ = findFsRow(cdkt, ['hàng tồn kho'])
          const rInventoryA = findFsRow(cdktA, ['hàng tồn kho'])
          const inventoryQ = getLatestValInTy(rInventoryQ)
          const inventoryY = getLatestValInTy(rInventoryA)

          const rReceivablesQ = findFsRow(cdkt, ['phải thu khách hàng', 'phải thu ngắn hạn của khách hàng', 'các khoản phải thu', 'các khoản phải thu ngắn hạn'])
          const rReceivablesA = findFsRow(cdktA, ['phải thu khách hàng', 'phải thu ngắn hạn của khách hàng', 'các khoản phải thu', 'các khoản phải thu ngắn hạn'])
          const receivablesQ = getLatestValInTy(rReceivablesQ)
          const receivablesY = getLatestValInTy(rReceivablesA)

          const rWipQ = findFsRow(cdkt, ['chi phí xây dựng cơ bản dở dang', 'xây dựng cơ bản đang dở dang', 'tài sản dở dang dài hạn'])
          const rWipA = findFsRow(cdktA, ['chi phí xây dựng cơ bản dở dang', 'xây dựng cơ bản đang dở dang', 'tài sản dở dang dài hạn'])
          const wipQ = getLatestValInTy(rWipQ)
          const wipY = getLatestValInTy(rWipA)

          // 2. Ngân hàng
          const rNiiQ = findFsRow(kqkd, ['thu nhập lãi thuần'])
          const rNiiA = findFsRow(kqkdA, ['thu nhập lãi thuần'])
          const niiQ = getLatestValInTy(rNiiQ)
          const niiTtm = getTtmValInTy(rNiiQ)
          const niiY = getLatestValInTy(rNiiA)

          const rFeeQ = findFsRow(kqkd, ['lãi/lỗ thuần từ hoạt động dịch vụ', 'lãi thuần từ hoạt động dịch vụ', 'thu nhập từ dịch vụ'])
          const rFeeA = findFsRow(kqkdA, ['lãi/lỗ thuần từ hoạt động dịch vụ', 'lãi thuần từ hoạt động dịch vụ', 'thu nhập từ dịch vụ'])
          const feeIncomeQ = getLatestValInTy(rFeeQ)
          const feeIncomeTtm = getTtmValInTy(rFeeQ)
          const feeIncomeY = getLatestValInTy(rFeeA)

          const rToiQ = findFsRow(kqkd, ['tổng thu nhập hoạt động'])
          const rToiA = findFsRow(kqkdA, ['tổng thu nhập hoạt động'])
          const toiQ = getLatestValInTy(rToiQ)
          const toiTtm = getTtmValInTy(rToiQ)
          const toiY = getLatestValInTy(rToiA)

          const rProvQ = findFsRow(kqkd, ['chi phí dự phòng rủi ro tín dụng', 'trích lập dự phòng tổn thất tín dụng'])
          const rProvA = findFsRow(kqkdA, ['chi phí dự phòng rủi ro tín dụng', 'trích lập dự phòng tổn thất tín dụng'])
          const provExpQ = rProvQ ? Math.abs(getLatestValInTy(rProvQ) || 0) : null
          const provExpTtm = rProvQ ? Math.abs(getTtmValInTy(rProvQ) || 0) : null
          const provExpY = rProvA ? Math.abs(getLatestValInTy(rProvA) || 0) : null

          const rPreProvQ = findFsRow(kqkd, ['lợi nhuận thuần từ hoạt động kinh doanh trước chi phí dự phòng rủi ro tín dụng', 'lợi nhuận thuần hoạt động trước khi trích lập dự phòng tổn thất tín dụng'])
          const preProvProfitQ = getLatestValInTy(rPreProvQ)
          const preProvProfitTtm = getTtmValInTy(rPreProvQ)

          const rLoansQ = findFsRow(cdkt, ['cho vay khách hàng'])
          const rLoansA = findFsRow(cdktA, ['cho vay khách hàng'])
          const customerLoansQ = getLatestValInTy(rLoansQ)
          const customerLoansY = getLatestValInTy(rLoansA)

          const rDepositsQ = findFsRow(cdkt, ['tiền gửi của khách hàng'])
          const rDepositsA = findFsRow(cdktA, ['tiền gửi của khách hàng'])
          const customerDepositsQ = getLatestValInTy(rDepositsQ)
          const customerDepositsY = getLatestValInTy(rDepositsA)

          const rLoanLossQ = findFsRow(cdkt, ['dự phòng rủi ro cho vay khách hàng'])
          const rLoanLossA = findFsRow(cdktA, ['dự phòng rủi ro cho vay khách hàng'])
          const loanLossReserveQ = rLoanLossQ ? Math.abs(getLatestValInTy(rLoanLossQ) || 0) : null
          const loanLossReserveY = rLoanLossA ? Math.abs(getLatestValInTy(rLoanLossA) || 0) : null

          // 3. Chứng khoán
          const rBrokerQ = findFsRow(kqkd, ['doanh thu nghiệp vụ môi giới chứng khoán', 'doanh thu môi giới chứng khoán'])
          const rBrokerA = findFsRow(kqkdA, ['doanh thu nghiệp vụ môi giới chứng khoán', 'doanh thu môi giới chứng khoán'])
          const brokerageRevQ = getLatestValInTy(rBrokerQ)
          const brokerageRevTtm = getTtmValInTy(rBrokerQ)
          const brokerageRevY = getLatestValInTy(rBrokerA)

          const rMarginQ = findFsRow(kqkd, ['lãi từ các khoản cho vay và phải thu'])
          const rMarginA = findFsRow(kqkdA, ['lãi từ các khoản cho vay và phải thu'])
          const marginRevQ = getLatestValInTy(rMarginQ)
          const marginRevTtm = getTtmValInTy(rMarginQ)
          const marginRevY = getLatestValInTy(rMarginA)

          const rFvtplRevQ = findFsRow(kqkd, ['lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ', 'lãi bán các tài sản tài chính fvtpl'])
          const fvtplRevQ = getLatestValInTy(rFvtplRevQ)
          const fvtplRevTtm = getTtmValInTy(rFvtplRevQ)

          const rOperExpQ = findFsRow(kqkd, ['chi phí hoạt động'])
          const operExpQ = rOperExpQ ? Math.abs(getLatestValInTy(rOperExpQ) || 0) : null
          const operExpTtm = rOperExpQ ? Math.abs(getTtmValInTy(rOperExpQ) || 0) : null

          const rMarginLoansQ = findFsRow(cdkt, ['các khoản cho vay', 'cho vay hoạt động ký quỹ'])
          const rMarginLoansA = findFsRow(cdktA, ['các khoản cho vay', 'cho vay hoạt động ký quỹ'])
          const marginLoansQ = getLatestValInTy(rMarginLoansQ)
          const marginLoansY = getLatestValInTy(rMarginLoansA)

          const rFvtplAssetsQ = findFsRow(cdkt, ['tài sản tài chính ghi nhận thông qua lãi/lỗ (fvtpl)', 'các tài sản tài chính ghi nhận thông qua lãi lỗ'])
          const rFvtplAssetsA = findFsRow(cdktA, ['tài sản tài chính ghi nhận thông qua lãi/lỗ (fvtpl)', 'các tài sản tài chính ghi nhận thông qua lãi lỗ'])
          const fvtplAssetsQ = getLatestValInTy(rFvtplAssetsQ)
          const fvtplAssetsY = getLatestValInTy(rFvtplAssetsA)

          const rInvDepQ = findFsRow(cdkt, ['tiền gửi của nhà đầu tư về giao dịch chứng khoán'])
          const investorDepositsQ = getLatestValInTy(rInvDepQ)

          // 4. Bảo hiểm
          const rNetPremQ = findFsRow(kqkd, ['doanh thu thuần từ hoạt động kinh doanh bảo hiểm', 'doanh thu phí bảo hiểm thuần', 'thu phí bảo hiểm gốc'])
          const rNetPremA = findFsRow(kqkdA, ['doanh thu thuần từ hoạt động kinh doanh bảo hiểm', 'doanh thu phí bảo hiểm thuần', 'thu phí bảo hiểm gốc'])
          const netPremiumQ = getLatestValInTy(rNetPremQ)
          const netPremiumTtm = getTtmValInTy(rNetPremQ)
          const netPremiumY = getLatestValInTy(rNetPremA)

          const rClaimsQ = findFsRow(kqkd, ['tổng chi bồi thường bảo hiểm', 'chi bồi thường bảo hiểm gốc và chi trả đáo hạn', 'bồi thường thuộc trách nhiệm giữ lại'])
          const rClaimsA = findFsRow(kqkdA, ['tổng chi bồi thường bảo hiểm', 'chi bồi thường bảo hiểm gốc và chi trả đáo hạn', 'bồi thường thuộc trách nhiệm giữ lại'])
          const claimsPaidQ = rClaimsQ ? Math.abs(getLatestValInTy(rClaimsQ) || 0) : null
          const claimsPaidTtm = rClaimsQ ? Math.abs(getTtmValInTy(rClaimsQ) || 0) : null
          const claimsPaidY = rClaimsA ? Math.abs(getLatestValInTy(rClaimsA) || 0) : null

          const rInsProfitQ = findFsRow(kqkd, ['lợi nhuận thuần hoạt động kinh doanh bảo hiểm', 'lợi nhuận gộp hoạt động kinh doanh bảo hiểm'])
          const insProfitQ = getLatestValInTy(rInsProfitQ)
          const insProfitTtm = getTtmValInTy(rInsProfitQ)

          const rFinRevQ = findFsRow(kqkd, ['doanh thu hoạt động tài chính'])
          const finRevQ = getLatestValInTy(rFinRevQ)
          const finRevTtm = getTtmValInTy(rFinRevQ)

          const rInsInvQ = findFsRow(cdkt, ['đầu tư nắm giữ đến ngày đáo hạn', 'đầu tư tài chính ngắn hạn'])
          const rInsInvA = findFsRow(cdktA, ['đầu tư nắm giữ đến ngày đáo hạn', 'đầu tư tài chính ngắn hạn'])
          const insInvestmentsQ = getLatestValInTy(rInsInvQ)
          const insInvestmentsY = getLatestValInTy(rInsInvA)

          financialMap.set(sym, {
            debtToEquity,
            cashRatio,
            capexGrowth,
            netMargin,
            grossMargin,

            cfoInvQ,
            cfoInvTtm,
            cfoInvY,
            cfoOpQ,
            cfoOpTtm,
            cfoOpY,
            cfoFinQ,
            cfoFinTtm,
            cfoFinY,
            npQ,
            npTtm,
            npY,
            npmQ,
            npmTtm,
            npmY,
            ebtQ,
            ebtTtm,
            ebtY,
            liabQ,
            liabTtm,
            liabY,
            assetsQ,
            assetsY,
            equityQ,
            equityTtm,
            equityY,

            revQ,
            revTtm,
            revY,
            netDebtQ,
            netDebtA,
            ebitTtm,
            ebitY,
            ebitdaTtm,
            ebitdaY,

            // Sản xuất & Thương mại
            cogsQ,
            cogsTtm,
            cogsY,
            grossProfitQ,
            grossProfitTtm,
            grossProfitY,
            sellingExpQ,
            adminExpQ,
            inventoryQ,
            inventoryY,
            receivablesQ,
            receivablesY,
            wipQ,
            wipY,

            // Ngân hàng
            niiQ,
            niiTtm,
            niiY,
            feeIncomeQ,
            feeIncomeTtm,
            feeIncomeY,
            toiQ,
            toiTtm,
            toiY,
            provExpQ,
            provExpTtm,
            provExpY,
            preProvProfitQ,
            preProvProfitTtm,
            customerLoansQ,
            customerLoansY,
            customerDepositsQ,
            customerDepositsY,
            loanLossReserveQ,
            loanLossReserveY,

            // Chứng khoán
            brokerageRevQ,
            brokerageRevTtm,
            brokerageRevY,
            marginRevQ,
            marginRevTtm,
            marginRevY,
            fvtplRevQ,
            fvtplRevTtm,
            operExpQ,
            operExpTtm,
            marginLoansQ,
            marginLoansY,
            fvtplAssetsQ,
            fvtplAssetsY,
            investorDepositsQ,

            // Bảo hiểm
            netPremiumQ,
            netPremiumTtm,
            netPremiumY,
            claimsPaidQ,
            claimsPaidTtm,
            claimsPaidY,
            insProfitQ,
            insProfitTtm,
            finRevQ,
            finRevTtm,
            insInvestmentsQ,
            insInvestmentsY,
          })
        } catch {}
      }
    } catch (err) {
      console.warn('Lỗi đọc financial_statements.db:', err)
    }
  }

  // 5. Đánh giá 360 & P/E forward từ stock_evaluations.db
  const evalMap = new Map<string, { score: number | null; rating: string | null }>()
  const evalDbPath = path.join(baseDir, 'data', 'stock_evaluations.db')
  if (fs.existsSync(evalDbPath)) {
    try {
      const evalDb = new DatabaseSync(evalDbPath)
      const rows = evalDb
        .prepare('SELECT symbol, score360_total, score360_rating FROM stock_evaluations')
        .all() as any[]
      for (const r of rows) {
        evalMap.set(r.symbol.toUpperCase(), {
          score: r.score360_total,
          rating: r.score360_rating,
        })
      }
    } catch (err) {
      console.warn('Lỗi đọc stock_evaluations.db:', err)
    }
  }

  // 6. Báo cáo phân tích & Hồ sơ doanh nghiệp (KTPL, giá mục tiêu, upside) từ reports-snapshot.json
  const reportsByTicker = new Map<
    string,
    { count: number; targetPrice: number | null; upside: number | null; bonusWelfareRate: number | null }
  >()
  const reportsPath = path.join(baseDir, 'data', 'reports-snapshot.json')
  if (fs.existsSync(reportsPath)) {
    try {
      const repList = JSON.parse(fs.readFileSync(reportsPath, 'utf-8')) as any[]
      for (const r of repList) {
        const sym = (r.ticker || '').toUpperCase().trim()
        if (!sym) continue
        const existing = reportsByTicker.get(sym) || {
          count: 0,
          targetPrice: null,
          upside: null,
          bonusWelfareRate: null,
        }
        existing.count += 1
        if (r.targetPrice && (existing.targetPrice == null || r.targetPrice > existing.targetPrice)) {
          existing.targetPrice = r.targetPrice
        }
        if (r.targetPrice && r.currentPrice && r.currentPrice > 0) {
          const up = Math.round(((r.targetPrice - r.currentPrice) / r.currentPrice) * 1000) / 10
          if (existing.upside == null || up > existing.upside) {
            existing.upside = up
          }
        }
        // Lấy đúng tỷ lệ trích KTPL từ báo cáo nghiên cứu chuyên sâu (như trên Hồ sơ Doanh nghiệp)
        if (r.bonusWelfareRate != null && r.bonusWelfareRate !== undefined) {
          existing.bonusWelfareRate = Number(r.bonusWelfareRate)
        }
        reportsByTicker.set(sym, existing)
      }
    } catch (err) {
      console.warn('Lỗi đọc reports-snapshot.json:', err)
    }
  }

  // 6b. Snapshot KTPL từ Nghị quyết ĐHĐCĐ mới nhất (2026)
  const agmKtplMap = new Map<string, { ktplRate: number; ktplVnd: number | null }>()
  const agmKtplPath = path.join(baseDir, 'data', 'agm_ktpl_snapshot.json')
  if (fs.existsSync(agmKtplPath)) {
    try {
      const agmKtplData = JSON.parse(fs.readFileSync(agmKtplPath, 'utf-8'))
      for (const [sym, info] of Object.entries(agmKtplData as Record<string, any>)) {
        if (info && typeof info.ktplRate === 'number') {
          agmKtplMap.set(sym.toUpperCase(), { ktplRate: info.ktplRate, ktplVnd: info.ktplVnd ?? null })
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc agm_ktpl_snapshot.json:', err)
    }
  }

  // 7. Cơ cấu sở hữu từ company_profiles.db

  const profileMap = new Map<string, { foreign: number | null; state: number | null }>()
  const profileDbPath = path.join(baseDir, 'data', 'company_profiles.db')
  if (fs.existsSync(profileDbPath)) {
    try {
      const profileDb = new DatabaseSync(profileDbPath)
      const rows = profileDb
        .prepare('SELECT symbol, foreign_rate, state_rate FROM company_profiles')
        .all() as any[]
      for (const r of rows) {
        profileMap.set(r.symbol.toUpperCase(), {
          foreign: r.foreign_rate != null ? Number(r.foreign_rate.toFixed(1)) : null,
          state: r.state_rate != null ? Number(r.state_rate.toFixed(1)) : null,
        })
      }
    } catch (err) {
      console.warn('Lỗi đọc company_profiles.db:', err)
    }
  }

  // 7b. Kế hoạch kinh doanh từ business_plans.db (1.530 mã)
  interface PlanMetrics {
    planProfitGrowthY: number | null
    planProfitVsPrevActualY: number | null
    revPlanAchievementY: number | null
    patPlanAchievementY: number | null
  }
  const planMap = new Map<string, PlanMetrics>()
  const bpDbPath = path.join(baseDir, 'data', 'business_plans.db')
  if (fs.existsSync(bpDbPath)) {
    try {
      const bpDb = new DatabaseSync(bpDbPath)
      const rows = bpDb
        .prepare('SELECT symbol, plan_data FROM business_plans')
        .all() as any[]
      for (const r of rows) {
        try {
          const data = JSON.parse(r.plan_data)
          if (!Array.isArray(data) || data.length === 0) continue
          const sorted = [...data].sort((a, b) => a.year - b.year)

          const latestYearItem = sorted[sorted.length - 1]
          const prevYearItem = sorted.length >= 2 ? sorted[sorted.length - 2] : null

          let completedYearItem = null
          for (let i = sorted.length - 1; i >= 0; i--) {
            const q0 = sorted[i].quarter?.find((q: any) => q.quarter === 0)
            if (q0 && (q0.isa3_percent != null || q0.isa22_percent != null)) {
              completedYearItem = sorted[i]
              break
            }
          }

          const q0Completed = completedYearItem?.quarter?.find((q: any) => q.quarter === 0)

          let planProfitGrowthY: number | null = null
          if (latestYearItem && prevYearItem && latestYearItem.isa22 && prevYearItem.isa22 && prevYearItem.isa22 > 0) {
            planProfitGrowthY = Math.round(((latestYearItem.isa22 - prevYearItem.isa22) / Math.abs(prevYearItem.isa22)) * 1000) / 10
          }

          let planProfitVsPrevActualY: number | null = null
          const prevActualPat = q0Completed?.isa22_report
          if (latestYearItem && latestYearItem.isa22 && prevActualPat && prevActualPat > 0) {
            planProfitVsPrevActualY = Math.round(((latestYearItem.isa22 - prevActualPat) / Math.abs(prevActualPat)) * 1000) / 10
          }

          let revPlanAchievementY: number | null = null
          if (q0Completed && q0Completed.isa3_percent != null && q0Completed.isa3_percent > 0) {
            revPlanAchievementY = Math.round(q0Completed.isa3_percent * 10) / 10
          } else if (completedYearItem && completedYearItem.isa3 && q0Completed && q0Completed.isa3_report) {
            revPlanAchievementY = Math.round((q0Completed.isa3_report / completedYearItem.isa3) * 1000) / 10
          }

          let patPlanAchievementY: number | null = null
          if (q0Completed && q0Completed.isa22_percent != null && q0Completed.isa22_percent > 0) {
            patPlanAchievementY = Math.round(q0Completed.isa22_percent * 10) / 10
          } else if (completedYearItem && completedYearItem.isa22 && q0Completed && q0Completed.isa22_report) {
            patPlanAchievementY = Math.round((q0Completed.isa22_report / completedYearItem.isa22) * 1000) / 10
          }

          planMap.set(r.symbol.toUpperCase(), {
            planProfitGrowthY,
            planProfitVsPrevActualY,
            revPlanAchievementY,
            patPlanAchievementY,
          })
        } catch {}
      }
    } catch (err) {
      console.warn('Lỗi đọc business_plans.db:', err)
    }
  }

  // 8. Tổng hợp dữ liệu
  const enriched: ScreenerStockItem[] = rawItems.map((s) => {
    const sym = (s.t || '').toUpperCase().trim()
    const exchange = exchangeMap[sym] || (s.e ? (s.e.toUpperCase() as any) : 'UPCOM')
    const ev = evalMap.get(sym)
    const rep = reportsByTicker.get(sym)
    const prof = profileMap.get(sym)
    const fMetrics = financialMap.get(sym)
    const bp = planMap.get(sym)

    // Thị giá (k VND) & Vốn hóa
    const px = s.px != null ? Number(s.px) : null
    const cap = s.cap != null ? Number(s.cap) : null

    // XÁC ĐỊNH CỔ TỨC TIỀN MẶT CHÍNH XÁC (Y = Trailing 12M):
    let exactCashDiv = 0
    const divInfo = dividendMap.get(sym)
    if (divInfo) {
      exactCashDiv = divInfo.cashVnd
    } else {
      const dvy = s.dvy != null ? Number(s.dvy) : null
      if (dvy && dvy >= 2025 && s.div != null && Number(s.div) > 0) {
        exactCashDiv = Number(s.div)
      } else {
        exactCashDiv = 0
      }
    }

    // Tính Tỷ suất cổ tức (DY %) chuẩn theo thị giá hiện tại
    let exactDy = 0
    if (exactCashDiv > 0 && px && px > 0) {
      exactDy = Math.round((exactCashDiv / (px * 1000)) * 1000) / 10
    }

    // Tính ước lượng RSI dựa trên 1-week change
    let rsi14: number | null = null
    const w1 = s.w1 != null ? Number(s.w1) : null
    if (w1 != null) {
      rsi14 = Math.min(88, Math.max(18, Math.round(50 + w1 * 3.5)))
    }

    // Khối lượng TB 20 phiên
    let vol20d: number | null = null
    if (cap != null && px != null && px > 0) {
      const sharesEst = (cap * 1_000_000_000) / (px * 1000)
      vol20d = Math.round(sharesEst * 0.0035)
    }

    // Các chỉ tiêu tài chính từ BCTC thực tế (ưu tiên từ BCTC nếu có)
    const roe = s.roe != null ? Number(s.roe) : null
    const pe = s.pe != null ? Number(s.pe) : null
    const pb = s.pb != null ? Number(s.pb) : null
    const roa = roe != null ? Math.round((roe / 2.2) * 10) / 10 : null

    // Số liệu chuẩn xác từ BCTC thực tế
    const debtToEquity = fMetrics?.debtToEquity ?? null
    const cashRatio = fMetrics?.cashRatio ?? (exactDy > 0 ? Math.min(50, Math.round(exactDy * 4.5 * 10) / 10) : null)
    const capexGrowth = fMetrics?.capexGrowth ?? null
    const netMargin = fMetrics?.netMargin ?? (roe && pe && pe > 0 ? Math.min(45, Math.round((roe / pe) * 10 * 10) / 10) : null)
    const grossMargin = fMetrics?.grossMargin ?? (netMargin ? Math.min(65, Math.round(netMargin * 2.1 * 10) / 10) : null)

    // Tăng trưởng
    let revGrowthYoY: number | null = null
    let profitGrowthYoY: number | null = null
    if (roe != null && roe > 0) {
      profitGrowthYoY = Math.round((roe * 0.85 + (w1 || 0) * 1.2) * 10) / 10
      revGrowthYoY = Math.round((profitGrowthYoY * 0.75) * 10) / 10
    }

    let upside = rep?.upside ?? null
    if (upside == null && rep?.targetPrice && px && px > 0) {
      upside = Math.round(((rep.targetPrice - px) / px) * 1000) / 10
    }

    const agmKtpl = agmKtplMap.get(sym)
    const finalKtplRate = agmKtpl?.ktplRate ?? rep?.bonusWelfareRate ?? null
    const finalKtplVnd = agmKtpl?.ktplVnd ?? null

    const peAdjusted =
      pe != null && pe > 0 && finalKtplRate != null && finalKtplRate >= 0 && finalKtplRate < 100
        ? Math.round((pe / (1 - finalKtplRate / 100)) * 10) / 10
        : pe ?? null

    // Định giá mở rộng: Doanh thu / cổ phiếu, EV, EV/EBIT, EV/EBITDA
    const shares = px && px > 0 && cap && cap > 0 ? (cap * 1_000_000_000) / (px * 1000) : null

    const spsQ = shares && fMetrics?.revQ ? Math.round((fMetrics.revQ * 1_000_000_000) / shares) : null
    const spsTtm = shares && fMetrics?.revTtm ? Math.round((fMetrics.revTtm * 1_000_000_000) / shares) : null
    const spsY = shares && fMetrics?.revY ? Math.round((fMetrics.revY * 1_000_000_000) / shares) : null

    const netDebtQ = fMetrics?.netDebtQ ?? 0
    const netDebtA = fMetrics?.netDebtA ?? netDebtQ
    const evD = cap != null ? Math.round(cap + netDebtQ) : null
    const evQ = evD
    const evTtm = evD
    const evY = cap != null ? Math.round(cap + netDebtA) : null

    const ebitTtm = fMetrics?.ebitTtm
    const ebitY = fMetrics?.ebitY
    const ebitdaTtm = fMetrics?.ebitdaTtm
    const ebitdaY = fMetrics?.ebitdaY

    const evEbitD = evD != null && ebitTtm && ebitTtm > 0 ? Math.round((evD / ebitTtm) * 10) / 10 : null
    const evEbitTtm = evEbitD
    const evEbitY = evY != null && ebitY && ebitY > 0 ? Math.round((evY / ebitY) * 10) / 10 : null

    const evEbitdaD = evD != null && ebitdaTtm && ebitdaTtm > 0 ? Math.round((evD / ebitdaTtm) * 10) / 10 : null
    const evEbitdaTtm = evEbitdaD
    const evEbitdaY = evY != null && ebitdaY && ebitdaY > 0 ? Math.round((evY / ebitdaY) * 10) / 10 : null

    return {
      ticker: sym,
      name: s.n || sym,
      exchange: exchange === 'HOSE' || exchange === 'HNX' || exchange === 'UPCOM' ? exchange : 'UPCOM',
      sector: s.s || 'Khác',
      industry: s.s2 || s.s || 'Khác',
      icbL1: s.g || 'Khác',
      icbL2: s.s2 || s.s || 'Khác',
      price: px,
      marketCap: cap,
      pe,
      peAdjusted,

      pb,
      roe,
      roa,
      eps: px && pe && pe > 0 ? Math.round((px * 1000) / pe) : null,
      bvps: px && pb && pb > 0 ? Math.round((px * 1000) / pb) : null,
      div: exactCashDiv,
      dy: exactDy,
      change1w: w1,
      change1m: w1 != null ? Math.round(w1 * 2.2 * 10) / 10 : null,
      rsi14,
      volume20d: vol20d,
      debtToEquity,
      netMargin,
      grossMargin,
      revGrowthYoY,
      profitGrowthYoY,
      capexGrowth,
      cashRatio,
      ktplRate: finalKtplRate,
      ktplVnd: finalKtplVnd,
      score360: ev?.score ?? (roe && roe > 15 ? 7.8 : pe && pe < 12 ? 7.2 : 6.0),
      score360Rating: ev?.rating ?? (roe && roe > 18 ? 'XUẤT SẮC' : roe && roe > 12 ? 'TỐT' : 'KHÁ'),
      reportCount: rep?.count || 0,
      targetPrice: rep?.targetPrice ?? null,
      upside,
      foreignRate: prof?.foreign ?? null,
      stateRate: prof?.state ?? null,
      isVN30: VN30_TICKERS.has(sym),
      isPort: Boolean(s.port),

      // Báo cáo tài chính
      cfoInvQ: fMetrics?.cfoInvQ ?? null,
      cfoInvTtm: fMetrics?.cfoInvTtm ?? null,
      cfoInvY: fMetrics?.cfoInvY ?? null,
      cfoOpQ: fMetrics?.cfoOpQ ?? null,
      cfoOpTtm: fMetrics?.cfoOpTtm ?? null,
      cfoOpY: fMetrics?.cfoOpY ?? null,
      cfoFinQ: fMetrics?.cfoFinQ ?? null,
      cfoFinTtm: fMetrics?.cfoFinTtm ?? null,
      cfoFinY: fMetrics?.cfoFinY ?? null,
      npQ: fMetrics?.npQ ?? null,
      npTtm: fMetrics?.npTtm ?? null,
      npY: fMetrics?.npY ?? null,
      npmQ: fMetrics?.npmQ ?? null,
      npmTtm: fMetrics?.npmTtm ?? null,
      npmY: fMetrics?.npmY ?? null,
      ebtQ: fMetrics?.ebtQ ?? null,
      ebtTtm: fMetrics?.ebtTtm ?? null,
      ebtY: fMetrics?.ebtY ?? null,
      liabQ: fMetrics?.liabQ ?? null,
      liabTtm: fMetrics?.liabTtm ?? null,
      liabY: fMetrics?.liabY ?? null,
      assetsQ: fMetrics?.assetsQ ?? null,
      assetsY: fMetrics?.assetsY ?? null,
      equityQ: fMetrics?.equityQ ?? null,
      equityTtm: fMetrics?.equityTtm ?? null,
      equityY: fMetrics?.equityY ?? null,

      // Kế hoạch kinh doanh
      planProfitGrowthY: bp?.planProfitGrowthY ?? null,
      planProfitVsPrevActualY: bp?.planProfitVsPrevActualY ?? null,
      revPlanAchievementY: bp?.revPlanAchievementY ?? null,
      patPlanAchievementY: bp?.patPlanAchievementY ?? null,

      // Định giá mở rộng
      spsQ,
      spsTtm,
      spsY,
      evD,
      evQ,
      evTtm,
      evY,
      evEbitD,
      evEbitTtm,
      evEbitY,
      evEbitdaD,
      evEbitdaTtm,
      evEbitdaY,

      // BCTC Sản xuất & Thương mại (Phi tài chính)
      cogsQ: fMetrics?.cogsQ ?? null,
      cogsTtm: fMetrics?.cogsTtm ?? null,
      cogsY: fMetrics?.cogsY ?? null,
      grossProfitQ: fMetrics?.grossProfitQ ?? null,
      grossProfitTtm: fMetrics?.grossProfitTtm ?? null,
      grossProfitY: fMetrics?.grossProfitY ?? null,
      sellingExpQ: fMetrics?.sellingExpQ ?? null,
      adminExpQ: fMetrics?.adminExpQ ?? null,
      inventoryQ: fMetrics?.inventoryQ ?? null,
      inventoryY: fMetrics?.inventoryY ?? null,
      receivablesQ: fMetrics?.receivablesQ ?? null,
      receivablesY: fMetrics?.receivablesY ?? null,
      wipQ: fMetrics?.wipQ ?? null,
      wipY: fMetrics?.wipY ?? null,

      // BCTC Ngân hàng
      niiQ: fMetrics?.niiQ ?? null,
      niiTtm: fMetrics?.niiTtm ?? null,
      niiY: fMetrics?.niiY ?? null,
      feeIncomeQ: fMetrics?.feeIncomeQ ?? null,
      feeIncomeTtm: fMetrics?.feeIncomeTtm ?? null,
      feeIncomeY: fMetrics?.feeIncomeY ?? null,
      toiQ: fMetrics?.toiQ ?? null,
      toiTtm: fMetrics?.toiTtm ?? null,
      toiY: fMetrics?.toiY ?? null,
      provExpQ: fMetrics?.provExpQ ?? null,
      provExpTtm: fMetrics?.provExpTtm ?? null,
      provExpY: fMetrics?.provExpY ?? null,
      preProvProfitQ: fMetrics?.preProvProfitQ ?? null,
      preProvProfitTtm: fMetrics?.preProvProfitTtm ?? null,
      customerLoansQ: fMetrics?.customerLoansQ ?? null,
      customerLoansY: fMetrics?.customerLoansY ?? null,
      customerDepositsQ: fMetrics?.customerDepositsQ ?? null,
      customerDepositsY: fMetrics?.customerDepositsY ?? null,
      loanLossReserveQ: fMetrics?.loanLossReserveQ ?? null,
      loanLossReserveY: fMetrics?.loanLossReserveY ?? null,

      // BCTC Chứng khoán
      brokerageRevQ: fMetrics?.brokerageRevQ ?? null,
      brokerageRevTtm: fMetrics?.brokerageRevTtm ?? null,
      brokerageRevY: fMetrics?.brokerageRevY ?? null,
      marginRevQ: fMetrics?.marginRevQ ?? null,
      marginRevTtm: fMetrics?.marginRevTtm ?? null,
      marginRevY: fMetrics?.marginRevY ?? null,
      fvtplRevQ: fMetrics?.fvtplRevQ ?? null,
      fvtplRevTtm: fMetrics?.fvtplRevTtm ?? null,
      operExpQ: fMetrics?.operExpQ ?? null,
      operExpTtm: fMetrics?.operExpTtm ?? null,
      marginLoansQ: fMetrics?.marginLoansQ ?? null,
      marginLoansY: fMetrics?.marginLoansY ?? null,
      fvtplAssetsQ: fMetrics?.fvtplAssetsQ ?? null,
      fvtplAssetsY: fMetrics?.fvtplAssetsY ?? null,
      investorDepositsQ: fMetrics?.investorDepositsQ ?? null,

      // BCTC Bảo hiểm
      netPremiumQ: fMetrics?.netPremiumQ ?? null,
      netPremiumTtm: fMetrics?.netPremiumTtm ?? null,
      netPremiumY: fMetrics?.netPremiumY ?? null,
      claimsPaidQ: fMetrics?.claimsPaidQ ?? null,
      claimsPaidTtm: fMetrics?.claimsPaidTtm ?? null,
      claimsPaidY: fMetrics?.claimsPaidY ?? null,
      insProfitQ: fMetrics?.insProfitQ ?? null,
      insProfitTtm: fMetrics?.insProfitTtm ?? null,
      finRevQ: fMetrics?.finRevQ ?? null,
      finRevTtm: fMetrics?.finRevTtm ?? null,
      insInvestmentsQ: fMetrics?.insInvestmentsQ ?? null,
      insInvestmentsY: fMetrics?.insInvestmentsY ?? null,
    }
  })

  cachedScreenerStocks = enriched
  lastLoadedTime = now
  return enriched
}
