import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

export interface AgmSection {
  id: string
  number: number
  title: string
  shortTitle: string
  contentHtml: string
  rawMarkdown: string
  hasContent: boolean
  isQa?: boolean
  isCapitalIncrease?: boolean
}

export interface AgmReportData {
  ticker: string
  year: number
  title: string
  subtitle?: string
  hasReport: boolean
  sections: AgmSection[]
  availableYears: number[]
  ktplRate?: number | null // Tỷ lệ trích Quỹ khen thưởng & phúc lợi (%) theo Nghị quyết ĐHĐCĐ
  ktplVnd?: number | null
  stats: {
    hasQa: boolean
    hasCapitalIncrease: boolean
    tableCount: number
  }
}


const SHORT_TITLES: Record<number, string> = {
  1: '1. Kế hoạch & KQKD',
  2: '2. Phân phối LN & Cổ tức',
  3: '3. Thảo luận & Q&A',
  4: '4. Tăng vốn & ESOP',
}

function formatMarkdownToHtml(markdown: string): string {
  // Parse with marked
  let html = marked.parse(markdown, { gfm: true, breaks: true }) as string

  // Wrap tables with a responsive overflow container
  html = html.replace(
    /<table>/g,
    '<div class="agm-table-wrapper overflow-x-auto rounded-xl border border-border/80 my-4 shadow-2xs"><table>'
  )
  html = html.replace(/<\/table>/g, '</table></div>')

  return html
}

const EXTERNAL_DIR = 'D:\\hoc\\lap trinh\\tai-lieu-PDF\\ket_qua_trich_xuat'

export function hasAgmReport(ticker: string, year = 2026): boolean {
  if (!ticker) return false
  const sym = ticker.toUpperCase().trim()
  const filePath = path.join(
    process.cwd(),
    'content',
    'agm',
    String(year),
    `${sym}_ChiTiet_AGM_${year}.md`
  )
  if (fs.existsSync(filePath)) return true

  if (fs.existsSync(EXTERNAL_DIR)) {
    const extPath = path.join(EXTERNAL_DIR, `${sym}_ChiTiet_AGM_${year}.md`)
    if (fs.existsSync(extPath)) return true
  }
  return false
}

export function getAvailableAgmTickers(year = 2026): string[] {
  const tickerSet = new Set<string>()

  // 1. Thư mục nội bộ
  const dir = path.join(process.cwd(), 'content', 'agm', String(year))
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .forEach((f) => {
        const t = f.split('_')[0].toUpperCase()
        if (t) tickerSet.add(t)
      })
  }

  // 2. Thư mục nguồn tự động quét (nếu có trên máy)
  if (fs.existsSync(EXTERNAL_DIR)) {
    try {
      fs.readdirSync(EXTERNAL_DIR)
        .filter((f) => f.endsWith('.md'))
        .forEach((f) => {
          const t = f.split('_')[0].toUpperCase()
          if (t) tickerSet.add(t)
        })
    } catch {
      // ignore
    }
  }

  return Array.from(tickerSet).sort((a, b) => a.localeCompare(b))
}

