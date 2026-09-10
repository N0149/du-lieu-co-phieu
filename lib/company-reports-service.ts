import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export interface CompanyReportItem {
  id: string
  symbol: string
  title: string
  slug: string
  source: string
  date: string
  displayDate: string
  recommendation: string | null
  targetPrice: number | null
  pageCount: number
  description: string
  downloadUrl: string
  thumbnailUrl: string
}

const CIPHER_KEY_HEX = '19dd3af428f4cf7d68864cd4c87d8d1c5b489932e84b93ac6528a0dd403a5725'
const API_BASE_URL = 'https://api.ruatichsan.com/api/v1/data/public/analyst-reports/company'
const DATA_DIR = path.resolve(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'company_reports.db')

let cryptoKeyCache: CryptoKey | null = null

async function getCryptoKey(): Promise<CryptoKey> {
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

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

export function extractRecAndTarget(
  title: string,
  desc: string,
  rawRec: string | null,
  rawTarget: number | null
): { rec: string | null; target: number | null } {
  let rec = rawRec ? rawRec.trim() : null
  let target = rawTarget != null && rawTarget > 0 ? Number(rawTarget) : null
  const text = `${title} ${desc || ''}`.toUpperCase()

  if (!rec) {
    if (
      text.includes('KHUYẾN NGHỊ MUA') ||
      text.includes('KHẢ QUAN') ||
      text.includes('OUTPERFORM') ||
      text.includes('BUY')
    ) {
      rec = 'MUA'
    } else if (text.includes('TĂNG TỶ TRỌNG') || text.includes('ACCUMULATE')) {
      rec = 'TĂNG TỶ TRỌNG'
    } else if (
      text.includes('KHUYẾN NGHỊ BÁN') ||
      text.includes('GIẢM TỶ TRỌNG') ||
      text.includes('UNDERPERFORM') ||
      text.includes('SELL')
    ) {
      rec = 'BÁN'
    } else if (
      text.includes('NẮM GIỮ') ||
      text.includes('TRUNG LẬP') ||
      text.includes('HOLD') ||
      text.includes('NEUTRAL')
    ) {
      rec = 'NẮM GIỮ'
    }
  }

  if (!target) {
    const m = `${title} ${desc || ''}`.match(
      /giá mục tiêu\s*(?:là|khoảng|lên|đạt)?\s*[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,6})/i
    )
    if (m && m[1]) {
      const clean = m[1].replace(/[.,]/g, '')
      const num = Number(clean)
      if (num >= 1000 && num <= 1000000) target = num
    }
  }

  return { rec, target }
}

export function getLocalCompanyReports(symbol: string): CompanyReportItem[] | null {
  const ticker = symbol.toUpperCase().trim()
  if (!fs.existsSync(DB_PATH)) return null

  try {
    const db = new DatabaseSync(DB_PATH, { readOnly: true })
    try {
      const rows = db
        .prepare(
          `
        SELECT 
          id,
          symbol,
          title,
          slug,
          source,
          date,
          display_date as displayDate,
          recommendation,
          target_price as targetPrice,
          page_count as pageCount,
          description,
          download_url as downloadUrl,
          thumbnail_url as thumbnailUrl
        FROM company_reports
        WHERE symbol = ?
        ORDER BY date DESC
      `
        )
        .all(ticker) as any[]

      if (rows && rows.length > 0) {
        return rows.map((r) => {
          const { rec, target } = extractRecAndTarget(
            r.title,
            r.description,
            r.recommendation,
            r.targetPrice
          )
          return {
            id: String(r.id),
            symbol: r.symbol,
            title: r.title,
            slug: r.slug || '',
            source: r.source || 'Khác',
            date: r.date || '',
            displayDate: r.displayDate || formatDisplayDate(r.date),
            recommendation: rec,
            targetPrice: target,
            pageCount: Number(r.pageCount) || 0,
            description: r.description || '',
            downloadUrl: r.downloadUrl || '',
            thumbnailUrl: r.thumbnailUrl || '',
          }
        })
      }
      return null
    } finally {
      db.close()
    }
  } catch (err) {
    return null
  }
}

