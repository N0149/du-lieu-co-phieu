import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

export interface BctcSection {
  id: string
  number: number
  title: string
  shortTitle: string
  contentHtml: string
  rawMarkdown: string
  hasContent: boolean
  tableCount: number
}

export interface BctcReportData {
  ticker: string
  reportType: 'HopNhat' | 'CongTyMe'
  reportTypeLabel: string
  title: string
  hasReport: boolean
  sections: BctcSection[]
  availableTypes: ('HopNhat' | 'CongTyMe')[]
  tableCount: number
}

const SECTION_SHORT_TITLES: Record<number, string> = {
  1: '1. Thông tin chung',
  2: '2. Thuyết minh CĐKT',
  3: '3. Thuyết minh KQKD',
  4: '4. Bên liên quan & Khác',
}

function formatMarkdownToHtml(markdown: string): string {
  let html = marked.parse(markdown, { gfm: true, breaks: true }) as string

  // Wrap tables with responsive overflow container
  html = html.replace(
    /<table>/g,
    '<div class="agm-table-wrapper overflow-x-auto rounded-xl border border-border/80 my-4 shadow-2xs"><table>'
  )
  html = html.replace(/<\/table>/g, '</table></div>')

  return html
}

const EXTERNAL_DIR = 'D:\\hoc\\lap trinh\\tai-lieu-BCTC\\ket_qua_trich_xuat'
const LOCAL_DIR = path.join(process.cwd(), 'content', 'bctc')

export function hasBctcReport(ticker: string): boolean {
  if (!ticker) return false
  const sym = ticker.toUpperCase().trim()
  const localHopNhat = path.join(LOCAL_DIR, `${sym}_ThuyetMinh_HopNhat.md`)
  const localCongTyMe = path.join(LOCAL_DIR, `${sym}_ThuyetMinh_CongTyMe.md`)
  if (fs.existsSync(localHopNhat) || fs.existsSync(localCongTyMe)) return true

  if (fs.existsSync(EXTERNAL_DIR)) {
    const extHopNhat = path.join(EXTERNAL_DIR, `${sym}_ThuyetMinh_HopNhat.md`)
    const extCongTyMe = path.join(EXTERNAL_DIR, `${sym}_ThuyetMinh_CongTyMe.md`)
    if (fs.existsSync(extHopNhat) || fs.existsSync(extCongTyMe)) return true
  }
  return false
}

export function getAvailableBctcTickers(): string[] {
  const tickerSet = new Set<string>()

  // 1. Quét từ LOCAL_DIR
  if (fs.existsSync(LOCAL_DIR)) {
    fs.readdirSync(LOCAL_DIR)
      .filter((f) => f.endsWith('.md'))
      .forEach((f) => {
        const t = f.split('_')[0].toUpperCase()
        if (t) tickerSet.add(t)
      })
  }

  // 2. Quét từ EXTERNAL_DIR
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

export function getBctcReport(
  ticker: string,
  preferredType: 'HopNhat' | 'CongTyMe' = 'HopNhat'
): BctcReportData | null {
  if (!ticker) return null
  const sym = ticker.toUpperCase().trim()

  const availableTypes: ('HopNhat' | 'CongTyMe')[] = []

  const checkFileExists = (type: 'HopNhat' | 'CongTyMe') => {
    const filename = `${sym}_ThuyetMinh_${type}.md`
    const localP = path.join(LOCAL_DIR, filename)
    if (fs.existsSync(localP)) return localP
    if (fs.existsSync(EXTERNAL_DIR)) {
      const extP = path.join(EXTERNAL_DIR, filename)
      if (fs.existsSync(extP)) return extP
    }
    if (type === 'HopNhat') {
      const bctcLocal = path.join(LOCAL_DIR, `${sym}_ThuyetMinh_BCTC.md`)
      if (fs.existsSync(bctcLocal)) return bctcLocal
      if (fs.existsSync(EXTERNAL_DIR)) {
        const bctcExt = path.join(EXTERNAL_DIR, `${sym}_ThuyetMinh_BCTC.md`)
        if (fs.existsSync(bctcExt)) return bctcExt
      }
    }
    return null
  }

  const hopNhatPath = checkFileExists('HopNhat')
  if (hopNhatPath) availableTypes.push('HopNhat')

  const congTyMePath = checkFileExists('CongTyMe')
  if (congTyMePath) availableTypes.push('CongTyMe')

  if (availableTypes.length === 0) {
    return null
  }

  const selectedType: 'HopNhat' | 'CongTyMe' = availableTypes.includes(preferredType)
    ? preferredType
    : availableTypes[0]

  const activeFilePath = selectedType === 'HopNhat' ? hopNhatPath : congTyMePath
  if (!activeFilePath || !fs.existsSync(activeFilePath)) {
    return null
  }

  const raw = fs.readFileSync(activeFilePath, 'utf-8')
  const lines = raw.split('\n')

  let title = `${sym} - Thuyết Minh Báo Cáo Tài Chính (${selectedType === 'HopNhat' ? 'Hợp nhất' : 'Công ty mẹ'})`
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].trim()
    if (l.startsWith('# ')) {
      title = l.replace(/^#\s+/, '')
      break
    }
  }

  // Tách các Phần: ## PHẦN 1, ## PHẦN 2, ## PHẦN 3, ## PHẦN 4...
  const sectionRegex = /^##\s+PHẦN\s+(\d+)[:\s]+([^\n]+)/gim
  const matches: { number: number; title: string; index: number }[] = []
  let match: RegExpExecArray | null

  while ((match = sectionRegex.exec(raw)) !== null) {
    matches.push({
      number: Number(match[1]),
      title: match[2].trim(),
      index: match.index,
    })
  }

  const sections: BctcSection[] = []

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : raw.length
    const sectionRaw = raw.slice(current.index, nextIndex)

    const firstLineBreak = sectionRaw.indexOf('\n')
    const bodyMarkdown = firstLineBreak !== -1 ? sectionRaw.slice(firstLineBreak + 1).trim() : ''
    const secTableCount = (bodyMarkdown.match(/\|[\s-:]+\|/g) || []).length

    sections.push({
      id: `phan-${current.number}`,
      number: current.number,
      title: `PHẦN ${current.number}: ${current.title}`,
      shortTitle: SECTION_SHORT_TITLES[current.number] || `Phần ${current.number}`,
      contentHtml: formatMarkdownToHtml(bodyMarkdown),
      rawMarkdown: bodyMarkdown,
      hasContent: bodyMarkdown.length > 0,
      tableCount: secTableCount,
    })
  }

  // Nếu không regex được ## PHẦN, đưa toàn bộ vào 1 section
  if (sections.length === 0) {
    const totalTableCount = (raw.match(/\|[\s-:]+\|/g) || []).length
    sections.push({
      id: 'toan-bo',
      number: 1,
      title: 'Toàn bộ nội dung Thuyết minh BCTC',
      shortTitle: 'Toàn bộ Thuyết minh',
      contentHtml: formatMarkdownToHtml(raw),
      rawMarkdown: raw,
      hasContent: raw.length > 0,
      tableCount: totalTableCount,
    })
  }

  const totalTableCount = (raw.match(/\|[\s-:]+\|/g) || []).length

  return {
    ticker: sym,
    reportType: selectedType,
    reportTypeLabel: selectedType === 'HopNhat' ? 'Hợp nhất' : 'Công ty mẹ',
    title,
    hasReport: true,
    sections,
    availableTypes,
    tableCount: totalTableCount,
  }
}
