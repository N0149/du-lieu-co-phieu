import crypto from 'crypto'

const KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'

export interface AnalystReportItem {
  id: string
  slug: string
  title: string
  source: string | null
  date: string // DD/MM/YYYY
  rawDate: string // YYYY-MM-DD
  symbol: string | null
  scope: string
  sectorName: string | null
  description: string
  recommendation: string | null
  targetPrice: number | null
  pageCount: number
  downloadUrl: string
  thumbnailUrl: string
}

export interface MarketReportsResult {
  total: number
  page: number
  pageSize: number
  totalPages: number
  reports: AnalystReportItem[]
  availableSources: string[]
}

// Từ điển nhận diện Công ty chứng khoán phát hành báo cáo
const BROKER_KEYWORDS: Record<string, string[]> = {
  'SSI': ['SSI', 'CHỨNG KHOÁN SSI'],
  'VNDS': ['VNDIRECT', 'VNDS', 'VND'],
  'HSC': ['HSC', 'CHỨNG KHOÁN THÀNH PHỐ HỒ CHÍ MINH'],
  'ACBS': ['ACBS', 'CHỨNG KHOÁN Á CHÂU'],
  'Vietstock': ['VIETSTOCK', 'VIETSTOCK WEEKLY'],
  'Mirae Asset': ['MIRAE ASSET', 'MAS'],
  'KBSV': ['KBSV', 'KB CHỨNG KHOÁN', 'KB VIỆT NAM'],
  'BSC': ['BSC', 'CHỨNG KHOÁN BIDV'],
  'VCBS': ['VCBS', 'CHỨNG KHOÁN VIETCOMBANK'],
  'FPTS': ['FPTS', 'CHỨNG KHOÁN FPT'],
  'TPS': ['TPS', 'TIÊN PHONG'],
  'BVSC': ['BVSC', 'BẢO VIỆT'],
  'MBS': ['MBS', 'CHỨNG KHOÁN MB'],
  'Yuanta': ['YUANTA', 'YSVN'],
  'VDSC': ['RỒNG VIỆT', 'VDSC'],
  'Kafi': ['KAFI'],
}

/** Tự động trích xuất tên CTCK từ tiêu đề và mô tả */
function detectBrokerSource(title: string, desc: string, explicitSource: string | null): string {
  if (explicitSource && explicitSource.trim()) {
    return explicitSource.trim()
  }

  const textToSearch = `${title} ${desc}`.toUpperCase()
  for (const [broker, keywords] of Object.entries(BROKER_KEYWORDS)) {
    if (keywords.some((kw) => textToSearch.includes(kw))) {
      return broker
    }
  }

  return '—'
}

/** Giải mã buffer nhị phân từ backend ruatichsan (AES-256-GCM) */
function decryptBinaryBuffer(buf: Buffer): any {
  const key = Buffer.from(KEY_HEX, 'hex')
  const iv = buf.subarray(0, 12)
  const ciphertextAndTag = buf.subarray(12)
  const tag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16)
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(ciphertext, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  return JSON.parse(decrypted)
}

/** Lấy danh sách báo cáo thị trường với bộ lọc và phân trang */
export async function fetchMarketReports(
  page = 1,
  pageSize = 20,
  search = '',
  sourceFilter = ''
): Promise<MarketReportsResult> {
  try {
    const url = `https://api.ruatichsan.com/api/v1/data/public/analyst-reports/market?page=${page}&page_size=${pageSize}`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/octet-stream, application/json',
      },
      next: { revalidate: 1800 }, // Cache 30 phút
    })

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`)
    }

    const arrayBuf = await res.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    const rawData = decryptBinaryBuffer(buf)

    const rawReports = rawData?.reports || []
    const total = rawData?.total || rawReports.length

    // Chuẩn hóa danh sách báo cáo
    const reports: AnalystReportItem[] = rawReports.map((r: any) => {
      const rawDate = r.date || ''
      let displayDate = rawDate
      if (rawDate.includes('-')) {
        const parts = rawDate.split('-')
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`
        }
      }

      const detectedSource = detectBrokerSource(r.title || '', r.description || '', r.source)

      return {
        id: String(r.id),
        slug: r.slug || '',
        title: r.title || 'Báo cáo phân tích thị trường',
        source: detectedSource,
        date: displayDate,
        rawDate,
        symbol: r.symbol || null,
        scope: r.scope || 'market',
        sectorName: r.sector_name || null,
        description: r.description || '',
        recommendation: r.recommendation || null,
        targetPrice: r.target_price != null ? Number(r.target_price) : null,
        pageCount: Number(r.page_count) || 1,
        downloadUrl: r.download_url || (r.pdf_key ? `https://cdn.ruatichsan.com/${r.pdf_key}` : ''),
        thumbnailUrl: r.thumbnail_url || (r.thumb_key ? `https://cdn.ruatichsan.com/${r.thumb_key}` : ''),
      }
    })

    // Lọc tìm kiếm nếu có
    let filteredReports = reports
    if (search && search.trim()) {
      const query = search.trim().toLowerCase()
      filteredReports = filteredReports.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          (r.source && r.source.toLowerCase().includes(query))
      )
    }

    if (sourceFilter && sourceFilter !== 'ALL') {
      filteredReports = filteredReports.filter((r) => r.source === sourceFilter)
    }

    // Danh sách nguồn CTCK có sẵn
    const availableSources = Array.from(
      new Set(reports.map((r) => r.source).filter((s): s is string => Boolean(s && s !== '—')))
    ).sort()

    const totalPages = Math.ceil(total / pageSize)

    return {
      total,
      page,
      pageSize,
      totalPages,
      reports: filteredReports,
      availableSources,
    }
  } catch (error) {
    console.error('[Reports Service Error]:', error)
    return {
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      reports: [],
      availableSources: [],
    }
  }
}
