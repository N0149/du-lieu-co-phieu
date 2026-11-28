import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
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

// In-memory cache cho Live Disclosures (lưu trên globalThis để giữ cache qua các lần HMR)
const globalForDisclosures = globalThis as unknown as {
  __inMemoryLiveDisclosures?: CorporateDisclosure[] | null
  __lastLiveFetchTime?: number
  __liveFetchPromise?: Promise<void> | null
  __liveHighestCafefPage?: number
  __liveSymbolDisclosuresMap?: Map<string, { data: CorporateDisclosure[]; timestamp: number }>
}
if (!globalForDisclosures.__liveSymbolDisclosuresMap) {
  globalForDisclosures.__liveSymbolDisclosuresMap = new Map()
}
const liveSymbolDisclosuresMap = globalForDisclosures.__liveSymbolDisclosuresMap
const LIVE_TTL_MS = 3 * 60 * 1000 // 3 phút cache
const DEFAULT_LIVE_PAGES = 12 // ~360 tin mới nhất (~3-5 ngày giao dịch gần nhất)

let stockExchangesCache: Record<string, string> | null = null
function loadStockExchanges(): Record<string, string> {
  if (!stockExchangesCache) {
    try {
      const exPath = path.join(DATA_DIR, 'stock_exchanges.json')
      if (fs.existsSync(exPath)) {
        stockExchangesCache = JSON.parse(fs.readFileSync(exPath, 'utf-8'))
      }
    } catch {}
    stockExchangesCache = stockExchangesCache || {}
  }
  return stockExchangesCache
}

function getStockExchange(symbol: string): string {
  const map = loadStockExchanges()
  return map[symbol] || 'UPCOM'
}

function isKnownStockTicker(candidate: string): boolean {
  const map = loadStockExchanges()
  return Boolean(map[candidate])
}

function extractTickerFromTitle(title: string): string | null {
  if (!title) return null
  const trimmed = title.trim()

  // 1. Prefix chuẩn dạng "MÃ: ..." hoặc "MÃ - ..." (không dùng \s chung để tránh bắt nhầm từ tiếng Việt)
  const mPrefix = trimmed.match(/^([A-Z0-9]{3,4})\s*[:\-–\.]/i)
  if (mPrefix) {
    const cand = mPrefix[1].toUpperCase()
    if (isKnownStockTicker(cand) || cand.length === 3) {
      return cand
    }
  }

  // 2. Mã trái phiếu có prefix là mã cổ phiếu niêm yết (vd: CII424002:, VHM121025:, BID123004:)
  const mBond = trimmed.match(/^([A-Z]{3})\d{5,7}\s*[:\-–]/i)
  if (mBond) {
    const parent = mBond[1].toUpperCase()
    if (isKnownStockTicker(parent)) {
      return parent
    }
  }

  // 3. Dạng "MÃ ..." có dấu cách nếu viết hoa toàn bộ & nằm trong danh mục 1.500+ mã sàn
  const mSpace = trimmed.match(/^([A-Z0-9]{3})\s+/)
  if (mSpace && isKnownStockTicker(mSpace[1])) {
    return mSpace[1]
  }

  // 4. Trong ngoặc đơn/vuông hoặc sau từ khóa
  const mKeyword = trimmed.match(/(?:mã\s*(?:ck|chứng khoán)|cổ phiếu)\s*[:\-]?\s*([A-Z0-9]{3,4})/i)
  if (mKeyword && isKnownStockTicker(mKeyword[1].toUpperCase())) {
    return mKeyword[1].toUpperCase()
  }
  const mParen = trimmed.match(/\(([A-Z0-9]{3,4})\)/)
  if (mParen && isKnownStockTicker(mParen[1].toUpperCase())) {
    return mParen[1].toUpperCase()
  }

  return null
}

function getVnNowString(): string {
  try {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00'
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
  } catch {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  }
}

