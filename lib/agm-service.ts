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

export function extractKtplFromMarkdown(content: string, ticker = ''): { rate: number; method: string; ktplVnd: number | null; lnstVnd: number | null } | null {
  let targetText = content
  const m2Match = content.match(/##\s+MỤC\s+2[:\s]+([\s\S]*?)(?=##\s+MỤC|\$)/i)
  if (m2Match) targetText = m2Match[1]

  const part2Split = targetText.split(/###\s*2\.?\s*Kế\s*hoạch/i)
  const currentYearText = part2Split.length > 1 ? part2Split[0] : targetText
  const lines = currentYearText.split('\n')

  let lnst: number | null = null
  for (const line of lines) {
    if (!line.includes('|')) continue
    if (/^\|?\s*[\d.*-]*\s*trích/i.test(line)) continue
    if (/chưa\s*phân\s*phối\s*trên\s*bctc|lũy\s*kế|năm\s*2024|năm\s*trước|đầu\s*năm/i.test(line)) continue

    if (/lợi\s*nhuận\s*sau\s*thuế|lnst/i.test(line) && /2025|năm\s*nay|phát\s*sinh/i.test(line)) {
      const numMatches = [...line.matchAll(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\b/g)]
      if (numMatches.length > 0) {
        const vals = numMatches.map((m) => parseFloat(m[0].replace(/\./g, '').replace(',', '.'))).filter((v) => v > 100000000)
        if (vals.length > 0) {
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

  if (!lnst) {
    for (const line of lines) {
      if (!line.includes('|')) continue
      if (/^\|?\s*[\d.*-]*\s*trích/i.test(line)) continue
      if (/chưa\s*phân\s*phối\s*trên\s*bctc|lũy\s*kế|năm\s*2024|năm\s*trước|đầu\s*năm|kế\s*hoạch\s*2026/i.test(line)) continue
      if (/lợi\s*nhuận\s*sau\s*thuế|lnst/i.test(line)) {
        const numMatches = [...line.matchAll(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\b/g)]
        const vals = numMatches.map((m) => parseFloat(m[0].replace(/\./g, '').replace(',', '.'))).filter((v) => v > 100000000)
        if (vals.length > 0) {
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

  const nonShareholderRegex = /(khen\s*thưởng|phúc\s*lợi|ktpl|quỹ\s*thưởng|thưởng\s*(?:ban\s*)?điều\s*hành|thưởng\s*người\s*quản\s*lý|thưởng\s*nql|thưởng\s*bđh|thưởng\s*(?:do\s*)?(?:hoàn\s*thành|vượt)|thù\s*lao\s*hđqt|thù\s*lao\s*(?:hội\s*đồng\s*quản\s*trị|bks|ban\s*kiểm\s*soát)|thưởng\s*(?:hđqt|hội\s*đồng\s*quản\s*trị|bks|ban\s*kiểm\s*soát|tổng\s*giám\s*đốc|tgđ|kế\s*toán\s*trưởng)|công\s*tác\s*xã\s*hội|từ\s*thiện|an\s*sinh\s*xã\s*hội)/i
  const equityRegex = /(đầu\s*tư\s*phát\s*triển|dự\s*trữ\s*(bắt\s*buộc|bổ\s*sung)|dự\s*phòng\s*tài\s*chính|cổ\s*tức|chưa\s*phân\s*phối|còn\s*lại|chuyển\s*sang|năm\s*trước|tích\s*lũy|thành\s*phần|chỉ\s*tiêu|cộng\s*các\s*quỹ|trích\s*lập\s*các\s*quỹ|tổng\s*lợi\s*nhuận|tổng\s*cộng|cổ\s*phiếu\s*thưởng|thưởng\s*bằng\s*cổ\s*phiếu)/i

  function getSttLevel(stt: string, nameCol: string, line: string): number {
    if (/trong\s*đó/i.test(line)) return 99
    if (!stt || stt.trim() === '') return 99
    const clean = stt.replace(/[*_~]/g, '').trim()
    if (/^[-–—+•]/.test(clean)) return 99
    if (/^\d+$/.test(clean)) return 1
    if (/^[IVXLCDM]+$/i.test(clean)) return 1
    if (/^[A-Z]$/.test(clean)) return 1
    if (/^\d+\.\d+$/.test(clean)) return 2
    if (/^[a-z]$/.test(clean)) return 2
    if (/^\d+\.\d+\.\d+/.test(clean)) return 3
    if (/^[a-z]\d+/.test(clean)) return 3
    return 2
  }

  const items: { text: string; vnd: number | null; pct: number | null; level: number }[] = []
  const seenLines = new Set<string>()
  let activeParentLevel: number | null = null

  for (const line of lines) {
    if (!line.includes('|')) continue
    if (/kế\s*hoạch\s*2026|dự\s*kiến\s*2026/i.test(line)) continue

    const cols = line.split('|').map((c) => c.trim())
    const rawStt = cols[1] || ''
    const nameCol = cols[2] || ''
    const level = getSttLevel(rawStt, nameCol, line)

    if (activeParentLevel !== null && level <= activeParentLevel) {
      activeParentLevel = null
    }

    if (!nonShareholderRegex.test(line)) continue
    if (equityRegex.test(line)) continue

    if (activeParentLevel !== null && level > activeParentLevel) {
      continue
    }

    const cleanKey = line.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '').slice(0, 25)
    if (seenLines.has(cleanKey)) continue
    seenLines.add(cleanKey)

    const numMatches = [...line.matchAll(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\b/g)]
    const vals = numMatches.map((m) => parseFloat(m[0].replace(/\./g, '').replace(',', '.'))).filter((v) => v > 100000)

    const pctMatch = line.match(/(?:~|\s)?(\d+(?:[.,]\d+)?)\s*%\s*(?:lnst)?/i)
    let pct: number | null = null
    if (pctMatch && !/tán\s*thành/i.test(line)) {
      pct = parseFloat(pctMatch[1].replace(',', '.'))
    }

    let vnd: number | null = null
    if (vals.length > 0) {
      if (/kế\s*hoạch.*thực\s*hiện/i.test(currentYearText) && vals.length >= 2) {
        vnd = vals[1]
      } else {
        vnd = vals[vals.length - 1]
      }
    }

    if (vnd !== null || pct !== null) {
      items.push({ text: line.trim(), vnd, pct, level })
      if (level < 99) {
        activeParentLevel = level
      }
    }
  }

  let totalVnd = 0
  let totalPct = 0
  items.forEach((it) => {
    if (it.vnd) totalVnd += it.vnd
    if (it.pct) totalPct += it.pct
  })

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
    /(?:tỷ\s*lệ\s*trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)|quỹ\s*khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi)[^:\n*]{0,80}[:*]+\s*(?:có\s*trích[^*]+)?(?:\*\*)?([0-9]+(?:[.,][0-9]+)?)\s*%/i,
    /(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)[^\n]{0,120}?(?:chiếm|tương\s*đương|tương\s*ứng)\s*(?:khoảng|~)?\s*(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%/i,
    /\(\s*(?:tương\s*đương|tương\s*ứng|chiếm)\s*(?:khoảng|~)?\s*(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%\s*(?:\*\*)?\s*lnst/i,
    /(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)\s*\(\s*0?(\d+(?:[.,]\d+)?)\s*%\s*lnst\s*\)/i,
    /(?:trích|trích\s*lập)\s*(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%(?:\*\*)?\s*(?:lnst|lợi\s*nhuận\s*sau\s*thuế)[^\n]{0,80}?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i,
    /(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)[^\n]{0,50}?\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)/i,
    /trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng\s*[,/&]?\s*phúc\s*lợi|ktpl)[^\n]{0,80}?(?:trích\s*)?(?:\*\*)?(\d+(?:[.,]\d+)?)\s*%(?:\*\*)?\s*(?:lnst|lợi\s*nhuận\s*sau\s*thuế)/i,
    /trích\s*(\d+(?:[.,]\d+)?)\s*%\s*trên\s*lợi\s*nhuận\s*sau\s*thuế[^\n]{0,60}?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i,
    /quỹ\s*khen\s*thưởng[^\n]{0,40}?trích\s*(\d+(?:[.,]\d+)?)\s*%/i,
    /quỹ\s*phúc\s*lợi[^\n]{0,40}?trích\s*(\d+(?:[.,]\d+)?)\s*%/i,
  ]

  for (const pat of patterns) {
    const m = targetText.match(pat)
    if (m) {
      const val = parseFloat(m[1].replace(',', '.'))
      if (val <= 100) return { rate: val, method: 'direct_regex', ktplVnd: null, lnstVnd: lnst }
    }
  }

  if (
    /(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
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
    if (/\|\s*0\s*\|/i.test(line) || /\|\s*0\s*vnđ/i.test(line) || /\|\s*\*\*0\*\*\s*\|/i.test(line) || /\|\s*0%\s*\|/i.test(line)) {
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

