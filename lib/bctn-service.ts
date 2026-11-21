import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

export type BctnSectionCategory =
  | 'intro'
  | 'operations'
  | 'management'
  | 'bod'
  | 'governance'
  | 'esg'
  | 'financials'
  | 'other'

export interface BctnSection {
  id: string
  number: number
  title: string
  shortTitle: string
  category: BctnSectionCategory
  contentHtml: string
  rawMarkdown: string
  hasContent: boolean
  tableCount: number
}

export interface BctnReportData {
  ticker: string
  year: number
  title: string
  subtitle?: string
  hasReport: boolean
  sections: BctnSection[]
  availableYears: number[]
  stats: {
    tableCount: number
    sectionCount: number
    charCount: number
  }
}

function classifySectionCategory(title: string): BctnSectionCategory {
  const t = title.toUpperCase()
  if (
    t.includes('THÔNG ĐIỆP') ||
    t.includes('THƯ GỬI') ||
    t.includes('THÔNG TIN CHUNG') ||
    t.includes('GIỚI THIỆU') ||
    t.includes('TỔNG QUAN') ||
    t.includes('PHẦN MỞ ĐẦU') ||
    t.includes('KHÁT VỌNG')
  ) {
    return 'intro'
  }
  if (
    t.includes('HOẠT ĐỘNG') ||
    t.includes('SẢN XUẤT KINH DOANH') ||
    t.includes('KẾT QUẢ KINH DOANH') ||
    t.includes('DỰ ÁN') ||
    t.includes('ĐẦU TƯ')
  ) {
    return 'operations'
  }
  if (
    t.includes('BAN TỔNG GIÁM ĐỐC') ||
    t.includes('BAN GIÁM ĐỐC') ||
    t.includes('BAN ĐIỀU HÀNH') ||
    t.includes('TỔNG GIÁM ĐỐC') ||
    t.includes('KẾ HOẠCH PHÁT TRIỂN')
  ) {
    return 'management'
  }
  if (t.includes('HỘI ĐỒNG QUẢN TRỊ') || t.includes('HĐQT')) {
    return 'bod'
  }
  if (
    t.includes('QUẢN TRỊ CÔNG TY') ||
    t.includes('QUẢN TRỊ DOANH NGHIỆP') ||
    t.includes('BAN KIỂM SOÁT') ||
    t.includes('ỦY BAN KIỂM TOÁN') ||
    t.includes('THÙ LAO') ||
    t.includes('CƠ CẤU CỔ ĐÔNG')
  ) {
    return 'governance'
  }
  if (
    t.includes('PHÁT TRIỂN BỀN VỮNG') ||
    t.includes('MÔI TRƯỜNG') ||
    t.includes('XÃ HỘI') ||
    t.includes('ESG') ||
    t.includes('NGƯỜI LAO ĐỘNG')
  ) {
    return 'esg'
  }
  if (t.includes('BÁO CÁO TÀI CHÍNH') || t.includes('TÀI CHÍNH')) {
    return 'financials'
  }
  return 'other'
}

