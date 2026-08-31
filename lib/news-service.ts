import manifestRaw from '@/data/longlive_manifest.json'

export type TickerTag = {
  ticker: string
  name: string
  price: number | null // nghìn đồng (vd: 22.1 = 22,100đ)
  changePercent: number | null // % biến động (vd: 1.84, -0.27, 0)
}

export type NewsItem = {
  id: string
  title: string
  link: string
  pubDate: string // ISO string
  relativeTime: string // ví dụ: "15 phút trước", "1 giờ trước"
  source: 'CafeF' | 'VnEconomy' | 'Vietnambiz' | 'Báo Đầu Tư' | 'Tin Nhanh CK' | 'Tổng Hợp'
  sourceUrl: string
  category: 'market' | 'stock' | 'global' | 'general'
  summary?: string
  imageUrl?: string
  tickers: TickerTag[]
}

export type NewsFilterTab = 'all' | 'market' | 'stock' | 'global' | 'saved'

type FeedConfig = {
  name: NewsItem['source']
  url: string
  categoryHint: 'market' | 'stock' | 'global' | 'general'
}

const FEEDS: FeedConfig[] = [
  // CafeF Feeds
  { name: 'CafeF', url: 'https://cafef.vn/thi-truong-chung-khoan.rss', categoryHint: 'market' },
  { name: 'CafeF', url: 'https://cafef.vn/doanh-nghiep.rss', categoryHint: 'stock' },
  { name: 'CafeF', url: 'https://cafef.vn/tai-chinh-ngan-hang.rss', categoryHint: 'market' },
  { name: 'CafeF', url: 'https://cafef.vn/bat-dong-san.rss', categoryHint: 'stock' },
  { name: 'CafeF', url: 'https://cafef.vn/vi-mo-dau-tu.rss', categoryHint: 'market' },
  { name: 'CafeF', url: 'https://cafef.vn/tai-chinh-quoc-te.rss', categoryHint: 'global' },

  // VnEconomy Feeds
  { name: 'VnEconomy', url: 'https://vneconomy.vn/chung-khoan.rss', categoryHint: 'market' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/tai-chinh.rss', categoryHint: 'market' },
  { name: 'VnEconomy', url: 'https://vneconomy.vn/doanh-nhan.rss', categoryHint: 'stock' },

  // Vietnambiz Feeds
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/chung-khoan.rss', categoryHint: 'market' },
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/doanh-nghiep.rss', categoryHint: 'stock' },
  { name: 'Vietnambiz', url: 'https://vietnambiz.vn/rss/tai-chinh.rss', categoryHint: 'market' },

  // Báo Đầu Tư Feeds
  { name: 'Báo Đầu Tư', url: 'https://baodautu.vn/rss/chung-khoan-d4.rss', categoryHint: 'market' },
  { name: 'Báo Đầu Tư', url: 'https://baodautu.vn/rss/tai-chinh-ngan-hang-d5.rss', categoryHint: 'market' },
]

// Common false-positive 3-letter words to ignore
const IGNORED_WORDS = new Set([
  'CHO', 'CỦA', 'TẠI', 'NĂM', 'GẦN', 'TỶ', 'ĐỒNG', 'USD', 'VND', 'CPI', 'GDP', 'FED', 'SBV',
  'HĐQT', 'BCTC', 'ĐHCĐ', 'IPO', 'ETF', 'FDI', 'VN30', 'HNX', 'HOSE', 'UPCOM', 'TOP', 'BIG',
  'CEO', 'CFO', 'CTCP', 'TNHH', 'NĐT', 'VAMC', 'IMF', 'WB', 'ADB', 'OPEC', 'ECB', 'SEC', 'BOT',
  'BT', 'PPP', 'AI', 'EVN', 'PVN', 'VNMAC', 'KCN', 'BĐS', 'TTLK', 'UBCK', 'SGDCK', 'M&A',
  'KHO', 'MUA', 'BÁN', 'GIÁ', 'TĂNG', 'GIẢM', 'VỐN', 'LÃI', 'LỖ', 'THU', 'CHI', 'XUẤT', 'NHẬP'
])

// Mapping common company keywords/names directly to tickers
const COMPANY_NAME_MAP: Record<string, string> = {
  'hòa phát': 'HPG',
  'hoa phat': 'HPG',
  'vietcombank': 'VCB',
  'techcombank': 'TCB',
  'vinhomes': 'VHM',
  'vingroup': 'VIC',
  'vinamilk': 'VNM',
  'thế giới di động': 'MWG',
  'the gioi di dong': 'MWG',
  'masan': 'MSN',
  'viettel post': 'VTP',
  'coteccons': 'CTD',
  'hòa bình': 'HBC',
  'hoa binh': 'HBC',
  'đất xanh': 'DXG',
  'dat xanh': 'DXG',
  'novaland': 'NVL',
  'vndirect': 'VND',
  'chứng khoán ssi': 'SSI',
  'ssi': 'SSI',
  'mbbank': 'MBB',
  'ngân hàng quân đội': 'MBB',
  'ngan hang quan doi': 'MBB',
  'bidv': 'BID',
  'vietinbank': 'CTG',
  'sacombank': 'STB',
  'acb': 'ACB',
  'vpbank': 'VPB',
  'hdbank': 'HDB',
  'shb': 'SHB',
  'tpbank': 'TPB',
  'msb': 'MSB',
  'ocb': 'OCB',
  'vib': 'VIB',
  'vàng bạc đá quý phú nhuận': 'PNJ',
  'pnj': 'PNJ',
  'đức giang': 'DGC',
  'duc giang': 'DGC',
  'hóa chất đức giang': 'DGC',
  'tổng công ty khí': 'GAS',
  'petrovietnam gas': 'GAS',
  'pv gas': 'GAS',
  'petrolimex': 'PLX',
  'tổng công ty điện lực dầu khí': 'POW',
  'pv power': 'POW',
  'bảo việt': 'BVH',
  'bao viet': 'BVH',
  'sabeco': 'SAB',
  'habeco': 'BHN',
  'khang điền': 'KDH',
  'khang dien': 'KDH',
  'nam long': 'NLG',
  'vincom retail': 'VRE',
  'cao su việt nam': 'GVR',
  'tập đoàn cao su': 'GVR',
  'tập đoàn gelex': 'GEX',
  'gelex': 'GEX',
  'phát đạt': 'PDR',
  'phat dat': 'PDR',
  'hoàng anh gia lai': 'HAG',
  'hagl': 'HAG',
  'hag': 'HAG',
  'nông nghiệp quốc tế hoàng anh gia lai': 'HNG',
  'quốc cường gia lai': 'QCG',
  'sonadezi': 'SNZ',
  'long hậu': 'LHG',
  'long hau': 'LHG',
  'danapha': 'DAN',
  'idico': 'IDC',
  'becamex': 'BCM',
  'kinh bắc': 'KBC',
  'kinh bac': 'KBC',
  'cao su phước hòa': 'PHR',
  'phuoc hoa': 'PHR',
  'cao su đồng phú': 'DPR',
  'nhiệt điện phả lại': 'PPC',
  'nhiệt điện hải phòng': 'HND',
}

// Build index of manifest stocks
let manifestStockMap: Map<string, { ticker: string; name: string; px: number | null; w1: number | null }> | null = null

function getManifestStockMap() {
  if (!manifestStockMap) {
    manifestStockMap = new Map()
    const items = (manifestRaw as any)?.items || []
    for (const item of items) {
      if (item.t) {
        manifestStockMap.set(item.t.toUpperCase(), {
          ticker: item.t.toUpperCase(),
          name: item.n || item.t,
          px: item.px ?? null,
          w1: item.w1 ?? 0,
        })
      }
    }
  }
  return manifestStockMap
}

/**
 * Format relative time in Vietnamese (ví dụ: "15 phút trước", "1 giờ trước", "Hôm qua")
 */
export function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Vừa xong'
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffMin < 1) return 'Vừa xong'
    if (diffMin < 60) return `${diffMin} phút trước`
    if (diffHour < 24) return `${diffHour} giờ trước`
    if (diffDay === 1) return 'Hôm qua'
    if (diffDay < 7) return `${diffDay} ngày trước`

    const pad = (n: number) => (n < 10 ? `0${n}` : n)
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return 'Gần đây'
  }
}

