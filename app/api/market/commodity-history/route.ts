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
  RUBBER: { ticker: 'RUBBER', name: 'Cao su thế giới (Rubber)', unit: 'USD Cents/Kg' },
  Rubber: { ticker: 'RUBBER', name: 'Cao su thế giới (Rubber)', unit: 'USD Cents/Kg' },
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawSymbol = searchParams.get('symbol') || 'CRUDE_OIL_WTI'
    const range = searchParams.get('range') || '10y' // Mặc định 10 năm theo yêu cầu

    const info = COMMODITY_MAP[rawSymbol] || COMMODITY_MAP[rawSymbol.toUpperCase()]
    const ticker = info?.ticker || (rawSymbol.includes('=') ? rawSymbol : 'CL=F')
    const displayName = info?.name || rawSymbol
    const unit = info?.unit || ''

    // Xử lý riêng cho UREA
    if (ticker === 'UREA') {
      const now = new Date()
      let cutoffYear = 2016
      if (range === '1m') cutoffYear = now.getFullYear() - 0.1
      else if (range === '3m') cutoffYear = now.getFullYear() - 0.3
      else if (range === '6m') cutoffYear = now.getFullYear() - 0.5
      else if (range === '1y') cutoffYear = now.getFullYear() - 1
      else if (range === '3y') cutoffYear = now.getFullYear() - 3
      else if (range === '5y') cutoffYear = now.getFullYear() - 5
      else cutoffYear = now.getFullYear() - 10

      const cutoffDateStr = new Date(now.getTime() - (now.getFullYear() - cutoffYear) * 365 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10)

      let filteredUrea = UREA_10Y_SERIES.filter((item) => item.ymd >= cutoffDateStr)
      if (filteredUrea.length < 5) {
        filteredUrea = UREA_10Y_SERIES.slice(-8)
      }

      const points = filteredUrea.map((item) => {
        const parts = item.ymd.split('-')
        return {
          date: `${parts[2]}/${parts[1]}/${parts[0]}`,
          ymd: item.ymd,
          price: item.p,
          timestamp: new Date(item.ymd).getTime() / 1000,
        }
      })

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
          ticker: 'UREA',
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
