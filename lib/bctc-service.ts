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

export interface BctcNoteItem {
  id: string
  sectionNumber: number
  parentSectionNumber?: number
  semanticSection?: number
  noteNumber: string
  title: string
  rawTitle: string
  contentHtml: string
  rawMarkdown: string
  tableCount: number
}

export interface BctcPeriodOption {
  id: string
  label: string
  shortLabel: string
  quarter?: number
  year: number
  isLatest?: boolean
}

export interface BctcReportData {
  ticker: string
  reportType: 'HopNhat' | 'CongTyMe'
  reportTypeLabel: string
  periodKey?: string
  periodLabel?: string
  availablePeriods?: BctcPeriodOption[]
  title: string
  hasReport: boolean
  sections: BctcSection[]
  notes?: BctcNoteItem[]
  availableTypes: ('HopNhat' | 'CongTyMe')[]
  tableCount: number
}

export function getSectionShortTitle(num: number, fullTitle: string): string {
  const t = (fullTitle || '').toUpperCase()
  if (t.includes('GIẢI TRÌNH')) return '0. Giải trình KQKD'
  if (t.includes('THÔNG TIN DOANH NGHIỆP') || t.includes('THÔNG TIN CHUNG') || t.includes('THÔNG TIN KHÁI QUÁT')) return '1. Thông tin chung'
  if (t.includes('CÂN ĐỐI KẾ TOÁN') || t.includes('CĐKT') || t.includes('TÌNH HÌNH TÀI CHÍNH')) {
    if (t.includes('THUYẾT MINH')) return '2. Thuyết minh CĐKT'
    return '2. Bảng CĐKT'
  }
  if (t.includes('KẾT QUẢ') && (t.includes('KINH DOANH') || t.includes('HOẠT ĐỘNG'))) {
    if (t.includes('THUYẾT MINH')) return '3. Thuyết minh KQKD'
    return '3. Báo cáo KQKD'
  }
  if (t.includes('LƯU CHUYỂN TIỀN TỆ') || t.includes('LCTT')) {
    return '4. Báo cáo LCTT'
  }
  if (t.includes('BÊN LIÊN QUAN') || t.includes('GIAO DỊCH VỚI')) {
    return '4. Bên liên quan & Khác'
  }
  if (t.includes('CHỌN LỌC') || t.includes('TRỌNG YẾU')) {
    return '5. TM chọn lọc'
  }
  if (num === 5 || t.includes('THUYẾT MINH CHI TIẾT') || t.includes('THUYẾT MINH TÀI CHÍNH') || t.includes('TOÀN BỘ CÁC BẢNG')) {
    return '5. Thuyết minh chi tiết'
  }
  return `Phần ${num}`
}