/**
 * Extract ticker tags from text (title + summary)
 */
export function extractTickers(text: string): TickerTag[] {
  if (!text) return []
  const stockMap = getManifestStockMap()
  const foundTickers = new Set<string>()
  const textLower = text.toLowerCase()

  // 1. Match company names from mapping
  for (const [name, ticker] of Object.entries(COMPANY_NAME_MAP)) {
    if (textLower.includes(name)) {
      foundTickers.add(ticker)
    }
  }

  // 2. Match explicit ticker patterns: (HPG), [HPG], mã HPG, cổ phiếu HPG, HPG:
  const explicitMatches = text.matchAll(/(?:\(|\[|mã\s+|cổ phiếu\s+|cp\s+)([A-Z0-9]{3,4})(?:\)|\]|\b|:)/gi)
  for (const match of explicitMatches) {
    const t = match[1].toUpperCase()
    if (stockMap.has(t) && !IGNORED_WORDS.has(t)) {
      foundTickers.add(t)
    }
  }

  // 3. Match uppercase standalone 3-letter tokens: e.g. "MBB: Còn dư địa bứt phá"
  const tokens = text.match(/\b[A-Z0-9]{3,4}\b/g)
  if (tokens) {
    for (const token of tokens) {
      const t = token.toUpperCase()
      if (stockMap.has(t) && !IGNORED_WORDS.has(t)) {
        foundTickers.add(t)
      }
    }
  }

  // Build tag objects (max 5 tags per article)
  const result: TickerTag[] = []
  for (const t of Array.from(foundTickers).slice(0, 5)) {
    const stockInfo = stockMap.get(t)
    if (stockInfo) {
      result.push({
        ticker: stockInfo.ticker,
        name: stockInfo.name,
        price: stockInfo.px,
        changePercent: stockInfo.w1,
      })
    } else {
      result.push({
        ticker: t,
        name: t,
        price: null,
        changePercent: null,
      })
    }
  }

  return result
}

