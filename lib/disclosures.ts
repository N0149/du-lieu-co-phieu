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