export function saveLocalCompanyReports(symbol: string, reports: CompanyReportItem[]): void {
  const ticker = symbol.toUpperCase().trim()
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    } catch {}
  }

  try {
    const db = new DatabaseSync(DB_PATH)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS company_reports (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          title TEXT NOT NULL,
          slug TEXT,
          source TEXT,
          date TEXT,
          display_date TEXT,
          recommendation TEXT,
          target_price REAL,
          page_count INTEGER,
          description TEXT,
          download_url TEXT,
          thumbnail_url TEXT,
          pdf_key TEXT,
          thumb_key TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_company_symbol ON company_reports (symbol);
        CREATE INDEX IF NOT EXISTS idx_company_date ON company_reports (date);
      `)

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO company_reports (
          id, symbol, title, slug, source, date, display_date,
          recommendation, target_price, page_count, description,
          download_url, thumbnail_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      db.exec('BEGIN')
      for (const r of reports) {
        stmt.run(
          r.id,
          ticker,
          r.title,
          r.slug,
          r.source,
          r.date,
          r.displayDate,
          r.recommendation,
          r.targetPrice,
          r.pageCount,
          r.description,
          r.downloadUrl,
          r.thumbnailUrl
        )
      }
      db.exec('COMMIT')
    } finally {
      db.close()
    }
  } catch (err) {
    // Bỏ qua lỗi ghi khi môi trường chạy read-only (Vercel serverless)
  }
}

export async function fetchAndCacheCompanyReports(symbol: string): Promise<CompanyReportItem[]> {
  const ticker = symbol.toUpperCase().trim()

  // 1. Ưu tiên đọc SQLite nội bộ
  const local = getLocalCompanyReports(ticker)
  if (local && local.length > 0) {
    return local
  }

  // 2. Dự phòng Online Fallback từ API Ruatichsan
  try {
    const PAGE_SIZE = 50
    const url = `${API_BASE_URL}/${encodeURIComponent(ticker)}?page=1&page_size=${PAGE_SIZE}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Origin: 'https://ruatichsan.com',
        Referer: `https://ruatichsan.com/company?symbol=${ticker}`,
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return []
    }

    const data = await decryptApiResponse(res)
    const total = data?.total || 0
    const rawReports: any[] = data?.reports || []

    // Nếu mã có nhiều trang báo cáo (như MWG 106 bài), tải thêm trang kế tiếp
    if (total > PAGE_SIZE) {
      const maxPages = Math.min(Math.ceil(total / PAGE_SIZE), 3)
      const remainingPages = []
      for (let p = 2; p <= maxPages; p++) {
        remainingPages.push(
          fetch(`${API_BASE_URL}/${encodeURIComponent(ticker)}?page=${p}&page_size=${PAGE_SIZE}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Origin: 'https://ruatichsan.com',
              Referer: `https://ruatichsan.com/company?symbol=${ticker}`,
            },
            next: { revalidate: 3600 },
          })
            .then((r) => (r.ok ? decryptApiResponse(r) : null))
            .then((d) => (d?.reports ? d.reports : []))
            .catch(() => [])
        )
      }
      const additionalReports = await Promise.all(remainingPages)
      for (const batch of additionalReports) {
        rawReports.push(...batch)
      }
    }

    const reports: CompanyReportItem[] = rawReports.map((r) => {
      const { rec, target } = extractRecAndTarget(
        r.title || '',
        r.description || '',
        r.recommendation || null,
        r.target_price != null ? Number(r.target_price) : null
      )
      return {
        id: String(r.id),
        symbol: ticker,
        title: (r.title || '').trim(),
        slug: r.slug || '',
        source: (r.source || 'Khác').trim(),
        date: r.date || '',
        displayDate: formatDisplayDate(r.date),
        recommendation: rec,
        targetPrice: target,
        pageCount: Number(r.page_count) || 0,
        description: (r.description || '').trim(),
        downloadUrl: r.download_url || '',
        thumbnailUrl: r.thumbnail_url || '',
      }
    })

    if (reports.length > 0) {
      saveLocalCompanyReports(ticker, reports)
    }

    return reports
  } catch (err) {
    console.error(`[fetchAndCacheCompanyReports] Lỗi lấy báo cáo cho ${ticker}:`, err)
    return []
  }
}
