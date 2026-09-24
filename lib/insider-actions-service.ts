import fs from 'node:fs'
import path from 'node:path'

export interface InsiderActionRecord {
  id: string
  date: string // dd/mm/yyyy
  rawDate: string // m/d/yyyy
  symbol: string
  companyName: string
  name: string
  position: string // Translated to Vietnamese
  rawPosition: string
  transaction: string // Translated to Vietnamese (Đăng ký mua, Đăng ký bán...)
  rawTransaction: string
  actionType: 'BUY' | 'SELL' | 'OTHER'
  isRegistration: boolean // true = Đăng ký mua/bán, false = Đã thực hiện mua/bán
  shares: number
  sharesFormatted: string
  price: number | null
  estimatedValue: number | null // in billion VND
}

export interface InsiderActionsResponse {
  items: InsiderActionRecord[]
  lastUpdated: string
  totalCount: number
}

// In-memory cache
let cachedInsiderActions: InsiderActionRecord[] | null = null
let lastFetchTime = 0
let isFetching = false
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

// Position dictionary translation
const POSITION_MAP: Record<string, string> = {
  'chairman of board': 'Chủ tịch HĐQT',
  'deputy chairman of board': 'Phó Chủ tịch HĐQT',
  'vice chairman of board': 'Phó Chủ tịch HĐQT',
  'board member': 'Thành viên HĐQT',
  'member of the bod': 'Thành viên HĐQT',
  'chief of executive officer': 'Tổng Giám đốc (CEO)',
  'ceo': 'Tổng Giám đốc (CEO)',
  'general director': 'Tổng Giám đốc',
  'deputy ceo': 'Phó Tổng Giám đốc',
  'deputy general director': 'Phó Tổng Giám đốc',
  'chief accountant': 'Kế toán trưởng',
  'representative spokesman': 'Người đại diện CBTT',
  'spokesman': 'Người đại diện CBTT',
  'control member': 'Thành viên Ban Kiểm soát',
  'head of supervisory board': 'Trưởng Ban Kiểm soát',
  'member of supervisory board': 'Thành viên Ban Kiểm soát',
  'supervisory board member': 'Thành viên Ban Kiểm soát',
  'secretary': 'Thư ký HĐQT',
  'person related to': 'Người có liên quan',
  'related person': 'Người có liên quan',
  'major shareholder': 'Cổ đông lớn',
  'internal shareholder': 'Cổ đông nội bộ',
}

export function translatePosition(pos: string): string {
  if (!pos || pos === '---' || pos.trim() === '') return 'Người liên quan / Khác'
  const clean = pos.trim().toLowerCase()
  if (POSITION_MAP[clean]) return POSITION_MAP[clean]
  for (const [k, v] of Object.entries(POSITION_MAP)) {
    if (clean.includes(k)) return v
  }
  return pos
}

const TRANSACTION_MAP: Record<string, { vi: string; action: 'BUY' | 'SELL' | 'OTHER'; isReg: boolean }> = {
  'registered to purchase': { vi: 'Đăng ký mua', action: 'BUY', isReg: true },
  'registered to sell': { vi: 'Đăng ký bán', action: 'SELL', isReg: true },
  'purchased': { vi: 'Đã mua', action: 'BUY', isReg: false },
  'sold': { vi: 'Đã bán', action: 'SELL', isReg: false },
  'stock right purchased': { vi: 'Đã mua quyền mua', action: 'BUY', isReg: false },
  'stock right sold': { vi: 'Đã bán quyền mua', action: 'SELL', isReg: false },
  'registered to purchase stock right': { vi: 'Đăng ký mua quyền mua', action: 'BUY', isReg: true },
  'registered to sell stock right': { vi: 'Đăng ký bán quyền mua', action: 'SELL', isReg: true },
}

export function translateTransaction(tx: string): { vi: string; action: 'BUY' | 'SELL' | 'OTHER'; isReg: boolean } {
  if (!tx) return { vi: 'Khác', action: 'OTHER', isReg: false }
  const clean = tx.trim().toLowerCase()
  if (TRANSACTION_MAP[clean]) return TRANSACTION_MAP[clean]
  if (clean.includes('purchase') || clean.includes('buy')) {
    return { vi: clean.includes('register') ? 'Đăng ký mua' : 'Đã mua', action: 'BUY', isReg: clean.includes('register') }
  }
  if (clean.includes('sell')) {
    return { vi: clean.includes('register') ? 'Đăng ký bán' : 'Đã bán', action: 'SELL', isReg: clean.includes('register') }
  }
  return { vi: tx, action: 'OTHER', isReg: false }
}

export function formatVnDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const m = parts[0].padStart(2, '0')
    const d = parts[1].padStart(2, '0')
    const y = parts[2]
    return `${d}/${m}/${y}`
  }
  return dateStr
}

// Company Manifest Cache
let companyMapCache: Record<string, { name: string; px: number | null }> | null = null

function getCompanyMap(): Record<string, { name: string; px: number | null }> {
  if (companyMapCache) return companyMapCache
  const map: Record<string, { name: string; px: number | null }> = {}
  try {
    const manifestPath = path.resolve(process.cwd(), 'data', 'longlive_manifest.json')
    if (fs.existsSync(manifestPath)) {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      const items = data.items || []
      for (const it of items) {
        if (it.t) {
          map[it.t.toUpperCase()] = {
            name: it.n || '',
            px: typeof it.px === 'number' ? it.px : null,
          }
        }
      }
    }
  } catch (err) {
    console.warn('[InsiderActions] Failed to load company manifest:', err)
  }
  companyMapCache = map
  return map
}

