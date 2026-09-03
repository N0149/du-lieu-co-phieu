export interface MarketItem {
  id: string
  market: string
  name: string
  fullName?: string
  code?: string
  symbol?: string
  price: string
  change: string
  percent: string
  date: string
  direction: 'up' | 'down' | 'flat'
}

export interface WorldMarketData {
  worldStock: MarketItem[]
  commodity: MarketItem[]
  changeRate: MarketItem[]
  goldPrice: MarketItem[]
  crypto: MarketItem[]
}

const COUNTRY_MAP: Record<string, string> = {
  'Dow Jones': 'Mỹ',
  'Nasdaq': 'Mỹ',
  'S&P 500': 'Mỹ',
  'US 30': 'Mỹ',
  'US 500': 'Mỹ',
  'US Tech 100': 'Mỹ',
  'Hang Seng': 'Hồng Kông',
  'Nikkei 225': 'Nhật',
  'Shanghai': 'Trung Quốc',
  'FTSE 100': 'Anh',
  'DAX': 'Đức',
  'CAC 40': 'Pháp',
  'KOSPI': 'Hàn',
  'STI': 'Singapore',
  'Nifty 50': 'Ấn Độ',
  'S&P/ASX 200': 'Úc',
  'IDX Composite': 'Indonesia',
  'DXY': 'USD',
  'VFS (Vinfast)': 'Mỹ',
  'Taiwan Weighted': 'Đài Loan',
}