/**
 * Classify category based on text and tags
 */
export function classifyCategory(
  title: string,
  summary: string,
  hint: NewsItem['category'],
  tickers: TickerTag[]
): NewsItem['category'] {
  const combined = `${title} ${summary}`.toLowerCase()

  if (tickers.length > 0) {
    return 'stock'
  }

  // Check global keywords
  if (
    combined.includes('fed') ||
    combined.includes('wall street') ||
    combined.includes('dow jones') ||
    combined.includes('s&p 500') ||
    combined.includes('nasdaq') ||
    combined.includes('chứng khoán mỹ') ||
    combined.includes('trung quốc') ||
    combined.includes('dầu thô') ||
    combined.includes('brent') ||
    combined.includes('wti') ||
    combined.includes('vàng thế giới') ||
    combined.includes('donald trump') ||
    combined.includes('tổng thống trump') ||
    combined.includes('châu á') ||
    combined.includes('châu âu') ||
    combined.includes('quốc tế')
  ) {
    return 'global'
  }

  // Check stock keywords
  if (
    combined.includes('cổ phiếu') ||
    combined.includes('doanh nghiệp') ||
    combined.includes('lãi ròng') ||
    combined.includes('lỗ ròng') ||
    combined.includes('lợi nhuận') ||
    combined.includes('báo cáo tài chính') ||
    combined.includes('bctc') ||
    combined.includes('cổ tức') ||
    combined.includes('đại hội cổ đông') ||
    combined.includes('đhcđ') ||
    combined.includes('phát hành') ||
    combined.includes('mua lại') ||
    combined.includes('thâu tóm')
  ) {
    return 'stock'
  }

  // Check market / macro keywords
  if (
    combined.includes('vn-index') ||
    combined.includes('vnindex') ||
    combined.includes('hnx-index') ||
    combined.includes('thị trường') ||
    combined.includes('khối ngoại') ||
    combined.includes('tự doanh') ||
    combined.includes('thanh khoản') ||
    combined.includes('lãi suất') ||
    combined.includes('ngân hàng nhà nước') ||
    combined.includes('sbv') ||
    combined.includes('tỷ giá') ||
    combined.includes('lạm phát') ||
    combined.includes('gdp') ||
    combined.includes('cpi') ||
    combined.includes('vĩ mô') ||
    combined.includes('trái phiếu') ||
    combined.includes('bất động sản')
  ) {
    return 'market'
  }

  return hint || 'market'
}

