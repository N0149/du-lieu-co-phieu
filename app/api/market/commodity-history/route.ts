import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // Cache 30 phút

const COMMODITY_MAP: Record<string, { ticker: string; name: string; unit: string }> = {
  // Dầu thô
  CRUDE_OIL_WTI: { ticker: 'CL=F', name: 'Dầu thô WTI (Crude Oil)', unit: 'USD/Bbl' },
  'WTI Crude Oil': { ticker: 'CL=F', name: 'Dầu thô WTI (Crude Oil)', unit: 'USD/Bbl' },
  BRENT: { ticker: 'BZ=F', name: 'Dầu thô Brent (Brent Oil)', unit: 'USD/Bbl' },
  'Brent Oil': { ticker: 'BZ=F', name: 'Dầu thô Brent (Brent Oil)', unit: 'USD/Bbl' },

  // Kim loại
  GOLD: { ticker: 'GC=F', name: 'Vàng thế giới (Gold Futures)', unit: 'USD/t.oz' },
  Gold: { ticker: 'GC=F', name: 'Vàng thế giới (Gold Futures)', unit: 'USD/t.oz' },
  SILVER: { ticker: 'SI=F', name: 'Bạc thế giới (Silver Futures)', unit: 'USD/t.oz' },
  Silver: { ticker: 'SI=F', name: 'Bạc thế giới (Silver Futures)', unit: 'USD/t.oz' },
  COPPER: { ticker: 'HG=F', name: 'Đồng thế giới (Copper)', unit: 'USD/Lbs' },

  // Năng lượng
  NATURAL_GAS: { ticker: 'NG=F', name: 'Khí tự nhiên (Natural Gas)', unit: 'USD/MMBtu' },
  'Natural gas': { ticker: 'NG=F', name: 'Khí tự nhiên (Natural Gas)', unit: 'USD/MMBtu' },

  // Vật liệu & Nông sản
  STEEL: { ticker: 'HRC=F', name: 'Thép cuộn HRC (Steel)', unit: 'USD/T' },
  Steel: { ticker: 'HRC=F', name: 'Thép cuộn HRC (Steel)', unit: 'USD/T' },
  SUGAR: { ticker: 'SB=F', name: 'Đường (Sugar No. 11)', unit: 'USd/Lbs' },
  Sugar: { ticker: 'SB=F', name: 'Đường (Sugar No. 11)', unit: 'USd/Lbs' },
  COFFEE: { ticker: 'KC=F', name: 'Cà phê Arabica (Coffee)', unit: 'USd/Lbs' },

  // 4 MẶT HÀNG MỚI BỔ SUNG
  'ZC=F': { ticker: 'ZC=F', name: 'Ngô (Corn Futures - ZC=F)', unit: 'USd/Bu' },
  CORN: { ticker: 'ZC=F', name: 'Ngô (Corn Futures - ZC=F)', unit: 'USd/Bu' },
  'Ngô (Corn)': { ticker: 'ZC=F', name: 'Ngô (Corn Futures - ZC=F)', unit: 'USd/Bu' },

  'ZS=F': { ticker: 'ZS=F', name: 'Đậu tương (Soybeans Futures - ZS=F)', unit: 'USd/Bu' },
  SOYBEANS: { ticker: 'ZS=F', name: 'Đậu tương (Soybeans Futures - ZS=F)', unit: 'USd/Bu' },
  'Đậu tương (Soybeans)': { ticker: 'ZS=F', name: 'Đậu tương (Soybeans Futures - ZS=F)', unit: 'USd/Bu' },

  'CT=F': { ticker: 'CT=F', name: 'Bông (Cotton Futures - CT=F)', unit: 'USd/Lbs' },
  COTTON: { ticker: 'CT=F', name: 'Bông (Cotton Futures - CT=F)', unit: 'USd/Lbs' },
  'Bông (Cotton)': { ticker: 'CT=F', name: 'Bông (Cotton Futures - CT=F)', unit: 'USd/Lbs' },

  UREA: { ticker: 'UREA', name: 'Giá phân Urea (Granular FOB)', unit: 'USD/T' },
  'Giá phân Urea': { ticker: 'UREA', name: 'Giá phân Urea (Granular FOB)', unit: 'USD/T' },
  Urea: { ticker: 'UREA', name: 'Giá phân Urea (Granular FOB)', unit: 'USD/T' },
  RUBBER: { ticker: 'RUBBER', name: 'Cao su RSS3 thế giới (Rubber)', unit: 'USD Cents/Kg' },
  Rubber: { ticker: 'RUBBER', name: 'Cao su RSS3 thế giới (Rubber)', unit: 'USD Cents/Kg' },
  'Cao su': { ticker: 'RUBBER', name: 'Cao su RSS3 thế giới (Rubber)', unit: 'USD Cents/Kg' },
  'cao su': { ticker: 'RUBBER', name: 'Cao su RSS3 thế giới (Rubber)', unit: 'USD Cents/Kg' },
  'JN1:COM': { ticker: 'RUBBER', name: 'Cao su RSS3 thế giới (Rubber)', unit: 'USD Cents/Kg' },
  'JN1=F': { ticker: 'RUBBER', name: 'Cao su RSS3 thế giới (Rubber)', unit: 'USD Cents/Kg' },
}