function formatMarkdownToHtml(markdown: string): string {
  let html = marked.parse(markdown, { gfm: true, breaks: true }) as string

  // Xử lý bảng biểu: Tự động phân loại cột số liệu vs cột văn bản
  html = html.replace(/<table>([\s\S]*?)<\/table>/gi, (match, tableInner) => {
    const theadMatch = tableInner.match(/<thead>([\s\S]*?)<\/thead>/i)
    const tbodyMatch = tableInner.match(/<tbody>([\s\S]*?)<\/tbody>/i)
    const numRegex = /^[\s\d.,()%\-–—+*]+$/

    // Phát hiện cột nào là cột số liệu và cột tỷ lệ % dựa vào dữ liệu trong tbody
    const colIsNumeric: boolean[] = []
    const colIsPct: boolean[] = []
    if (tbodyMatch) {
      const rows = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      rows.forEach((r: string) => {
        const cells = r.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []
        cells.forEach((c: string, colIdx: number) => {
          const rawText = c.replace(/<[^>]+>/g, '').trim()
          if (rawText.length > 0) {
            const isNum = numRegex.test(rawText)
            const isPct = /%$/.test(rawText) || /^\d+([.,]\d+)?\s*%$/.test(rawText)
            if (colIsNumeric[colIdx] === undefined) {
              colIsNumeric[colIdx] = isNum
              colIsPct[colIdx] = isPct
            } else {
              if (!isNum) colIsNumeric[colIdx] = false
              if (!isPct) colIsPct[colIdx] = false
            }
          }
        })
      })
    }

    let newTable = tableInner

    // Gắn class agm-th-num (hoặc agm-th-pct) hoặc agm-th-text cho thead
    if (theadMatch) {
      let colIdx = 0
      const newTheadContent = theadMatch[1].replace(/<th([^>]*)>([\s\S]*?)<\/th>/gi, (_m: string, attrs: string, content: string) => {
        const isNumCol = colIsNumeric[colIdx] === true
        const isPctCol = colIsPct[colIdx] === true
        colIdx++
        const cls = isNumCol ? (isPctCol ? 'agm-th-num agm-th-pct' : 'agm-th-num') : 'agm-th-text'
        return `<th${attrs} class="${cls}">${content}</th>`
      })
      newTable = newTable.replace(theadMatch[1], newTheadContent)
    }

    // Gắn class agm-td-num (hoặc agm-td-pct) hoặc agm-td-text cho tbody
    if (tbodyMatch) {
      const newTbodyContent = tbodyMatch[1].replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi, (_trMatch: string, trAttrs: string, trContent: string) => {
        let colIdx = 0
        const newTrContent = trContent.replace(/<td([^>]*)>([\s\S]*?)<\/td>/gi, (_tdMatch: string, tdAttrs: string, tdContent: string) => {
          const rawText = tdContent.replace(/<[^>]+>/g, '').trim()
          const isNum = rawText.length > 0 && numRegex.test(rawText)
          const isNumCol = colIsNumeric[colIdx] === true
          const isPctCol = colIsPct[colIdx] === true
          colIdx++
          const cls = (isNum || isNumCol) ? (isPctCol ? 'agm-td-num agm-td-pct' : 'agm-td-num') : 'agm-td-text'
          return `<td${tdAttrs} class="${cls}">${tdContent}</td>`
        })
        return `<tr${trAttrs}>${newTrContent}</tr>`
      })
      newTable = newTable.replace(tbodyMatch[1], newTbodyContent)
    }

    return `<div class="agm-table-wrapper overflow-x-auto rounded-xl border border-border/80 my-2 sm:my-3 shadow-2xs"><table>${newTable}</table></div>`
  })

  return html
}

const IS_LOCAL_DEV = process.env.NODE_ENV !== 'production' && process.platform === 'win32'
const EXTERNAL_DIR = IS_LOCAL_DEV ? 'D:\\hoc\\lap trinh\\tai-lieu-BCTC\\ket_qua_trich_xuat' : ''
const LOCAL_DIR = path.join(process.cwd(), 'content', 'bctc')

// Thứ tự ưu tiên kỳ BCTC (mới nhất trước): Quý 3/2026 -> Bán niên 2026 -> Thư mục gốc (legacy)
const PERIOD_SUBDIRS = ['Quy_3_2026', 'Ban_Nien_2026', '']

export function hasBctcReport(ticker: string): boolean {
  if (!ticker) return false
  const sym = ticker.toUpperCase().trim()

  const candidateNames = [
    sym + '_HopNhat_Q3.md',
    sym + '_CongTyMe_Q3.md',
    sym + '_ThuyetMinh_HopNhat.md',
    sym + '_ThuyetMinh_CongTyMe.md',
    sym + '_ThuyetMinh_BCTC.md',
  ]

  for (const sub of PERIOD_SUBDIRS) {
    const localDir = sub ? path.join(LOCAL_DIR, sub) : LOCAL_DIR
    if (fs.existsSync(localDir)) {
      for (const name of candidateNames) {
        if (fs.existsSync(path.join(localDir, name))) return true
      }
    }

    if (EXTERNAL_DIR && fs.existsSync(/*turbopackIgnore: true*/ EXTERNAL_DIR)) {
      const extDir = sub ? path.join(EXTERNAL_DIR, sub) : EXTERNAL_DIR
      if (fs.existsSync(/*turbopackIgnore: true*/ extDir)) {
        for (const name of candidateNames) {
          if (fs.existsSync(/*turbopackIgnore: true*/ path.join(extDir, name))) return true
        }
      }
    }
  }
  return false
}

