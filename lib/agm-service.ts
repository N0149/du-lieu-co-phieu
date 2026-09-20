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
  let ktplRate = agmKtpl?.ktplRate ?? null
  let ktplVnd = agmKtpl?.ktplVnd ?? null

  // Fallback: nếu chưa có trong snapshot, bóc tách trực tiếp on-the-fly từ nội dung markdown
  if (ktplRate === null && raw) {
    const extracted = extractKtplFromMarkdown(raw, sym)
    if (extracted !== null) {
      ktplRate = extracted.rate
      ktplVnd = extracted.ktplVnd ?? null
      if (agmKtplCache) {
        agmKtplCache[sym] = { ticker: sym, year: selectedYear, ktplRate, ktplVnd }
      }
    }
  }

  return {
    ticker: sym,
    year: selectedYear,
    title,
    subtitle,
    hasReport: true,
    sections,
    availableYears,
    ktplRate,
    ktplVnd,
    stats: {
      hasQa,
      hasCapitalIncrease,
      tableCount,
    },
  }
}

function parseThousand(str: string): number | null {
  if (!str) return null
  const clean = str.replace(/[*_~()$\\]/g, '').trim()
  if (clean === '' || clean === '-') return null
  const commas = (clean.match(/,/g) || []).length
  const dots = (clean.match(/\./g) || []).length
  if (commas > 1 && dots <= 1) return parseFloat(clean.replace(/,/g, ''))
  return parseFloat(clean.replace(/\./g, '').replace(',', '.'))
}

function splitPlan2026(targetText: string): string {
  const headingRegex = /\n#{3,4}\s+(?![^\n]*\b2\.1\b)(?![^\n]*\b2025\b)[^\n]*(?:kế\s*hoạch|dự\s*kiến|bảng\s*2)[^\n]*2026[^\n]*/gi
  const match = headingRegex.exec(targetText)
  if (match) {
    return targetText.slice(0, match.index)
  }
  return targetText
}

function stripFundBalanceSections(targetText: string): string {
  return targetText.replace(
    /\n#{3,4}\s+(?:bảng\s*)?(?:tình\s*hình\s*(?:số\s*dư\s*)?(?:các\s*)?quỹ|số\s*dư\s*(?:các\s*)?quỹ|biến\s*động\s*(?:các\s*)?quỹ)[\s\S]*?(?=\n#{2,4}\s+|$)/gi,
    ''
  )
}

