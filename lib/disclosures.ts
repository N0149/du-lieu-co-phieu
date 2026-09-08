import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type CorporateDisclosure = {
  id: string
  symbol: string
  exchange: string
  company_name: string
  title: string
  doc_type:
    | 'BCTC_SOAT_XET'
    | 'GIAI_TRINH_KQKD'
    | 'CO_TUC'
    | 'CANH_BAO_KIEM_SOAT'
    | 'DHDCD'
    | 'NGHI_QUYET_HDQT'
    | 'GIAO_DICH_NOI_BO'
    | 'KHAC'
    | string
  doc_type_label: string
  published_at: string
  file_url?: string
  source: string
  is_important: number
}

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'corporate_disclosures.db')
const SNAPSHOT_PATH = path.join(DATA_DIR, 'disclosures_snapshot.json')

let cachedSnapshot: CorporateDisclosure[] | null = null
let dbInstance: DatabaseSync | null = null

// In-memory cache cho Live Disclosures (Serverless revalidation)
let inMemoryLiveDisclosures: CorporateDisclosure[] | null = null
let lastLiveFetchTime = 0
let isLiveFetching = false
const LIVE_TTL_MS = 3 * 60 * 1000 // 3 phút cache

let stockExchangesCache: Record<string, string> | null = null
function getStockExchange(symbol: string): string {
  if (!stockExchangesCache) {
    try {
      const exPath = path.join(DATA_DIR, 'stock_exchanges.json')
      if (fs.existsSync(exPath)) {
        stockExchangesCache = JSON.parse(fs.readFileSync(exPath, 'utf-8'))
      }
    } catch {}
    stockExchangesCache = stockExchangesCache || {}
  }
  return stockExchangesCache[symbol] || 'UPCOM'
}

function extractTickerFromTitle(title: string): string | null {
  if (!title) return null
  const m1 = title.match(/^([A-Z0-9]{3,4})[:\s\-]/i)
  if (m1) return m1[1].toUpperCase()
  const m2 = title.match(/(?:mã\s*(?:ck|chứng khoán)|cổ phiếu)\s*[:\-]?\s*([A-Z0-9]{3,4})/i)
  if (m2) return m2[1].toUpperCase()
  const m3 = title.match(/\(([A-Z0-9]{3,4})\)/)
  if (m3) return m3[1].toUpperCase()
  return null
}

