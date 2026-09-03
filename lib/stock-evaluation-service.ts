import fs from 'node:fs'
import path from 'node:path'

const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'

export interface StockEvaluationData {
  symbol: string
  score360: {
    total: number
    ratingText: string
    peVsMedian: number | null
    pbVsMedian: number | null
    psVsMedian: number | null
    peForward: number | null
    peForwardVsMedian: number | null
    pbForward: number | null
    pbForwardVsMedian: number | null
  } | null
  price: number | null
  priceChange?: number | null
  priceChangePct?: number | null
  metrics: {
    marketCap: number | null // in tỷ (T)
    pe: number | null
    eps: number | null
    volume10d: number | null
    pb: number | null
    ps: number | null
    bvps: number | null
    sharesOut: number | null
    evEbitda: number | null
    beta: number | null
  }
}

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

const CACHE_DIR = path.join(process.cwd(), 'data', 'evaluation_cache')

export async function getStockEvaluation(symbol: string): Promise<StockEvaluationData | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  // Đảm bảo thư mục cache tồn tại
  if (!fs.existsSync(CACHE_DIR)) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    } catch {}
  }

  const cacheFile = path.join(CACHE_DIR, `${sym}.json`)
  // Ưu tiên đọc từ cache cục bộ (Offline-First, không phụ thuộc vào ruatichsan)
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      if (cached?.metrics) {
        return cached
      }
      if (cached?.snapshot) {
        const s = cached.snapshot
        const score = s?.score360_total ?? null
        let ratingText = 'TRUNG BÌNH'
        if (score != null) {
          if (score >= 8.0) ratingText = 'XUẤT SẮC'
          else if (score >= 6.5) ratingText = 'TỐT'
          else if (score >= 5.0) ratingText = 'KHÁ'
          else ratingText = 'CẦN LƯU Ý'
        }
        return {
          symbol: sym,
          score360: score != null ? {
            total: score,
            ratingText,
            peVsMedian: s?.pe_vs_median ?? null,
            pbVsMedian: s?.pb_vs_median ?? null,
            psVsMedian: s?.ps_vs_median ?? null,
            peForward: s?.pe_forward ?? null,
            peForwardVsMedian: s?.pe_forward_vs_median ?? null,
            pbForward: s?.pb_forward ?? null,
            pbForwardVsMedian: s?.pb_forward_vs_median ?? null,
          } : null,
          price: s?.price != null ? s.price / 1000 : null,
          metrics: {
            marketCap: s?.market_cap_bn ?? null,
            pe: s?.pe ?? null,
            eps: s?.eps ?? cached?.lastEps ?? null,
            volume10d: null,
            pb: s?.pb ?? null,
            ps: s?.ps ?? cached?.ps?.at(-1) ?? null,
            bvps: s?.bvps ?? cached?.lastBvps ?? null,
            sharesOut: cached?.lastCirculationVol ?? null,
            evEbitda: null,
            beta: null,
          }
        }
      }
    } catch {}
  }

  try {
    const [valRes, moneyRes] = await Promise.allSettled([
      fetch(`https://api.ruatichsan.com/api/v1/data/public/valuation/${sym}`, {
        headers: {
          Origin: 'https://ruatichsan.com',
          Referer: `https://ruatichsan.com/company?symbol=${sym}`,
        },
        next: { revalidate: 600 },
      }),
      fetch(`https://api-finance-t19.24hmoney.vn/v2/ios/companies/index?symbol=${sym}`, {
        next: { revalidate: 600 },
      }),
    ])

    let valData: any = null
    if (valRes.status === 'fulfilled' && valRes.value.ok) {
      valData = await decryptApiResponse(valRes.value)
    } else {
      // Nếu ruatichsan không phản hồi / đóng cửa -> Tự động chuyển sang Bot trực tiếp CafeF & 24hMoney
      const { fetchDirectStockEvaluation } = await import('./direct-market-bot')
      const direct = await fetchDirectStockEvaluation(sym)
      if (direct) {
        try {
          fs.writeFileSync(cacheFile, JSON.stringify(direct, null, 2), 'utf-8')
        } catch {}
        return direct
      }
    }

    let moneyData: any = null
    if (moneyRes.status === 'fulfilled' && moneyRes.value.ok) {
      try {
        const json = await moneyRes.value.json()
        moneyData = json.data
      } catch {}
    }

    const s = valData?.snapshot
    const score = s?.score360_total ?? null

    let ratingText = 'TRUNG BÌNH'
    if (score != null) {
      if (score >= 8.0) ratingText = 'XUẤT SẮC'
      else if (score >= 6.5) ratingText = 'TỐT'
      else if (score >= 5.0) ratingText = 'KHÁ'
      else ratingText = 'CẦN LƯU Ý'
    }

    const result: StockEvaluationData = {
      symbol: sym,
      score360:
        score != null
          ? {
              total: score,
              ratingText,
              peVsMedian: s?.pe_vs_median ?? null,
              pbVsMedian: s?.pb_vs_median ?? null,
              psVsMedian: s?.ps_vs_median ?? null,
              peForward: s?.pe_forward ?? null,
              peForwardVsMedian: s?.pe_forward_vs_median ?? null,
              pbForward: s?.pb_forward ?? null,
              pbForwardVsMedian: s?.pb_forward_vs_median ?? null,
            }
          : null,
      price: s?.price != null ? s.price / 1000 : null,
      metrics: {
        marketCap: s?.market_cap_bn ?? null,
        pe: s?.pe ?? moneyData?.pe ?? null,
        eps: s?.eps ?? valData?.lastEps ?? null,
        volume10d: moneyData?.avg_trading_vol ?? null,
        pb: s?.pb ?? moneyData?.pb ?? null,
        ps: s?.ps ?? valData?.ps?.at(-1) ?? null,
        bvps: s?.bvps ?? valData?.lastBvps ?? null,
        sharesOut: valData?.lastCirculationVol ?? moneyData?.circulation_vol ?? null,
        evEbitda: moneyData?.ev_per_ebitda || null,
        beta: moneyData?.the_beta ?? null,
      },
    }

    // Ghi cache nền
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf-8')
    } catch {}

    return result
  } catch (err) {
    console.error(`[getStockEvaluation] Lỗi tải dữ liệu đánh giá ${sym}:`, err)
    return null
  }
}
