import fs from 'node:fs'
import path from 'node:path'

export interface DailyPricePoint {
  time: number // unix timestamp in seconds
  date: string // DD/MM/YYYY
  close: number // Giá đóng cửa theo VNĐ (ví dụ 73100)
  volume?: number
  open?: number // Giá mở cửa theo VNĐ
  high?: number // Giá cao nhất theo VNĐ
  low?: number // Giá thấp nhất theo VNĐ
}

export interface CandleDataPoint {
  time: string // 'YYYY-MM-DD'
  open: number // Đơn vị k VNĐ (ví dụ 27.50)
  high: number
  low: number
  close: number
  volume: number
  dateStr: string // 'DD/MM/YYYY'
  timestamp: number
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

function formatYYYYMMDD(sec: number): string {
  const d = new Date(sec * 1000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Đọc lịch sử giá từ cache nội bộ data/price_history/{ticker}.json (0ms, 100% offline)
 */
export function getLocalPriceWeekly(ticker: string): { d: string; c: number; v: number }[] {
  try {
    const p = path.join(CACHE_DIR, `${ticker.toUpperCase().trim()}.json`)
    if (!fs.existsSync(p)) return []
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.points)) return []

    return parsed.points.map((pt: any) => {
      let d = pt.date || ''
      if (d.includes('/')) {
        const parts = d.split('/')
        if (parts.length === 3) d = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
      return {
        d,
        c: pt.close ? Math.round((pt.close / 1000) * 100) / 100 : 0,
        v: pt.volume || 0,
      }
    })
  } catch {
    return []
  }
}

/**
 * Đọc nến giá TradingView trực tiếp từ cache nội bộ (0ms, 100% offline, không gọi network bên ngoài)
 */
export function getLocalStockCandles(symbol: string): CandleDataPoint[] {
  try {
    const sym = symbol.toUpperCase().trim()
    const p = path.join(CACHE_DIR, `${sym}.json`)
    if (!fs.existsSync(p)) return []
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.points) || parsed.points.length === 0) return []

    const sortedPoints = [...parsed.points].sort((a: any, b: any) => a.time - b.time)
    const candleMap = new Map<string, CandleDataPoint>()

    for (const pt of sortedPoints) {
      const timeStr = formatYYYYMMDD(pt.time)
      if (!timeStr) continue

      const openVal = Math.round(((pt.open ?? pt.close) / 1000) * 100) / 100
      const highVal = Math.round(((pt.high ?? pt.close) / 1000) * 100) / 100
      const lowVal = Math.round(((pt.low ?? pt.close) / 1000) * 100) / 100
      const closeVal = Math.round((pt.close / 1000) * 100) / 100
      const vol = pt.volume || 0

      if (candleMap.has(timeStr)) {
        const existing = candleMap.get(timeStr)!
        existing.high = Math.max(existing.high, highVal, closeVal)
        existing.low = Math.min(existing.low, lowVal, closeVal)
        existing.close = closeVal
        existing.volume = (existing.volume || 0) + vol
        existing.timestamp = pt.time
      } else {
        candleMap.set(timeStr, {
          time: timeStr,
          open: openVal,
          high: Math.max(highVal, openVal, closeVal),
          low: Math.min(lowVal, openVal, closeVal),
          close: closeVal,
          volume: vol,
          dateStr: pt.date || formatDDMMYYYY(pt.time),
          timestamp: pt.time,
        })
      }
    }

    return Array.from(candleMap.values()).sort((a, b) => a.time.localeCompare(b.time))
  } catch {
    return []
  }
}