function parseVnDateTime(str: string): string {
  if (!str) return new Date().toISOString().replace('T', ' ').slice(0, 19)
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/)
  if (match) {
    const [, d, m, y, h, min] = match
    const pad = (n: any) => String(n).padStart(2, '0')
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:00`
  }
  return str.replace('T', ' ').slice(0, 19)
}

function classifyDisclosure(title: string): { docType: string; label: string; isImportant: number } {
  const t = (title || '').toLowerCase()
  if (
    t.includes('cảnh báo') ||
    t.includes('kiểm soát') ||
    t.includes('ra khỏi diện') ||
    t.includes('đưa vào diện') ||
    t.includes('hạn chế giao dịch') ||
    t.includes('đình chỉ giao dịch') ||
    t.includes('hủy niêm yết')
  ) {
    return { docType: 'CANH_BAO_KIEM_SOAT', label: 'Cảnh báo & Kiểm soát', isImportant: 1 }
  }
  if (
    t.includes('soát xét') ||
    t.includes('kiểm toán') ||
    t.includes('báo cáo tài chính') ||
    t.includes('bctc')
  ) {
    return { docType: 'BCTC_SOAT_XET', label: 'BCTC & Soát xét', isImportant: 1 }
  }
  if (
    t.includes('giải trình') ||
    t.includes('chênh lệch') ||
    t.includes('biến động kqkd') ||
    t.includes('chuyển từ lỗ sang lãi')
  ) {
    return { docType: 'GIAI_TRINH_KQKD', label: 'Giải trình KQKD', isImportant: 1 }
  }
  if (
    t.includes('cổ tức') ||
    t.includes('ngày đkcc') ||
    t.includes('chốt danh sách') ||
    t.includes('trả cổ tức') ||
    t.includes('quyền mua')
  ) {
    return { docType: 'CO_TUC', label: 'Cổ tức & Quyền', isImportant: 1 }
  }
  if (
    t.includes('đhđcđ') ||
    t.includes('đại hội đồng cổ đông') ||
    t.includes('nghị quyết đhđcđ') ||
    t.includes('biên bản họp đhđcđ')
  ) {
    return { docType: 'DHDCD', label: 'ĐHĐCĐ', isImportant: 0 }
  }
  if (
    t.includes('nghị quyết hđqt') ||
    t.includes('quyết định hđqt') ||
    t.includes('hội đồng quản trị')
  ) {
    return { docType: 'NGHI_QUYET_HDQT', label: 'Nghị quyết HĐQT', isImportant: 0 }
  }
  if (
    t.includes('nội bộ') ||
    t.includes('giao dịch cổ phiếu') ||
    t.includes('cổ đông lớn') ||
    t.includes('người có liên quan')
  ) {
    return { docType: 'GIAO_DICH_NOI_BO', label: 'Giao dịch nội bộ', isImportant: 0 }
  }
  return { docType: 'KHAC', label: 'Công bố thông tin', isImportant: 0 }
}

/**
 * Cào tức thì luồng công bố thông tin 3 sàn mới nhất từ CafeF AJAX (~200ms)
 */
export async function fetchLiveCafefDisclosures(): Promise<CorporateDisclosure[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      'https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol=&floorID=0&configID=0&PageIndex=1&PageSize=50&Type=2',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://cafef.vn/',
        },
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)

    if (!res.ok) return []
    const html = await res.text()
    const records: CorporateDisclosure[] = []
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let liMatch: RegExpExecArray | null
    while ((liMatch = liRegex.exec(html)) !== null) {
      const liContent = liMatch[1]
      const timeMatch = liContent.match(/<span class=["']timeTitle["']>([^<]+)<\/span>/i)
      const linkMatch = liContent.match(
        /<a class=['"]docnhanhTitle['"][^>]*href=['"]([^'"]+)['"][^>]*title=['"]([^'"]*)['"][^>]*>([\s\S]*?)<\/a>/i
      )
      if (!timeMatch || !linkMatch) continue

      const rawTime = timeMatch[1].trim()
      const publishedAt = parseVnDateTime(rawTime)
      const rawHref = linkMatch[1].trim()
      const fileUrl = rawHref.startsWith('http') ? rawHref : `https://cafef.vn${rawHref}`
      const rawTitle = (linkMatch[2] || linkMatch[3] || '').replace(/<[^>]+>/g, '').trim()
      const symbol = extractTickerFromTitle(rawTitle)
      if (!symbol) continue

      const exchange = getStockExchange(symbol)
      const { docType, label, isImportant } = classifyDisclosure(rawTitle)
      const id = `cf_${symbol}_${publishedAt.replace(/[: -]/g, '')}`

      records.push({
        id,
        symbol,
        exchange,
        company_name: '',
        title: rawTitle,
        doc_type: docType,
        doc_type_label: label,
        published_at: publishedAt,
        file_url: fileUrl,
        source: 'CafeF_Sở',
        is_important: isImportant,
      })
    }
    return records
  } catch (err) {
    console.warn('[Disclosures] Error fetching live CafeF stream:', err)
    return []
  }
}

function getDisclosuresDb(): DatabaseSync | null {
  if (dbInstance) return dbInstance
  try {
    if (fs.existsSync(DB_PATH)) {
      dbInstance = new DatabaseSync(DB_PATH, { readOnly: true })
      return dbInstance
    }
  } catch (err) {
    console.warn('[Disclosures] SQLite open error:', err)
  }
  return null
}

function loadSnapshot(): CorporateDisclosure[] {
  if (cachedSnapshot) return cachedSnapshot
  try {
    if (fs.existsSync(SNAPSHOT_PATH)) {
      const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8')
      cachedSnapshot = JSON.parse(raw) as CorporateDisclosure[]
      return cachedSnapshot || []
    }
  } catch (err) {
    console.warn('[Disclosures] Error reading snapshot:', err)
  }
  return []
}

/**
 * Lấy danh sách công bố thông tin của 1 mã cổ phiếu
 */
export function getDisclosuresBySymbol(symbol: string, limit: number = 50): CorporateDisclosure[] {
  const sym = symbol.toUpperCase().trim()

  // 1. Thử lấy từ cơ sở dữ liệu SQLite cục bộ
  try {
    const db = getDisclosuresDb()
    if (db) {
      const stmt = db.prepare(`
        SELECT id, symbol, exchange, company_name, title, doc_type, doc_type_label,
               published_at, file_url, source, is_important
        FROM disclosures
        WHERE symbol = ?
        ORDER BY published_at DESC
        LIMIT ?
      `)
      const rows = stmt.all(sym, limit) as CorporateDisclosure[]
      if (rows && rows.length > 0) {
        return rows.map((r) => ({ ...r }))
      }
    }
  } catch (err) {
    console.warn(`[Disclosures] SQLite read error for ${sym}:`, err)
  }

  // 2. Fallback sang snapshot JSON
  const snapshot = loadSnapshot()
  return snapshot.filter((item) => item.symbol?.toUpperCase() === sym).slice(0, limit)
}

