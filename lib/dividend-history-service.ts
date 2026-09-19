import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface DividendEventItem {
  date: string
  cashVnd: number | null
  stockPct: number | null
  texts: string[]
}

export interface DividendHistoryPayload {
  symbol: string
  events: DividendEventItem[]
}

let supabaseInstance: SupabaseClient | null = null
function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxtmuwrpuywrkclobfpa.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jjx3eb2edh-gxHZKYEZIog_UyWNqV9Z'
  if (!url || !key) return null
  supabaseInstance = createClient(url, key)
  return supabaseInstance
}

const DIV_MEMORY_CACHE = new Map<string, { data: DividendHistoryPayload; expiresAt: number }>()
const DIV_CACHE_TTL_MS = 10 * 60 * 1000 // 10 phút RAM cache

const DATA_DIR = path.join(process.cwd(), 'data')
const DIV_DIR = path.join(DATA_DIR, 'dividend_history')
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

const DB_DIV_PATH = path.join(DATA_DIR, 'dividend_history.db')

export async function getDividendHistory(symbol: string): Promise<DividendHistoryPayload | null> {
  const sym = symbol.toUpperCase().trim()
  const cacheFile = path.join(DIV_DIR, `${sym}.json`)

  // 1. Đọc cache đĩa cục bộ
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = fs.readFileSync(cacheFile, 'utf-8')
      const data = JSON.parse(raw)
      if (data && Array.isArray(data.events)) {
        return data as DividendHistoryPayload
      }
    } catch {}
  }

  // 2. Đọc từ SQLite dividend_history.db (1.436 mã, < 0.1ms)
  if (fs.existsSync(DB_DIV_PATH)) {
    try {
      const db = new DatabaseSync(DB_DIV_PATH, { readOnly: true })
      try {
        const row = db.prepare('SELECT events_json FROM dividend_history WHERE symbol = ?').get(sym) as any
        if (row?.events_json) {
          const events = JSON.parse(row.events_json)
          if (Array.isArray(events)) {
            return { symbol: sym, events }
          }
        }
      } finally {
        db.close()
      }
    } catch {}
  }

  // 3. Đọc từ Supabase Cloud Database (<25ms, Vercel 24/7 khi tắt máy)
  const now = Date.now()
  const cachedDiv = DIV_MEMORY_CACHE.get(sym)
  if (cachedDiv && cachedDiv.expiresAt > now) {
    return cachedDiv.data
  }

  try {
    const supabase = getSupabase()
    if (supabase) {
      const { data, error } = await supabase
        .from('dividend_history')
        .select('events_json')
        .eq('symbol', sym)
        .maybeSingle()
      if (!error && data?.events_json) {
        const events = Array.isArray(data.events_json)
          ? data.events_json
          : (typeof data.events_json === 'string' ? JSON.parse(data.events_json) : [])
        if (events.length > 0) {
          const payload: DividendHistoryPayload = { symbol: sym, events }
          DIV_MEMORY_CACHE.set(sym, { data: payload, expiresAt: now + DIV_CACHE_TTL_MS })
          return payload
        }
      }
    }
  } catch {}

  return null
}