function parseVnDateTime(str: string): string {
  if (!str) return getVnNowString()
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/)
  if (match) {
    const [, d, m, y, h, min] = match
    const pad = (n: any) => String(n).padStart(2, '0')
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:00`
  }
  const dateOnly = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dateOnly) {
    const [, d, m, y] = dateOnly
    const pad = (n: any) => String(n).padStart(2, '0')
    return `${y}-${pad(m)}-${pad(d)} 00:00:00`
  }
  return str.replace('T', ' ').slice(0, 19)
}

function toSortMs(dateStr: string): number {
  if (!dateStr) return 0
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (m) {
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0))
  }
  const t = Date.parse(dateStr)
  return Number.isNaN(t) ? 0 : t
}

function makeDisclosureId(symbol: string, publishedAt: string, title: string): string {
  const hash = crypto.createHash('md5').update(title.trim()).digest('hex').slice(0, 10)
  return `cf_${symbol}_${publishedAt.slice(0, 10)}_${hash}`
}

function makeDedupeKey(item: Pick<CorporateDisclosure, 'symbol' | 'published_at' | 'title'>): string {
  const cleanTitle = (item.title || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return `${(item.symbol || '').toUpperCase()}_${(item.published_at || '').slice(0, 10)}_${cleanTitle}`
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
    t.includes('giải trình') ||
    t.includes('chênh lệch') ||
    t.includes('biến động kqkd') ||
    t.includes('kết quả kinh doanh') ||
    t.includes('chuyển từ lỗ sang lãi')
  ) {
    return { docType: 'GIAI_TRINH_KQKD', label: 'Giải trình KQKD', isImportant: 1 }
  }
  if (
    t.includes('soát xét') ||
    t.includes('kiểm toán') ||
    t.includes('báo cáo tài chính') ||
    t.includes('bctc') ||
    t.includes('bán niên')
  ) {
    return { docType: 'BCTC_SOAT_XET', label: 'BCTC & Soát xét', isImportant: 1 }
  }
  if (
    t.includes('cổ tức') ||
    t.includes('đkcc') ||
    t.includes('ngày đkcc') ||
    t.includes('đăng ký cuối cùng') ||
    t.includes('chốt danh sách') ||
    t.includes('trả cổ tức') ||
    t.includes('chi trả') ||
    t.includes('quyền mua') ||
    t.includes('thưởng cổ phiếu')
  ) {
    return { docType: 'CO_TUC', label: 'Cổ tức & Quyền', isImportant: 1 }
  }
  if (
    t.includes('đhđcđ') ||
    t.includes('đhcđ') ||
    t.includes('đại hội đồng cổ đông') ||
    t.includes('nghị quyết đhđcđ') ||
    t.includes('biên bản họp đhđcđ') ||
    t.includes('lấy ý kiến cổ đông')
  ) {
    const imp = t.includes('bất thường') || t.includes('kế hoạch') ? 1 : 0
    return { docType: 'DHDCD', label: 'ĐHĐCĐ', isImportant: imp }
  }
  if (
    t.includes('nghị quyết hđqt') ||
    t.includes('quyết định hđqt') ||
    t.includes('hđqt') ||
    t.includes('hội đồng quản trị') ||
    t.includes('bổ nhiệm') ||
    t.includes('miễn nhiệm')
  ) {
    return { docType: 'NGHI_QUYET_HDQT', label: 'Nghị quyết HĐQT', isImportant: 0 }
  }
  if (
    t.includes('nội bộ') ||
    t.includes('giao dịch cổ phiếu') ||
    t.includes('giao dịch') ||
    t.includes('cổ đông lớn') ||
    t.includes('người có liên quan')
  ) {
    return { docType: 'GIAO_DICH_NOI_BO', label: 'Giao dịch nội bộ', isImportant: 0 }
  }
  return { docType: 'KHAC', label: 'Công bố thông tin', isImportant: 0 }
}

/**
 * Cào 1 trang luồng công bố thông tin CafeF AJAX
 */
async function fetchCafefDisclosuresSinglePage(page: number): Promise<CorporateDisclosure[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      `https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol=&floorID=0&configID=0&PageIndex=${page}&PageSize=50&Type=2`,
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
      const id = makeDisclosureId(symbol, publishedAt, rawTitle)

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
    console.warn(`[Disclosures] Error fetching CafeF page ${page}:`, err)
    return []
  }
}

/**
 * Cào nhiều trang luồng công bố thông tin 3 sàn mới nhất từ CafeF AJAX (song song theo lô)
 * Đảm bảo dòng tin tức luôn liền mạch nhiều ngày liên tiếp, không bị đứt đoạn chỉ ở 30 tin đầu.
 */
export async function fetchLiveCafefDisclosures(options?: {
  startPage?: number
  maxPages?: number
  stopAtMs?: number
}): Promise<{ records: CorporateDisclosure[]; lastPageFetched: number }> {
  const startPage = Math.max(1, options?.startPage ?? 1)
  const maxPages = Math.max(1, Math.min(options?.maxPages ?? DEFAULT_LIVE_PAGES, 40))
  const stopAtMs = options?.stopAtMs ?? 0

  const allRecords: CorporateDisclosure[] = []
  const batchSize = 4
  let lastPageFetched = startPage - 1

  for (let offset = 0; offset < maxPages; offset += batchSize) {
    const pages: number[] = []
    for (let i = 0; i < batchSize && offset + i < maxPages; i++) {
      pages.push(startPage + offset + i)
    }

    const batchResults = await Promise.all(pages.map((p) => fetchCafefDisclosuresSinglePage(p)))
    let shouldStop = false

    for (let i = 0; i < batchResults.length; i++) {
      const pageItems = batchResults[i]
      if (!pageItems || pageItems.length === 0) {
        shouldStop = true
        break
      }
      lastPageFetched = pages[i]
      allRecords.push(...pageItems)

      if (stopAtMs > 0) {
        const oldestOnPage = pageItems.reduce((min, it) => {
          const ms = toSortMs(it.published_at)
          return ms > 0 && ms < min ? ms : min
        }, Infinity)
        if (oldestOnPage <= stopAtMs) {
          shouldStop = true
          break
        }
      }
    }

    if (shouldStop) break
  }

  return { records: allRecords, lastPageFetched }
}

/**
 * Cào tức thì luồng công bố thông tin CafeF theo từng mã cổ phiếu (kèm link văn bản trực tiếp)
 */
export async function fetchLiveDisclosuresForSymbol(symbol: string): Promise<CorporateDisclosure[]> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return []
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      `https://cafef.vn/du-lieu/Ajax/Events_RelatedNews_New.aspx?symbol=${encodeURIComponent(sym)}&floorID=0&configID=0&PageIndex=1&PageSize=50&Type=2`,
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

      const exchange = getStockExchange(sym)
      const { docType, label, isImportant } = classifyDisclosure(rawTitle)
      const id = makeDisclosureId(sym, publishedAt, rawTitle)

      records.push({
        id,
        symbol: sym,
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

    // Lưu vào bộ nhớ RAM tức thì để phục vụ serverless / Vercel (kể cả khi filesystem read-only)
    if (records.length > 0) {
      liveSymbolDisclosuresMap.set(sym, { data: records, timestamp: Date.now() })
    }

    // Tự động lưu vào SQLite để các lần sau nạp tức thì (nếu môi trường cho phép ghi)
    try {
      if (fs.existsSync(DB_PATH) && records.length > 0) {
        const db = new DatabaseSync(DB_PATH)
        const stmt = db.prepare(`
          INSERT INTO disclosures (
            id, symbol, exchange, company_name, title, doc_type, doc_type_label,
            published_at, file_url, source, is_important, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
          ON CONFLICT(id) DO UPDATE SET
            file_url = excluded.file_url,
            doc_type_label = excluded.doc_type_label
        `)
        for (const r of records) {
          stmt.run(
            r.id,
            r.symbol,
            r.exchange,
            r.company_name || '',
            r.title,
            r.doc_type,
            r.doc_type_label,
            r.published_at,
            r.file_url || '',
            r.source,
            r.is_important
          )
        }
      }
    } catch {}

    return records
  } catch (err) {
    console.warn(`[Disclosures] Error fetching live CafeF for ${sym}:`, err)
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
 * Lấy danh sách công bố thông tin của 1 mã cổ phiếu (kết hợp RAM Cache, SQLite và Snapshot)
 */
export function getDisclosuresBySymbol(symbol: string, limit: number = 50): CorporateDisclosure[] {
  const sym = symbol.toUpperCase().trim()
  const memCached = liveSymbolDisclosuresMap.get(sym)
  const memRecords = memCached?.data || []

  // 1. Thử lấy từ cơ sở dữ liệu SQLite cục bộ
  let dbRows: CorporateDisclosure[] = []
  try {
    const db = getDisclosuresDb()
    if (db) {
      const stmt = db.prepare(`
        SELECT id, symbol, exchange, company_name, title, doc_type, doc_type_label,
               published_at, file_url, source, is_important
        FROM disclosures
        WHERE symbol = ?
        ORDER BY
          CASE WHEN file_url LIKE '%cafef.vn/du-lieu/%' OR file_url LIKE '%.pdf%' THEN 0 ELSE 1 END,
          published_at DESC
        LIMIT ?
      `)
      const rows = stmt.all(sym, limit) as CorporateDisclosure[]
      if (rows && rows.length > 0) {
        dbRows = rows.map((r) => ({ ...r }))
      }
    }
  } catch (err) {
    console.warn(`[Disclosures] SQLite read error for ${sym}:`, err)
  }

  // 2. Trộn dữ liệu từ RAM và SQLite (ưu tiên bản ghi có direct link và mới nhất)
  if (memRecords.length > 0 || dbRows.length > 0) {
    const map = new Map<string, CorporateDisclosure>()
    for (const r of memRecords) {
      map.set(r.id || r.title, r)
    }
    for (const r of dbRows) {
      if (!map.has(r.id || r.title)) {
        map.set(r.id || r.title, r)
      }
    }
    return Array.from(map.values())
      .sort((a, b) => toSortMs(b.published_at) - toSortMs(a.published_at))
      .slice(0, limit)
  }

  // 3. Fallback sang snapshot JSON nếu cả SQLite và RAM đều rỗng
  const snapshot = loadSnapshot()
  return snapshot.filter((item) => item.symbol?.toUpperCase() === sym).slice(0, limit)
}

function mergeDisclosureLists(
  primary: CorporateDisclosure[],
  secondary: CorporateDisclosure[]
): CorporateDisclosure[] {
  const map = new Map<string, CorporateDisclosure>()
  for (const item of primary) {
    map.set(makeDedupeKey(item), item)
  }
  for (const item of secondary) {
    const key = makeDedupeKey(item)
    if (!map.has(key)) {
      map.set(key, item)
    }
  }
  return Array.from(map.values()).sort((a, b) => toSortMs(b.published_at) - toSortMs(a.published_at))
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

export function getLiveDisclosuresLastUpdated(): number {
  return globalForDisclosures.__lastLiveFetchTime || 0
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

  const cacheFresh =
    !forceRefresh &&
    globalForDisclosures.__inMemoryLiveDisclosures &&
    globalForDisclosures.__inMemoryLiveDisclosures.length > 0 &&
    now - (globalForDisclosures.__lastLiveFetchTime || 0) < LIVE_TTL_MS

  // 1. Kiểm tra cache trong bộ nhớ (đảm bảo đủ số lượng nếu cần)
  if (cacheFresh && globalForDisclosures.__inMemoryLiveDisclosures!.length >= Math.min(limit, 300)) {
    return filterDisclosures(globalForDisclosures.__inMemoryLiveDisclosures!, {
      exchange,
      docType,
      importantOnly,
      limit,
    })
  }

  // 2. Nếu đang có luồng fetch chạy, chờ chung promise thay vì trả về rỗng/cũ
  if (globalForDisclosures.__liveFetchPromise) {
    await globalForDisclosures.__liveFetchPromise
  } else {
    globalForDisclosures.__liveFetchPromise = (async () => {
      try {
        const baseItems = getRecentMarketDisclosures({ limit: 500 })
        const newestBaseMs = baseItems.length > 0 ? toSortMs(baseItems[0].published_at) : 0
        // Nếu DB/Snapshot mới (trong vòng 7 ngày), dừng sớm khi đã chạm vùng giao thoa để cực nhanh
        const sevenDaysAgoMs = now - 7 * 24 * 3600 * 1000
        const stopAtMs = newestBaseMs > sevenDaysAgoMs ? newestBaseMs : 0
        const maxPages = limit > 300 ? Math.min(20, Math.ceil(limit / 25) + 2) : DEFAULT_LIVE_PAGES

        const { records: liveItems, lastPageFetched } = await fetchLiveCafefDisclosures({
          startPage: 1,
          maxPages,
          stopAtMs,
        })

        if (liveItems.length > 0) {
          const existingMem = globalForDisclosures.__inMemoryLiveDisclosures || []
          const merged = mergeDisclosureLists(liveItems, mergeDisclosureLists(existingMem, baseItems))
          globalForDisclosures.__inMemoryLiveDisclosures = merged
          globalForDisclosures.__liveHighestCafefPage = Math.max(
            lastPageFetched,
            globalForDisclosures.__liveHighestCafefPage || 0
          )
          globalForDisclosures.__lastLiveFetchTime = Date.now()
        } else {
          if (!globalForDisclosures.__inMemoryLiveDisclosures || globalForDisclosures.__inMemoryLiveDisclosures.length === 0) {
            globalForDisclosures.__inMemoryLiveDisclosures = baseItems
          }
          globalForDisclosures.__lastLiveFetchTime = Date.now()
        }
      } catch (e) {
        console.warn('[Disclosures] Live fetch failed, using cached base:', e)
        if (!globalForDisclosures.__inMemoryLiveDisclosures || globalForDisclosures.__inMemoryLiveDisclosures.length === 0) {
          globalForDisclosures.__inMemoryLiveDisclosures = getRecentMarketDisclosures({ limit: 300 })
        }
        globalForDisclosures.__lastLiveFetchTime = Date.now()
      } finally {
        globalForDisclosures.__liveFetchPromise = null
      }
    })()

    await globalForDisclosures.__liveFetchPromise
  }

  const pool =
    globalForDisclosures.__inMemoryLiveDisclosures && globalForDisclosures.__inMemoryLiveDisclosures.length > 0
      ? globalForDisclosures.__inMemoryLiveDisclosures
      : getRecentMarketDisclosures({ limit: Math.max(limit, 200) })

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
