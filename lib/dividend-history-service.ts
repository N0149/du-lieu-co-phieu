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
  execDate?: string | null
  eventTitle?: string
  eventType?: 'cash' | 'stock' | 'rights' | 'other'
}

export interface DividendHistoryPayload {
  symbol: string
  events: DividendEventItem[]
}

export function formatEventTitle(text: string, cashVnd: number | null, stockPct: number | null): string {
  if (!text) {
    if (cashVnd && cashVnd > 0) return `Cổ tức bằng tiền, tỷ lệ ${cashVnd.toLocaleString('vi-VN')}đ/CP`
    if (stockPct && stockPct > 0) {
      const p = stockPct <= 1 ? stockPct * 100 : stockPct
      return `Cổ tức bằng cổ phiếu, tỷ lệ ${Math.round(p)}%`
    }
    return 'Sự kiện doanh nghiệp'
  }

  // Khớp mẫu: "Trả cổ tức bằng tiền mặt - Đợt 2 2025 - 500 VND"
  const m1 = text.match(/Trả cổ tức bằng tiền mặt\s*-\s*Đợt\s*(\d+)\s*(\d{4})\s*-\s*([\d,.]+)\s*VND/i)
  if (m1) {
    const val = m1[3].replace(/,/g, '.')
    return `Cổ tức đợt ${m1[1]}/${m1[2]} bằng tiền, tỷ lệ ${val}đ/CP`
  }

  // Khớp mẫu: "Trả cổ tức bằng tiền mặt - Cả năm 2024 - 2,000 VND"
  const m2 = text.match(/Trả cổ tức bằng tiền mặt\s*-\s*Cả năm\s*(\d{4})\s*-\s*([\d,.]+)\s*VND/i)
  if (m2) {
    const val = m2[2].replace(/,/g, '.')
    return `Cổ tức năm ${m2[1]} bằng tiền, tỷ lệ ${val}đ/CP`
  }

  // Khớp mẫu quyền mua: "Phát hành cổ phiếu - Quyền mua CP cho Cổ đông hiện hữu tỉ lệ 50.0%"
  const m3 = text.match(/Quyền mua CP cho Cổ đông hiện hữu\s*tỉ lệ\s*([\d.]+)%/i)
  if (m3) {
    const pct = parseFloat(m3[1])
    let ratio = `${pct}%`
    if (Math.abs(pct - 50) < 0.1) ratio = '2:1'
    else if (Math.abs(pct - 100) < 0.1) ratio = '1:1'
    else if (Math.abs(pct - 20) < 0.1) ratio = '5:1'
    else if (Math.abs(pct - 25) < 0.1) ratio = '4:1'
    return `Phát hành CP cho CĐHH, tỷ lệ ${ratio}, giá 10000đ/CP`
  }

  // Khớp mẫu: "Trả cổ tức bằng cổ phiếu - Tỷ lệ 10%"
  const m4 = text.match(/Trả cổ tức bằng cổ phiếu\s*-\s*(.*)/i)
  if (m4) {
    return `Cổ tức bằng cổ phiếu, ${m4[1].trim()}`
  }

  return text
    .replace(/^Trả cổ tức bằng tiền mặt - /i, 'Cổ tức bằng tiền: ')
    .replace(/^Trả cổ tức bằng cổ phiếu - /i, 'Cổ tức bằng cổ phiếu: ')
    .replace(/^Phát hành cổ phiếu - /i, 'Phát hành CP: ')
}

let corporateEventsCache: Record<string, Array<{ gd_khq?: string; ngay_thuc_hien?: string | null; title_event?: string }>> | null = null

function getCorporateEventsMap() {
  if (corporateEventsCache !== null) return corporateEventsCache
  try {
    const p = path.join(process.cwd(), 'data', 'widata_archive', 'company', 'corporate_events.json')
    if (fs.existsSync(p)) {
      corporateEventsCache = JSON.parse(fs.readFileSync(p, 'utf-8'))
      return corporateEventsCache
    }
  } catch {}
  corporateEventsCache = {}
  return corporateEventsCache
}

function enrichEvents(sym: string, rawEvents: DividendEventItem[]): DividendEventItem[] {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) return []

  const corpMap = getCorporateEventsMap()
  const corpList = corpMap ? corpMap[sym.toUpperCase()] : null

  return rawEvents.map((e) => {
    const rawText = e.texts?.[0] || ''
    const title = e.eventTitle || formatEventTitle(rawText, e.cashVnd, e.stockPct)

    let exec = e.execDate || null
    if (!exec && corpList && corpList.length > 0) {
      const match = corpList.find((c) => c.gd_khq === e.date && c.ngay_thuc_hien)
      if (match?.ngay_thuc_hien) {
        exec = match.ngay_thuc_hien
      }
    }

    const hasCash = e.cashVnd != null && e.cashVnd > 0
    const hasStock = e.stockPct != null && e.stockPct > 0
    const isRights =
      rawText.toLowerCase().includes('quyền mua') ||
      rawText.toLowerCase().includes('phát hành') ||
      rawText.toLowerCase().includes('cđhh')

    let type: 'cash' | 'stock' | 'rights' | 'other' = 'cash'
    if (isRights) type = 'rights'
    else if (hasStock) type = 'stock'
    else if (hasCash) type = 'cash'

    return {
      ...e,
      eventTitle: title,
      execDate: exec,
      eventType: type,
    }
  })
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
        return {
          symbol: sym,
          events: enrichEvents(sym, data.events),
        }
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
            return {
              symbol: sym,
              events: enrichEvents(sym, events),
            }
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
          const payload: DividendHistoryPayload = {
            symbol: sym,
            events: enrichEvents(sym, events),
          }
          DIV_MEMORY_CACHE.set(sym, { data: payload, expiresAt: now + DIV_CACHE_TTL_MS })
          return payload
        }
      }
    }
  } catch {}

  return null
}