export function hasBctcReportForPeriod(ticker: string, period: 'Ban_Nien_2026' | 'Quy_3_2026'): boolean {
  if (!ticker) return false
  const sym = ticker.toUpperCase().trim()
  const q3Files = [
    `${sym}_HopNhat_Q3.md`,
    `${sym}_CongTyMe_Q3.md`,
  ]
  const banNienFiles = [
    `${sym}_ThuyetMinh_HopNhat.md`,
    `${sym}_ThuyetMinh_CongTyMe.md`,
    `${sym}_ThuyetMinh_BCTC.md`,
    `${sym}_HopNhat_BanNien.md`,
  ]
  const files = period === 'Quy_3_2026' ? q3Files : banNienFiles
  const localDir = path.join(LOCAL_DIR, period)
  if (fs.existsSync(localDir)) {
    for (const f of files) {
      if (fs.existsSync(path.join(localDir, f))) return true
    }
  }
  if (EXTERNAL_DIR && fs.existsSync(/*turbopackIgnore: true*/ EXTERNAL_DIR)) {
    const extDir = path.join(EXTERNAL_DIR, period)
    if (fs.existsSync(/*turbopackIgnore: true*/ extDir)) {
      for (const f of files) {
        if (fs.existsSync(/*turbopackIgnore: true*/ path.join(extDir, f))) return true
      }
    }
  }
  return false
}

export function getAvailableBctcTickersForPeriod(period: 'Ban_Nien_2026' | 'Quy_3_2026'): string[] {
  const tickerSet = new Set<string>()
  const scan = (dir: string) => {
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) return
    try {
      const entries = fs.readdirSync(dir)
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          const t = entry.split('_')[0].toUpperCase()
          if (t && t.length >= 3 && t.length <= 5) tickerSet.add(t)
        }
      }
    } catch {}
  }
  scan(path.join(LOCAL_DIR, period))
  if (EXTERNAL_DIR && fs.existsSync(/*turbopackIgnore: true*/ EXTERNAL_DIR)) {
    scan(path.join(EXTERNAL_DIR, period))
  }
  return Array.from(tickerSet).sort((a, b) => a.localeCompare(b))
}

let _cachedBctcTickers: { list: string[]; time: number } | null = null

export function getAvailableBctcTickers(): string[] {
  const now = Date.now()
  if (_cachedBctcTickers && now - _cachedBctcTickers.time < 60000) {
    return _cachedBctcTickers.list
  }

  const tickerSet = new Set<string>()

  const scanDir = (dir: string) => {
    if (!fs.existsSync(dir)) return
    try {
      const entries = fs.readdirSync(dir)
      for (const entry of entries) {
        const fullPath = path.join(dir, entry)
        try {
          const stat = fs.statSync(fullPath)
          if (stat.isFile() && entry.endsWith('.md')) {
            const t = entry.split('_')[0].toUpperCase()
            if (t && t.length >= 3 && t.length <= 5) tickerSet.add(t)
          } else if (stat.isDirectory()) {
            const subEntries = fs.readdirSync(fullPath)
            for (const subF of subEntries) {
              if (subF.endsWith('.md')) {
                const t = subF.split('_')[0].toUpperCase()
                if (t && t.length >= 3 && t.length <= 5) tickerSet.add(t)
              }
            }
          }
        } catch {}
      }
    } catch {}
  }

  // 1. Quét từ LOCAL_DIR (bao gồm các thư mục con)
  scanDir(LOCAL_DIR)

  // 2. Quét từ EXTERNAL_DIR (bao gồm các thư mục con)
  if (EXTERNAL_DIR) {
    scanDir(EXTERNAL_DIR)
  }

  const result = Array.from(tickerSet).sort((a, b) => a.localeCompare(b))
  _cachedBctcTickers = { list: result, time: now }
  return result
}

