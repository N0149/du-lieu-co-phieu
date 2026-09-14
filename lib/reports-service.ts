import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
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

const DB_REPORTS_PATH = path.join(process.cwd(), 'data', 'industry_reports.db')

/** Lấy danh sách báo cáo thị trường với bộ lọc và phân trang từ SQLite nội bộ (0ms, 100% offline) */
export async function fetchMarketReports(
  page = 1,
  pageSize = 20,
  search = '',
  sourceFilter = ''
): Promise<MarketReportsResult> {
  if (fs.existsSync(DB_REPORTS_PATH)) {
    try {
      const db = new DatabaseSync(DB_REPORTS_PATH, { readOnly: true })
      try {
        const conditions: string[] = []
        const params: any[] = []

        if (search && search.trim()) {
          conditions.push('(title LIKE ? OR description LIKE ? OR source LIKE ?)')
          const q = `%${search.trim()}%`
          params.push(q, q, q)
        }

        if (sourceFilter && sourceFilter !== 'ALL') {
          conditions.push('source = ?')
          params.push(sourceFilter)
        }

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        const countRow = db
          .prepare(`SELECT COUNT(1) as total FROM industry_reports ${whereSql}`)
          .get(...params) as any
        const total = countRow?.total || 0
        const totalPages = Math.max(1, Math.ceil(total / pageSize))
        const offset = (Math.max(1, page) - 1) * pageSize

        const rows = db
          .prepare(
            `SELECT id, slug, title, source, date, display_date, scope, sector_name,
                    symbol, description, page_count, download_url, thumbnail_url,
                    recommendation, target_price
             FROM industry_reports
             ${whereSql}
             ORDER BY date DESC
             LIMIT ? OFFSET ?`
          )
          .all(...params, pageSize, offset) as any[]

        const sourceRows = db
          .prepare(
            `SELECT DISTINCT source FROM industry_reports WHERE source IS NOT NULL AND source != ''`
          )
          .all() as any[]
        const availableSources = sourceRows.map((r) => r.source).sort()

        const reports: AnalystReportItem[] = rows.map((r) => ({
          id: String(r.id),
          slug: r.slug || '',
          title: r.title || 'Báo cáo phân tích thị trường',
          source: r.source || 'Khác',
          date: r.display_date || r.date || '',
          rawDate: r.date || '',
          symbol: r.symbol || null,
          scope: r.scope || 'sector',
          sectorName: r.sector_name || null,
          description: r.description || '',
          recommendation: r.recommendation || null,
          targetPrice: r.target_price != null ? Number(r.target_price) : null,
          pageCount: Number(r.page_count) || 1,
          downloadUrl: r.download_url || '',
          thumbnailUrl: r.thumbnail_url || '',
        }))

        return {
          total,
          page,
          pageSize,
          totalPages,
          reports,
          availableSources,
        }
      } finally {
        db.close()
      }
    } catch (err) {
      console.error('[fetchMarketReports] Lỗi đọc SQLite:', err)
    }
  }

  return {
    total: 0,
    page,
    pageSize,
    totalPages: 1,
    reports: [],
    availableSources: [],
  }
}