const STOCKBIZ_URL = 'http://en.stockbiz.vn/InsiderActionsStats.aspx'
const CTRL_ID = 'ctl00_webPartManager_wp303436996_wp32423248_cbInsiderActions'

async function fetchStockbizPage(startIndex = 0, symbol = ''): Promise<string> {
  const params = new URLSearchParams()
  params.append(`Cart_${CTRL_ID}_Callback_Param`, symbol)
  params.append(`Cart_${CTRL_ID}_Callback_Param`, '-1')
  params.append(`Cart_${CTRL_ID}_Callback_Param`, '1753-01-01')
  params.append(`Cart_${CTRL_ID}_Callback_Param`, '-1')
  params.append(`Cart_${CTRL_ID}_Callback_Param`, String(startIndex))

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(STOCKBIZ_URL, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': STOCKBIZ_URL,
      },
      body: params.toString(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return ''
    return await res.text()
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn(`[InsiderActions] Failed to fetch Stockbiz page ${startIndex}:`, err)
    return ''
  }
}

function parseInsiderTableHtml(html: string): InsiderActionRecord[] {
  if (!html) return []
  const items: InsiderActionRecord[] = []
  const companyMap = getCompanyMap()

  const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
  for (const tr of trMatches) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    )

    if (tds.length >= 6) {
      const [rawDate, rawSymbol, rawName, rawPos, rawTx, rawShares] = tds
      if (
        rawDate.toLowerCase() === 'date' ||
        rawSymbol.toLowerCase() === 'symbol' ||
        !rawDate.includes('/')
      ) {
        continue
      }

      const symbol = rawSymbol.toUpperCase().trim()
      if (!symbol || !/^[A-Z0-9]{3,4}$/.test(symbol)) continue

      const shares = parseInt(rawShares.replace(/,/g, '').replace(/\./g, ''), 10) || 0
      const txInfo = translateTransaction(rawTx)
      const position = translatePosition(rawPos)
      const date = formatVnDate(rawDate)

      const companyInfo = companyMap[symbol]
      const companyName = companyInfo?.name || symbol
      const price = companyInfo?.px || null

      let estimatedValue: number | null = null
      if (price && shares > 0) {
        // price in thousand VND (e.g. 24.5 means 24,500 VND), value in billion VND
        estimatedValue = parseFloat(((shares * (price * 1000)) / 1_000_000_000).toFixed(2))
      }

      // Generate stable deterministic ID
      const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15)
      const id = `ia_${symbol}_${date.replace(/\//g, '')}_${shares}_${safeName}`

      items.push({
        id,
        date,
        rawDate,
        symbol,
        companyName,
        name: rawName,
        position,
        rawPosition: rawPos,
        transaction: txInfo.vi,
        rawTransaction: rawTx,
        actionType: txInfo.action,
        isRegistration: txInfo.isReg,
        shares,
        sharesFormatted: shares.toLocaleString('vi-VN'),
        price,
        estimatedValue,
      })
    }
  }

  return items
}

/**
 * Quét toàn bộ giao dịch nội bộ từ Stockbiz (khoảng 80-100 giao dịch mới nhất)
 */
export async function getInsiderActions(options?: {
  symbol?: string
  force?: boolean
  limit?: number
}): Promise<InsiderActionRecord[]> {
  const now = Date.now()
  const force = options?.force ?? false
  const symbol = options?.symbol?.toUpperCase().trim() || ''

  // Nếu tìm theo mã cụ thể, gọi trực tiếp callback với filter mã
  if (symbol) {
    try {
      const html = await fetchStockbizPage(0, symbol)
      return parseInsiderTableHtml(html)
    } catch {
      return []
    }
  }

  // Cache hit
  if (!force && cachedInsiderActions && cachedInsiderActions.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return options?.limit ? cachedInsiderActions.slice(0, options.limit) : cachedInsiderActions
  }

  if (isFetching && cachedInsiderActions) {
    return options?.limit ? cachedInsiderActions.slice(0, options.limit) : cachedInsiderActions
  }

  isFetching = true
  try {
    // Quét 4 trang song song (0, 20, 40, 60) -> 80 giao dịch gần nhất
    const pages = await Promise.all([
      fetchStockbizPage(0),
      fetchStockbizPage(20),
      fetchStockbizPage(40),
      fetchStockbizPage(60),
    ])

    const allItems: InsiderActionRecord[] = []
    const seenIds = new Set<string>()

    for (const html of pages) {
      const parsed = parseInsiderTableHtml(html)
      for (const item of parsed) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          allItems.push(item)
        }
      }
    }

    if (allItems.length > 0) {
      cachedInsiderActions = allItems
      lastFetchTime = Date.now()
    }

    return options?.limit ? allItems.slice(0, options.limit) : allItems
  } catch (err) {
    console.error('[InsiderActions] Error fetching all pages:', err)
    return cachedInsiderActions || []
  } finally {
    isFetching = false
  }
}