function filterDisclosures(
  items: CorporateDisclosure[],
  filter: { exchange?: string; docType?: string; importantOnly?: boolean; limit: number }
): CorporateDisclosure[] {
  let list = items
  if (filter.exchange && filter.exchange !== 'ALL') {
    list = list.filter((it) => it.exchange?.toUpperCase() === filter.exchange?.toUpperCase())
  }
  if (filter.docType && filter.docType !== 'ALL') {
    list = list.filter((it) => it.doc_type === filter.docType)
  }
  if (filter.importantOnly) {
    list = list.filter((it) => it.is_important === 1)
  }
  return list.slice(0, filter.limit)
}

/**
 * Lấy danh sách công bố thông tin mới nhất toàn thị trường (cả 3 sàn HOSE, HNX, UPCoM)
 * Hỗ trợ tự động revalidation theo thời gian thực (Live On-Demand Fetching)
 */
export async function getLiveMarketDisclosures(options?: {
  limit?: number
  exchange?: string
  docType?: string
  importantOnly?: boolean
  forceRefresh?: boolean
}): Promise<CorporateDisclosure[]> {
  const { limit = 150, exchange, docType, importantOnly, forceRefresh = false } = options || {}
  const now = Date.now()

  // 1. Kiểm tra cache trong bộ nhớ
  if (
    !forceRefresh &&
    inMemoryLiveDisclosures &&
    inMemoryLiveDisclosures.length > 0 &&
    now - lastLiveFetchTime < LIVE_TTL_MS
  ) {
    return filterDisclosures(inMemoryLiveDisclosures, { exchange, docType, importantOnly, limit })
  }

  // 2. Nếu đang cào hoặc cần cào mới:
  if (!isLiveFetching) {
    isLiveFetching = true
    try {
      const liveItems = await fetchLiveCafefDisclosures()
      if (liveItems && liveItems.length > 0) {
        // Lấy dữ liệu cơ sở (từ DB hoặc Snapshot)
        const baseItems = getRecentMarketDisclosures({ limit: 300 })

        // Trộn và khử trùng lặp theo title hoặc id
        const map = new Map<string, CorporateDisclosure>()
        for (const item of liveItems) {
          const key = `${item.symbol}_${item.title}`
          map.set(key, item)
        }
        for (const item of baseItems) {
          const key = `${item.symbol}_${item.title}`
          if (!map.has(key)) {
            map.set(key, item)
          }
        }

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        )

        inMemoryLiveDisclosures = merged
        lastLiveFetchTime = now
      }
    } catch (e) {
      console.warn('[Disclosures] Live fetch failed, using cached base:', e)
    } finally {
      isLiveFetching = false
    }
  }

  const pool =
    inMemoryLiveDisclosures && inMemoryLiveDisclosures.length > 0
      ? inMemoryLiveDisclosures
      : getRecentMarketDisclosures({ limit: 200 })

  return filterDisclosures(pool, { exchange, docType, importantOnly, limit })
}

/**
 * Lấy danh sách công bố thông tin mới nhất toàn thị trường (cả 3 sàn HOSE, HNX, UPCoM)
 */
export function getRecentMarketDisclosures(options?: {
  limit?: number
  exchange?: string
  docType?: string
  importantOnly?: boolean
}): CorporateDisclosure[] {
  const { limit = 150, exchange, docType, importantOnly } = options || {}

  // 1. Thử truy vấn từ SQLite
  try {
    const db = getDisclosuresDb()
    if (db) {
      let query = `
        SELECT id, symbol, exchange, company_name, title, doc_type, doc_type_label,
               published_at, file_url, source, is_important
        FROM disclosures
        WHERE 1=1
      `
      const params: any[] = []

      if (exchange && exchange !== 'ALL') {
        query += ' AND exchange = ?'
        params.push(exchange.toUpperCase())
      }
      if (docType && docType !== 'ALL') {
        query += ' AND doc_type = ?'
        params.push(docType)
      }
      if (importantOnly) {
        query += ' AND is_important = 1'
      }

      query += ' ORDER BY published_at DESC LIMIT ?'
      params.push(limit)

      const stmt = db.prepare(query)
      const rows = stmt.all(...params) as CorporateDisclosure[]
      if (rows && rows.length > 0) {
        return rows.map((r) => ({ ...r }))
      }
    }
  } catch (err) {
    console.warn('[Disclosures] SQLite read error for market:', err)
  }

  // 2. Fallback sang snapshot JSON
  let list = loadSnapshot()

  if (exchange && exchange !== 'ALL') {
    list = list.filter((it) => it.exchange?.toUpperCase() === exchange.toUpperCase())
  }
  if (docType && docType !== 'ALL') {
    list = list.filter((it) => it.doc_type === docType)
  }
  if (importantOnly) {
    list = list.filter((it) => it.is_important === 1)
  }

  return list.slice(0, limit)
}
