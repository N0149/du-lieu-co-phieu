import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getLiveStockQuote, type LiveStockQuote } from './live-quote-service'

let supabaseInstance: SupabaseClient | null = null
function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxtmuwrpuywrkclobfpa.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jjx3eb2edh-gxHZKYEZIog_UyWNqV9Z'
  if (!url || !key) return null
  supabaseInstance = createClient(url, key)
  return supabaseInstance
}

const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'

export interface StockEvaluationData {
  symbol: string
  score360: {
    total: number
    ratingText: string
    peVsMedian: number | null
    pbVsMedian: number | null
    psVsMedian: number | null
    peForward: number | null
    peForwardVsMedian: number | null
    pbForward: number | null
    pbForwardVsMedian: number | null
  } | null
  price: number | null // in VNĐ (e.g. 32100)
  priceChange?: number | null // in thousand VNĐ (e.g. -1.30)
  priceChangePct?: number | null // in % (e.g. -3.89)
  tradingDate?: string | null // DD/MM/YYYY
  tradingTime?: string | null // HH:mm:ss
  basicPrice?: number | null // in VNĐ
  metrics: {
    marketCap: number | null // in tỷ (T)
    pe: number | null
    eps: number | null
    volume10d: number | null
    pb: number | null
    ps: number | null
    bvps: number | null
    sharesOut: number | null
    evEbitda: number | null
    beta: number | null
    auditor?: string | null
    isBig4?: boolean | null
    bookValue?: number | null
  }
}

export function formatAuditorShortName(name: string | null | undefined): string {
  if (!name) return '—'
  const lower = name.toLowerCase()
  if (lower.includes('pwc') || lower.includes('pricewaterhouse')) return 'PWC'
  if (lower.includes('kpmg')) return 'KPMG'
  if (lower.includes('ernst') || lower.includes('& young') || lower.includes('ey')) return 'EY'
  if (lower.includes('deloitte')) return 'Deloitte'
  if (lower.includes('a&c') || lower.includes('a & c')) return 'A&C'
  if (lower.includes('aasc')) return 'AASC'
  if (lower.includes('rsm')) return 'RSM'
  if (lower.includes('bdo')) return 'BDO'
  if (lower.includes('grant thornton')) return 'Grant Thornton'
  if (lower.includes('vaco')) return 'VACO'
  if (lower.includes('cpa')) return 'CPA VN'
  if (lower.includes('uhy')) return 'UHY'
  if (lower.includes('moore')) return 'Moore AIS'
  return name
    .replace(/^công ty\s+(tnhh|trách nhiệm hữu hạn|cổ phần|cp)\s+/i, '')
    .replace(/^kiểm toán\s+(và\s+tư\s+vấn\s+)?/i, '')
    .replace(/\s+việt nam$/i, '')
    .trim() || name
}

let cryptoKeyCache: CryptoKey | null = null
async function getCryptoKey() {
  if (cryptoKeyCache) return cryptoKeyCache
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
  cryptoKeyCache = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt'])
  return cryptoKeyCache
}

async function decryptApiResponse(res: Response): Promise<any> {
  if (res.headers.get('X-Encrypted') !== '1') {
    return await res.json()
  }
  const buf = await res.arrayBuffer()
  const key = await getCryptoKey()
  const rawBytes = new Uint8Array(buf)
  const iv = rawBytes.slice(0, 12)
  const ciphertext = rawBytes.slice(12)
  const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(decryptedBuf))
}

const CACHE_DIR = path.join(process.cwd(), 'data', 'evaluation_cache')

function applyLiveQuote(target: StockEvaluationData, quote: LiveStockQuote | null): StockEvaluationData {
  if (!quote) return target

  target.price = quote.price
  target.priceChange = quote.change
  target.priceChangePct = quote.changePercent
  target.tradingDate = quote.tradingDate
  target.tradingTime = quote.tradingTime
  target.basicPrice = quote.basicPrice

  // Chuẩn hóa marketCap nếu lưu dạng số thô quá lớn (> 10 tỷ) -> chuyển về tỷ đồng
  if (target.metrics.marketCap && target.metrics.marketCap > 10_000_000_000) {
    target.metrics.marketCap = Math.round(target.metrics.marketCap / 1_000_000_000)
  }

  // Tự động đồng bộ P/E, P/B và Vốn hóa theo giá live mới nhất
  if (quote.price > 0) {
    if (target.metrics.eps && target.metrics.eps > 0) {
      target.metrics.pe = Math.round((quote.price / target.metrics.eps) * 100) / 100
    }
    if (target.metrics.bvps && target.metrics.bvps > 0) {
      target.metrics.pb = Math.round((quote.price / target.metrics.bvps) * 100) / 100
    }
    if (target.metrics.sharesOut && target.metrics.sharesOut > 0) {
      // Vốn hóa theo tỷ đồng (VNĐ * shares / 10^9)
      target.metrics.marketCap = Math.round((quote.price * target.metrics.sharesOut) / 1_000_000_000)
    }
  }

  return target
}

