import fs from 'node:fs'
import path from 'node:path'
import { getStockByTicker, getLocalCoreCard } from '@/lib/longlivestock'
import { getStock, upside, marginOfSafety } from '@/lib/data'
import { getLocalFinancialStatements } from '@/lib/financial-statements-db'
import { getBctcReport } from '@/lib/bctc-service'
import { getAgmReport } from '@/lib/agm-service'
import { getDisclosuresBySymbol } from '@/lib/disclosures'
import { getBusinessPlan } from '@/lib/business-plan-db'
import { fmtBillion, fmtNum, fmtPct, fmtPrice } from '@/lib/format'

export interface AiBundleResult {
  symbol: string
  companyName: string
  exchange: string
  sector: string
  updatedDate: string
  markdownContent: string
  compactPrompt: string
  pdfLinks: Array<{
    title: string
    docType: string
    publishedAt: string
    url: string
  }>
  metrics: {
    price?: number
    rnav?: number
    pe?: number
    pb?: number
    dividendYield?: number
    marketCap?: number
  }
}

/** Chuẩn hóa số tiền về đơn vị Tỷ VNĐ */
function toBillion(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—'
  // Nếu số quá lớn (> 100.000.000), đang ở đơn vị Đồng
  if (Math.abs(val) > 100_000_000) {
    const bil = val / 1_000_000_000
    return bil.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
  }
  return Number(val).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

/** Trích xuất bảng tóm tắt BCTC (KQKD, CĐKT, LCTT) các kỳ gần nhất */
function formatFinancialStatementTables(symbol: string): {
  annualKqkdTable: string
  annualCdktTable: string
  annualLcttTable: string
  quarterKqkdTable: string
} {
  const annual = getLocalFinancialStatements(symbol, 'annual')
  const quarter = getLocalFinancialStatements(symbol, 'quarter')

  // 1. Tóm tắt Báo cáo Kết Quả Kinh Doanh Hàng Năm (3-4 năm gần nhất)
  let annualKqkdTable = ''
  if (annual && annual.fiscalDates && annual.fiscalDates.length > 0) {
    const dates = annual.fiscalDates.slice(-4)
    const dateHeaders = dates.map((d) => d.substring(0, 4))
    const startIdx = annual.fiscalDates.length - dates.length

    const targetKqkdKeywords = [
      { key: 'Doanh thu thuần', pattern: /doanh thu thuần|doanh thu bán hàng/i },
      { key: 'Lợi nhuận gộp', pattern: /lợi nhuận gộp/i },
      { key: 'Chi phí tài chính', pattern: /chi phí tài chính/i },
      { key: 'Trong đó: CP Lãi vay', pattern: /chi phí lãi vay/i },
      { key: 'Chi phí bán hàng', pattern: /chi phí bán hàng/i },
      { key: 'Chi phí QLDN', pattern: /quản lý doanh nghiệp/i },
      { key: 'Lợi nhuận thuần từ HĐKD', pattern: /thuần từ hoạt động kinh doanh/i },
      { key: 'LN trước thuế (LNTT)', pattern: /lợi nhuận trước thuế/i },
      { key: 'LN sau thuế (LNST)', pattern: /lợi nhuận sau thuế thu nhập|lợi nhuận sau thuế của/i },
      { key: 'LNST Cổ đông Cty Mẹ', pattern: /cổ đông công ty mẹ|cổ đông mẹ/i },
    ]

    const rows: string[] = []
    rows.push(`| Chỉ tiêu KQKD (Tỷ VNĐ) | ${dateHeaders.join(' | ')} |`)
    rows.push(`|:---|${dateHeaders.map(() => '---:').join('|')}|`)

    for (const item of targetKqkdKeywords) {
      const match = annual.kqkd.find((r) => item.pattern.test(r[0]))
      if (match) {
        const vals = dates.map((_, i) => toBillion(match[3 + startIdx + i] as number))
        rows.push(`| **${item.key}** | ${vals.join(' | ')} |`)
      }
    }
    annualKqkdTable = rows.join('\n')
  }

  // 2. Tóm tắt Bảng Cân Đối Kế Toán Hàng Năm
  let annualCdktTable = ''
  if (annual && annual.fiscalDates && annual.fiscalDates.length > 0) {
    const dates = annual.fiscalDates.slice(-4)
    const dateHeaders = dates.map((d) => d.substring(0, 4))
    const startIdx = annual.fiscalDates.length - dates.length

    const targetCdktKeywords = [
      { key: 'TÀI SẢN NGẮN HẠN', pattern: /^tài sản ngắn hạn/i },
      { key: 'Tiền & tương đương tiền', pattern: /tiền và các khoản tương đương tiền|tiền và tương đương/i },
      { key: 'Đầu tư tài chính ngắn hạn', pattern: /đầu tư tài chính ngắn hạn/i },
      { key: 'Phải thu ngắn hạn', pattern: /phải thu ngắn hạn của khách hàng|các khoản phải thu ngắn hạn/i },
      { key: 'Hàng tồn kho', pattern: /hàng tồn kho/i },
      { key: 'TÀI SẢN DÀI HẠN', pattern: /^tài sản dài hạn/i },
      { key: 'Tài sản cố định', pattern: /tài sản cố định/i },
      { key: 'Chi phí XDCB dở dang', pattern: /chi phí xây dựng cơ bản dở dang|xây dựng dở dang/i },
      { key: 'TỔNG CỘNG TÀI SẢN', pattern: /^tổng cộng tài sản/i },
      { key: 'NỢ PHẢI TRẢ', pattern: /^nợ phải trả/i },
      { key: 'Vay nợ ngắn hạn', pattern: /vay và nợ thuê tài chính ngắn hạn/i },
      { key: 'Vay nợ dài hạn', pattern: /vay và nợ thuê tài chính dài hạn/i },
      { key: 'VỐN CHỦ SỞ HỮU', pattern: /^vốn chủ sở hữu/i },
      { key: 'Vốn điều lệ / Góp', pattern: /vốn góp của chủ sở hữu/i },
      { key: 'LNST chưa phân phối', pattern: /lợi nhuận sau thuế chưa phân phối/i },
    ]

    const rows: string[] = []
    rows.push(`| Chỉ tiêu CĐKT (Tỷ VNĐ) | ${dateHeaders.join(' | ')} |`)
    rows.push(`|:---|${dateHeaders.map(() => '---:').join('|')}|`)

    for (const item of targetCdktKeywords) {
      const match = annual.cdkt.find((r) => item.pattern.test(r[0]))
      if (match) {
        const vals = dates.map((_, i) => toBillion(match[3 + startIdx + i] as number))
        rows.push(`| ${item.key} | ${vals.join(' | ')} |`)
      }
    }
    annualCdktTable = rows.join('\n')
  }

  // 3. Tóm tắt Báo cáo Lưu Chuyển Tiền Tệ Hàng Năm (CFO, CFI, CFF)
  let annualLcttTable = ''
  if (annual && annual.fiscalDates && annual.fiscalDates.length > 0) {
    const dates = annual.fiscalDates.slice(-4)
    const dateHeaders = dates.map((d) => d.substring(0, 4))
    const startIdx = annual.fiscalDates.length - dates.length

    const targetLcttKeywords = [
      { key: 'Lưu chuyển tiền từ HĐ Kinh doanh (CFO)', pattern: /lưu chuyển tiền thuần từ hoạt động kinh doanh/i },
      { key: 'Lưu chuyển tiền từ HĐ Đầu tư (CFI)', pattern: /lưu chuyển tiền thuần từ hoạt động đầu tư/i },
      { key: 'Trong đó: Tiền mua sắm TSCĐ (CAPEX)', pattern: /mua sắm, xây dựng tscđ|tiền chi để mua sắm/i },
      { key: 'Lưu chuyển tiền từ HĐ Tài chính (CFF)', pattern: /lưu chuyển tiền thuần từ hoạt động tài chính/i },
      { key: 'Trong đó: Cổ tức đã trả', pattern: /cổ tức, lợi nhuận đã trả/i },
      { key: 'Tiền & tương đương tiền cuối kỳ', pattern: /tiền và tương đương tiền cuối kỳ/i },
    ]

    const rows: string[] = []
    rows.push(`| Dòng tiền LCTT (Tỷ VNĐ) | ${dateHeaders.join(' | ')} |`)
    rows.push(`|:---|${dateHeaders.map(() => '---:').join('|')}|`)

    for (const item of targetLcttKeywords) {
      const match = annual.lctt.find((r) => item.pattern.test(r[0]))
      if (match) {
        const vals = dates.map((_, i) => toBillion(match[3 + startIdx + i] as number))
        rows.push(`| ${item.key} | ${vals.join(' | ')} |`)
      }
    }
    annualLcttTable = rows.join('\n')
  }

  // 4. Tóm tắt KQKD 4 Quý Gần Nhất
  let quarterKqkdTable = ''
  if (quarter && quarter.fiscalDates && quarter.fiscalDates.length > 0) {
    const dates = quarter.fiscalDates.slice(-4)
    const dateHeaders = dates.map((d) => {
      const m = d.match(/(\d{4})-(\d{2})/)
      if (m) {
        const q = Math.ceil(parseInt(m[2]) / 3)
        return `Q${q}/${m[1].substring(2)}`
      }
      return d
    })
    const startIdx = quarter.fiscalDates.length - dates.length

    const targetQuarterKeywords = [
      { key: 'Doanh thu thuần', pattern: /doanh thu thuần|doanh thu bán hàng/i },
      { key: 'Lợi nhuận gộp', pattern: /lợi nhuận gộp/i },
      { key: 'LNTT', pattern: /lợi nhuận trước thuế/i },
      { key: 'LNST cổ đông mẹ', pattern: /cổ đông công ty mẹ|cổ đông mẹ/i },
    ]

    const rows: string[] = []
    rows.push(`| KQKD 4 Quý Gần Nhất (Tỷ VNĐ) | ${dateHeaders.join(' | ')} |`)
    rows.push(`|:---|${dateHeaders.map(() => '---:').join('|')}|`)

    for (const item of targetQuarterKeywords) {
      const match = quarter.kqkd.find((r) => item.pattern.test(r[0]))
      if (match) {
        const vals = dates.map((_, i) => toBillion(match[3 + startIdx + i] as number))
        rows.push(`| **${item.key}** | ${vals.join(' | ')} |`)
      }
    }
    quarterKqkdTable = rows.join('\n')
  }

  return {
    annualKqkdTable,
    annualCdktTable,
    annualLcttTable,
    quarterKqkdTable,
  }
}

/** Đọc ghi chú chi tiết từ file notes-cache nếu có */
function getNotesCacheDetails(symbol: string): string {
  const cachePath = path.join(process.cwd(), 'data', 'notes-cache', `${symbol}.json`)
  if (!fs.existsSync(cachePath)) return ''

  try {
    const raw = fs.readFileSync(cachePath, 'utf-8')
    const items: Array<{
      date: string
      year: number
      quarter: number
      category: string
      item_name: string
      value: number
      unit: string
    }> = JSON.parse(raw)

    if (!Array.isArray(items) || items.length === 0) return ''

    const years = Array.from(new Set(items.map((i) => i.year))).sort((a, b) => b - a)
    const recentYears = years.slice(0, 2)
    const filtered = items.filter((i) => recentYears.includes(i.year) && i.value !== 0)

    if (filtered.length === 0) return ''

    const lines: string[] = []
    lines.push(`### Thống Kê Bóc Tách Chi Phí & CAPEX:`)
    const groupMap = new Map<string, Array<{ period: string; val: number }>>()
    for (const f of filtered.slice(0, 40)) {
      const list = groupMap.get(f.item_name) || []
      list.push({ period: `Q${f.quarter}/${f.year}`, val: f.value })
      groupMap.set(f.item_name, list)
    }

    groupMap.forEach((vals, name) => {
      const valStr = vals.map((v) => `${v.period}: ${toBillion(v.val)} tỷ`).join(' | ')
      lines.push(`- **${name}**: ${valStr}`)
    })

    return lines.join('\n')
  } catch {
    return ''
  }
}

/** Hàm chính: Tạo gói dữ liệu AI toàn diện cho 1 mã cổ phiếu */
export async function buildStockAiBundle(tickerSymbol: string): Promise<AiBundleResult> {
  const sym = tickerSymbol.toUpperCase().trim()
  const todayStr = new Date().toLocaleDateString('vi-VN')

  // 1. Dữ liệu cơ bản
  const manifestStock = getStockByTicker(sym)
  const legacyStock = getStock(sym)
  const coreCard = getLocalCoreCard(sym)
  const companyProfile = coreCard?.snippet || coreCard?.subtitle || ''

  const companyName = manifestStock?.n || legacyStock?.name || sym
  const exchange = manifestStock?.e || legacyStock?.exchange || 'HOSE/HNX/UPCOM'
  const sector = manifestStock?.s || legacyStock?.sector || 'Chưa phân loại'

  const marketPrice = legacyStock?.marketPrice ?? (manifestStock?.px != null ? manifestStock.px : undefined)
  const rnav = legacyStock?.rnav
  const mos = legacyStock ? marginOfSafety(legacyStock) : undefined
  const up = legacyStock ? upside(legacyStock) : undefined
  const pe = legacyStock?.forwardPE ?? (manifestStock?.pe != null ? manifestStock.pe : undefined)
  const pb = manifestStock?.pb != null ? manifestStock.pb : undefined
  const divYield = legacyStock?.dividendYield ?? (manifestStock?.dy != null ? manifestStock.dy : undefined)
  const marketCap = legacyStock?.marketCap ?? (manifestStock?.cap != null ? manifestStock.cap : undefined)

  // 2. BCTC & Bảng biểu
  const { annualKqkdTable, annualCdktTable, annualLcttTable, quarterKqkdTable } =
    formatFinancialStatementTables(sym)

  // 3. Thuyết minh BCTC
  const bctcReport = getBctcReport(sym)
  let bctcMarkdown = ''
  if (bctcReport && bctcReport.sections.length > 0) {
    const secTexts: string[] = []
    for (const sec of bctcReport.sections) {
      if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
        const cleaned =
          sec.rawMarkdown.length > 4000
            ? sec.rawMarkdown.substring(0, 4000) + '\n\n...[Đã tóm lược bớt bảng biểu chi tiết]...'
            : sec.rawMarkdown
        secTexts.push(`### ${sec.title}\n${cleaned}`)
      }
    }
    bctcMarkdown = secTexts.join('\n\n')
  } else {
    bctcMarkdown = getNotesCacheDetails(sym)
  }

  // 4. Đại hội đồng cổ đông (ĐHĐCĐ)
  const agmReport = getAgmReport(sym, 2026) || getAgmReport(sym, 2025)
  let agmMarkdown = ''
  if (agmReport && agmReport.hasReport) {
    const agmParts: string[] = []
    agmParts.push(`- **Kỳ ĐHĐCĐ**: Năm ${agmReport.year}`)
    if (agmReport.ktplRate != null) {
      agmParts.push(`- **Tỷ lệ trích Quỹ khen thưởng & phúc lợi (KTPL)**: ${agmReport.ktplRate}% LNST`)
    }

    for (const sec of agmReport.sections) {
      if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
        const textSnippet =
          sec.rawMarkdown.length > 3000
            ? sec.rawMarkdown.substring(0, 3000) + '\n...[Đã rút gọn]...'
            : sec.rawMarkdown
        agmParts.push(`#### ${sec.title}\n${textSnippet}`)
      }
    }
    agmMarkdown = agmParts.join('\n\n')
  }

  // 5. Kế hoạch kinh doanh
  let businessPlanMarkdown = ''
  const bpPayload = await getBusinessPlan(sym)
  const bpData = bpPayload?.data || []
  if (bpData && bpData.length > 0) {
    const bpRows: string[] = []
    bpRows.push(`| Năm | KH Doanh thu (Tỷ) | KH LNTT (Tỷ) | KH LNST (Tỷ) |`)
    bpRows.push(`|:---:|:---:|:---:|:---:|`)
    for (const y of bpData.slice(0, 3)) {
      bpRows.push(
        `| ${y.year} | ${y.isa3 != null ? fmtBillion(y.isa3) : '—'} | ${y.isa16 != null ? fmtBillion(y.isa16) : '—'} | ${y.isa22 != null ? fmtBillion(y.isa22) : '—'} |`
      )
    }
    businessPlanMarkdown = bpRows.join('\n')
  }

  // 6. Công bố thông tin & Link PDF gốc
  const disclosures = getDisclosuresBySymbol(sym, 30)
  const pdfLinks: Array<{
    title: string
    docType: string
    publishedAt: string
    url: string
  }> = []

  const disclosuresMarkdownList: string[] = []
  for (const d of disclosures) {
    if (d.file_url) {
      pdfLinks.push({
        title: d.title,
        docType: d.doc_type_label || d.doc_type,
        publishedAt: d.published_at,
        url: d.file_url,
      })
    }
    disclosuresMarkdownList.push(
      `- [${d.published_at.substring(0, 10)}] **[${d.doc_type_label || d.doc_type}]** ${d.title}${d.file_url ? ` ([Tải file PDF](${d.file_url}))` : ''}`
    )
  }

  // 7. Ghép thành Markdown toàn diện (Bundle Markdown)
  const bundleMarkdown = `# HỒ SƠ PHÂN TÍCH TÀI CHÍNH TOÀN DIỆN: ${sym} - ${companyName}
*Nguồn dữ liệu trích xuất: [dulieudautu.com](https://dulieudautu.com) · Ngày xuất: ${todayStr}*

---

## 1. TỔNG QUAN DOANH NGHIỆP & CHỈ SỐ ĐỊNH GIÁ
- **Mã chứng khoán**: ${sym} | **Sàn**: ${exchange} | **Ngành**: ${sector}
${companyProfile ? `- **Mô tả hoạt động**: ${companyProfile}` : ''}
- **Thị giá hiện tại**: ${marketPrice != null ? fmtPrice(marketPrice) : '—'} nghìn VNĐ
${rnav != null ? `- **Định giá hợp lý RNAV**: ${fmtPrice(rnav)} nghìn VNĐ (Dư địa tăng giá: ${up != null ? fmtPct(up, 0) : '—'}, Biên an toàn MOS: ${mos != null ? fmtPct(mos, 0) : '—'})` : ''}
- **Vốn hóa thị trường**: ${marketCap != null ? fmtBillion(marketCap) : '—'} tỷ VNĐ
- **Định giá P/E**: ${pe != null ? fmtNum(pe, 1) + 'x' : '—'} | **P/B**: ${pb != null ? fmtNum(pb, 1) + 'x' : '—'}
- **Tỷ suất cổ tức tiền mặt**: ${divYield != null ? fmtNum(divYield, 1) + '%' : '—'}

---

## 2. BÁO CÁO TÀI CHÍNH CÁC NĂM GẦN NHẤT
${annualKqkdTable ? `### 2.1. Kết Quả Kinh Doanh Hàng Năm\n${annualKqkdTable}` : ''}