/**
 * Fast RSS XML Item Parser without heavy dependencies
 */
function parseRssXml(xml: string, feed: FeedConfig): NewsItem[] {
  const items: NewsItem[] = []
  if (!xml) return items

  // Match all <item>...</item> blocks
  const itemMatches = xml.matchAll(/<item[\s\S]*?<\/item>/gi)

  for (const match of itemMatches) {
    const itemXml = match[0]

    // Extract Title
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i)
    let title = (titleMatch ? (titleMatch[1] || titleMatch[2] || '') : '').trim()
    // clean any remaining CDATA or HTML tags
    title = title.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/<[^>]*>/g, '').trim()
    if (!title) continue

    // Extract Link
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/i)
    let link = (linkMatch ? (linkMatch[1] || linkMatch[2] || '') : '').trim()
    if (!link) continue

    // Extract PubDate
    const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/pubDate>/i)
    const rawDate = (pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || '') : '').trim()
    let pubDate = new Date().toISOString()
    if (rawDate) {
      const parsed = new Date(rawDate)
      if (!isNaN(parsed.getTime())) {
        pubDate = parsed.toISOString()
      }
    }

    // Extract Description / Summary
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i)
    const rawDesc = (descMatch ? (descMatch[1] || descMatch[2] || '') : '').trim()
    // Extract image url if present in CDATA / img tag
    let imageUrl: string | undefined
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i) || itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i)
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1]
    }

    // Clean summary text
    const summary = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // Extract Tickers
    const tickers = extractTickers(`${title} ${summary}`)

    // Category
    const category = classifyCategory(title, summary, feed.categoryHint, tickers)

    // ID
    const id = `${feed.name}-${Buffer.from(link).toString('base64url').slice(0, 24)}`

    items.push({
      id,
      title,
      link,
      pubDate,
      relativeTime: formatRelativeTime(pubDate),
      source: feed.name,
      sourceUrl: new URL(link).origin,
      category,
      summary: summary.length > 280 ? summary.slice(0, 280) + '...' : summary,
      imageUrl,
      tickers,
    })
  }

  return items
}

/**
 * In-memory Cache Structure
 */
type CacheStore = {
  items: NewsItem[]
  lastFetched: number
  isFetching: boolean
}

const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes
const cache: CacheStore = {
  items: [],
  lastFetched: 0,
  isFetching: false,
}

/**
 * Fetch all RSS feeds in parallel with timeout and error handling
 */
