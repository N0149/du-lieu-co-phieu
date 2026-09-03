import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'business_plans.db')

const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'
const API_BASE_URL = 'https://api.ruatichsan.com/api/v1/data/public/business-plan'

export interface BusinessPlanQuarterData {
  quarter: number // 0 = full year, 1..4 = Q1..Q4
  isa3_report?: number | null // Doanh thu thực hiện (tỷ)
  isa3_percent?: number | null // % Đạt được doanh thu
  isa16_report?: number | null // LNTT thực hiện (tỷ)
  isa16_percent?: number | null // % Đạt được LNTT
  isa22_report?: number | null // LNST thực hiện (tỷ)
  isa22_percent?: number | null // % Đạt được LNST
}

export interface BusinessPlanYearData {
  year: number
  isa3?: number | null // Kế hoạch Doanh thu (tỷ)
  isa16?: number | null // Kế hoạch Lợi nhuận trước thuế (tỷ)
  isa22?: number | null // Kế hoạch Lợi nhuận sau thuế (tỷ)
  quarter?: BusinessPlanQuarterData[]
}

export interface RawBusinessPlanPayload {
  symbol: string
  updated?: string
  data: BusinessPlanYearData[]
}

let dbInstance: DatabaseSync | null = null

export function getBusinessPlanDb(): DatabaseSync {
  if (dbInstance) return dbInstance

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const db = new DatabaseSync(DB_PATH)

  db.exec(`
    CREATE TABLE IF NOT EXISTS business_plans (
      symbol TEXT PRIMARY KEY NOT NULL,
      plan_data TEXT NOT NULL,
      updated_source TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_business_plans_symbol ON business_plans (symbol);
  `)

  dbInstance = db
  return dbInstance
}

let cryptoKeyCache: CryptoKey | null = null
async function getCryptoKey(): Promise<CryptoKey> {
  if (cryptoKeyCache) return cryptoKeyCache
  const bytes = new Uint8Array(
    CIPHER_KEY_HEX.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  )
  cryptoKeyCache = await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
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
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return JSON.parse(new TextDecoder().decode(decryptedBuf))
}

export function getLocalBusinessPlan(symbol: string): RawBusinessPlanPayload | null {
  try {
    const db = getBusinessPlanDb()
    const stmt = db.prepare(`
      SELECT plan_data, updated_source, updated_at
      FROM business_plans
      WHERE symbol = ?
    `)
    const row = stmt.get(symbol.toUpperCase().trim()) as { plan_data: string; updated_source: string; updated_at: string } | undefined
    if (!row || !row.plan_data) return null

    const data = JSON.parse(row.plan_data)
    return {
      symbol: symbol.toUpperCase().trim(),
      updated: row.updated_source || row.updated_at,
      data: Array.isArray(data) ? data : data.data || [],
    }
  } catch (err) {
    console.error(`Lỗi đọc SQLite kế hoạch kinh doanh cho ${symbol}:`, err)
    return null
  }
}

export function saveBusinessPlanToDb(symbol: string, payload: RawBusinessPlanPayload): boolean {
  try {
    const db = getBusinessPlanDb()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO business_plans (
        symbol, plan_data, updated_source, updated_at
      ) VALUES (?, ?, ?, datetime('now', 'localtime'))
    `)

    stmt.run(
      symbol.toUpperCase().trim(),
      JSON.stringify(payload.data || []),
      payload.updated || new Date().toISOString()
    )
    return true
  } catch (err) {
    console.error(`Lỗi lưu kế hoạch kinh doanh vào SQLite cho ${symbol}:`, err)
    return false
  }
}

export async function fetchAndCacheBusinessPlan(symbol: string): Promise<RawBusinessPlanPayload | null> {
  const sym = symbol.toUpperCase().trim()
  const url = `${API_BASE_URL}/${encodeURIComponent(sym)}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Origin: 'https://ruatichsan.com',
        Referer: `https://ruatichsan.com/company?symbol=${sym}`,
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return null
    const decrypted = await decryptApiResponse(res)
    if (!decrypted || !Array.isArray(decrypted.data)) return null

    saveBusinessPlanToDb(sym, decrypted)
    return decrypted
  } catch (err) {
    console.error(`Lỗi fetch Kế hoạch KD online cho ${sym}:`, err)
    return null
  }
}

export async function getBusinessPlan(symbol: string): Promise<RawBusinessPlanPayload | null> {
  const local = getLocalBusinessPlan(symbol)
  if (local && Array.isArray(local.data) && local.data.length > 0) {
    return local
  }
  return await fetchAndCacheBusinessPlan(symbol)
}