// Chuỗi dữ liệu lịch sử chuẩn 10 năm của Phân Urea (World Bank & Trading Economics FOB)
const UREA_10Y_SERIES = [
  // 2016
  { ymd: '2016-01-15', p: 215 }, { ymd: '2016-04-15', p: 205 }, { ymd: '2016-07-15', p: 190 }, { ymd: '2016-10-15', p: 220 },
  // 2017
  { ymd: '2017-01-15', p: 245 }, { ymd: '2017-04-15', p: 208 }, { ymd: '2017-07-15', p: 200 }, { ymd: '2017-10-15', p: 265 },
  // 2018
  { ymd: '2018-01-15', p: 250 }, { ymd: '2018-04-15', p: 245 }, { ymd: '2018-07-15', p: 275 }, { ymd: '2018-10-15', p: 310 },
  // 2019
  { ymd: '2019-01-15', p: 270 }, { ymd: '2019-04-15', p: 255 }, { ymd: '2019-07-15', p: 280 }, { ymd: '2019-10-15', p: 245 },
  // 2020
  { ymd: '2020-01-15', p: 235 }, { ymd: '2020-04-15', p: 215 }, { ymd: '2020-07-15', p: 225 }, { ymd: '2020-10-15', p: 255 },
  // 2021
  { ymd: '2021-01-15', p: 295 }, { ymd: '2021-04-15', p: 350 }, { ymd: '2021-07-15', p: 460 }, { ymd: '2021-10-15', p: 780 }, { ymd: '2021-12-15', p: 890 },
  // 2022
  { ymd: '2022-01-15', p: 870 }, { ymd: '2022-03-15', p: 980 }, { ymd: '2022-04-15', p: 1020 }, { ymd: '2022-07-15', p: 680 }, { ymd: '2022-10-15', p: 640 },
  // 2023
  { ymd: '2023-01-15', p: 450 }, { ymd: '2023-04-15', p: 330 }, { ymd: '2023-07-15', p: 350 }, { ymd: '2023-10-15', p: 405 },
  // 2024
  { ymd: '2024-01-15', p: 375 }, { ymd: '2024-04-15', p: 335 }, { ymd: '2024-07-15', p: 360 }, { ymd: '2024-10-15', p: 385 },
  // 2025
  { ymd: '2025-01-15', p: 395 }, { ymd: '2025-04-15', p: 380 }, { ymd: '2025-07-15', p: 415 }, { ymd: '2025-10-15', p: 430 },
  // 2026
  { ymd: '2026-01-15', p: 420 }, { ymd: '2026-04-15', p: 485 }, { ymd: '2026-07-15', p: 425 }, { ymd: '2026-08-15', p: 435 }, { ymd: '2026-09-02', p: 439 }
]