function getBctnShortTitle(title: string, index: number, category: BctnSectionCategory): string {
  const t = title.toUpperCase()
  if (t.includes('THÔNG ĐIỆP') || t.includes('THƯ GỬI')) return 'Thông điệp Chủ tịch'
  if (t.includes('MỤC LỤC')) return 'Mục lục'

  switch (category) {
    case 'intro':
      return `${index}. Thông tin chung`
    case 'operations':
      return `${index}. Hoạt động & Đầu tư`
    case 'management':
      return `${index}. Báo cáo Ban Điều hành`
    case 'bod':
      return `${index}. Đánh giá của HĐQT`
    case 'governance':
      return `${index}. Quản trị công ty`
    case 'esg':
      return `${index}. Bền vững & ESG`
    case 'financials':
      return `${index}. Báo cáo tài chính`
    default: {
      const cleaned = title
        .replace(/^[#\s]+/, '')
        .replace(/^(?:CHƯƠNG|PHẦN|MỤC)\s+[0-9IVXLCDM]+[.:\s]*/i, '')
        .replace(/^[IVXLCDM0-9]+\.\s*/i, '')
        .trim()
      return `${index}. ${cleaned.slice(0, 18).trim()}`
    }
  }
}

function formatMarkdownToHtml(markdown: string): string {
  let html = marked.parse(markdown, { gfm: true, breaks: true }) as string

  // Bao bọc các bảng số liệu để có thể cuộn ngang mượt mà, viền bo tròn, đổ bóng đẹp mắt
  html = html.replace(
    /<table>/gi,
    '<div class="agm-table-wrapper overflow-x-auto rounded-xl border border-border/80 my-4 shadow-2xs"><table>'
  )
  html = html.replace(/<\/table>/gi, '</table></div>')

  return html
}

const EXTERNAL_DIR = 'D:\\hoc\\lap trinh\\tai-lieu-BCTC\\ket_qua_trich_xuat\\BCTN_2026'

export function hasBctnReport(ticker: string, year = 2025): boolean {
  if (!ticker) return false
  const sym = ticker.toUpperCase().trim()

  // 1. Kiểm tra thư mục ngoài
  if (fs.existsSync(EXTERNAL_DIR)) {
    const extPath = path.join(EXTERNAL_DIR, `${sym}_BCTN_${year}.md`)
    if (fs.existsSync(extPath)) return true
  }

  // 2. Kiểm tra thư mục nội bộ dự án
  const localPath = path.join(process.cwd(), 'content', 'bctn', String(year), `${sym}_BCTN_${year}.md`)
  if (fs.existsSync(localPath)) return true

  return false
}

let _cachedBctnTickers: { year: number; list: string[]; time: number } | null = null

export function getAvailableBctnTickers(year = 2025): string[] {
  const now = Date.now()
  if (_cachedBctnTickers && _cachedBctnTickers.year === year && now - _cachedBctnTickers.time < 60000) {
    return _cachedBctnTickers.list
  }

  const tickerSet = new Set<string>()

  // 1. Quét thư mục ngoài (ưu tiên nguồn trực tiếp mới nhất)
  if (fs.existsSync(EXTERNAL_DIR)) {
    try {
      fs.readdirSync(EXTERNAL_DIR)
        .filter((f) => f.endsWith('.md'))
        .forEach((f) => {
          const parts = f.split('_')
          if (parts.length >= 2 && parts[0]) {
            tickerSet.add(parts[0].toUpperCase())
          }
        })
    } catch {
      // ignore
    }
  }

  // 2. Quét thư mục nội bộ content/bctn/{year}
  const localDir = path.join(process.cwd(), 'content', 'bctn', String(year))
  if (fs.existsSync(localDir)) {
    try {
      fs.readdirSync(localDir)
        .filter((f) => f.endsWith('.md'))
        .forEach((f) => {
          const parts = f.split('_')
          if (parts.length >= 2 && parts[0]) {
            tickerSet.add(parts[0].toUpperCase())
          }
        })
    } catch {
      // ignore
    }
  }

  const result = Array.from(tickerSet).sort((a, b) => a.localeCompare(b))
  _cachedBctnTickers = { year, list: result, time: now }
  return result
}

export function getBctnReport(ticker: string, targetYear = 2025): BctnReportData | null {
  if (!ticker) return null
  const sym = ticker.toUpperCase().trim()

  const availableYears: number[] = []

  // Tìm các năm có dữ liệu
  const baseDir = path.join(process.cwd(), 'content', 'bctn')
  if (fs.existsSync(baseDir)) {
    const yearDirs = fs
      .readdirSync(baseDir)
      .filter((d) => fs.statSync(path.join(baseDir, d)).isDirectory() && !isNaN(Number(d)))
      .map(Number)
      .sort((a, b) => b - a)

    for (const y of yearDirs) {
      const p = path.join(baseDir, String(y), `${sym}_BCTN_${y}.md`)
      if (fs.existsSync(p)) {
        availableYears.push(y)
      }
    }
  }

  // Kiểm tra EXTERNAL_DIR
  if (fs.existsSync(EXTERNAL_DIR)) {
    const extPath = path.join(EXTERNAL_DIR, `${sym}_BCTN_${targetYear}.md`)
    if (fs.existsSync(extPath) && !availableYears.includes(targetYear)) {
      availableYears.push(targetYear)
    }
  }

  if (availableYears.length === 0) {
    return null
  }

  const selectedYear = availableYears.includes(targetYear) ? targetYear : availableYears[0]

  // Tìm file path ưu tiên: EXTERNAL_DIR -> local content
  let filePath = path.join(baseDir, String(selectedYear), `${sym}_BCTN_${selectedYear}.md`)
  if (fs.existsSync(EXTERNAL_DIR)) {
    const extPath = path.join(EXTERNAL_DIR, `${sym}_BCTN_${selectedYear}.md`)
    if (fs.existsSync(extPath)) {
      filePath = extPath
    }
  }

  if (!fs.existsSync(filePath)) {
    return null
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const lines = raw.split('\n')

  // Trích xuất tiêu đề chính và phụ
  let title = `${sym} - Báo Cáo Thường Niên Năm ${selectedYear}`
  let subtitle: string | undefined

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const l = lines[i].trim()
    if (l.startsWith('# ') && !title.includes('BÁO CÁO THƯỜNG NIÊN')) {
      const cleaned = l.replace(/^#\s+/, '')
      if (cleaned.length > 5) title = cleaned
    } else if (l.startsWith('*(') && l.endsWith(')*')) {
      subtitle = l.slice(2, -2).trim()
    } else if (l.startsWith('*') && l.endsWith('*') && l.length > 6 && !subtitle) {
      subtitle = l.slice(1, -1).trim()
    }
  }

  // Bóc tách phân cấp thông minh (Tier 1: `#` -> Tier 2: `##` -> Tier 3: `###`)
  function findTierMatches(regex: RegExp) {
    const list: { lineIndex: number; title: string }[] = []
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim()
      if (
        i < 8 &&
        (l.includes('BÁO CÁO THƯỜNG NIÊN') ||
          l.includes('CÔNG TY CỔ PHẦN') ||
          l.includes('CÔNG BỐ THÔNG TIN'))
      ) {
        continue
      }
      const m = l.match(regex)
      if (m) {
        list.push({ lineIndex: i, title: m[1].trim() })
      }
    }
    return list
  }

  const h1Regex =
    /^#\s+((?:(?:CHƯƠNG|PHẦN)\s+[0-9IVXLCDM]+[.:\s]+|[IVXLCDM]+\.\s+|\d{1,2}[.:\s]+\s*[A-ZÀ-Ỹ])\s*[^\n]+|THÔNG ĐIỆP[^\n]+|THƯ GỬI[^\n]+|KHÁT VỌNG[^\n]+)/i
  let tierMatches = findTierMatches(h1Regex)

  if (tierMatches.length < 3) {
    const h2Regex =
      /^##\s+((?:(?:CHƯƠNG|PHẦN)\s+[0-9IVXLCDM]+[.:\s]+|[IVXLCDM]+\.\s+|[A-F]\.\s+|\d{1,2}[.:\s]+\s*[A-ZÀ-Ỹ])\s*[^\n]+|THÔNG ĐIỆP[^\n]+|THƯ GỬI[^\n]+|KHÁT VỌNG[^\n]+)/i
    const h2Matches = findTierMatches(h2Regex)
    if (h2Matches.length >= 3) {
      tierMatches = h2Matches
    }
  }

  if (tierMatches.length < 3) {
    const h3Regex =
      /^###\s+((?:(?:CHƯƠNG|PHẦN)\s+[0-9IVXLCDM]+[.:\s]+|[IVXLCDM]+\.\s+|[A-F]\.\s+|\d{1,2}[.:\s]+\s*[A-ZÀ-Ỹ])\s*[^\n]+)/i
    const h3Matches = findTierMatches(h3Regex)
    if (h3Matches.length >= 3) {
      tierMatches = h3Matches
    }
  }

  // Tính vị trí ký tự index trong toàn bộ chuỗi raw
  const lineCharStarts: number[] = [0]
  let curOffset = 0
  for (let i = 0; i < lines.length; i++) {
    curOffset += lines[i].length + 1
    lineCharStarts.push(curOffset)
  }

  const sections: BctnSection[] = []

  if (tierMatches.length >= 2) {
    const firstMatchOffset = lineCharStarts[tierMatches[0].lineIndex]
    if (firstMatchOffset > 250) {
      const introRaw = raw.slice(0, firstMatchOffset).trim()
      if (introRaw.length > 80) {
        const introHtml = formatMarkdownToHtml(introRaw)
        const tCount = (introHtml.match(/<table/gi) || []).length
        sections.push({
          id: 'sec-intro',
          number: 0,
          title: 'Lời mở đầu & Thông tin khái quát',
          shortTitle: 'Khái quát & Mở đầu',
          category: 'intro',
          contentHtml: introHtml,
          rawMarkdown: introRaw,
          hasContent: true,
          tableCount: tCount,
        })
      }
    }

    for (let i = 0; i < tierMatches.length; i++) {
      const current = tierMatches[i]
      const curStart = lineCharStarts[current.lineIndex]
      const nextStart =
        i + 1 < tierMatches.length
          ? lineCharStarts[tierMatches[i + 1].lineIndex]
          : raw.length
      const sectionRaw = raw.slice(curStart, nextStart).trim()

      const category = classifySectionCategory(current.title)
      const secNumber = sections.length + 1
      const shortTitle = getBctnShortTitle(current.title, secNumber, category)
      const contentHtml = formatMarkdownToHtml(sectionRaw)
      const tableCount = (contentHtml.match(/<table/gi) || []).length

      sections.push({
        id: `sec-${secNumber}`,
        number: secNumber,
        title: current.title,
        shortTitle,
        category,
        contentHtml,
        rawMarkdown: sectionRaw,
        hasContent: sectionRaw.length > 0,
        tableCount,
      })
    }
  } else {
    // Trường hợp đặc biệt, hiển thị toàn bộ
    const fullHtml = formatMarkdownToHtml(raw)
    const tableCount = (fullHtml.match(/<table/gi) || []).length
    sections.push({
      id: 'sec-all',
      number: 1,
      title: 'Toàn bộ Báo Cáo Thường Niên',
      shortTitle: 'Toàn bộ báo cáo',
      category: 'intro',
      contentHtml: fullHtml,
      rawMarkdown: raw,
      hasContent: raw.length > 0,
      tableCount,
    })
  }

  const totalTableCount = (raw.match(/\|[\s-:]+\|/g) || []).length

  return {
    ticker: sym,
    year: selectedYear,
    title,
    subtitle,
    hasReport: true,
    sections,
    availableYears,
    stats: {
      tableCount: totalTableCount,
      sectionCount: sections.length,
      charCount: raw.length,
    },
  }
}
