import fs from 'node:fs'
import path from 'node:path'

export interface DailyPricePoint {
  time: number // unix timestamp in seconds
  date: string // DD/MM/YYYY
  close: number // Giá đóng cửa theo VNĐ (ví dụ 73100)
  volume?: number
}

export interface StockPriceHistoryPayload {
  symbol: string
  updatedAt: string
  points: DailyPricePoint[]
}

const CACHE_DIR = path.join(process.cwd(), 'data', 'price_history')

function formatDDMMYYYY(sec: number): string {
  const d = new Date(sec * 1000)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Lấy lịch sử giá ngày của mã cổ phiếu trong N năm gần nhất.
 * Ưu tiên:
 * 1. Đọc cache nội bộ từ data/price_history/{symbol}.json (nếu có và còn mới).
 * 2. Lấy từ VNDirect TradingView Dchart API.
 * 3. Fallback sang DNSE Entrade API nếu VNDirect gặp lỗi.
 */
export async function getStockPriceHistory(
  symbol: string,
  years: number = 3
): Promise<StockPriceHistoryPayload | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  if (!fs.existsSync(CACHE_DIR)) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    } catch {}
  }

  const cacheFile = path.join(CACHE_DIR, `${sym}.json`)
  const now = Date.now()

  // 1. Kiểm tra cache đĩa cục bộ (TTL: 3 giờ trong phiên hoặc 12 giờ ngoài phiên)
  if (fs.existsSync(cacheFile)) {
    try {
      const stat = fs.statSync(cacheFile)
      const ageHours = (now - stat.mtimeMs) / (1000 * 60 * 60)
      if (ageHours < 4) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
        if (cached && Array.isArray(cached.points) && cached.points.length > 0) {
          return cached as StockPriceHistoryPayload
        }
      }
    } catch {}
  }

  const toSec = Math.floor(now / 1000)
  const fromSec = toSec - Math.max(1, years) * 365 * 86400

  // 2. Nạp từ VNDirect DChart API
  try {
    const vnUrl = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${fromSec}&to=${toSec}`
    const res = await fetch(vnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data && data.s === 'ok' && Array.isArray(data.t) && data.t.length > 0) {
        const points: DailyPricePoint[] = []
        const times = data.t
        const closes = data.c
        const volumes = data.v || []

        for (let i = 0; i < times.length; i++) {
          const rawClose = Number(closes[i]) || 0
          // VNDirect trả về đơn vị nghìn đồng nếu < 500
          const closeVnd = rawClose < 500 ? Math.round(rawClose * 1000) : Math.round(rawClose)
          points.push({
            time: times[i],
            date: formatDDMMYYYY(times[i]),
            close: closeVnd,
            volume: Number(volumes[i]) || 0,
          })
        }

        const payload: StockPriceHistoryPayload = {
          symbol: sym,
          updatedAt: new Date().toISOString(),
          points,
        }

        try {
          fs.writeFileSync(cacheFile, JSON.stringify(payload), 'utf-8')
        } catch {}

        return payload
      }
    }
  } catch (e) {
    console.warn(`[StockPriceHistory] Lỗi nạp VNDirect cho ${sym}:`, e)
  }

  // 3. Fallback sang DNSE Entrade API
  try {
    const dnseUrl = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromSec}&to=${toSec}&symbol=${sym}&resolution=1D`
    const res = await fetch(dnseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.t) && data.t.length > 0) {
        const points: DailyPricePoint[] = []
        const times = data.t
        const closes = data.c
        const volumes = data.v || []

        for (let i = 0; i < times.length; i++) {
          const rawClose = Number(closes[i]) || 0
          const closeVnd = rawClose < 500 ? Math.round(rawClose * 1000) : Math.round(rawClose)
          points.push({
            time: times[i],
            date: formatDDMMYYYY(times[i]),
            close: closeVnd,
            volume: Number(volumes[i]) || 0,
          })
        }

        const payload: StockPriceHistoryPayload = {
          symbol: sym,
          updatedAt: new Date().toISOString(),
          points,
        }

        try {
          fs.writeFileSync(cacheFile, JSON.stringify(payload), 'utf-8')
        } catch {}

        return payload
      }
    }
  } catch (e) {
    console.warn(`[StockPriceHistory] Lỗi nạp DNSE cho ${sym}:`, e)
  }

  // 4. Fallback cuối cùng: đọc lại cache cũ nếu có dù đã hết hạn
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      if (cached && Array.isArray(cached.points) && cached.points.length > 0) {
        return cached as StockPriceHistoryPayload
      }
    } catch {}
  }

  return null
}
