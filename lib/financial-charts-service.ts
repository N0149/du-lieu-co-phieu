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

export async function getFinancialChartData(
  symbol: string,
  periodType: 'quarter' | 'annual' = 'quarter'
): Promise<FinancialChartPayload | null> {
  const sym = symbol.toUpperCase().trim()
  const targetDir = periodType === 'quarter' ? QUARTER_DIR : ANNUAL_DIR
  const cacheFile = path.join(targetDir, `${sym}.json`)

  // 1. Kiểm tra cache đĩa cục bộ (Offline-First, < 0.1ms)
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = fs.readFileSync(cacheFile, 'utf-8')
      return JSON.parse(raw) as FinancialChartPayload
    } catch {}
  }

  // 2. Fallback: Nếu máy chưa có cache thì kéo về và lưu lại
  try {
    const url = `https://api.ruatichsan.com/api/v1/data/public/chart/${periodType}/${sym}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Origin: 'https://ruatichsan.com',
        Referer: `https://ruatichsan.com/company?symbol=${sym}`,
      },
      next: { revalidate: 86400 },
    })

    if (!res.ok) return null
    const data = await decryptApiResponse(res)
    if (data) {
      fs.mkdirSync(targetDir, { recursive: true })
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf-8')
      return data as FinancialChartPayload
    }
  } catch (err) {
    console.error(`[FinancialChartsService] Lỗi tải chart cho ${sym}:`, err)
  }

  return null
}