const DB_EVAL_PATH = path.resolve(process.cwd(), 'data', 'stock_evaluations.db')

function getEvaluationFromDb(sym: string): any {
  if (!fs.existsSync(DB_EVAL_PATH)) return null
  try {
    const db = new DatabaseSync(DB_EVAL_PATH, { readOnly: true })
    try {
      const row = db
        .prepare(
          `SELECT symbol, score360_total, score360_rating, pe_vs_median, pb_vs_median, ps_vs_median,
                  pe_forward, pb_forward, pe_forward_vs_median, pb_forward_vs_median, raw_json
           FROM stock_evaluations
           WHERE symbol = ?`
        )
        .get(sym) as any
      return row || null
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

let summaryCache: Record<string, any> | null = null
function getStockEvaluationSummary(sym: string): any {
  if (!summaryCache) {
    const summaryPath = path.resolve(process.cwd(), 'data', 'stock_evaluations_summary.json')
    if (fs.existsSync(summaryPath)) {
      try {
        summaryCache = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
      } catch {}
    }
  }
  return summaryCache ? summaryCache[sym] || null : null
}

/**
 * Lấy khối lượng giao dịch bình quân 15 phiên gần nhất (KLGD TB15D)
 * Đọc trực tiếp từ kho dữ liệu lịch sử giá cục bộ (0ms, 100% offline)
 */
export function getAvgTradingVol15d(symbol: string): number | null {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  try {
    const p = path.join(process.cwd(), 'data', 'price_history', `${sym}.json`)
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.points) && parsed.points.length > 0) {
      const last15 = parsed.points.slice(-15)
      const sum = last15.reduce((acc: number, pt: any) => acc + (Number(pt.volume) || 0), 0)
      return Math.round(sum / last15.length)
    }
  } catch {}

  return null
}

const MONEY_COMPANY_CACHE = new Map<string, { data: any; expiresAt: number }>()
const MONEY_CACHE_TTL_MS = 10 * 60 * 1000 // 10 phút RAM cache

async function fetchCompanyMoneyData(sym: string): Promise<any> {
  const now = Date.now()
  const cached = MONEY_COMPANY_CACHE.get(sym)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  try {
    const res = await fetch(`https://api-finance-t19.24hmoney.vn/v2/ios/companies/index?symbol=${encodeURIComponent(sym.toLowerCase())}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(800),
      next: { revalidate: 600 },
    })
    if (res.ok) {
      const json = await res.json()
      const d = json?.data || null
      if (d) {
        MONEY_COMPANY_CACHE.set(sym, { data: d, expiresAt: now + MONEY_CACHE_TTL_MS })
      }
      return d
    }
  } catch {}

  return cached?.data || null
}

export async function getStockEvaluation(symbol: string): Promise<StockEvaluationData | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  // 1. Tải đồng thời live quote và thông tin mở rộng từ RAM cache hoặc 24hMoney
  const [liveQuote, moneyData] = await Promise.all([
    getLiveStockQuote(sym).catch(() => null),
    fetchCompanyMoneyData(sym),
  ])

  // 2. Đọc dữ liệu đánh giá 360° từ SQLite nội bộ (1.368 mã, < 0.2ms)
  let dbRow = getEvaluationFromDb(sym)

  let valData: any = null
  if (dbRow?.raw_json) {
    try {
      valData = typeof dbRow.raw_json === 'string' ? JSON.parse(dbRow.raw_json) : dbRow.raw_json
    } catch {}
  }

  // Fallback đọc từ file cache nếu có
  if (!valData) {
    const cacheFile = path.join(CACHE_DIR, `${sym}.json`)
    if (fs.existsSync(cacheFile)) {
      try {
        valData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      } catch {}
    }
  }

  // 2b. Fallback đọc từ tóm tắt siêu nhẹ bundle kèm web (0.01ms)
  if (!dbRow && !valData) {
    const sum = getStockEvaluationSummary(sym)
    if (sum) {
      dbRow = {
        score360_total: sum.score,
        score360_rating: sum.rating,
        pe_vs_median: sum.pe_m,
        pb_vs_median: sum.pb_m,
        ps_vs_median: sum.ps_m,
        pe_forward: sum.pe_f,
        pb_forward: sum.pb_f,
        pe_forward_vs_median: sum.pe_fm,
        pb_forward_vs_median: sum.pb_fm,
      }
      valData = {
        snapshot: {
          price: sum.price,
          market_cap_bn: sum.mc,
          pe: sum.pe,
          pb: sum.pb,
          ps: sum.ps,
          eps: sum.eps,
          bvps: sum.bvps,
        },
        lastEps: sum.eps,
        lastBvps: sum.bvps,
        lastCirculationVol: sum.shares,
      }
    }
  }

  // 3. Fallback đọc từ Supabase Cloud Database (<25ms, Vercel 24/7 khi tắt máy)
  if (!dbRow && !valData) {
    try {
      const supabase = getSupabase()
      if (supabase) {
        const { data, error } = await supabase
          .from('stock_evaluations')
          .select('*')
          .eq('symbol', sym)
          .maybeSingle()
        if (!error && data) {
          dbRow = data
          if (data.raw_json) {
            valData = typeof data.raw_json === 'string' ? JSON.parse(data.raw_json) : data.raw_json
          }
        }
      }
    } catch {}
  }

  const s = valData?.snapshot
  const score = dbRow?.score360_total ?? s?.score360_total ?? null

  let ratingText = dbRow?.score360_rating || 'TRUNG BÌNH'
  if (score != null && !dbRow?.score360_rating) {
    if (score >= 8.0) ratingText = 'XUẤT SẮC'
    else if (score >= 6.5) ratingText = 'TỐT'
    else if (score >= 5.0) ratingText = 'KHÁ'
    else ratingText = 'CẦN LƯU Ý'
  }

  const auditor = formatAuditorShortName(moneyData?.audit_firm_name)
  const isBig4 = Boolean(moneyData?.audit_is_big4)
  const bookValue = moneyData?.book_value ?? null
  const localVol15d = getAvgTradingVol15d(sym)
  const volumeFinal = localVol15d ?? moneyData?.avg_trading_vol ?? liveQuote?.volume ?? null

  const result: StockEvaluationData = {
    symbol: sym,
    score360:
      score != null
        ? {
            total: score,
            ratingText,
            peVsMedian: dbRow?.pe_vs_median ?? s?.pe_vs_median ?? null,
            pbVsMedian: dbRow?.pb_vs_median ?? s?.pb_vs_median ?? null,
            psVsMedian: dbRow?.ps_vs_median ?? s?.ps_vs_median ?? null,
            peForward: dbRow?.pe_forward ?? s?.pe_forward ?? null,
            peForwardVsMedian: dbRow?.pe_forward_vs_median ?? s?.pe_forward_vs_median ?? null,
            pbForward: dbRow?.pb_forward ?? s?.pb_forward ?? null,
            pbForwardVsMedian: dbRow?.pb_forward_vs_median ?? s?.pb_forward_vs_median ?? null,
          }
        : null,
    price: s?.price != null ? s.price : null,
    metrics: {
      marketCap: s?.market_cap_bn ?? null,
      pe: s?.pe ?? moneyData?.pe ?? null,
      eps: s?.eps ?? valData?.lastEps ?? null,
      volume10d: volumeFinal,
      pb: s?.pb ?? moneyData?.pb ?? null,
      ps: s?.ps ?? valData?.ps?.at(-1) ?? null,
      bvps: s?.bvps ?? valData?.lastBvps ?? null,
      sharesOut: valData?.lastCirculationVol ?? moneyData?.circulation_vol ?? null,
      evEbitda: moneyData?.ev_per_ebitda || null,
      beta: moneyData?.the_beta ?? null,
      auditor: auditor !== '—' ? auditor : null,
      isBig4,
      bookValue,
    },
  }

  return applyLiveQuote(result, liveQuote)
}