export function getAgmReport(ticker: string, targetYear = 2026): AgmReportData | null {
  if (!ticker) return null
  const sym = ticker.toUpperCase().trim()

  // Tìm các năm có dữ liệu
  const baseDir = path.join(process.cwd(), 'content', 'agm')
  const availableYears: number[] = []
  if (fs.existsSync(baseDir)) {
    const yearDirs = fs
      .readdirSync(baseDir)
      .filter((d) => fs.statSync(path.join(baseDir, d)).isDirectory() && !isNaN(Number(d)))
      .map(Number)
      .sort((a, b) => b - a)

    for (const y of yearDirs) {
      const p = path.join(baseDir, String(y), `${sym}_ChiTiet_AGM_${y}.md`)
      if (fs.existsSync(p)) {
        availableYears.push(y)
      }
    }
  }

  // Kiểm tra thêm thư mục EXTERNAL_DIR cho targetYear
  if (fs.existsSync(EXTERNAL_DIR)) {
    const extPath = path.join(EXTERNAL_DIR, `${sym}_ChiTiet_AGM_${targetYear}.md`)
    if (fs.existsSync(extPath) && !availableYears.includes(targetYear)) {
      availableYears.push(targetYear)
    }
  }

  if (availableYears.length === 0) {
    return null
  }

  const selectedYear = availableYears.includes(targetYear) ? targetYear : availableYears[0]
  let filePath = path.join(baseDir, String(selectedYear), `${sym}_ChiTiet_AGM_${selectedYear}.md`)

  // Ưu tiên đọc từ EXTERNAL_DIR nếu có để luôn mới nhất
  if (fs.existsSync(EXTERNAL_DIR)) {
    const extPath = path.join(EXTERNAL_DIR, `${sym}_ChiTiet_AGM_${selectedYear}.md`)
    if (fs.existsSync(extPath)) {
      filePath = extPath
    }
  }

  if (!fs.existsSync(filePath)) {
    return null
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split('\n')

  // Extract title and subtitle
  let title = `${sym} - Báo Cáo Chi Tiết ĐHĐCĐ Thường Niên Năm ${selectedYear}`
  let subtitle: string | undefined

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].trim()
    if (l.startsWith('# ')) {
      title = l.replace(/^#\s+/, '')
    } else if (l.startsWith('*(') && l.endsWith(')*')) {
      subtitle = l.slice(2, -2).trim()
    }
  }

  // Tách các Mục (MỤC 1, MỤC 2, MỤC 3, MỤC 4)
  const sectionRegex = /^##\s+MỤC\s+(\d+)[:\s]+([^\n]+)/gim
  const matches: { number: number; title: string; index: number }[] = []
  let match: RegExpExecArray | null

  while ((match = sectionRegex.exec(raw)) !== null) {
    matches.push({
      number: Number(match[1]),
      title: match[2].trim(),
      index: match.index,
    })
  }

  const sections: AgmSection[] = []
  let hasQa = true
  let hasCapitalIncrease = false

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : raw.length
    const sectionRaw = raw.slice(current.index, nextIndex)

    // Bỏ dòng tiêu đề ## MỤC ...
    const firstLineBreak = sectionRaw.indexOf('\n')
    const bodyMarkdown = firstLineBreak !== -1 ? sectionRaw.slice(firstLineBreak + 1).trim() : ''

    const isQa = current.number === 3
    const isCap = current.number === 4

    if (isQa) {
      const lower = bodyMarkdown.toLowerCase()
      if (lower.includes('không có nội dung q&a') || lower.includes('không có cổ đông')) {
        hasQa = false
      }
    }

    if (isCap) {
      const lower = bodyMarkdown.toLowerCase()
      if (
        lower.includes('không có') &&
        !lower.includes('phát hành') &&
        bodyMarkdown.length < 300
      ) {
        hasCapitalIncrease = false
      } else if (bodyMarkdown.length > 100 && !bodyMarkdown.includes('**Không có**')) {
        hasCapitalIncrease = true
      }
    }

    sections.push({
      id: `muc-${current.number}`,
      number: current.number,
      title: `MỤC ${current.number}: ${current.title}`,
      shortTitle: SHORT_TITLES[current.number] || `Mục ${current.number}`,
      contentHtml: formatMarkdownToHtml(bodyMarkdown),
      rawMarkdown: bodyMarkdown,
      hasContent: bodyMarkdown.length > 0,
      isQa,
      isCapitalIncrease: isCap,
    })
  }

  // Đếm số lượng bảng
  const tableCount = (raw.match(/\|[\s-:]+\|/g) || []).length

  const agmKtpl = getAgmKtplInfo(sym)

  return {
    ticker: sym,
    year: selectedYear,
    title,
    subtitle,
    hasReport: true,
    sections,
    availableYears,
    ktplRate: agmKtpl?.ktplRate ?? null,
    ktplVnd: agmKtpl?.ktplVnd ?? null,
    stats: {
      hasQa,
      hasCapitalIncrease,
      tableCount,
    },
  }
}

let agmKtplCache: Record<string, { ticker: string; year: number; ktplRate: number; ktplVnd: number | null }> | null = null

export function getAllAgmKtpl(): Record<string, { ticker: string; year: number; ktplRate: number; ktplVnd: number | null }> {
  if (process.env.NODE_ENV === 'production' && agmKtplCache) return agmKtplCache
  const snapPath = path.join(process.cwd(), 'data', 'agm_ktpl_snapshot.json')
  if (fs.existsSync(snapPath)) {
    try {
      agmKtplCache = JSON.parse(fs.readFileSync(snapPath, 'utf-8'))
      return agmKtplCache || {}
    } catch {
      // ignore
    }
  }
  return {}
}

export function getAgmKtplInfo(ticker: string) {
  if (!ticker) return null
  const map = getAllAgmKtpl()
  return map[ticker.toUpperCase().trim()] || null
}

export function getAgmKtpl(ticker: string): number | null {
  const info = getAgmKtplInfo(ticker)
  return info && typeof info.ktplRate === 'number' ? info.ktplRate : null
}

