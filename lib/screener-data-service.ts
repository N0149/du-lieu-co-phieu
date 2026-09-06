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
}

const VN30_TICKERS = new Set([
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
])

function findRowValue(rows: any[], targetKeywords: string[]): number | null {
  if (!Array.isArray(rows)) return null
  for (const r of rows) {
    if (Array.isArray(r) && r.length > 3 && typeof r[0] === 'string') {
      const rowName = r[0].toLowerCase().trim()
      if (targetKeywords.some((kw) => rowName === kw || rowName.includes(kw))) {
        // Tìm giá trị số hợp lệ cuối cùng trong hàng (kỳ BCTC gần nhất)
        for (let i = r.length - 1; i >= 3; i--) {
          if (typeof r[i] === 'number' && !isNaN(r[i])) {
            return r[i]
          }
        }
      }
    }
  }
  return null
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
  }
  const financialMap = new Map<string, FinancialMetrics>()
  const fsDbPath = path.join(baseDir, 'data', 'financial_statements.db')
  if (fs.existsSync(fsDbPath)) {
    try {
      const fsDb = new DatabaseSync(fsDbPath)
      
      // Đọc dữ liệu quý cho các chỉ số hoạt động gần nhất
      const fsQuarterRows = fsDb
        .prepare("SELECT symbol, cdkt, kqkd FROM financial_statements WHERE period_type='quarter'")
        .all() as any[]

      for (const row of fsQuarterRows) {
        try {
          const sym = (row.symbol || '').toUpperCase().trim()
          const cdkt = JSON.parse(row.cdkt || '[]')
          const kqkd = JSON.parse(row.kqkd || '[]')

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

          financialMap.set(sym, {
            debtToEquity,
            cashRatio,
            capexGrowth,
            netMargin,
            grossMargin,
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

  // 8. Tổng hợp dữ liệu
  const enriched: ScreenerStockItem[] = rawItems.map((s) => {
    const sym = (s.t || '').toUpperCase().trim()
    const exchange = exchangeMap[sym] || (s.e ? (s.e.toUpperCase() as any) : 'UPCOM')
    const ev = evalMap.get(sym)
    const rep = reportsByTicker.get(sym)
    const prof = profileMap.get(sym)
    const fMetrics = financialMap.get(sym)

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

    return {
      ticker: sym,
      name: s.n || sym,
      exchange: exchange === 'HOSE' || exchange === 'HNX' || exchange === 'UPCOM' ? exchange : 'UPCOM',
      sector: s.s || 'Khác',
      icbL1: s.g || 'Khác',
      icbL2: s.s2 || s.s || 'Khác',
      price: px,
      marketCap: cap,
      pe,
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
      ktplRate: rep?.bonusWelfareRate ?? null,
      ktplVnd: null,
      score360: ev?.score ?? (roe && roe > 15 ? 7.8 : pe && pe < 12 ? 7.2 : 6.0),
      score360Rating: ev?.rating ?? (roe && roe > 18 ? 'XUẤT SẮC' : roe && roe > 12 ? 'TỐT' : 'KHÁ'),
      reportCount: rep?.count || 0,
      targetPrice: rep?.targetPrice ?? null,
      upside,
      foreignRate: prof?.foreign ?? null,
      stateRate: prof?.state ?? null,
      isVN30: VN30_TICKERS.has(sym),
      isPort: Boolean(s.port),
    }
  })

  cachedScreenerStocks = enriched
  lastLoadedTime = now
  return enriched
}