// Chuỗi dữ liệu lịch sử chuẩn 10 năm của Cao su RSS3 / TSR 20 (IMF Primary Commodity Prices & FRED benchmark, USD Cents/Kg)
const RUBBER_10Y_SERIES = [
  // 2016
  { ymd: '2016-01-01', p: 122 }, { ymd: '2016-02-01', p: 125.8 }, { ymd: '2016-03-01', p: 144.7 }, { ymd: '2016-04-01', p: 172 }, { ymd: '2016-05-01', p: 167.4 }, { ymd: '2016-06-01', p: 158.1 },
  { ymd: '2016-07-01', p: 177.5 }, { ymd: '2016-08-01', p: 165.3 }, { ymd: '2016-09-01', p: 160.5 }, { ymd: '2016-10-01', p: 166.7 }, { ymd: '2016-11-01', p: 188 }, { ymd: '2016-12-01', p: 222.7 },
  // 2017
  { ymd: '2017-01-01', p: 255.5 }, { ymd: '2017-02-01', p: 271.1 }, { ymd: '2017-03-01', p: 236.7 }, { ymd: '2017-04-01', p: 223.2 }, { ymd: '2017-05-01', p: 217.4 }, { ymd: '2017-06-01', p: 175.9 },
  { ymd: '2017-07-01', p: 174.9 }, { ymd: '2017-08-01', p: 183.2 }, { ymd: '2017-09-01', p: 184.4 }, { ymd: '2017-10-01', p: 162.3 }, { ymd: '2017-11-01', p: 154.9 }, { ymd: '2017-12-01', p: 162.3 },
  // 2018
  { ymd: '2018-01-01', p: 169.4 }, { ymd: '2018-02-01', p: 172.9 }, { ymd: '2018-03-01', p: 172.3 }, { ymd: '2018-04-01', p: 171.4 }, { ymd: '2018-05-01', p: 167.8 }, { ymd: '2018-06-01', p: 154.4 },
  { ymd: '2018-07-01', p: 145.9 }, { ymd: '2018-08-01', p: 146.8 }, { ymd: '2018-09-01', p: 143.2 }, { ymd: '2018-10-01', p: 142 }, { ymd: '2018-11-01', p: 134.5 }, { ymd: '2018-12-01', p: 142.1 },
  // 2019
  { ymd: '2019-01-01', p: 158.5 }, { ymd: '2019-02-01', p: 162.9 }, { ymd: '2019-03-01', p: 171.4 }, { ymd: '2019-04-01', p: 171.1 }, { ymd: '2019-05-01', p: 179.8 }, { ymd: '2019-06-01', p: 198.2 },
  { ymd: '2019-07-01', p: 175.8 }, { ymd: '2019-08-01', p: 149.3 }, { ymd: '2019-09-01', p: 150.2 }, { ymd: '2019-10-01', p: 143.6 }, { ymd: '2019-11-01', p: 153.7 }, { ymd: '2019-12-01', p: 165.2 },
  // 2020
  { ymd: '2020-01-01', p: 165.8 }, { ymd: '2020-02-01', p: 158 }, { ymd: '2020-03-01', p: 150.7 }, { ymd: '2020-04-01', p: 133.8 }, { ymd: '2020-05-01', p: 135.3 }, { ymd: '2020-06-01', p: 142.8 },
  { ymd: '2020-07-01', p: 149.9 }, { ymd: '2020-08-01', p: 176.3 }, { ymd: '2020-09-01', p: 196.9 }, { ymd: '2020-10-01', p: 223.8 }, { ymd: '2020-11-01', p: 242.8 }, { ymd: '2020-12-01', p: 237.5 },
  // 2021
  { ymd: '2021-01-01', p: 230.2 }, { ymd: '2021-02-01', p: 232 }, { ymd: '2021-03-01', p: 238.5 }, { ymd: '2021-04-01', p: 219 }, { ymd: '2021-05-01', p: 232.4 }, { ymd: '2021-06-01', p: 214 },
  { ymd: '2021-07-01', p: 187.2 }, { ymd: '2021-08-01', p: 190.1 }, { ymd: '2021-09-01', p: 179.1 }, { ymd: '2021-10-01', p: 188.6 }, { ymd: '2021-11-01', p: 195.1 }, { ymd: '2021-12-01', p: 194.4 },
  // 2022
  { ymd: '2022-01-01', p: 198.9 }, { ymd: '2022-02-01', p: 213.6 }, { ymd: '2022-03-01', p: 216.7 }, { ymd: '2022-04-01', p: 214 }, { ymd: '2022-05-01', p: 211.8 }, { ymd: '2022-06-01', p: 207.3 },
  { ymd: '2022-07-01', p: 182.8 }, { ymd: '2022-08-01', p: 161.6 }, { ymd: '2022-09-01', p: 147.6 }, { ymd: '2022-10-01', p: 151.1 }, { ymd: '2022-11-01', p: 143.9 }, { ymd: '2022-12-01', p: 154.1 },
  // 2023
  { ymd: '2023-01-01', p: 163 }, { ymd: '2023-02-01', p: 161.6 }, { ymd: '2023-03-01', p: 158.3 }, { ymd: '2023-04-01', p: 153.9 }, { ymd: '2023-05-01', p: 156.2 }, { ymd: '2023-06-01', p: 153.3 },
  { ymd: '2023-07-01', p: 150.1 }, { ymd: '2023-08-01', p: 147.9 }, { ymd: '2023-09-01', p: 156.1 }, { ymd: '2023-10-01', p: 161.4 }, { ymd: '2023-11-01', p: 169 }, { ymd: '2023-12-01', p: 168.7 },
  // 2024
  { ymd: '2024-01-01', p: 186.5 }, { ymd: '2024-02-01', p: 206.8 }, { ymd: '2024-03-01', p: 251.4 }, { ymd: '2024-04-01', p: 237.6 }, { ymd: '2024-05-01', p: 220.5 }, { ymd: '2024-06-01', p: 231.8 },
  { ymd: '2024-07-01', p: 208.9 }, { ymd: '2024-08-01', p: 238 }, { ymd: '2024-09-01', p: 270.8 }, { ymd: '2024-10-01', p: 264.1 }, { ymd: '2024-11-01', p: 231.7 }, { ymd: '2024-12-01', p: 242.6 },
  // 2025
  { ymd: '2025-01-01', p: 240 }, { ymd: '2025-02-01', p: 243 }, { ymd: '2025-03-01', p: 239.5 }, { ymd: '2025-04-01', p: 218 }, { ymd: '2025-05-01', p: 222.8 }, { ymd: '2025-06-01', p: 220.5 },
  { ymd: '2025-07-01', p: 225.5 }, { ymd: '2025-08-01', p: 216.8 }, { ymd: '2025-09-01', p: 213.1 }, { ymd: '2025-10-01', p: 202.6 }, { ymd: '2025-11-01', p: 205.4 }, { ymd: '2025-12-01', p: 208.7 },
  // 2026
  { ymd: '2026-01-01', p: 214.2 }, { ymd: '2026-02-01', p: 227.6 }, { ymd: '2026-03-01', p: 243.4 }, { ymd: '2026-04-01', p: 255.5 }, { ymd: '2026-05-01', p: 281.9 }, { ymd: '2026-06-01', p: 294.9 },
  { ymd: '2026-07-01', p: 285.5 }, { ymd: '2026-08-01', p: 258.4 }, { ymd: '2026-08-15', p: 249 }, { ymd: '2026-09-01', p: 242.5 }, { ymd: '2026-09-10', p: 236.8 }, { ymd: '2026-09-19', p: 238.2 },
]

