import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export interface FinancialChartPayload {
  newFiscalDateQuarter?: string[]
  newFiscalDateYear?: string[]
  isNganHang?: boolean
  isChungKhoan?: boolean
  [key: string]: any
}

const DATA_DIR = path.join(process.cwd(), 'data')
const QUARTER_DIR = path.join(DATA_DIR, 'financial_charts', 'quarter')
const ANNUAL_DIR = path.join(DATA_DIR, 'financial_charts', 'annual')
const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'

const CHART_MEMORY_CACHE = new Map<string, { data: FinancialChartPayload; expiresAt: number }>()
const CACHE_TTL_MS = 3600 * 1000 // 1 hour in-memory cache

let cryptoKeyCache: any = null
async function getCryptoKey(): Promise<any> {
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

async function fetchRemoteChartData(
  symbol: string,
  periodType: 'quarter' | 'annual'
): Promise<FinancialChartPayload | null> {
  const sym = symbol.toUpperCase().trim()
  const url = `https://api.ruatichsan.com/api/v1/data/public/chart/${periodType}/${sym}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Origin: 'https://ruatichsan.com',
        Referer: `https://ruatichsan.com/company?symbol=${sym}`,
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return (await decryptApiResponse(res)) as FinancialChartPayload
  } catch {
    return null
  }
}

export async function getFinancialChartData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter'
): Promise<FinancialChartPayload | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  const targetDir = periodType === 'quarter' ? QUARTER_DIR : ANNUAL_DIR
  const cacheFile = path.join(targetDir, `${sym}.json`)

  // 1. Kiểm tra cache đĩa cục bộ (Offline-First, < 0.1ms)
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = fs.readFileSync(cacheFile, 'utf-8')
      return JSON.parse(raw) as FinancialChartPayload
    } catch {}
  }

  // 2. Kiểm tra bộ nhớ RAM cache (0ms)
  const cacheKey = `${sym}_${periodType}`
  const cached = CHART_MEMORY_CACHE.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  // 3. Tải dự phòng On-Demand từ API máy chủ dữ liệu nếu chưa có file
  const remoteData = await fetchRemoteChartData(sym, periodType)
  if (remoteData) {
    CHART_MEMORY_CACHE.set(cacheKey, {
      data: remoteData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    // Tự động ghi vào ổ đĩa để các lần sau đạt tốc độ < 0.1ms
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }
      fs.writeFileSync(cacheFile, JSON.stringify(remoteData), 'utf-8')
    } catch {}

    return remoteData
  }

  return null
}
