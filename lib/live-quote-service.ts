/**
 * Live Stock Quote Service
 * Lấy dữ liệu thị giá thời gian thực (khớp lệnh, tham chiếu, trần/sàn, % tăng giảm, ngày giờ giao dịch)
 * Nguồn: 24hMoney Live Ticker API (cùng nguồn ruatichsan.com sử dụng)
 */

export interface LiveStockQuote {
  symbol: string
  price: number // Thị giá hiện tại (VNĐ, ví dụ 32100)
  priceK: number // Thị giá theo nghìn VNĐ (ví dụ 32.1)
  change: number // Điểm tăng/giảm theo nghìn VNĐ (ví dụ -1.30)
  changePercent: number // Tỷ lệ tăng/giảm theo % (ví dụ -3.89)
  basicPrice: number | null // Giá tham chiếu (VNĐ, ví dụ 33400)
  ceilingPrice: number | null // Giá trần (VNĐ)
  floorPrice: number | null // Giá sàn (VNĐ)
  openPrice: number | null // Giá mở cửa (VNĐ)
  highestPrice: number | null // Giá cao nhất phiên (VNĐ)
  lowestPrice: number | null // Giá thấp nhất phiên (VNĐ)
  volume: number | null // Khối lượng khớp lệnh tích lũy
  accumulatedVal: number | null // Giá trị giao dịch tích lũy (tỷ VNĐ)
  tradingDate: string | null // Ngày giao dịch DD/MM/YYYY
  tradingTime: string | null // Giờ giao dịch HH:mm:ss
  rawTimestamp: number | null // Unix timestamp (ms)
}

const MEMORY_CACHE = new Map<string, { data: LiveStockQuote; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 1000 // 60 giây cache

function formatTradingDate(ms: number | null | undefined): string | null {
  if (!ms) return null
  try {
    const d = new Date(ms)
    if (isNaN(d.getTime())) return null
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return null
  }
}

export async function getLiveStockQuote(symbol: string): Promise<LiveStockQuote | null> {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null

  // 1. Kiểm tra in-memory cache
  const cached = MEMORY_CACHE.get(sym)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  try {
    const url = `https://api-finance-t19.24hmoney.vn/v2/ios/stock/detail-even-deactivate?symbol=${encodeURIComponent(sym.toLowerCase())}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return cached?.data ?? null
    }

    const json = await res.json()
    const d = json?.data
    if (!d) {
      return cached?.data ?? null
    }

    // d.match_price hoặc d.close_price là theo nghìn VNĐ (ví dụ 32.1)
    const rawPriceK = Number(d.match_price ?? d.close_price ?? d.price)
    if (isNaN(rawPriceK) || rawPriceK <= 0) {
      return cached?.data ?? null
    }

    const price = Math.round(rawPriceK < 1000 ? rawPriceK * 1000 : rawPriceK)
    const priceK = rawPriceK < 1000 ? rawPriceK : rawPriceK / 1000

    const change = Number(d.change ?? 0)
    const changePercent = Number(d.change_percent ?? 0)

    const basicPriceK = Number(d.basic_price)
    const ceilingPriceK = Number(d.ceiling_price)
    const floorPriceK = Number(d.floor_price)
    const openPriceK = Number(d.open_price)
    const highestPriceK = Number(d.hieghest_price ?? d.highest_price)
    const lowestPriceK = Number(d.lowest_price)

    const basicPrice = !isNaN(basicPriceK) && basicPriceK > 0 ? Math.round(basicPriceK < 1000 ? basicPriceK * 1000 : basicPriceK) : null
    const ceilingPrice = !isNaN(ceilingPriceK) && ceilingPriceK > 0 ? Math.round(ceilingPriceK < 1000 ? ceilingPriceK * 1000 : ceilingPriceK) : null
    const floorPrice = !isNaN(floorPriceK) && floorPriceK > 0 ? Math.round(floorPriceK < 1000 ? floorPriceK * 1000 : floorPriceK) : null
    const openPrice = !isNaN(openPriceK) && openPriceK > 0 ? Math.round(openPriceK < 1000 ? openPriceK * 1000 : openPriceK) : null
    const highestPrice = !isNaN(highestPriceK) && highestPriceK > 0 ? Math.round(highestPriceK < 1000 ? highestPriceK * 1000 : highestPriceK) : null
    const lowestPrice = !isNaN(lowestPriceK) && lowestPriceK > 0 ? Math.round(lowestPriceK < 1000 ? lowestPriceK * 1000 : lowestPriceK) : null

    const rawTradingDateMs = Number(d.trading_date) || (d.updated_at ? Number(d.updated_at) * 1000 : null)
    const tradingDate = formatTradingDate(rawTradingDateMs)
    const tradingTime = d.time ? String(d.time) : null

    const result: LiveStockQuote = {
      symbol: sym,
      price,
      priceK,
      change,
      changePercent,
      basicPrice,
      ceilingPrice,
      floorPrice,
      openPrice,
      highestPrice,
      lowestPrice,
      volume: Number(d.accumylated_vol ?? d.accumulated_vol) || null,
      accumulatedVal: Number(d.accumulated_val) || null,
      tradingDate,
      tradingTime,
      rawTimestamp: rawTradingDateMs,
    }

    // Lưu cache 60s
    MEMORY_CACHE.set(sym, {
      data: result,
      expiresAt: now + CACHE_TTL_MS,
    })

    return result
  } catch (err) {
    console.error(`[getLiveStockQuote] Error fetching quote for ${sym}:`, err)
    return cached?.data ?? null
  }
}