${quarterKqkdTable ? `### 2.2. Kết Quả Kinh Doanh 4 Quý Gần Nhất\n${quarterKqkdTable}` : ''}

${annualCdktTable ? `### 2.3. Bảng Cân Đối Kế Toán\n${annualCdktTable}` : ''}

${annualLcttTable ? `### 2.4. Báo Cáo Lưu Chuyển Tiền Tệ (LCTT)\n${annualLcttTable}` : ''}

---

## 3. THUYẾT MINH BÁO CÁO TÀI CHÍNH TRỌNG YẾU
${bctcMarkdown ? bctcMarkdown : '_Chưa có trích xuất chi tiết thuyết minh văn bản cho mã này (đã có số liệu BCTC tổng hợp phía trên)._'}

---

## 4. KẾ HOẠCH KINH DOANH & ĐẠI HỘI ĐỒNG CỔ ĐÔNG (ĐHĐCĐ)
${businessPlanMarkdown ? `### 4.1. Kế Hoạch Kinh Doanh Các Năm\n${businessPlanMarkdown}\n` : ''}
${agmMarkdown ? `### 4.2. Nghị Quyết & Thảo Luận ĐHĐCĐ\n${agmMarkdown}` : '_Chưa có ghi chép chi tiết ĐHĐCĐ năm gần nhất._'}