export async function fetchAllFinancialNews(forceRefresh = false): Promise<NewsItem[]> {
  const now = Date.now()

  // Return cached items if still fresh and not forcing refresh
  if (!forceRefresh && cache.items.length > 0 && now - cache.lastFetched < CACHE_TTL_MS) {
    // update relative time strings before returning
    return cache.items.map((item) => ({
      ...item,
      relativeTime: formatRelativeTime(item.pubDate),
    }))
  }

  // Prevent multiple concurrent fetches
  if (cache.isFetching && cache.items.length > 0) {
    return cache.items
  }

  cache.isFetching = true

  try {
    const fetchPromises = FEEDS.map(async (feed) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 6500)

        const res = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          },
          signal: controller.signal,
          next: { revalidate: 180 },
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          return []
        }

        const xml = await res.text()
        return parseRssXml(xml, feed)
      } catch (err) {
        return []
      }
    })

    const results = await Promise.allSettled(fetchPromises)
    const allFetched: NewsItem[] = []

    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allFetched.push(...r.value)
      }
    }

    // Deduplicate by URL or normalized title
    const seenLinks = new Set<string>()
    const seenTitles = new Set<string>()
    const uniqueNews: NewsItem[] = []

    for (const item of allFetched) {
      const cleanLink = item.link.split('?')[0].trim()
      const cleanTitle = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

      if (seenLinks.has(cleanLink) || seenTitles.has(cleanTitle)) {
        continue
      }

      seenLinks.add(cleanLink)
      seenTitles.add(cleanTitle)
      uniqueNews.push(item)
    }

    // Sort by publication date descending (newest first)
    uniqueNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    if (uniqueNews.length > 0) {
      cache.items = uniqueNews
      cache.lastFetched = now
    }

    return cache.items.map((item) => ({
      ...item,
      relativeTime: formatRelativeTime(item.pubDate),
    }))
  } finally {
    cache.isFetching = false
  }
}

/**
 * Filter and search news items
 */
export function filterNewsItems(
  items: NewsItem[],
  options: {
    tab?: NewsFilterTab
    search?: string
    source?: string
    ticker?: string
    savedIds?: string[]
  }
): NewsItem[] {
  const { tab = 'all', search = '', source = 'all', ticker = '', savedIds = [] } = options

  let filtered = items

  // 1. Filter by Tab
  if (tab === 'saved') {
    const savedSet = new Set(savedIds)
    filtered = filtered.filter((item) => savedSet.has(item.id))
  } else if (tab === 'market') {
    filtered = filtered.filter((item) => item.category === 'market')
  } else if (tab === 'stock') {
    filtered = filtered.filter((item) => item.category === 'stock' || item.tickers.length > 0)
  } else if (tab === 'global') {
    filtered = filtered.filter((item) => item.category === 'global')
  }

  // 2. Filter by Source
  if (source && source !== 'all') {
    filtered = filtered.filter((item) => item.source.toLowerCase() === source.toLowerCase())
  }

  // 3. Filter by Ticker
  if (ticker) {
    const tNorm = ticker.toUpperCase().trim()
    filtered = filtered.filter((item) =>
      item.tickers.some((t) => t.ticker.toUpperCase() === tNorm) ||
      item.title.toUpperCase().includes(tNorm)
    )
  }

  // 4. Search Keyword
  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        item.tickers.some((t) => t.ticker.toLowerCase() === q || t.name.toLowerCase().includes(q))
    )
  }

  return filtered
}

/**
 * Extract top trending tickers based on news frequency in the last 24-48 hours
 */
export function getTrendingTickers(items: NewsItem[], limit = 12): { ticker: string; count: number; changePercent: number | null; price: number | null }[] {
  const tickerCounts = new Map<string, { count: number; changePercent: number | null; price: number | null }>()

  for (const item of items) {
    for (const t of item.tickers) {
      const existing = tickerCounts.get(t.ticker) || { count: 0, changePercent: t.changePercent, price: t.price }
      existing.count += 1
      if (t.changePercent !== null) existing.changePercent = t.changePercent
      if (t.price !== null) existing.price = t.price
      tickerCounts.set(t.ticker, existing)
    }
  }

  return Array.from(tickerCounts.entries())
    .map(([ticker, data]) => ({ ticker, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