export function extractKtplFromMarkdown(content: string, ticker = ''): { rate: number; method: string; ktplVnd: number | null; lnstVnd: number | null } | null {
  let targetText = content
  // Lookahead fix: (?=##\s+MỤC|$)
  const m2Match = content.match(/##\s+MỤC\s+2[:\s]+([\s\S]*?)(?=##\s+MỤC|$)/i)
  if (m2Match) targetText = m2Match[1]

  // Split out 2026 plan tables and fund balance movement tables
  let currentYearText = splitPlan2026(targetText)
  currentYearText = stripFundBalanceSections(currentYearText)
  const lines = currentYearText.split('\n')

  // Detect unit
  const isTrieuDong = /triệu\s*đồng|trđ|\(trđ\)/i.test(currentYearText)
  const isTyDong = /tỷ\s*đồng|\(tỷ\s*đồng\)/i.test(currentYearText)
  const minVal = isTyDong ? 0.001 : isTrieuDong ? 0.5 : 100000
  const minLnstVal = isTyDong ? 0.1 : isTrieuDong ? 50 : 100000000

  // Track header columns
  let headerCols: string[] | null = null
  let thucHienColIdx = -1

  for (const line of lines) {
    if (!line.includes('|')) continue
    const cols = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
    if (cols.some((c) => /chỉ\s*tiêu|nội\s*dung|thuyết\s*minh|khoản\s*mục/i.test(c))) {
      headerCols = cols
      thucHienColIdx = cols.findIndex((c) => /thực\s*hiện/i.test(c) && !/tỷ\s*lệ|%/i.test(c))
      break
    }
  }

  function isNoteCol(idx: number, cellText: string): boolean {
    if (headerCols && headerCols[idx] && /ghi\s*chú|diễn\s*giải|căn\s*cứ|quy\s*định|giải\s*trình/i.test(headerCols[idx])) return true
    if (/^trong\s*đó:|^căn\s*cứ:|^theo\s*nđ/i.test(cellText.replace(/[*_~]/g, '').trim())) return true
    return false
  }

  let lnst: number | null = null
  for (const line of lines) {
    if (!line.includes('|')) continue
    const cols = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
    if (cols.length < 2) continue

    let nameCol = cols[1] || ''
    if (cols[0] && (cols[0].length > 10 || /^(Lợi\s*nhuận|Trích|Quỹ|Doanh\s*thu|Cổ\s*tức|Tổng|Chỉ\s*tiêu|Nội\s*dung)/i.test(cols[0].replace(/[*_~]/g, '').trim()))) {
      nameCol = cols[0]
    }

    if (/^[\d.*-]*\s*trích|^[\d.*-]*\s*quỹ|chi\s*trả\s*cổ\s*tức|chia\s*cổ\s*tức/i.test(nameCol)) continue
    if (/chưa\s*phân\s*phối\s*trên\s*bctc|năm\s*2024|năm\s*trước|đầu\s*năm/i.test(line)) continue

    if (/lợi\s*nhuận\s*sau\s*thuế|lnst/i.test(nameCol) && /2025|năm\s*nay|phát\s*sinh|thực\s*hiện/i.test(line)) {
      const vals: number[] = []
      for (let i = 0; i < cols.length; i++) {
        if (cols[i] === nameCol || isNoteCol(i, cols[i])) continue
        const c = cols[i]
        if (/^(triệu\s*đồng|đồng|tỷ\s*đồng|vnđ|%|đvt)$/i.test(c.replace(/[*_~]/g, '').trim())) continue
        const numMatches = [...c.matchAll(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/g)]
        for (const m of numMatches) {
          const v = parseThousand(m[0])
          if (v !== null && v > minLnstVal && !c.includes('%')) vals.push(v)
        }
      }
      if (vals.length > 0) {
        if (thucHienColIdx !== -1 && cols[thucHienColIdx]) {
          const m = cols[thucHienColIdx].match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/)
          if (m) {
            const v = parseThousand(m[0])
            if (v && v > minLnstVal) {
              lnst = v
              break
            }
          }
        }
        if (/kế\s*hoạch.*thực\s*hiện/i.test(currentYearText) && vals.length >= 2) {
          lnst = vals[1]
        } else {
          lnst = vals[vals.length - 1]
        }
        break
      }
    }
  }

  if (!lnst) {
    for (const line of lines) {
      if (!line.includes('|')) continue
      const cols = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      if (cols.length < 2) continue

      let nameCol = cols[1] || ''
      if (cols[0] && (cols[0].length > 10 || /^(Lợi\s*nhuận|Trích|Quỹ|Doanh\s*thu|Cổ\s*tức|Tổng|Chỉ\s*tiêu|Nội\s*dung)/i.test(cols[0].replace(/[*_~]/g, '').trim()))) {
        nameCol = cols[0]
      }

      if (/^[\d.*-]*\s*trích|^[\d.*-]*\s*quỹ|chi\s*trả\s*cổ\s*tức|chia\s*cổ\s*tức/i.test(nameCol)) continue
      if (/chưa\s*phân\s*phối\s*trên\s*bctc|năm\s*2024|năm\s*trước|đầu\s*năm|kế\s*hoạch\s*2026/i.test(line)) continue

      if (/lợi\s*nhuận\s*sau\s*thuế|lnst|lợi\s*nhuận\s*được\s*phân\s*phối|lợi\s*nhuận\s*(?:thực\s*hiện\s*)?phân\s*phối|lợi\s*nhuận\s*sử\s*dụng\s*để\s*phân\s*phối|tổng\s*lợi\s*nhuận\s*phân\s*phối/i.test(nameCol)) {
        const vals: number[] = []
        for (let i = 0; i < cols.length; i++) {
          if (cols[i] === nameCol || isNoteCol(i, cols[i])) continue
          const c = cols[i]
          if (/^(triệu\s*đồng|đồng|tỷ\s*đồng|vnđ|%|đvt)$/i.test(c.replace(/[*_~]/g, '').trim())) continue
          const numMatches = [...c.matchAll(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/g)]
          for (const m of numMatches) {
            const v = parseThousand(m[0])
            if (v !== null && v > minLnstVal && !c.includes('%')) vals.push(v)
          }
        }
        if (vals.length > 0) {
          if (thucHienColIdx !== -1 && cols[thucHienColIdx]) {
            const m = cols[thucHienColIdx].match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/)
            if (m) {
              const v = parseThousand(m[0])
              if (v && v > minLnstVal) {
                lnst = v
                break
              }
            }
          }
          if (/kế\s*hoạch.*thực\s*hiện/i.test(currentYearText) && vals.length >= 2) {
            lnst = vals[1]
          } else {
            lnst = vals[vals.length - 1]
          }
          break
        }
      }
    }
  }

  // Fallback LNST if still null
  if (!lnst) {
    for (const line of lines) {
      if (!line.includes('|')) continue
      const cols = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      if (cols.length < 2) continue
      let nameCol = cols[1] || ''
      if (cols[0] && (cols[0].length > 10 || /^(Lợi\s*nhuận|Trích|Quỹ|Doanh\s*thu|Cổ\s*tức|Tổng|Chỉ\s*tiêu|Nội\s*dung)/i.test(cols[0].replace(/[*_~]/g, '').trim()))) {
        nameCol = cols[0]
      }
      if (/lợi\s*nhuận\s*sau\s*thuế\s*chưa\s*phân\s*phối\s*lũy\s*kế|lợi\s*nhuận\s*sau\s*thuế\s*dùng\s*để\s*trích/i.test(nameCol)) {
        for (let i = 0; i < cols.length; i++) {
          if (cols[i] === nameCol || isNoteCol(i, cols[i])) continue
          const c = cols[i]
          const numMatches = [...c.matchAll(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/g)]
          for (const m of numMatches) {
            const v = parseThousand(m[0])
            if (v !== null && v > minLnstVal && !c.includes('%')) {
              lnst = v
              break
            }
          }
          if (lnst) break
        }
        if (lnst) break
      }
    }
  }

  const nonShareholderRegex = /(khen\s*thưởng|phúc\s*lợi|ktpl|quỹ\s*thưởng|trích\s*thưởng|thưởng\s*(?:cho\s*)?(?:ban\s*)?(?:bgđ|bđh|hđqt|bks|ubkt|nql|tgđ|giám\s*đốc|điều\s*hành|quản\s*lý|kiểm\s*soát|cán\s*bộ|nhân\s*viên|lao\s*động|chủ\s*chốt|người\s*quản\s*lý)|thưởng\s*(?:do\s*)?(?:hoàn\s*thành|vượt|hiệu\s*quả)|thưởng\s*(?:hội\s*đồng\s*quản\s*trị|ban\s*kiểm\s*soát|ban\s*giám\s*đốc|ban\s*điều\s*hành|thành\s*viên)|thù\s*lao\s*hđqt|thù\s*lao\s*(?:hội\s*đồng\s*quản\s*trị|bks|ban\s*kiểm\s*soát|ubkt)|công\s*tác\s*xã\s*hội|từ\s*thiện|an\s*sinh\s*xã\s*hội)/i
  const pureEquityRegex = /^(?:trích\s*(?:lập\s*)?)?(quỹ\s*đầu\s*tư\s*phát\s*triển|quỹ\s*đtpt|quỹ\s*dự\s*trữ|quỹ\s*dự\s*phòng|cổ\s*tức|cổ\s*phiếu\s*thưởng|thưởng\s*bằng\s*cổ\s*phiếu|lợi\s*nhuận\s*(?:còn\s*lại|chưa\s*(?:phân\s*phối|chia)|chuyển\s*sang|để\s*lại|năm\s*trước)|lnst\s*còn\s*lại)/i

  function getSttLevel(stt: string, nameCol: string, line: string): number {
    if (/trong\s*đó/i.test(line) || /trong\s*đó/i.test(nameCol)) return 99
    const clean = (stt || '').replace(/[*_~]/g, '').trim()
    const cleanName = (nameCol || '').replace(/[*_~]/g, '').trim()
    if (/^\+/.test(clean) || /^\+/.test(cleanName)) return 4
    if (/^[-–—•]/.test(cleanName)) return 3
    if (!clean || clean === '') return 99
    if (/^\d+$/.test(clean) || /^[IVXLCDM]+$/i.test(clean) || /^[A-Z]$/.test(clean)) return 1
    if (/^\d+\.\d+$/.test(clean) || /^[a-z]$/.test(clean)) return 2
    if (/^[-–—•]/.test(clean)) return 2
    if (/^\d+\.\d+\.\d+/.test(clean)) return 3
    if (/^[a-z]\d+/.test(clean)) return 3
    return 2
  }

  const items: { text: string; vnd: number | null; pct: number | null; level: number }[] = []
  const seenLines = new Set<string>()
  let activeParentLevel: number | null = null
  let activeCombinedLevel: number | null = null
  let hasExplicitZeroRow = false

  for (const line of lines) {
    if (!line.includes('|')) continue
    if (/kế\s*hoạch\s*2026|dự\s*kiến\s*2026/i.test(line)) continue

    const cols = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
    if (cols.length < 2) continue

    let rawStt = cols[0] || ''
    let nameCol = cols[1] || ''
    let valueColumns = cols.slice(2)

    if (cols[0] && (cols[0].length > 10 || /^(Lợi\s*nhuận|Trích|Quỹ|Doanh\s*thu|Cổ\s*tức|Tổng|Chỉ\s*tiêu|Nội\s*dung)/i.test(cols[0].replace(/[*_~]/g, '').trim()))) {
      nameCol = cols[0]
      rawStt = ''
      valueColumns = cols.slice(1)
    }

    const level = getSttLevel(rawStt, nameCol, line)

    if (activeParentLevel !== null && level <= activeParentLevel) {
      activeParentLevel = null
    }
    const cleanName = nameCol.replace(/[*_~]/g, '').trim()
    if (activeCombinedLevel !== null && level <= activeCombinedLevel && !/^[-–—•+]/.test(cleanName)) {
      activeCombinedLevel = null
    }

    if (!nonShareholderRegex.test(cleanName) && /lợi\s*nhuận\s*sau\s*thuế|lnst|doanh\s*thu/i.test(cleanName)) continue

    if (!nonShareholderRegex.test(cleanName)) {
      if (!nonShareholderRegex.test(line) || pureEquityRegex.test(cleanName)) continue
    } else {
      if (pureEquityRegex.test(cleanName)) continue
    }

    if (activeParentLevel !== null && level > activeParentLevel) {
      continue
    }
    if (activeCombinedLevel !== null) {
      const isSubOfCombined = level > activeCombinedLevel ||
                              /^[-–—•+]/.test(cleanName) ||
                              /^[-–—•+]/.test(rawStt.replace(/[*_~]/g, '').trim()) ||
                              /trong\s*đó/i.test(line) ||
                              /%\s*(?:quỹ\s*)?ktpl/i.test(line)
      if (isSubOfCombined) {
        continue
      }
    }

    if (/tán\s*thành|thông\s*qua|biểu\s*quyết/i.test(line) && !/lnst|lợi\s*nhuận|tháng\s*lương/i.test(line)) {
      continue
    }

    const cleanKey = line.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '').slice(0, 25)
    if (seenLines.has(cleanKey)) continue
    seenLines.add(cleanKey)

    const valueColsText = valueColumns.join(' | ')
    const isZeroRow = /(?:^|[^\d.,])0+(?:[.,]0+)?\s*%|\b0\s*(?:đồng|vnđ)|\b0\s*\(|không\s*trích|chưa\s*trích/i.test(valueColsText) ||
                      (valueColumns.length > 0 && valueColumns.every((c) => {
                        const cl = c.replace(/[*_~]/g, '').trim()
                        return cl === '0' || cl === '0,0' || cl === '0.0' || cl === '-' || /(?:^|[^\d.,])0+(?:[.,]0+)?\s*%/.test(cl)
                      }))

    if (isZeroRow) {
      hasExplicitZeroRow = true
      items.push({ text: line.trim(), vnd: 0, pct: 0, level })
      continue
    }

    const vals: number[] = []
    for (let i = 0; i < cols.length; i++) {
      if (cols[i] === nameCol || isNoteCol(i, cols[i])) continue
      const c = cols[i]
      if (/^(triệu\s*đồng|đồng|tỷ\s*đồng|vnđ|%|đvt)$/i.test(c.replace(/[*_~]/g, '').trim())) continue
      if (/^\s*\d+\s*tháng/i.test(c.replace(/[*_~]/g, '').trim())) continue

      const numMatches = [...c.matchAll(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/g)]
      for (const m of numMatches) {
        const idx = c.indexOf(m[0])
        const after = c.slice(idx + m[0].length, idx + m[0].length + 10)
        if (/^\s*tháng/i.test(after)) continue

        const val = parseThousand(m[0])
        if (val !== null && val >= minVal) {
          if (c.includes('%') && val <= 100 && !c.toLowerCase().includes('tỷ') && !c.toLowerCase().includes('triệu')) {
            continue
          }
          vals.push(val)
        }
      }
    }

    const pctMatch = valueColsText.match(/(?:~|\s)?([*_~]*\d+(?:[.,]\d+)?)[*_~]*\s*%/i)
    let pct: number | null = null
    if (pctMatch && !/tán\s*thành|thông\s*qua|biểu\s*quyết/i.test(valueColsText)) {
      const p = parseThousand(pctMatch[1])
      if (p !== null && p <= 100) pct = p
    }

    let vnd: number | null = null
    if (vals.length > 0) {
      if (thucHienColIdx !== -1 && cols[thucHienColIdx]) {
        const m = cols[thucHienColIdx].match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\b/)
        if (m) {
          const v = parseThousand(m[0])
          if (v && v >= minVal) vnd = v
        }
      }
      if (vnd === null) {
        if (/kế\s*hoạch.*thực\s*hiện/i.test(currentYearText) && vals.length >= 2) {
          vnd = vals[1]
        } else {
          vnd = vals[vals.length - 1]
        }
      }
    }

    if (vnd !== null || pct !== null) {
      items.push({ text: line.trim(), vnd, pct, level })
      const isCombinedKtpl = /(?:khen\s*thưởng.*phúc\s*lợi|phúc\s*lợi.*khen\s*thưởng|ktpl)/i.test(cleanName)
      if (isCombinedKtpl) {
        activeCombinedLevel = level
      }
      if (level < 99) {
        activeParentLevel = level
      }
    }
  }

  let totalVnd = 0
  let totalPct = 0
  let positiveCount = 0
  items.forEach((it) => {
    if (it.vnd) {
      totalVnd += it.vnd
      positiveCount++
    }
    if (it.pct) {
      totalPct += it.pct
      positiveCount++
    }
  })

  if (positiveCount === 0 && hasExplicitZeroRow) {
    return { rate: 0, method: 'table_zero', ktplVnd: 0, lnstVnd: lnst }
  }

  if (lnst && totalVnd > 0 && totalVnd < lnst) {
    const rate = Math.round((totalVnd / lnst) * 10000) / 100
    return {
      rate,
      method: 'table_vnd_sum',
      ktplVnd: totalVnd,
      lnstVnd: lnst,
    }
  }

  if (totalPct > 0 && totalPct <= 100) {
    return {
      rate: Math.round(totalPct * 100) / 100,
      method: 'table_pct_sum',
      ktplVnd: totalVnd > 0 ? totalVnd : null,
      lnstVnd: lnst ?? null,
    }
  }

  const patterns = [
    /(?:tỷ\s*lệ\s*trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng\s*(?:[,/&\-–—]|và)?\s*phúc\s*lợi|ktpl)|quỹ\s*khen\s*thưởng\s*(?:[,/&\-–—]|và)?\s*phúc\s*lợi)[^:\n*]{0,80}[:*]+\s*(?:có\s*trích[^*]+)?(?:\*\*)?([0-9]+(?:[.,][0-9]+)?)\s*%(?:\*\*)?/i,
    /(?:khen\s*thưởng\s*(?:[,/&\-–—]|và)?\s*phúc\s*lợi|ktpl)[^\n]{0,120}?(?:chiếm|tương\s*đương|tương\s*ứng)\s*(?:khoảng|~)?\s*(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%(?:\*\*)?/i,
    /\(\s*(?:tương\s*đương|tương\s*ứng|chiếm)\s*(?:khoảng|~)?\s*(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%\s*(?:\*\*)?\s*lnst/i,
    /(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)\s*\(\s*0?(\d+(?:[.,]\d+)?)\s*%\s*lnst\s*\)/i,
    /(?:trích|trích\s*lập)\s*(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%(?:\*\*)?\s*(?:lnst|lợi\s*nhuận\s*sau\s*thuế)[^\n]{0,80}?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i,
    /(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)[^\n]{0,50}?\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)/i,
    /trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng\s*(?:[,/&\-–—]|và)?\s*phúc\s*lợi|ktpl)[^\n]{0,80}?(?:trích\s*)?(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%(?:\*\*)?\s*(?:lnst|lợi\s*nhuận\s*sau\s*thuế)/i,
    /trích\s*(\d+(?:[.,]\d+)?)\s*%\s*trên\s*lợi\s*nhuận\s*sau\s*thuế[^\n]{0,60}?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i,
    /quỹ\s*khen\s*thưởng[^\n]{0,40}?trích\s*(\d+(?:[.,]\d+)?)\s*%/i,
    /quỹ\s*phúc\s*lợi[^\n]{0,40}?trích\s*(\d+(?:[.,]\d+)?)\s*%/i,
  ]

  for (const pat of patterns) {
    const m = targetText.match(pat)
    if (m) {
      const val = parseThousand(m[1])
      if (val !== null && val <= 100) return { rate: val, method: 'direct_regex', ktplVnd: null, lnstVnd: lnst }
    }
  }

  if (
    /(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:các\s*)?(?:quỹ\s*)?(?:này|khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
    /không\s*có\s*(?:báo\s*cáo\s*)?trích\s*lập\s*(?:riêng\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
    /không\s*trích\s*(?:lập\s*)?quỹ\s*ktpl/i.test(targetText) ||
    /tỷ\s*lệ\s*trích\s*lập\s*các\s*quỹ\s*khen\s*thưởng\s*phúc\s*lợi[^\n]{0,60}?0%/i.test(targetText) ||
    /không\s*trích\s*(?:lập\s*)?(?:các\s*)?quỹ/i.test(targetText)
  ) {
    return { rate: 0, method: 'no_fund_text', ktplVnd: 0, lnstVnd: lnst }
  }

  for (const line of lines) {
    if (!line.includes('|')) continue
    if (!/khen\s*thưởng|ktpl|phúc\s*lợi/i.test(line)) continue
    if (/\|\s*0\s*\|/i.test(line) || /\|\s*0\s*vnđ/i.test(line) || /\|\s*\*\*0\*\*\s*\|/i.test(line) || /\|\s*0%\s*\|/i.test(line) || /\|\s*0%\s*\([^)]*\)\s*\|/i.test(line) || /\|\s*\*\*0%\s*\([^)]*\)\*\*\s*\|/i.test(line) || /\|\s*\*\*0%\*\*\s*\|/i.test(line) || /\|\s*0\s*\(/i.test(line)) {
      return { rate: 0, method: 'table_zero', ktplVnd: 0, lnstVnd: lnst }
    }
  }

  if (/(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(content)) {
    return { rate: 0, method: 'doc_no_fund', ktplVnd: 0, lnstVnd: null }
  }

  return null
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
  const sym = ticker.toUpperCase().trim()
  const map = getAllAgmKtpl()
  if (map[sym]) return map[sym]

  // On-the-fly extract from file if not in snapshot
  const filePath = path.join(process.cwd(), 'content', 'agm', '2026', `${sym}_ChiTiet_AGM_2026.md`)
  const extPath = path.join(EXTERNAL_DIR, `${sym}_ChiTiet_AGM_2026.md`)
  const targetFile = fs.existsSync(filePath) ? filePath : fs.existsSync(extPath) ? extPath : null
  if (targetFile) {
    try {
      const content = fs.readFileSync(targetFile, 'utf-8')
      const res = extractKtplFromMarkdown(content, sym)
      if (res) {
        const item = { ticker: sym, year: 2026, ktplRate: res.rate, ktplVnd: res.ktplVnd ?? null }
        if (agmKtplCache) agmKtplCache[sym] = item
        return item
      }
    } catch {}
  }
  return null
}

export function getAgmKtpl(ticker: string): number | null {
  const info = getAgmKtplInfo(ticker)
  return info && typeof info.ktplRate === 'number' ? info.ktplRate : null
}