---

## 5. CÔNG BỐ THÔNG TIN TRỌNG YẾU & TÀI LIỆU GỐC ĐÍNH KÈM
${disclosuresMarkdownList.length > 0 ? disclosuresMarkdownList.slice(0, 15).join('\n') : '_Không có công bố thông tin gần đây._'}

---

## HƯỚNG DẪN CÂU LỆNH PHÂN TÍCH (SYSTEM PROMPT CHO AI):
Bạn là Chuyên gia Phân tích Tài chính Cao cấp (CFA Charterholder & Senior Auditor). Dựa trên TOÀN BỘ dữ liệu tài chính thực tế của mã ${sym} được cung cấp ở trên:
1. **Đánh giá chất lượng lợi nhuận**: So sánh LNST với Dòng tiền hoạt động kinh doanh (CFO). Doanh nghiệp có thu được tiền thật về không hay đang bị đọng ở các khoản phải thu và tồn kho?
2. **Kiểm tra rủi ro nợ vay & thanh khoản**: Tỷ lệ nợ vay trên vốn chủ sở hữu (D/E), áp lực chi trả lãi vay, và cơ cấu vay ngắn/dài hạn.
3. **Đánh giá Ban lãnh đạo & ĐHĐCĐ**: Tính khả thi của kế hoạch kinh doanh, chính sách chia cổ tức, và tỷ lệ trích Quỹ khen thưởng & phúc lợi (KTPL) có công bằng với cổ đông không?
4. **Kết luận định giá & khuyến nghị**: Tổng hợp ưu điểm, rủi ro chính và mức giá mục tiêu hợp lý cho nhà đầu tư cá nhân.
`

  // 8. Tạo Prompt tóm tắt gọn (Compact Prompt cho Clipboard / ChatGPT)
  const compactPrompt = `Bạn là Chuyên gia Phân tích Tài chính Cấp cao (CFA). Dưới đây là toàn bộ hồ sơ dữ liệu tài chính thực tế của mã **${sym} (${companyName})** từ dulieudautu.com:

### 1. Chỉ số cốt lõi:
- Mã: ${sym} (${exchange}) - Ngành: ${sector}
- Thị giá: ${marketPrice != null ? fmtPrice(marketPrice) : '—'}k | Vốn hóa: ${marketCap != null ? fmtBillion(marketCap) : '—'} tỷ | P/E: ${pe != null ? fmtNum(pe, 1) + 'x' : '—'} | Cổ tức: ${divYield != null ? fmtNum(divYield, 1) + '%' : '—'}
${rnav != null ? `- Định giá RNAV: ${fmtPrice(rnav)}k | Dư địa tăng: ${up != null ? fmtPct(up, 0) : '—'}` : ''}

### 2. Kết quả kinh doanh & BCTC nhiều năm:
${annualKqkdTable}

${quarterKqkdTable}

${annualCdktTable}

${annualLcttTable}

${agmMarkdown ? `### 3. ĐHĐCĐ & Kế hoạch:\n${agmMarkdown.substring(0, 1500)}\n` : ''}
${disclosuresMarkdownList.length > 0 ? `### 4. Công bố thông tin gần nhất:\n${disclosuresMarkdownList.slice(0, 8).join('\n')}\n` : ''}

---
YÊU CẦU PHÂN TÍCH CHUYÊN SÂU:
Hãy giúp tôi phân tích chi tiết mã ${sym}:
1. Sức khỏe tài chính, chất lượng dòng tiền (CFO vs LNST) và rủi ro nợ vay.
2. Triển vọng tăng trưởng, tính khả thi của kế hoạch ĐHĐCĐ và quyền lợi cổ đông (cổ tức, quỹ KTPL).
3. Đưa ra góc nhìn định giá và lưu ý quan trọng cho nhà đầu tư.`

  return {
    symbol: sym,
    companyName,
    exchange,
    sector,
    updatedDate: todayStr,
    markdownContent: bundleMarkdown,
    compactPrompt,
    pdfLinks,
    metrics: {
      price: marketPrice ?? undefined,
      rnav: rnav ?? undefined,
      pe: pe ?? undefined,
      pb: pb ?? undefined,
      dividendYield: divYield ?? undefined,
      marketCap: marketCap ?? undefined,
    },
  }
}