/**
 * Lấy lịch sử giá ngày của mã cổ phiếu trong N năm gần nhất.
 * Ưu tiên:
 * 1. Đọc cache nội bộ từ data/price_history/{symbol}.json nếu đã có đầy đủ OHLC.
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

  let cachedPayload: StockPriceHistoryPayload | null = null
  // 1. Kiểm tra cache đĩa cục bộ
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      if (cached && Array.isArray(cached.points) && cached.points.length > 0) {
        cachedPayload = cached as StockPriceHistoryPayload
        // Nếu cache đã có sẵn trường open (full OHLCV), dùng ngay
        if (cached.points[0]?.open != null) {
          return cachedPayload
        }
      }
    } catch {}
  }

  const toSec = Math.floor(now / 1000)
  const fromSec = toSec - Math.max(1, years) * 365 * 86400

  const toVnd = (raw: number) => (raw < 500 ? Math.round(raw * 1000) : Math.round(raw))

  // 2. Dự phòng nạp từ VNDirect DChart API (để lấy đủ OHLCV)
  try {
    const vnUrl = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${fromSec}&to=${toSec}`
    const res = await fetch(vnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data && data.s === 'ok' && Array.isArray(data.t) && data.t.length > 0) {
        const points: DailyPricePoint[] = []
        const times = data.t
        const opens = data.o || []
        const highs = data.h || []
        const lows = data.l || []
        const closes = data.c || []
        const volumes = data.v || []

        for (let i = 0; i < times.length; i++) {
          const rawClose = Number(closes[i]) || 0
          const rawOpen = Number(opens[i]) || rawClose
          const rawHigh = Number(highs[i]) || Math.max(rawOpen, rawClose)
          const rawLow = Number(lows[i]) || Math.min(rawOpen, rawClose)

          points.push({
            time: times[i],
            date: formatDDMMYYYY(times[i]),
            open: toVnd(rawOpen),
            high: toVnd(rawHigh),
            low: toVnd(rawLow),
            close: toVnd(rawClose),
            volume: Number(volumes[i]) || 0,
          })
        }

        const payload: StockPriceHistoryPayload = {
          symbol: sym,
          updatedAt: new Date().toISOString(),
          points,
        }

        if (process.env.NODE_ENV !== 'development') {
          try {
            fs.writeFileSync(cacheFile, JSON.stringify(payload), 'utf-8')
          } catch {}
        }

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
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.t) && data.t.length > 0) {
        const points: DailyPricePoint[] = []
        const times = data.t
        const opens = data.o || []
        const highs = data.h || []
        const lows = data.l || []
        const closes = data.c || []
        const volumes = data.v || []

        for (let i = 0; i < times.length; i++) {
          const rawClose = Number(closes[i]) || 0
          const rawOpen = Number(opens[i]) || rawClose
          const rawHigh = Number(highs[i]) || Math.max(rawOpen, rawClose)
          const rawLow = Number(lows[i]) || Math.min(rawOpen, rawClose)

          points.push({
            time: times[i],
            date: formatDDMMYYYY(times[i]),
            open: toVnd(rawOpen),
            high: toVnd(rawHigh),
            low: toVnd(rawLow),
            close: toVnd(rawClose),
            volume: Number(volumes[i]) || 0,
          })
        }

        const payload: StockPriceHistoryPayload = {
          symbol: sym,
          updatedAt: new Date().toISOString(),
          points,
        }

        if (process.env.NODE_ENV !== 'development') {
          try {
            fs.writeFileSync(cacheFile, JSON.stringify(payload), 'utf-8')
          } catch {}
        }

        return payload
      }
    }
  } catch (e) {
    console.warn(`[StockPriceHistory] Lỗi nạp DNSE cho ${sym}:`, e)
  }

  // 4. Fallback cuối cùng: dùng cache cũ đã nạp (dù thiếu OHLC thì tự ước lượng)
  if (cachedPayload) {
    const enrichedPoints = cachedPayload.points.map((pt) => {
      const c = pt.close || 0
      return {
        ...pt,
        open: pt.open ?? c,
        high: pt.high ?? c,
        low: pt.low ?? c,
      }
    })
    return {
      ...cachedPayload,
      points: enrichedPoints,
    }
  }

  return null
}

/**
 * Lấy danh sách nến chuẩn cho TradingView (Lightweight Charts)
 * Đơn vị giá: k VNĐ (ví dụ 27.50, 34.63 như trên biểu đồ FireAnt)
 */
export async function getStockCandles(
  symbol: string,
  years: number = 3
): Promise<CandleDataPoint[]> {
  const history = await getStockPriceHistory(symbol, years)
  if (!history || !Array.isArray(history.points) || history.points.length === 0) return []

  // Sắp xếp các điểm theo unix timestamp tăng dần
  const sortedPoints = [...history.points].sort((a, b) => a.time - b.time)

  const candleMap = new Map<string, CandleDataPoint>()

  for (const pt of sortedPoints) {
    const timeStr = formatYYYYMMDD(pt.time)
    if (!timeStr) continue

    const openVal = Math.round(((pt.open ?? pt.close) / 1000) * 100) / 100
    const highVal = Math.round(((pt.high ?? pt.close) / 1000) * 100) / 100
    const lowVal = Math.round(((pt.low ?? pt.close) / 1000) * 100) / 100
    const closeVal = Math.round((pt.close / 1000) * 100) / 100
    const vol = pt.volume || 0

    if (candleMap.has(timeStr)) {
      // Nếu cùng 1 ngày có nhiều điểm: gộp nến để tạo ra nến hợp nhất
      const existing = candleMap.get(timeStr)!
      existing.high = Math.max(existing.high, highVal, closeVal)
      existing.low = Math.min(existing.low, lowVal, closeVal)
      existing.close = closeVal
      existing.volume = (existing.volume || 0) + vol
      existing.timestamp = pt.time
    } else {
      candleMap.set(timeStr, {
        time: timeStr,
        open: openVal,
        high: Math.max(highVal, openVal, closeVal),
        low: Math.min(lowVal, openVal, closeVal),
        close: closeVal,
        volume: vol,
        dateStr: pt.date,
        timestamp: pt.time,
      })
    }
  }

  // Đảm bảo danh sách trả về strictly sorted theo thời gian
  return Array.from(candleMap.values()).sort((a, b) => a.time.localeCompare(b.time))
}
