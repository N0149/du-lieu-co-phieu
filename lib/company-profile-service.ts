import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  CompanyFullProfileData,
  ShareholderItem,
  OwnershipStructure,
  SubsidiaryItem,
  InsiderTradeItem,
} from './company-profile-types'
import { fetchDirectCompanyProfile } from './direct-market-bot'

let supabaseInstance: SupabaseClient | null = null
function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxtmuwrpuywrkclobfpa.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jjx3eb2edh-gxHZKYEZIog_UyWNqV9Z'
  if (!url || !key) return null
  supabaseInstance = createClient(url, key)
  return supabaseInstance
}

const PROFILE_MEMORY_CACHE = new Map<string, { data: CompanyFullProfileData; expiresAt: number }>()
const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000 // 10 phút RAM cache

const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'

const SLICE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
]

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

const CACHE_DIR = path.join(process.cwd(), 'data', 'shareholder_cache')

export function parseShareholderPayload(sym: string, d: any): CompanyFullProfileData {
  // 1. Phân tích cơ cấu cổ đông
  const rawList: any[] = d.co_cau_so_huu?.CoDongSoHuu || []
  const shareholders: ShareholderItem[] = rawList
    .map((item) => {
      const rateStr = String(item.AssetRate || '0').replace(',', '.')
      return {
        name: item.Name || '—',
        shares: item.AssetVolume || '—',
        rate: parseFloat(rateStr) || 0,
        updated: item.UpdatedDate || '—',
      }
    })
    .sort((a, b) => b.rate - a.rate)

  const top9 = shareholders.slice(0, 9)
  const top9Sum = top9.reduce((acc, cur) => acc + cur.rate, 0)
  const otherRate = Math.max(0, parseFloat((100 - top9Sum).toFixed(2)))

  const pieChartData = top9.map((sh, idx) => ({
    name: sh.name,
    value: sh.rate,
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
  }))

  if (otherRate > 0) {
    pieChartData.push({
      name: 'Cổ đông khác',
      value: otherRate,
      color: '#64748b',
    })
  }

  const ownership: OwnershipStructure = {
    foreign: Number(d.co_cau_so_huu?.NuocNgoai) || 0,
    state: Number(d.co_cau_so_huu?.NhaNuoc) || 0,
    other: Number(d.co_cau_so_huu?.Khac) || (100 - (Number(d.co_cau_so_huu?.NuocNgoai) || 0)),
    shareholders,
    pieChartData,
  }

  // 2. Công ty con & công ty liên kết
  const subsidiaries: SubsidiaryItem[] = []

  const conList: any[] = d.cong_ty_con || d.Subsidiaries || []
  for (const c of conList) {
    subsidiaries.push({
      name: c.Name || '—',
      charterCapital: Number(c.TotalCapital) || 0,
      contributedCapital: Number(c.SharedCapital) || 0,
      ownershipRate: Number(c.OwnershipRate) || 0,
      type: 'subsidiary',
      note: c.Note || c.TradeCenter || '',
    })
  }

  const lkList: any[] = d.cong_ty_lien_ket || d.AssociatedCompanies || d.Affiliates || []
  for (const c of lkList) {
    subsidiaries.push({
      name: c.Name || '—',
      charterCapital: Number(c.TotalCapital) || 0,
      contributedCapital: Number(c.SharedCapital) || 0,
      ownershipRate: Number(c.OwnershipRate) || 0,
      type: 'associate',
      note: c.Note || c.TradeCenter || '',
    })
  }

  const otherList: any[] = d.OtherCompanies || []
  for (const o of otherList) {
    subsidiaries.push({
      name: o.Name || '—',
      charterCapital: Number(o.TotalCapital) || 0,
      contributedCapital: Number(o.SharedCapital) || 0,
      ownershipRate: Number(o.OwnershipRate) || 0,
      type: 'associate',
      note: o.Note || o.TradeCenter || '',
    })
  }

function parseAnyDateToVn(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const match = String(dateStr).match(/\/Date\((\d+)\)\//)
  if (match) {
    const d = new Date(parseInt(match[1], 10))
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  let s = String(dateStr)
  if (s.includes('T')) {
    s = s.split('T')[0]
  }
  if (s.includes('-')) {
    const parts = s.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return s
}

function getTradeTimestamp(dStr: string): number {
  if (!dStr) return 0
  const parts = dStr.split('/')
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime()
  }
  return 0
}

  // 3. Lịch sử giao dịch nội bộ
  const rawTrades: any[] = d.giao_dich_noi_bo || d.co_cau_so_huu?.giao_dich_noi_bo || d.insiderTrades || []
  const dedupedRawTrades: any[] = []
  const handledKeys = new Set<string>()

  for (const t of rawTrades) {
    const name = (t.transaction_name || t.TransactionMan || t.traderName || '').trim()
    const planBuy = Number(t.plan_buy ?? t.PlanBuyVolume ?? (t.action === 'BUY' ? t.volumeRegistered : 0)) || 0
    const planSell = Number(t.plan_sell ?? t.PlanSellVolume ?? (t.action === 'SELL' ? t.volumeRegistered : 0)) || 0
    const planBegin = t.plan_begin_date || t.PlanBeginDate || t.planBeginDate || ''
    const planEnd = t.plan_end_date || t.PlanEndDate || t.planEndDate || ''

    const hasPlan = (planBuy > 0 || planSell > 0) && Boolean(planBegin || planEnd)

    if (hasPlan) {
      const roundKey = `${name}_${planBuy}_${planSell}_${planBegin}_${planEnd}`
      if (handledKeys.has(roundKey)) continue
      const matches = rawTrades.filter((m) => {
        const mName = (m.transaction_name || m.TransactionMan || m.traderName || '').trim()
        const mPlanBuy = Number(m.plan_buy ?? m.PlanBuyVolume ?? (m.action === 'BUY' ? m.volumeRegistered : 0)) || 0
        const mPlanSell = Number(m.plan_sell ?? m.PlanSellVolume ?? (m.action === 'SELL' ? m.volumeRegistered : 0)) || 0
        const mPlanBegin = m.plan_begin_date || m.PlanBeginDate || m.planBeginDate || ''
        const mPlanEnd = m.plan_end_date || m.PlanEndDate || m.planEndDate || ''
        return `${mName}_${mPlanBuy}_${mPlanSell}_${mPlanBegin}_${mPlanEnd}` === roundKey
      })
      let best = matches[0]
      for (const m of matches) {
        const mRealBuy = Number(m.real_buy ?? m.RealBuyVolume ?? (m.action === 'BUY' ? m.volumeTraded : 0)) || 0
        const mRealSell = Number(m.real_sell ?? m.RealSellVolume ?? (m.action === 'SELL' ? m.volumeTraded : 0)) || 0
        const mRealEnd = m.real_end_date || m.RealEndDate || m.realEndDate
        if (mRealBuy > 0 || mRealSell > 0 || mRealEnd) {
          best = m
          break
        }
      }
      handledKeys.add(roundKey)
      dedupedRawTrades.push(best)
    } else {
      // Giao dịch trực tiếp không qua đăng ký trước
      const realBuy = Number(t.real_buy ?? t.RealBuyVolume ?? (t.action === 'BUY' ? t.volumeTraded : 0)) || 0
      const realSell = Number(t.real_sell ?? t.RealSellVolume ?? (t.action === 'SELL' ? t.volumeTraded : 0)) || 0
      const realEnd = t.real_end_date || t.RealEndDate || t.realEndDate || t.tradeDate || ''
      const pubDate = t.published_date || t.PublishedDate || t.publishedDate || ''
      const volAfter = t.volume_after ?? t.VolumeAfterTransaction ?? t.volumeAfter ?? ''
      const exactKey = `${name}_${realBuy}_${realSell}_${realEnd}_${pubDate}_${volAfter}`
      if (handledKeys.has(exactKey)) continue
      handledKeys.add(exactKey)
      dedupedRawTrades.push(t)
    }
  }

  const insiderTrades: InsiderTradeItem[] = []
  for (const t of dedupedRawTrades) {
    if (t.action && (t.volumeTraded != null || t.volumeRegistered != null) && t.tradeDate && !t.real_buy && !t.RealBuyVolume && !t.real_sell && !t.RealSellVolume) {
      insiderTrades.push(t)
      continue
    }

    const realBuy = Number(t.real_buy ?? t.RealBuyVolume ?? (t.action === 'BUY' ? t.volumeTraded : 0)) || 0
    const realSell = Number(t.real_sell ?? t.RealSellVolume ?? (t.action === 'SELL' ? t.volumeTraded : 0)) || 0
    const planBuy = Number(t.plan_buy ?? t.PlanBuyVolume ?? (t.action === 'BUY' ? t.volumeRegistered : 0)) || 0
    const planSell = Number(t.plan_sell ?? t.PlanSellVolume ?? (t.action === 'SELL' ? t.volumeRegistered : 0)) || 0

    const rawDate = t.real_end_date || t.RealEndDate || t.realEndDate || t.plan_end_date || t.PlanEndDate || t.planEndDate || t.plan_begin_date || t.PlanBeginDate || t.published_date || t.PublishedDate || t.tradeDate || ''
    const tradeDate = parseAnyDateToVn(rawDate)

    const volBeforeRaw = t.volume_before ?? t.VolumeBeforeTransaction ?? t.volumeBefore
    const volumeBefore = (volBeforeRaw != null && volBeforeRaw !== '') ? Number(volBeforeRaw) : undefined
    const volumeAfter = Number(t.volume_after ?? t.VolumeAfterTransaction ?? t.volumeAfter) || 0
    const ownershipRate = Number(t.ownership_rate || t.ty_le_so_huu || t.TyLeSoHuu || t.ownershipRate) || undefined

    const base = {
      traderName: (t.transaction_name || t.TransactionMan || t.traderName || '—').replace(/<[^>]+>/g, '').trim(),
      traderPosition: (t.transaction_position || t.TransactionManPosition || t.traderPosition || '').trim(),
      leaderName: (t.leader_name || t.RelatedMan || t.leaderName || '').replace(/<[^>]+>/g, '').trim(),
      leaderPosition: (t.leader_position || t.RelatedManPosition || t.leaderPosition || '').trim(),
      tradeDate,
      volumeBefore,
      volumeAfter,
      ownershipRate,
    }

    if (realSell > 0 || planSell > 0) {
      insiderTrades.push({
        ...base,
        action: 'SELL',
        volumeTraded: realSell,
        volumeRegistered: planSell,
      })
    }
    if (realBuy > 0 || planBuy > 0) {
      insiderTrades.push({
        ...base,
        action: 'BUY',
        volumeTraded: realBuy,
        volumeRegistered: planBuy,
      })
    }
    if (realSell === 0 && planSell === 0 && realBuy === 0 && planBuy === 0) {
      insiderTrades.push({
        ...base,
        action: t.action || 'NONE',
        volumeTraded: 0,
        volumeRegistered: 0,
      })
    }
  }

  // Sắp xếp ngày mới nhất lên đầu
  insiderTrades.sort((a, b) => getTradeTimestamp(b.tradeDate) - getTradeTimestamp(a.tradeDate))

  return {
    symbol: sym,
    ownership,
    subsidiaries,
    insiderTrades,
  }
}

const DB_PROFILE_PATH = path.resolve(process.cwd(), 'data', 'company_profiles.db')

export async function getCompanyFullProfile(symbol: string): Promise<CompanyFullProfileData | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  // 1. Đọc trực tiếp từ SQLite company_profiles.db (đã có đủ 1.530 mã, < 0.2ms)
  if (fs.existsSync(DB_PROFILE_PATH)) {
    try {
      const db = new DatabaseSync(DB_PROFILE_PATH, { readOnly: true })
      try {
        const row = db.prepare('SELECT raw_json FROM company_profiles WHERE symbol = ?').get(sym) as any
        if (row?.raw_json) {
          const parsed = JSON.parse(row.raw_json)
          if (parsed?.ownership) {
            return parsed
          }
          if (parsed?.co_cau_so_huu) {
            return parseShareholderPayload(sym, parsed)
          }
        }
      } finally {
        db.close()
      }
    } catch {}
  }

  // 2. Dự phòng đọc từ local cache disk nếu có
  const cacheFile = path.join(CACHE_DIR, `${sym}.json`)
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      if (cached?.ownership) {
        return cached
      }
      if (cached?.co_cau_so_huu) {
        return parseShareholderPayload(sym, cached)
      }
    } catch {}
  }

  // 3. Đọc từ Supabase Cloud Database (<25ms, Vercel 24/7 khi tắt máy)
  const now = Date.now()
  const cachedProfile = PROFILE_MEMORY_CACHE.get(sym)
  if (cachedProfile && cachedProfile.expiresAt > now) {
    return cachedProfile.data
  }

  try {
    const supabase = getSupabase()
    if (supabase) {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('raw_json')
        .eq('symbol', sym)
        .maybeSingle()
      if (!error && data?.raw_json) {
        const parsed = typeof data.raw_json === 'string' ? JSON.parse(data.raw_json) : data.raw_json
        let finalData: CompanyFullProfileData | null = null
        if (parsed?.ownership) {
          finalData = parsed
        } else if (parsed?.co_cau_so_huu) {
          finalData = parseShareholderPayload(sym, parsed)
        }
        if (finalData) {
          PROFILE_MEMORY_CACHE.set(sym, { data: finalData, expiresAt: now + PROFILE_CACHE_TTL_MS })
          return finalData
        }
      }
    }
  } catch {}

  // 4. Nếu chưa có trên cơ sở dữ liệu, tự động fetch trực tiếp từ CafeF
  try {
    const directProfile = await fetchDirectCompanyProfile(sym)
    if (directProfile) {
      PROFILE_MEMORY_CACHE.set(sym, { data: directProfile, expiresAt: now + PROFILE_CACHE_TTL_MS })
      return directProfile
    }
  } catch {}

  return null
}