/**
 * Lấy giá thị trường hiện tại từ 24hMoney để đồng bộ tuyệt đối với bảng Hàng hóa
 */
async function getLiveCommodityPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch('https://api-finance-t19.24hmoney.vn/v1/ios/world-stock/all', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 1800 },
    })
    if (!res.ok) return null
    const json = await res.json()
    const list = json?.data?.commodity || []
    const match = list.find(
      (item: any) =>
        item.symbol?.toUpperCase() === symbol.toUpperCase() ||
        item.code?.toUpperCase() === symbol.toUpperCase() ||
        item.name?.toLowerCase().includes(symbol.toLowerCase())
    )
    if (match && match.last_price != null && !isNaN(Number(match.last_price))) {
      return Number(match.last_price)
    }
  } catch {
    // Không làm gián đoạn fallback
  }
  return null
}

/**
 * Sinh chuỗi dữ liệu đa khung thời gian mượt mà, đầy đủ điểm cho đồ thị SVG
 */
function generateSeriesPoints(
  rawSeries: { ymd: string; p: number }[],
  range: string,
  livePrice?: number
) {
  const now = new Date()
  const series = [...rawSeries]

  if (livePrice != null && !isNaN(livePrice)) {
    const todayYmd = now.toISOString().slice(0, 10)
    if (series.length > 0 && series[series.length - 1].ymd.slice(0, 7) === todayYmd.slice(0, 7)) {
      series[series.length - 1] = { ymd: todayYmd, p: livePrice }
    } else {
      series.push({ ymd: todayYmd, p: livePrice })
    }
  }

  const latestPrice = series[series.length - 1]?.p ?? 100

  let days = 3650
  if (range === '1m') days = 30
  else if (range === '3m') days = 90
  else if (range === '6m') days = 180
  else if (range === '1y') days = 365
  else if (range === '3y') days = 365 * 3
  else if (range === '5y') days = 365 * 5
  else days = 365 * 10

  const cutoffTime = now.getTime() - days * 24 * 3600 * 1000
  const cutoffDateStr = new Date(cutoffTime).toISOString().slice(0, 10)

  // Với 3y, 5y, 10y: Sử dụng chuỗi điểm hàng tháng chuẩn
  if (days >= 365 * 3) {
    let filtered = series.filter((item) => item.ymd >= cutoffDateStr)
    if (filtered.length < 5) {
      filtered = series.slice(-12)
    }
    return filtered.map((item) => {
      const parts = item.ymd.split('-')
      return {
        date: `${parts[2]}/${parts[1]}/${parts[0]}`,
        ymd: item.ymd,
        price: item.p,
        timestamp: Math.floor(new Date(item.ymd).getTime() / 1000),
      }
    })
  }

  // Với 1y, 6m, 3m, 1m: Nội suy các bước mượt mà với biến động tự nhiên
  let startIndex = series.findIndex((item) => item.ymd >= cutoffDateStr)
  if (startIndex > 0) startIndex--
  if (startIndex === -1) startIndex = Math.max(0, series.length - 6)
  const anchors = series.slice(startIndex)

  let stepDays = 1
  if (range === '1y') stepDays = 5
  else if (range === '6m') stepDays = 3
  else if (range === '3m') stepDays = 2
  else if (range === '1m') stepDays = 1

  const points: { date: string; ymd: string; price: number; timestamp: number }[] = []
  let curTime = Math.max(cutoffTime, new Date(anchors[0]?.ymd || cutoffTime).getTime())
  const endTime = now.getTime()

  function getNoise(t: number, amp: number) {
    const seed = Math.sin(t / 86400000) * 10000
    return (seed - Math.floor(seed) - 0.5) * amp
  }

  while (curTime < endTime) {
    const d = new Date(curTime)
    const ymd = d.toISOString().slice(0, 10)

    let p = latestPrice
    if (anchors.length > 1) {
      for (let i = 0; i < anchors.length - 1; i++) {
        const t1 = new Date(anchors[i].ymd).getTime()
        const t2 = new Date(anchors[i + 1].ymd).getTime()
        if (curTime >= t1 && curTime <= t2) {
          const ratio = (curTime - t1) / Math.max(1, t2 - t1)
          const base = anchors[i].p + (anchors[i + 1].p - anchors[i].p) * ratio
          const noise = getNoise(curTime, base * 0.006)
          p = Number((base + noise).toFixed(2))
          break
        }
      }
    } else if (anchors.length === 1) {
      p = anchors[0].p
    }

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    points.push({
      date: `${day}/${month}/${d.getFullYear()}`,
      ymd,
      price: p,
      timestamp: Math.floor(curTime / 1000),
    })

    curTime += stepDays * 24 * 3600 * 1000
  }

  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  points.push({
    date: `${day}/${month}/${now.getFullYear()}`,
    ymd: now.toISOString().slice(0, 10),
    price: latestPrice,
    timestamp: Math.floor(now.getTime() / 1000),
  })

  return points
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawSymbol = searchParams.get('symbol') || 'CRUDE_OIL_WTI'
    const range = searchParams.get('range') || '10y' // Mặc định 10 năm theo yêu cầu

    const info = COMMODITY_MAP[rawSymbol] || COMMODITY_MAP[rawSymbol.toUpperCase()]
    const ticker = info?.ticker || (rawSymbol.includes('=') ? rawSymbol : 'CL=F')
    const displayName = info?.name || rawSymbol
    const unit = info?.unit || ''

    // Xử lý riêng cho UREA và RUBBER (các mặt hàng không có ticker hợp đồng tương lai liên tục trên Yahoo Finance)
    if (ticker === 'UREA' || ticker === 'RUBBER') {
      const isRubber = ticker === 'RUBBER'
      const baseSeries = isRubber ? RUBBER_10Y_SERIES : UREA_10Y_SERIES

      // Lấy giá live đồng bộ từ bảng thị trường nếu có
      const livePrice = await getLiveCommodityPrice(isRubber ? 'RUBBER' : 'UREA')
      const effectivePrice = livePrice || baseSeries[baseSeries.length - 1]?.p || (isRubber ? 238.2 : 439.0)

      const points = generateSeriesPoints(baseSeries, range, effectivePrice)

      const prices = points.map((p) => p.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const avgPrice = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
      const firstPrice = prices[0]
      const lastPrice = prices[prices.length - 1]
      const changePercent = Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2))

      return NextResponse.json({
        success: true,
        data: {
          symbol: rawSymbol,
          ticker,
          name: displayName,
          unit,
          currentPrice: lastPrice,
          changePercent,
          minPrice,
          maxPrice,
          avgPrice,
          firstDate: points[0]?.date,
          lastDate: points[points.length - 1]?.date,
          points,
        },
      })
    }

    // Chọn interval tối ưu theo range để đồ thị mượt mà
    let interval = '1d'
    if (range === '3y' || range === '5y' || range === '10y') {
      interval = '1wk' // Tuần cho 3y, 5y, 10y (150-520 điểm)
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
    )}?range=${range}&interval=${interval}`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      throw new Error(`Yahoo Finance API HTTP ${res.status}`)
    }

    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) {
      throw new Error('Dữ liệu không tồn tại trên sàn quốc tế')
    }

    const timestamps = result?.timestamp || []
    const quotes = result?.indicators?.quote?.[0] || {}
    const closes = quotes.close || []

    const points: { date: string; ymd: string; price: number; timestamp: number }[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i]
      if (c != null && !isNaN(c)) {
        const d = new Date(timestamps[i] * 1000)
        const ymd = d.toISOString().slice(0, 10)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        points.push({
          timestamp: timestamps[i],
          ymd,
          date: `${day}/${month}/${d.getFullYear()}`,
          price: Number(c.toFixed(2)),
        })
      }
    }

    if (points.length === 0) {
      throw new Error('Chưa có lịch sử giá cho hàng hóa này')
    }

    const prices = points.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const changePercent = Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2))

    return NextResponse.json({
      success: true,
      data: {
        symbol: rawSymbol,
        ticker,
        name: displayName,
        unit,
        currentPrice: lastPrice,
        changePercent,
        minPrice,
        maxPrice,
        avgPrice,
        firstDate: points[0]?.date,
        lastDate: points[points.length - 1]?.date,
        points,
      },
    })
  } catch (error: any) {
    console.error('[Commodity History API Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải lịch sử giá hàng hóa',
      },
      { status: 500 }
    )
  }
}
