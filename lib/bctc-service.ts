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
  noteNumber: string
  title: string
  rawTitle: string
  contentHtml: string
  rawMarkdown: string
  tableCount: number
}

export interface BctcReportData {
  ticker: string
  reportType: 'HopNhat' | 'CongTyMe'
  reportTypeLabel: string
  title: string
  hasReport: boolean
  sections: BctcSection[]
  notes?: BctcNoteItem[]
  availableTypes: ('HopNhat' | 'CongTyMe')[]
  tableCount: number
}

const SECTION_SHORT_TITLES: Record<number, string> = {
  0: '0. Giải trình KQKD',
  1: '1. Thông tin chung',
  2: '2. Thuyết minh CĐKT',
  3: '3. Thuyết minh KQKD',
  4: '4. Bên liên quan & Khác',
}

function formatMarkdownToHtml(markdown: string): string {
  let html = marked.parse(markdown, { gfm: true, breaks: true }) as string

  // Xử lý bảng biểu: Tự động phân loại cột số liệu vs cột văn bản
  html = html.replace(/<table>([\s\S]*?)<\/table>/gi, (match, tableInner) => {
    const theadMatch = tableInner.match(/<thead>([\s\S]*?)<\/thead>/i)
    const tbodyMatch = tableInner.match(/<tbody>([\s\S]*?)<\/tbody>/i)
    const numRegex = /^[\s\d.,()%\-–—+*]+$/

    // Phát hiện cột nào là cột số liệu dựa vào dữ liệu trong tbody
    const colIsNumeric: boolean[] = []
    if (tbodyMatch) {
      const rows = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      rows.forEach((r: string) => {
        const cells = r.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []
        cells.forEach((c: string, colIdx: number) => {
          const rawText = c.replace(/<[^>]+>/g, '').trim()
          if (rawText.length > 0) {
            const isNum = numRegex.test(rawText)
            if (colIsNumeric[colIdx] === undefined) {
              colIsNumeric[colIdx] = isNum
            } else if (!isNum) {
              colIsNumeric[colIdx] = false
            }
          }
        })
      })
    }

    let newTable = tableInner

    // Gắn class agm-th-num hoặc agm-th-text cho thead
    if (theadMatch) {
      let colIdx = 0
      const newTheadContent = theadMatch[1].replace(/<th([^>]*)>([\s\S]*?)<\/th>/gi, (_m: string, attrs: string, content: string) => {
        const isNumCol = colIsNumeric[colIdx] === true
        colIdx++
        const cls = isNumCol ? 'agm-th-num' : 'agm-th-text'
        return `<th${attrs} class="${cls}">${content}</th>`
      })
      newTable = newTable.replace(theadMatch[1], newTheadContent)
    }

    // Gắn class agm-td-num hoặc agm-td-text cho tbody
    if (tbodyMatch) {
      const newTbodyContent = tbodyMatch[1].replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi, (_trMatch: string, trAttrs: string, trContent: string) => {
        let colIdx = 0
        const newTrContent = trContent.replace(/<td([^>]*)>([\s\S]*?)<\/td>/gi, (_tdMatch: string, tdAttrs: string, tdContent: string) => {
          const rawText = tdContent.replace(/<[^>]+>/g, '').trim()
          const isNum = rawText.length > 0 && numRegex.test(rawText)
          const isNumCol = colIsNumeric[colIdx] === true
          colIdx++
          const cls = isNum || isNumCol ? 'agm-td-num' : 'agm-td-text'
          return `<td${tdAttrs} class="${cls}">${tdContent}</td>`
        })
        return `<tr${trAttrs}>${newTrContent}</tr>`
      })
      newTable = newTable.replace(tbodyMatch[1], newTbodyContent)
    }

    return `<div class="agm-table-wrapper overflow-x-auto rounded-xl border border-border/80 my-4 shadow-2xs"><table>${newTable}</table></div>`
  })

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

let _cachedBctcTickers: { list: string[]; time: number } | null = null

export function getAvailableBctcTickers(): string[] {
  const now = Date.now()
  if (_cachedBctcTickers && now - _cachedBctcTickers.time < 60000) {
    return _cachedBctcTickers.list
  }

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

  const result = Array.from(tickerSet).sort((a, b) => a.localeCompare(b))
  _cachedBctcTickers = { list: result, time: now }
  return result
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

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : raw.length
    const sectionRaw = raw.slice(current.index, nextIndex)

    const firstLineBreak = sectionRaw.indexOf('\n')
    const bodyMarkdown = firstLineBreak !== -1 ? sectionRaw.slice(firstLineBreak + 1).trim() : ''
    const contentHtml = formatMarkdownToHtml(bodyMarkdown)
    const secTableCount = (contentHtml.match(/<table/gi) || []).length

    sections.push({
      id: `phan-${current.number}`,
      number: current.number,
      title: `PHẦN ${current.number}: ${current.title}`,
      shortTitle: SECTION_SHORT_TITLES[current.number] || `Phần ${current.number}`,
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
  let currentSection = 0
  let currentNote: {
    id: string
    sectionNumber: number
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
    const secMatch = line.match(/^#{1,4}\s*(?:##)?\s*PHẦN\s+(\d+)[:\s]+([^\r\n]+)/i)
    if (secMatch) {
      finishCurrentNote()
      currentSection = parseInt(secMatch[1], 10)
      continue
    }

    const noteMatch = line.match(/^#{2,3}\s+(?:Thuyết minh\s+(\d+)[:\s]+|(\d+)[\.\s]+)?([^\r\n]+)/i)
    if (noteMatch && !line.match(/^#+\s*PHẦN/i)) {
      finishCurrentNote()
      const noteNum = noteMatch[1] || noteMatch[2] || ''
      const rawTitle = (noteMatch[3] || '').trim()
      const title = rawTitle.replace(/^[\d\.\s]+/, '').trim()
      currentNote = {
        id: `sec-${currentSection}-note-${noteNum || notes.length + 1}`,
        sectionNumber: currentSection,
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

