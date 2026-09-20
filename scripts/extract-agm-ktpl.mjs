import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, '..')
const AGM_DIR = path.join(ROOT_DIR, 'content', 'agm', '2026')
const OUTPUT_FILE = path.join(ROOT_DIR, 'data', 'agm_ktpl_snapshot.json')
const REPORTS_FILE = path.join(ROOT_DIR, 'data', 'reports-snapshot.json')

function parseThousand(str) {
  if (!str) return null
  const clean = str.replace(/[*_~()$\\]/g, '').trim()
  if (clean === '' || clean === '-') return null
  const commas = (clean.match(/,/g) || []).length
  const dots = (clean.match(/\./g) || []).length
  if (commas > 1 && dots <= 1) return parseFloat(clean.replace(/,/g, ''))
  return parseFloat(clean.replace(/\./g, '').replace(',', '.'))
}

function splitPlan2026(targetText) {
  const headingRegex = /\n#{3,4}\s+(?![^\n]*\b2\.1\b)(?![^\n]*\b2025\b)[^\n]*(?:kế\s*hoạch|dự\s*kiến|bảng\s*2)[^\n]*2026[^\n]*/gi
  const match = headingRegex.exec(targetText)
  if (match) {
    return targetText.slice(0, match.index)
  }
  return targetText
}

function stripFundBalanceSections(targetText) {
  return targetText.replace(
    /\n#{3,4}\s+(?:bảng\s*)?(?:tình\s*hình\s*(?:số\s*dư\s*)?(?:các\s*)?quỹ|số\s*dư\s*(?:các\s*)?quỹ|biến\s*động\s*(?:các\s*)?quỹ)[\s\S]*?(?=\n#{2,4}\s+|$)/gi,
    ''
  )
}

export function extractKtplFromMarkdown(content, ticker = '') {
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
  let headerCols = null
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

  function isNoteCol(idx, cellText) {
    if (headerCols && headerCols[idx] && /ghi\s*chú|diễn\s*giải|căn\s*cứ|quy\s*định|giải\s*trình/i.test(headerCols[idx])) return true
    if (/^trong\s*đó:|^căn\s*cứ:|^theo\s*nđ/i.test(cellText.replace(/[*_~]/g, '').trim())) return true
    return false
  }

  let lnst = null
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
      const vals = []
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
        const vals = []
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

  function getSttLevel(stt, nameCol, line) {
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

  const items = []
  const seenLines = new Set()
  let activeParentLevel = null
  let activeCombinedLevel = null
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

    const vals = []
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
    let pct = null
    if (pctMatch && !/tán\s*thành|thông\s*qua|biểu\s*quyết/i.test(valueColsText)) {
      const p = parseThousand(pctMatch[1])
      if (p !== null && p <= 100) pct = p
    }

    let vnd = null
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
    return { rate: 0, method: 'table_zero', ktplVnd: 0, lnstVnd: lnst, itemCount: items.length }
  }

  if (lnst && totalVnd > 0 && totalVnd < lnst) {
    const rate = Math.round((totalVnd / lnst) * 10000) / 100
    return {
      rate,
      method: 'table_vnd_sum',
      ktplVnd: totalVnd,
      lnstVnd: lnst,
      itemCount: items.length,
    }
  }

  if (totalPct > 0 && totalPct <= 100) {
    return {
      rate: Math.round(totalPct * 100) / 100,
      method: 'table_pct_sum',
      ktplVnd: totalVnd > 0 ? totalVnd : null,
      lnstVnd: lnst ?? null,
      itemCount: items.length,
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
      if (val !== null && val <= 100) return { rate: val, method: 'direct_regex', ktplVnd: null, lnstVnd: lnst, itemCount: 1 }
    }
  }

  if (
    /(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:các\s*)?(?:quỹ\s*)?(?:này|khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
    /không\s*có\s*(?:báo\s*cáo\s*)?trích\s*lập\s*(?:riêng\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
    /không\s*trích\s*(?:lập\s*)?quỹ\s*ktpl/i.test(targetText) ||
    /tỷ\s*lệ\s*trích\s*lập\s*các\s*quỹ\s*khen\s*thưởng\s*phúc\s*lợi[^\n]{0,60}?0%/i.test(targetText) ||
    /không\s*trích\s*(?:lập\s*)?(?:các\s*)?quỹ/i.test(targetText)
  ) {
    return { rate: 0, method: 'no_fund_text', ktplVnd: 0, lnstVnd: lnst, itemCount: 1 }
  }

  for (const line of lines) {
    if (!line.includes('|')) continue
    if (!/khen\s*thưởng|ktpl|phúc\s*lợi/i.test(line)) continue
    if (/\|\s*0\s*\|/i.test(line) || /\|\s*0\s*vnđ/i.test(line) || /\|\s*\*\*0\*\*\s*\|/i.test(line) || /\|\s*0%\s*\|/i.test(line) || /\|\s*0%\s*\([^)]*\)\s*\|/i.test(line) || /\|\s*\*\*0%\s*\([^)]*\)\*\*\s*\|/i.test(line) || /\|\s*\*\*0%\*\*\s*\|/i.test(line) || /\|\s*0\s*\(/i.test(line)) {
      return { rate: 0, method: 'table_zero', ktplVnd: 0, lnstVnd: lnst, itemCount: 1 }
    }
  }

  if (/(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(content)) {
    return { rate: 0, method: 'doc_no_fund', ktplVnd: 0, lnstVnd: null, itemCount: 1 }
  }

  return null
}

export function generateAgmKtplSnapshot() {
  if (!fs.existsSync(AGM_DIR)) {
    console.error(`❌ Không tìm thấy thư mục AGM: ${AGM_DIR}`)
    return
  }

  const files = fs.readdirSync(AGM_DIR).filter((f) => f.endsWith('.md'))
  const snapshot = {}
  let extractedCount = 0

  for (const file of files) {
    const sym = file.split('_')[0].toUpperCase().trim()
    const content = fs.readFileSync(path.join(AGM_DIR, file), 'utf-8')
    const res = extractKtplFromMarkdown(content, sym)

    if (res !== null) {
      snapshot[sym] = {
        ticker: sym,
        year: 2026,
        ktplRate: res.rate,
        ktplVnd: res.ktplVnd ?? null,
        lnstVnd: res.lnstVnd ?? null,
        method: res.method,
      }
      extractedCount++
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(snapshot, null, 2), 'utf-8')
  console.log(`✅ Đã bóc tách thành công KTPL cho ${extractedCount}/${files.length} mã vào ${OUTPUT_FILE}`)

  // Cập nhật đồng bộ vào reports-snapshot.json nếu có
  if (fs.existsSync(REPORTS_FILE)) {
    try {
      const reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf-8'))
      let updatedRepCount = 0
      for (const rep of reports) {
        const sym = (rep.ticker || '').toUpperCase().trim()
        if (snapshot[sym] && snapshot[sym].ktplRate != null) {
          if (rep.bonusWelfareRate !== snapshot[sym].ktplRate) {
            rep.bonusWelfareRate = snapshot[sym].ktplRate
            updatedRepCount++
          }
        }
      }
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8')
      console.log(`✅ Đã cập nhật bổ sung bonusWelfareRate cho ${updatedRepCount} báo cáo trong ${REPORTS_FILE}`)
    } catch (err) {
      console.warn('Cảnh báo khi cập nhật reports-snapshot.json:', err)
    }
  }

  return snapshot
}

// Chạy trực tiếp nếu là CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAgmKtplSnapshot()
}
