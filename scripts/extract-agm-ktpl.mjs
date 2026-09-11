import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, '..')
const AGM_DIR = path.join(ROOT_DIR, 'content', 'agm', '2026')
const OUTPUT_FILE = path.join(ROOT_DIR, 'data', 'agm_ktpl_snapshot.json')
const REPORTS_FILE = path.join(ROOT_DIR, 'data', 'reports-snapshot.json')

export function extractKtplFromMarkdown(content, ticker = '') {
  let targetText = content
  const m2Match = content.match(/##\s+MỤC\s+2[:\s]+([\s\S]*?)(?=##\s+MỤC|\$)/i)
  if (m2Match) targetText = m2Match[1]

  // Tách lấy bảng phân phối lợi nhuận thực hiện của năm vừa qua (bỏ phần kế hoạch năm 2026)
  const part2Split = targetText.split(/###\s*2\.?\s*Kế\s*hoạch/i)
  const currentYearText = part2Split.length > 1 ? part2Split[0] : targetText
  const lines = currentYearText.split('\n')

  // 1. Tìm LNST thực hiện năm gần nhất (ưu tiên 2025 hoặc năm phát sinh)
  let lnst = null
  for (const line of lines) {
    if (!line.includes('|')) continue
    if (/^\|?\s*[\d.*-]*\s*trích/i.test(line)) continue // Bỏ dòng trích lập
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

  // Fallback tìm LNST nếu chưa thấy dòng gắn nhãn 2025
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

  // 2. Tìm tất cả các khoản trích lập KHÔNG THUỘC VỀ CỔ ĐÔNG (KTPL, Thưởng BĐH, Thù lao HĐQT/BKS, Từ thiện...)
  const nonShareholderRegex = /(khen\s*thưởng|phúc\s*lợi|ktpl|thưởng\s*(?:ban\s*)?điều\s*hành|thưởng\s*người\s*quản\s*lý|thưởng\s*nql|thưởng\s*bđh|thù\s*lao\s*hđqt|thù\s*lao\s*(?:hội\s*đồng\s*quản\s*trị|bks|ban\s*kiểm\s*soát)|thưởng\s*(?:hđqt|hội\s*đồng\s*quản\s*trị)|công\s*tác\s*xã\s*hội|từ\s*thiện)/i
  const equityRegex = /(đầu\s*tư\s*phát\s*triển|dự\s*trữ\s*(bắt\s*buộc|bổ\s*sung)|dự\s*phòng\s*tài\s*chính|cổ\s*tức|chưa\s*phân\s*phối|còn\s*lại|chuyển\s*sang|năm\s*trước|tích\s*lũy|thành\s*phần|chỉ\s*tiêu|cộng\s*các\s*quỹ|trích\s*lập\s*các\s*quỹ|tổng\s*lợi\s*nhuận|tổng\s*cộng)/i

  const items = []
  const seenLines = new Set()

  for (const line of lines) {
    if (!line.includes('|')) continue
    if (/kế\s*hoạch\s*2026|dự\s*kiến\s*2026/i.test(line)) continue
    if (!nonShareholderRegex.test(line)) continue
    if (equityRegex.test(line)) continue

    const cleanKey = line.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '').slice(0, 25)
    if (seenLines.has(cleanKey)) continue
    seenLines.add(cleanKey)

    const isTrongDo = /trong\s*đó/i.test(line)
    const numMatches = [...line.matchAll(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\b/g)]
    const vals = numMatches.map((m) => parseFloat(m[0].replace(/\./g, '').replace(',', '.'))).filter((v) => v > 100000)

    const pctMatch = line.match(/(?:~|\s)?(\d+(?:[.,]\d+)?)\s*%\s*(?:lnst)?/i)
    let pct = null
    if (pctMatch && !/tán\s*thành/i.test(line)) {
      pct = parseFloat(pctMatch[1].replace(',', '.'))
    }

    let vnd = null
    if (vals.length > 0) {
      if (/kế\s*hoạch.*thực\s*hiện/i.test(currentYearText) && vals.length >= 2) {
        vnd = vals[1]
      } else {
        vnd = vals[vals.length - 1]
      }
    }

    if (vnd !== null || pct !== null) {
      items.push({ text: line.trim(), vnd, pct, isTrongDo })
    }
  }

  // Nếu có dòng tổng và các dòng 'trong đó', ưu tiên dùng dòng cha
  const parentItems = items.filter((it) => !it.isTrongDo)
  const finalItems = parentItems.length > 0 ? parentItems : items

  let totalVnd = 0
  let totalPct = 0
  finalItems.forEach((it) => {
    if (it.vnd) totalVnd += it.vnd
    if (it.pct) totalPct += it.pct
  })

  // 3. Tính toán tỷ lệ phần trăm
  if (lnst && totalVnd > 0 && totalVnd < lnst) {
    const rate = Math.round((totalVnd / lnst) * 10000) / 100
    return {
      rate,
      method: 'table_vnd_sum',
      ktplVnd: totalVnd,
      lnstVnd: lnst,
      itemCount: finalItems.length,
    }
  }

  if (totalPct > 0 && totalPct <= 100) {
    return {
      rate: Math.round(totalPct * 100) / 100,
      method: 'table_pct_sum',
      ktplVnd: totalVnd > 0 ? totalVnd : null,
      lnstVnd: lnst ?? null,
      itemCount: finalItems.length,
    }
  }

  // 4. Fallback: Direct patterns in text / bullet points / notes
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

  // Check no fund in text
  if (
    /(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
    /không\s*có\s*(?:báo\s*cáo\s*)?trích\s*lập\s*(?:riêng\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(targetText) ||
    /không\s*trích\s*(?:lập\s*)?quỹ\s*ktpl/i.test(targetText) ||
    /tỷ\s*lệ\s*trích\s*lập\s*các\s*quỹ\s*khen\s*thưởng\s*phúc\s*lợi[^\n]{0,60}?0%/i.test(targetText) ||
    /không\s*trích\s*(?:lập\s*)?(?:các\s*)?quỹ/i.test(targetText)
  ) {
    return { rate: 0, method: 'no_fund_text', ktplVnd: 0, lnstVnd: lnst }
  }

  // Check 0 in table
  for (const line of lines) {
    if (!line.includes('|')) continue
    if (!/khen\s*thưởng|ktpl|phúc\s*lợi/i.test(line)) continue
    if (/\|\s*0\s*\|/i.test(line) || /\|\s*0\s*vnđ/i.test(line) || /\|\s*\*\*0\*\*\s*\|/i.test(line) || /\|\s*0%\s*\|/i.test(line)) {
      return { rate: 0, method: 'table_zero', ktplVnd: 0, lnstVnd: lnst }
    }
  }

  // 5. Fallback check entire doc
  if (/(?:không|chưa)\s*(?:thực\s*hiện\s*)?trích\s*(?:lập\s*)?(?:quỹ\s*)?(?:khen\s*thưởng|phúc\s*lợi|ktpl)/i.test(content)) {
    return { rate: 0, method: 'doc_no_fund', ktplVnd: 0, lnstVnd: null }
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