function formatDate(timestamp: any): string {
  if (!timestamp) return '—'
  let date: Date
  if (typeof timestamp === 'string' && timestamp.includes('-')) {
    date = new Date(timestamp)
  } else {
    const num = Number(timestamp)
    const ms = num < 1e12 ? num * 1000 : num
    date = new Date(ms)
  }
  if (isNaN(date.getTime())) return '—'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function formatPrice(val: any): string {
  if (val == null || val === '' || isNaN(Number(val))) return String(val || '—')
  const num = Number(val)
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatChange(val: any): string {
  if (val == null || val === '' || isNaN(Number(val))) return '0'
  const num = Number(val)
  return (
    (num > 0 ? '+' : '') +
    num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  )
}

function formatPercent(val: any): string {
  if (val == null || val === '') return '—'
  if (typeof val === 'string' && val.endsWith('%')) return val
  const num = Number(val)
  if (isNaN(num)) return String(val)
  return (num > 0 ? '+' : '') + num.toFixed(2) + '%'
}

export async function fetchWorldMarketData(): Promise<WorldMarketData | null> {
  try {
    const res = await fetch(
      'https://api-finance-t19.24hmoney.vn/v1/ios/world-stock/all',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        next: { revalidate: 1800 }, // 30 phút
      }
    )

    if (!res.ok) {
      console.warn(`[24hMoney API] HTTP error: ${res.status}`)
      return null
    }

    const json = await res.json()
    const d = json?.data || {}

    // 1. World Stock
    const worldStock = (d.world_stock || [])
      .filter(
        (item: any) =>
          item.object_type === 'world_stock' ||
          (!item.name?.includes('Futures') &&
            item.code !== 'US 30' &&
            item.code !== 'US 500' &&
            item.code !== 'US Tech 100')
      )
      .slice(0, 14)
      .map((item: any, idx: number) => {
        const market =
          COUNTRY_MAP[item.code] ||
          COUNTRY_MAP[item.name] ||
          (item.region === 'America'
            ? 'Mỹ'
            : item.region === 'Asia'
            ? 'Châu Á'
            : item.region === 'Europe'
            ? 'Châu Âu'
            : 'TG')
        const changeNum = Number(item.change_price ?? item.change ?? 0)
        return {
          id: item.symbol || item.code || `ws-${idx}`,
          market,
          name: item.name || item.code,
          code: item.code,
          price: formatPrice(item.last_price),
          change: formatChange(item.change_price),
          percent: formatPercent(item.change_percent),
          date: formatDate(item.trade_date),
          direction: changeNum > 0 ? 'up' : changeNum < 0 ? 'down' : 'flat',
        }
      })

    // 2. Commodity (Hàng hóa)
    const commodity = (d.commodity || [])
      .slice(0, 14)
      .map((item: any, idx: number) => {
        const changeNum = Number(item.change_price ?? item.change ?? 0)
        return {
          id: item.symbol || item.code || `com-${idx}`,
          symbol: item.symbol || item.code || item.name,
          code: item.code,
          fullName: item.name,
          market: item.unit || '—',
          name: item.name || item.code,
          price: formatPrice(item.last_price),
          change: formatChange(item.change_price),
          percent: formatPercent(item.change_percent),
          date: formatDate(item.trade_date),
          direction: changeNum > 0 ? 'up' : changeNum < 0 ? 'down' : 'flat',
        }
      })

    // 4 Mặt hàng bổ sung: Ngô (ZC=F), Đậu tương (ZS=F), Bông (CT=F), Phân Urea (UREA)
    const todayStr = formatDate(new Date())
    const extraCommodities: MarketItem[] = [
      {
        id: 'com-corn',
        symbol: 'ZC=F',
        code: 'Corn',
        fullName: 'Ngô (Corn Futures - ZC=F)',
        market: 'USd/Bu',
        name: 'Ngô (Corn)',
        price: '537.75',
        change: '-8.25',
        percent: '-1.51%',
        date: todayStr,
        direction: 'down',
      },
      {
        id: 'com-soybeans',
        symbol: 'ZS=F',
        code: 'Soybeans',
        fullName: 'Đậu tương (Soybeans Futures - ZS=F)',
        market: 'USd/Bu',
        name: 'Đậu tương (Soybeans)',
        price: '1,303.75',
        change: '-14.00',
        percent: '-1.06%',
        date: todayStr,
        direction: 'down',
      },
      {
        id: 'com-cotton',
        symbol: 'CT=F',
        code: 'Cotton',
        fullName: 'Bông (Cotton Futures - CT=F)',
        market: 'USd/Lbs',
        name: 'Bông (Cotton)',
        price: '91.73',
        change: '-1.41',
        percent: '-1.51%',
        date: todayStr,
        direction: 'down',
      },
      {
        id: 'com-urea',
        symbol: 'UREA',
        code: 'Urea',
        fullName: 'Giá phân Urea (Granular FOB)',
        market: 'USD/T',
        name: 'Giá phân Urea',
        price: '439.00',
        change: '+6.50',
        percent: '+1.50%',
        date: todayStr,
        direction: 'up',
      },
    ]

    for (const extra of extraCommodities) {
      if (!commodity.some((c: any) => c.symbol === extra.symbol || c.name.toLowerCase().includes(extra.name.toLowerCase()))) {
        commodity.push(extra)
      }
    }

    // 3. Change Rate (Tỷ giá)
    const changeRate = (d.change_rate || []).slice(0, 14).map((item: any, idx: number) => {
      const changeNum = Number(item.change_price ?? item.change ?? 0)
      const rawPrice = item.Last ?? item.last_price
      const numPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/,/g, '')) : Number(rawPrice)
      const formattedPrice = !isNaN(numPrice) ? formatPrice(numPrice) : String(rawPrice || '—')
      
      const symbolOrCode = item.symbol || item.code || item.text || ''
      const currencyType = symbolOrCode.includes('_') ? symbolOrCode.split('_')[1] : symbolOrCode

      return {
        id: item.symbol || item.code || `rate-${idx}`,
        market: currencyType || 'FX',
        name: item.text || item.name || item.code,
        fullName: item.footer || item.name,
        price: formattedPrice,
        change: formatChange(changeNum),
        percent: formatPercent(item.Percent ?? item.change_percent),
        date: formatDate(item.trade_date || item.last_update),
        direction: changeNum > 0 ? 'up' : changeNum < 0 ? 'down' : 'flat',
      }
    })

    // 4. Gold Price (Giá vàng)
    const goldPrice = (d.gold_price || [])
      .slice(0, 14)
      .map((item: any, idx: number) => {
        const isDomestic =
          !item.symbol?.includes('XAU') &&
          !item.text?.includes('XAU') &&
          !item.footer?.toLowerCase().includes('spot') &&
          !item.extra_name?.toLowerCase().includes('thế giới')
        const changeRaw = item.change ?? item.change_price ?? 0
        const changeNum =
          typeof changeRaw === 'number'
            ? changeRaw
            : Number(String(changeRaw).replace(/,/g, ''))
        const percentRaw = item.Percent ?? item.change_percent
        return {
          id: item.symbol || item.text || `gold-${idx}`,
          market: isDomestic ? 'VN' : 'TG',
          name: item.text || item.footer,
          fullName: item.footer || item.text,
          price: item.Last ? String(item.Last) : formatPrice(item.last_price),
          change: formatChange(changeRaw),
          percent: formatPercent(percentRaw),
          date: formatDate(item.last_update || item.trade_date),
          direction:
            changeNum > 0
              ? 'up'
              : changeNum < 0
              ? 'down'
              : item.Css === 'up'
              ? 'up'
              : item.Css === 'dn'
              ? 'down'
              : 'flat',
        }
      })

    // 5. Crypto (Tiền mã hóa)
    const crypto = (d.stock_crypto || []).slice(0, 14).map((item: any, idx: number) => {
      const changeNum = Number(item.change ?? item.percent_change_24h ?? 0)
      return {
        id: item.id || item.symbol || `crypto-${idx}`,
        market: item.symbol || 'COIN',
        name: item.name,
        symbol: item.symbol,
        price: formatPrice(item.price_usd) + ' $',
        change: formatChange(item.change),
        percent: formatPercent(item.percent_change_24h),
        date: formatDate(item.last_updated),
        direction: changeNum > 0 ? 'up' : changeNum < 0 ? 'down' : 'flat',
      }
    })

    return {
      worldStock,
      commodity,
      changeRate,
      goldPrice,
      crypto,
    }
  } catch (err) {
    console.error('[Market Service] Error fetching data:', err)
    return null
  }
}