export function getAvailableBctcPeriods(ticker: string): BctcPeriodOption[] {
  if (!ticker) return []
  const sym = ticker.toUpperCase().trim()
  const list: BctcPeriodOption[] = []

  const checkPeriodExists = (sub: string, files: string[]) => {
    // 1. Local dir
    const localDir = path.join(LOCAL_DIR, sub)
    if (fs.existsSync(localDir)) {
      for (const f of files) {
        if (fs.existsSync(path.join(localDir, f))) return true
      }
    }
    // 2. External dir
    if (EXTERNAL_DIR && fs.existsSync(/*turbopackIgnore: true*/ EXTERNAL_DIR)) {
      const extDir = path.join(EXTERNAL_DIR, sub)
      if (fs.existsSync(/*turbopackIgnore: true*/ extDir)) {
        for (const f of files) {
          if (fs.existsSync(/*turbopackIgnore: true*/ path.join(extDir, f))) return true
        }
      }
    }
    return false
  }

  // Quý 3/2026
  const q3Files = [
    `${sym}_HopNhat_Q3.md`,
    `${sym}_CongTyMe_Q3.md`,
    `${sym}_ThuyetMinh_HopNhat.md`,
    `${sym}_ThuyetMinh_CongTyMe.md`,
  ]
  if (checkPeriodExists('Quy_3_2026', q3Files)) {
    list.push({
      id: 'Quy_3_2026',
      label: 'Báo cáo Quý 3/2026',
      shortLabel: 'Quý 3/2026',
      quarter: 3,
      year: 2026,
      isLatest: true,
    })
  }

  // Bán niên 2026
  const banNienFiles = [
    `${sym}_ThuyetMinh_HopNhat.md`,
    `${sym}_ThuyetMinh_CongTyMe.md`,
    `${sym}_ThuyetMinh_BCTC.md`,
    `${sym}_HopNhat_BanNien.md`,
  ]
  if (checkPeriodExists('Ban_Nien_2026', banNienFiles)) {
    list.push({
      id: 'Ban_Nien_2026',
      label: 'Báo cáo Bán niên 2026',
      shortLabel: 'Bán niên 2026',
      year: 2026,
    })
  }

  return list
}

