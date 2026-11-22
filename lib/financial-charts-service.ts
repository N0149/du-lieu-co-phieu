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
const CIPHER_KEY_HEX = 'fa4abc75c049cac6b2d58d501f183a3f4eeace7d3f79f37724b1737d095371e5'

const CHART_MEMORY_CACHE = new Map<string, { data: FinancialChartPayload; expiresAt: number }>()
const CACHE_TTL_MS = 3600 * 1000 // 1 hour in-memory cache

let cryptoKeyCache: any = null
const RTZ1_MAGIC = [82, 84, 90, 49];

function isRtz1Compressed(buf: Uint8Array): boolean {
  if (!buf || buf.length < RTZ1_MAGIC.length) return false;
  return RTZ1_MAGIC.every((b, i) => buf[i] === b);
}

async function decompressRtz1Gzip(buf: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(buf);
      controller.close();
    }
  }).pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

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
  const decryptedBytes = new Uint8Array(decryptedBuf)
  const finalBytes = isRtz1Compressed(decryptedBytes)
    ? await decompressRtz1Gzip(decryptedBytes.subarray(RTZ1_MAGIC.length))
    : decryptedBytes
  return JSON.parse(new TextDecoder().decode(finalBytes))
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
      signal: AbortSignal.timeout(800),
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

    // Tự động ghi vào ổ đĩa để các lần sau đạt tốc độ < 0.1ms (bỏ qua trên dev để tránh kích hoạt HMR)
    if (process.env.NODE_ENV !== 'development') {
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }
        fs.writeFileSync(cacheFile, JSON.stringify(remoteData), 'utf-8')
      } catch {}
    }

    return remoteData
  }

  return null
}
