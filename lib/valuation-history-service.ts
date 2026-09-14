import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'

export interface ValuationHistoryPayload {
  symbol: string
  updated?: string
  dates: number[]
  pe: (number | null)[]
  pb: (number | null)[]
  ps: (number | null)[]
  lastEps?: number
  snapshot?: {
    pe?: number
    pb?: number
    ps?: number
    pe_vs_median?: number
    pb_vs_median?: number
    ps_vs_median?: number
    pe_forward?: number
    pb_forward?: number
    [key: string]: any
  }
}

const DATA_DIR = path.join(process.cwd(), 'data')
const VAL_DIR = path.join(DATA_DIR, 'valuation_history')
const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'

async function decryptApiResponse(res: Response): Promise<any> {
  if (res.headers.get('X-Encrypted') !== '1') {
    return await res.json()
  }
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(CIPHER_KEY_HEX.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt'])
  const rawBytes = new Uint8Array(buf)
  const iv = rawBytes.slice(0, 12)
  const ciphertext = rawBytes.slice(12)
  const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(decryptedBuf))
}

const DB_EVAL_PATH = path.join(DATA_DIR, 'stock_evaluations.db')

export async function getValuationHistory(symbol: string): Promise<ValuationHistoryPayload | null> {
  const sym = symbol.toUpperCase().trim()
  const cacheFile = path.join(VAL_DIR, `${sym}.json`)

  // 1. Đọc cache đĩa cục bộ
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = fs.readFileSync(cacheFile, 'utf-8')
      const data = JSON.parse(raw)
      if (data && data.dates && data.dates.length > 0) {
        return data as ValuationHistoryPayload
      }
    } catch {}
  }

  // 2. Đọc từ SQLite stock_evaluations.db (chứa 1.368 mã đầy đủ chuỗi lịch sử định giá đa năm)
  if (fs.existsSync(DB_EVAL_PATH)) {
    try {
      const db = new DatabaseSync(DB_EVAL_PATH, { readOnly: true })
      try {
        const row = db.prepare('SELECT raw_json FROM stock_evaluations WHERE symbol = ?').get(sym) as any
        if (row?.raw_json) {
          const data = JSON.parse(row.raw_json)
          if (data && Array.isArray(data.dates) && data.dates.length > 0) {
            return data as ValuationHistoryPayload
          }
        }
      } finally {
        db.close()
      }
    } catch {}
  }

  return null
}