export function getBctcReport(
  ticker: string,
  preferredType: 'HopNhat' | 'CongTyMe' = 'HopNhat',
  preferredPeriod?: string
): BctcReportData | null {
  if (!ticker) return null
  const sym = ticker.toUpperCase().trim()

  const availableTypes: ('HopNhat' | 'CongTyMe')[] = []

  // Nếu có preferredPeriod cụ thể (ví dụ 'Ban_Nien_2026' hoặc 'Quy_3_2026'): CHỈ QUÉT THƯ MỤC KỲ ĐÓ
  let scanSubDirs = PERIOD_SUBDIRS
  let isStrictPeriod = false
  if (preferredPeriod && preferredPeriod.trim()) {
    const pTrim = preferredPeriod.trim()
    scanSubDirs = [pTrim]
    isStrictPeriod = true
  }

  const checkFileExists = (type: 'HopNhat' | 'CongTyMe') => {
    let candidateFiles: string[] = []
    if (isStrictPeriod && preferredPeriod === 'Ban_Nien_2026') {
      candidateFiles = [
        sym + '_ThuyetMinh_' + type + '.md',
        ...(type === 'HopNhat' ? [sym + '_ThuyetMinh_BCTC.md', sym + '_HopNhat_BanNien.md', sym + '_BanNien.md'] : [sym + '_CongTyMe_BanNien.md']),
      ]
    } else if (isStrictPeriod && preferredPeriod === 'Quy_3_2026') {
      candidateFiles = [
        sym + '_' + type + '_Q3.md',
        sym + '_ThuyetMinh_' + type + '.md',
        ...(type === 'HopNhat' ? [sym + '_ThuyetMinh_BCTC.md'] : []),
      ]
    } else {
      candidateFiles = [
        sym + '_' + type + '_Q3.md',
        sym + '_ThuyetMinh_' + type + '.md',
        ...(type === 'HopNhat' ? [sym + '_ThuyetMinh_BCTC.md', sym + '_HopNhat_BanNien.md'] : []),
      ]
    }

    for (const sub of scanSubDirs) {
      // 1. Local dir
      const localDir = sub ? path.join(LOCAL_DIR, sub) : LOCAL_DIR
      if (fs.existsSync(localDir)) {
        for (const fname of candidateFiles) {
          const p = path.join(localDir, fname)
          if (fs.existsSync(p)) return p
        }
      }

      // 2. External dir
      if (EXTERNAL_DIR && fs.existsSync(/*turbopackIgnore: true*/ EXTERNAL_DIR)) {
        const extDir = sub ? path.join(EXTERNAL_DIR, sub) : EXTERNAL_DIR
        if (fs.existsSync(/*turbopackIgnore: true*/ extDir)) {
          for (const fname of candidateFiles) {
            const ep = path.join(extDir, fname)
            if (fs.existsSync(/*turbopackIgnore: true*/ ep)) return ep
          }
        }
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

  // Xác định kỳ báo cáo thực tế
  let periodKey = 'Quy_3_2026'
  let periodLabel = 'Báo cáo Quý 3/2026'
  if (activeFilePath.includes('Ban_Nien_2026') || activeFilePath.includes('BanNien')) {
    periodKey = 'Ban_Nien_2026'
    periodLabel = 'Báo cáo Bán niên 2026'
  } else if (activeFilePath.includes('Quy_3_2026') || activeFilePath.includes('_Q3')) {
    periodKey = 'Quy_3_2026'
    periodLabel = 'Báo cáo Quý 3/2026'
  }

  const raw = fs.readFileSync(activeFilePath, 'utf-8')
  const lines = raw.split('\n')

  let title = `${sym} - BÁO CÁO TÀI CHÍNH & THUYẾT MINH ${periodKey === 'Quy_3_2026' ? 'QUÝ 3/2026' : 'BÁN NIÊN 2026'} (${selectedType === 'HopNhat' ? 'Hợp nhất' : 'Công ty mẹ'})`
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].trim()
    if (l.startsWith('# ')) {
      let rawH1 = l.replace(/^#\s+/, '')
      // Chuẩn hóa tiêu đề: loại bỏ văn bản OCR nhầm lẫn như "(Báo cáo tài chính Giữa niên độ)" cho file Quý 3
      if (periodKey === 'Quy_3_2026' && /giữa niên độ/i.test(rawH1)) {
        rawH1 = rawH1.replace(/\(Báo cáo tài chính Giữa niên độ\)/i, '(Báo cáo Quý 3/2026)')
                     .replace(/giữa niên độ/i, 'Quý 3/2026')
      }
      title = rawH1
      break
    }
  }

  // Tách các Phần: # PHẦN, ## PHẦN, ### PHẦN 0, 1, 2, 3, 4...
  const sectionRegex = /^#{1,4}\s*(?:##)?\s*PHẦN\s+(\d+)[:\s]+([^\n]+)/gim
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
  const sectionCountMap: Record<number, number> = {}
  const usedIds = new Set<string>()

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    sectionCountMap[current.number] = (sectionCountMap[current.number] || 0) + 1
    const occurrence = sectionCountMap[current.number]

    let secId = `phan-${current.number}`
    let colIndex = occurrence
    while (usedIds.has(secId)) {
      secId = `phan-${current.number}-${colIndex}`
      colIndex++
    }
    usedIds.add(secId)

    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : raw.length
    const sectionRaw = raw.slice(current.index, nextIndex)

    const firstLineBreak = sectionRaw.indexOf('\n')
    const bodyMarkdown = firstLineBreak !== -1 ? sectionRaw.slice(firstLineBreak + 1).trim() : ''
    const contentHtml = formatMarkdownToHtml(bodyMarkdown)
    const secTableCount = (contentHtml.match(/<table/gi) || []).length

    let shortTitle = getSectionShortTitle(current.number, current.title)
    if (occurrence > 1) {
      if (current.number === 5) {
        shortTitle = '5. Toàn bộ TM'
      } else {
        shortTitle = `${shortTitle} (${occurrence})`
      }
    } else if (current.number === 5 && (current.title.toUpperCase().includes('CHỌN LỌC') || current.title.toUpperCase().includes('TRỌNG YẾU'))) {
      shortTitle = '5. TM chọn lọc'
    }

    sections.push({
      id: secId,
      number: current.number,
      title: `PHẦN ${current.number}: ${current.title}`,
      shortTitle,
      contentHtml,
      rawMarkdown: bodyMarkdown,
      hasContent: bodyMarkdown.length > 0,
      tableCount: secTableCount,
    })
  }

  // Nếu không regex được PHẦN, đưa toàn bộ vào 1 section
  if (sections.length === 0) {
    const contentHtml = formatMarkdownToHtml(raw)
    const totalTableCount = (contentHtml.match(/<table/gi) || []).length
    sections.push({
      id: 'toan-bo',
      number: 1,
      title: 'Toàn bộ nội dung Thuyết minh BCTC',
      shortTitle: 'Toàn bộ Thuyết minh',
      contentHtml,
      rawMarkdown: raw,
      hasContent: raw.length > 0,
      tableCount: totalTableCount,
    })
  }

  const totalTableCount = sections.reduce((acc, s) => acc + s.tableCount, 0)
  const notes = extractNotesFromRaw(raw)

  return {
    ticker: sym,
    reportType: selectedType,
    reportTypeLabel: selectedType === 'HopNhat' ? 'Hợp nhất' : 'Công ty mẹ',
    periodKey,
    periodLabel,
    availablePeriods: getAvailableBctcPeriods(sym),
    title,
    hasReport: true,
    sections,
    notes,
    availableTypes,
    tableCount: totalTableCount,
  }
}

export function extractNotesFromRaw(rawMarkdown: string): BctcNoteItem[] {
  const lines = rawMarkdown.split('\n')
  const notes: BctcNoteItem[] = []
  const usedNoteIds = new Set<string>()
  let currentSection = 0
  let currentSubSection = 0
  let currentNote: {
    id: string
    sectionNumber: number
    parentSectionNumber?: number
    semanticSection?: number
    noteNumber: string
    title: string
    rawTitle: string
    lines: string[]
  } | null = null

  const finishCurrentNote = () => {
    if (!currentNote) return
    const body = currentNote.lines.join('\n').trim()
    const contentHtml = formatMarkdownToHtml(body)
    const tableCount = (contentHtml.match(/<table/gi) || []).length
    notes.push({
      id: currentNote.id,
      sectionNumber: currentNote.sectionNumber,
      parentSectionNumber: currentNote.parentSectionNumber,
      semanticSection: currentNote.semanticSection,
      noteNumber: currentNote.noteNumber,
      title: currentNote.title,
      rawTitle: currentNote.rawTitle,
      rawMarkdown: body,
      contentHtml,
      tableCount,
    })
    currentNote = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 1. Nhận diện đầu mục PHẦN lớn (# PHẦN, ## PHẦN)
    const secMatch = line.match(/^#{1,4}\s*(?:##)?\s*PHẦN\s+(\d+)[:\s]+([^\r\n]+)/i)
    if (secMatch) {
      finishCurrentNote()
      currentSection = parseInt(secMatch[1], 10)
      currentSubSection = 0
      continue
    }

    // 2. Nhận diện các phân nhóm La Mã lớn trong Phần 5 (I., II., III., V., VI., VII., VIII...)
    const subSecMatch = line.match(/^#{2}\s+(?:[IVXLCDM]+\.)\s*([^\r\n]+)/i)
    if (subSecMatch && currentSection >= 5) {
      const subTitleUpper = subSecMatch[1].toUpperCase()
      if (subTitleUpper.includes('CÂN ĐỐI KẾ TOÁN') || subTitleUpper.includes('TÌNH HÌNH TÀI CHÍNH')) {
        currentSubSection = 2
      } else if (subTitleUpper.includes('KẾT QUẢ') && (subTitleUpper.includes('KINH DOANH') || subTitleUpper.includes('HOẠT ĐỘNG'))) {
        currentSubSection = 3
      } else if (subTitleUpper.includes('LƯU CHUYỂN TIỀN TỆ')) {
        currentSubSection = 4
      } else if (subTitleUpper.includes('BÊN LIÊN QUAN') || subTitleUpper.includes('THÔNG TIN KHÁC') || subTitleUpper.includes('GIAO DỊCH VỚI')) {
        currentSubSection = 4
      }
      continue
    }

    // 3. Nhận diện từng note cụ thể:
    // Hỗ trợ:
    // - ### 1. Tiền...
    // - ## 4. TIỀN VÀ CÁC KHOẢN... (như trong HAH)
    // - ### Thuyết minh 1: Tiền...
    const noteMatch = line.match(/^#{2,3}\s+(?:Thuyết minh\s+(\d+)[:\s]+|([A-Za-z0-9\.]+)\.?\s+)?([^\r\n]+)/i)
    if (noteMatch && !line.match(/^#+\s*PHẦN/i)) {
      finishCurrentNote()
      const rawTitle = (noteMatch[3] || '').trim()
      const rawPrefix = (noteMatch[2] || noteMatch[1] || '').trim()
      const noteNum = rawPrefix.replace(/\.$/, '')
      const title = rawTitle.replace(/^[\d\.\s]+/, '').trim()

      let semanticSec = currentSection
      if (currentSection >= 5) {
        if (currentSubSection > 0) {
          semanticSec = currentSubSection
        } else {
          const tUp = (title || rawTitle).toUpperCase()
          if (
            tUp.includes('DOANH THU') ||
            tUp.includes('GIÁ VỐN') ||
            tUp.includes('CHI PHÍ TÀI CHÍNH') ||
            tUp.includes('CHI PHÍ BÁN HÀNG') ||
            tUp.includes('CHI PHÍ QUẢN LÝ') ||
            tUp.includes('THUẾ') ||
            tUp.includes('LÃI CƠ BẢN') ||
            tUp.includes('EPS') ||
            tUp.includes('KẾT QUẢ KINH DOANH')
          ) {
            semanticSec = 3
          } else if (
            tUp.includes('TIỀN') ||
            tUp.includes('ĐẦU TƯ TÀI CHÍNH') ||
            tUp.includes('PHẢI THU') ||
            tUp.includes('HÀNG TỒN KHO') ||
            tUp.includes('TÀI SẢN') ||
            tUp.includes('CHI PHÍ TRẢ TRƯỚC') ||
            tUp.includes('PHẢI TRẢ') ||
            tUp.includes('VAY') ||
            tUp.includes('VỐN CHỦ SỞ HỮU') ||
            tUp.includes('NỢ')
          ) {
            semanticSec = 2
          } else if (tUp.includes('LƯU CHUYỂN TIỀN TỆ') || tUp.includes('BÊN LIÊN QUAN') || tUp.includes('GIAO DỊCH VỚI')) {
            semanticSec = 4
          }
        }
      }

      let noteId = 'sec-' + semanticSec + '-note-' + (noteNum || notes.length + 1)
      let nSuffix = 2
      while (usedNoteIds.has(noteId)) {
        noteId = `sec-${semanticSec}-note-${noteNum || notes.length + 1}-${nSuffix}`
        nSuffix++
      }
      usedNoteIds.add(noteId)

      currentNote = {
        id: noteId,
        sectionNumber: semanticSec,
        parentSectionNumber: currentSection,
        semanticSection: semanticSec,
        noteNumber: noteNum,
        title: title || rawTitle,
        rawTitle: line.replace(/^#{2,3}\s+/, '').trim(),
        lines: [],
      }
    } else if (currentNote) {
      currentNote.lines.push(line)
    }
  }

  finishCurrentNote()
  return notes
}
