import fs from 'node:fs'
import path from 'node:path'
import { getStockByTicker, getLocalCoreCard } from '@/lib/longlivestock'
import { getStock, upside, marginOfSafety } from '@/lib/data'
import { getLocalFinancialStatements } from '@/lib/financial-statements-db'
import { getBctcReport } from '@/lib/bctc-service'
import { getAgmReport } from '@/lib/agm-service'
import {
  getNghienCuuAiReportsForTicker,
  getNghienCuuAiReportBySlug,
} from '@/lib/nghien-cuu-ai-service'
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
  if (Math.abs(val) > 100_000_000) {
    const bil = val / 1_000_000_000
    return bil.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
  }
  return Number(val).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

/** Trích xuất bảng tóm tắt KQKD các quý gần nhất */
function formatQuarterKqkdTable(symbol: string): string {
  const quarter = getLocalFinancialStatements(symbol, 'quarter')
  if (!quarter || !quarter.fiscalDates || quarter.fiscalDates.length === 0) return ''

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

  const targetKeywords = [
    { key: 'Doanh thu thuần', pattern: /doanh thu thuần|doanh thu bán hàng/i },
    { key: 'Lợi nhuận gộp', pattern: /lợi nhuận gộp/i },
    { key: 'LNTT', pattern: /lợi nhuận trước thuế/i },
    { key: 'LNST cổ đông mẹ', pattern: /cổ đông công ty mẹ|cổ đông mẹ/i },
  ]

  const rows: string[] = []
  rows.push(`| Chỉ tiêu KQKD (Tỷ VNĐ) | ${dateHeaders.join(' | ')} |`)
  rows.push(`|:---|${dateHeaders.map(() => '---:').join('|')}|`)

  for (const item of targetKeywords) {
    const match = quarter.kqkd.find((r) => item.pattern.test(r[0]))
    if (match) {
      const vals = dates.map((_, i) => toBillion(match[3 + startIdx + i] as number))
      rows.push(`| **${item.key}** | ${vals.join(' | ')} |`)
    }
  }

  return rows.join('\n')
}

/**
 * Hàm chính: Tạo gói dữ liệu AI tinh gọn, tập trung và cực nhanh (< 5ms)
 * 1. Báo cáo tài chính Quý 3/2026 & Bán niên 2026 đã bóc tách (Tab Báo cáo tài chính)
 * 2. Thông tin AGM 2026 (Nghị quyết, Kế hoạch & Q&A ĐHĐCĐ 2026)
 * 3. Dữ liệu Nghiên cứu chuyên sâu AI (Hệ điểm định giá Benchmark 10% = 100đ, Toàn văn bài phân tích)
 */
export async function buildStockAiBundle(tickerSymbol: string): Promise<AiBundleResult> {
  const sym = tickerSymbol.toUpperCase().trim()
  const todayStr = new Date().toLocaleDateString('vi-VN')

  // 1. Dữ liệu thông tin cơ bản & định giá
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

  const quarterKqkdTable = formatQuarterKqkdTable(sym)

  // 2. Dữ liệu Nghiên Cứu Chuyên Sâu AI (Tab "Nghiên cứu chuyên sâu AI")
  const aiReports = getNghienCuuAiReportsForTicker(sym)
  let aiResearchMarkdown = ''
  if (aiReports.length > 0) {
    const aiBlocks: string[] = []
    for (const r of aiReports) {
      const detail = getNghienCuuAiReportBySlug(r.slug)
      const currentScoreStr = r.currentScore != null ? `${r.currentScore}` : `${r.score ?? '—'}`
      const classStr = r.currentClassification || r.classification || 'Phân tích'
      const deltaStr = r.scoreDelta != null ? (r.scoreDelta > 0 ? ` (+${r.scoreDelta}đ)` : r.scoreDelta < 0 ? ` (${r.scoreDelta}đ)` : '') : ''
      const pxLive = r.currentPrice ? `${r.currentPrice}k (Thị giá hiện tại)` : (r.price ? `${r.price}k` : '—')

      let block = `### 🌟 BÀI ĐỊNH GIÁ AI: ${r.title}\n`
      block += `- **Điểm định giá AI hiện tại**: **${currentScoreStr} ĐIỂM** [${classStr}]${deltaStr}\n`
      block += `  *(Hệ quy chiếu: Benchmark gửi tiết kiệm 10%/năm = 100 điểm. Điểm ≥ 200: Siêu Hấp Dẫn | 150 - 200: Khả Quan | 100 - 150: Theo Dõi | < 100: Kém Hấp Dẫn)*\n`
      block += `- **Điểm gốc lúc nghiên cứu**: ${r.score ?? '—'} điểm (tại giá ${r.price ? `${r.price}k` : '—'} ngày ${r.date})\n`
      block += `- **Thị giá**: ${pxLive}\n`
      if (r.summary) {
        block += `- **Tóm tắt luận điểm**: ${r.summary}\n`
      }
      if (detail?.markdown && detail.markdown.trim().length > 0) {
        block += `\n#### Toàn văn bài nghiên cứu AI chi tiết:\n${detail.markdown}\n`
      }
      aiBlocks.push(block)
    }
    aiResearchMarkdown = aiBlocks.join('\n\n---\n\n')
  } else {
    aiResearchMarkdown = `_Mã ${sym} hiện chưa có bài chấm điểm sẵn trong kho Nghiên cứu AI. AI hãy dựa trên dữ liệu Thuyết minh BCTC Quý 3/2026, Bán niên 2026 và Nghị quyết ĐHĐCĐ 2026 bên dưới để tự chấm điểm theo thang điểm chuẩn (Benchmark lãi suất tiết kiệm = 100 điểm, Điểm > 150 là Khả quan, > 200 là Siêu hấp dẫn)._`
  }

  // 3. Thuyết minh Báo cáo tài chính Quý 3/2026 & Bán niên 2026 đã bóc tách (Tab "Báo cáo tài chính")
  const q3Report = getBctcReport(sym, 'HopNhat', 'Quy_3_2026') || getBctcReport(sym, 'CongTyMe', 'Quy_3_2026')
  const banNienReport = getBctcReport(sym, 'HopNhat', 'Ban_Nien_2026') || getBctcReport(sym, 'CongTyMe', 'Ban_Nien_2026')

  const bctcBlocks: string[] = []

  if (q3Report && q3Report.sections.length > 0) {
    const secTexts: string[] = []
    for (const sec of q3Report.sections) {
      if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
        secTexts.push(`#### ${sec.title}\n${sec.rawMarkdown}`)
      }
    }
    if (secTexts.length > 0) {
      bctcBlocks.push(`### Thuyết Minh BCTC Quý 3/2026 (${q3Report.reportTypeLabel}):\n\n${secTexts.join('\n\n')}`)
    }
  }

  if (banNienReport && banNienReport.sections.length > 0) {
    const secTexts: string[] = []
    for (const sec of banNienReport.sections) {
      if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
        secTexts.push(`#### ${sec.title}\n${sec.rawMarkdown}`)
      }
    }
    if (secTexts.length > 0) {
      bctcBlocks.push(`### Thuyết Minh BCTC Bán Niên 2026 (${banNienReport.reportTypeLabel}):\n\n${secTexts.join('\n\n')}`)
    }
  }

  // Fallback nếu không có quý 3 / bán niên nhưng có thuyết minh kỳ khác
  if (bctcBlocks.length === 0) {
    const fallbackReport = getBctcReport(sym)
    if (fallbackReport && fallbackReport.sections.length > 0) {
      const secTexts: string[] = []
      for (const sec of fallbackReport.sections) {
        if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
          secTexts.push(`#### ${sec.title}\n${sec.rawMarkdown}`)
        }
      }
      if (secTexts.length > 0) {
        bctcBlocks.push(`### Thuyết Minh BCTC Gần Nhất:\n\n${secTexts.join('\n\n')}`)
      }
    }
  }

  const bctcMarkdown = bctcBlocks.join('\n\n---\n\n')

  // 4. Thông tin Đại hội đồng cổ đông (AGM 2026)
  const agmReport = getAgmReport(sym, 2026) || getAgmReport(sym, 2025)
  let agmMarkdown = ''
  if (agmReport && agmReport.hasReport) {
    const agmParts: string[] = []
    agmParts.push(`- **Kỳ họp ĐHĐCĐ**: Năm ${agmReport.year} - ${agmReport.title}`)
    if (agmReport.ktplRate != null) {
      agmParts.push(`- **Tỷ lệ trích Quỹ khen thưởng & phúc lợi (KTPL)**: ${agmReport.ktplRate}% LNST`)
    }
    if (agmReport.ktplVnd != null) {
      agmParts.push(`- **Số tiền trích Quỹ KTPL**: ${fmtBillion(agmReport.ktplVnd)} tỷ VNĐ`)
    }

    for (const sec of agmReport.sections) {
      if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
        agmParts.push(`### ${sec.title}\n${sec.rawMarkdown}`)
      }
    }
    agmMarkdown = agmParts.join('\n\n')
  }

  // 5. Ghép thành Markdown hồ sơ chuẩn
  const bundleMarkdown = `# HỒ SƠ TÀI CHÍNH & NGHIÊN CỨU AI: ${sym} - ${companyName}
*Nguồn dữ liệu trích xuất: [dulieudautu.com](https://dulieudautu.com) · Cập nhật: ${todayStr}*

---

## 1. TỔNG QUAN DOANH NGHIỆP & CHỈ SỐ CỐT LÕI
- **Mã cổ phiếu**: ${sym} | **Sàn**: ${exchange} | **Ngành**: ${sector}
${companyProfile ? `- **Mô tả hoạt động**: ${companyProfile}` : ''}
- **Thị giá hiện tại**: ${marketPrice != null ? fmtPrice(marketPrice) + ' nghìn VNĐ' : '—'}
- **Vốn hóa thị trường**: ${marketCap != null ? fmtBillion(marketCap) + ' tỷ VNĐ' : '—'}
- **Định giá P/E**: ${pe != null ? fmtNum(pe, 1) + 'x' : '—'} | **P/B**: ${pb != null ? fmtNum(pb, 1) + 'x' : '—'} | **Tỷ suất cổ tức tiền mặt**: ${divYield != null ? fmtNum(divYield, 1) + '%' : '—'}
${rnav != null ? `- **Định giá RNAV**: ${fmtPrice(rnav)} nghìn VNĐ (Dư địa tăng: ${up != null ? fmtPct(up, 0) : '—'}, Biên an toàn MOS: ${mos != null ? fmtPct(mos, 0) : '—'})` : ''}

${quarterKqkdTable ? `### Tóm Tắt KQKD Các Quý Gần Nhất:\n${quarterKqkdTable}\n` : ''}

---

## 2. NGHIÊN CỨU CHUYÊN SÂU AI (TAB "NGHIÊN CỨU CHUYÊN SÂU AI")
${aiResearchMarkdown}

---

## 3. THUYẾT MINH BÁO CÁO TÀI CHÍNH QUÝ 3 & BÁN NIÊN 2026 ĐÃ BÓC TÁCH (TAB "BÁO CÁO TÀI CHÍNH")
${bctcMarkdown ? bctcMarkdown : '_Chưa có trích xuất chi tiết thuyết minh văn bản BCTC Quý 3/Bán niên 2026 cho mã này._'}

---

## 4. TÀI LIỆU ĐẠI HỘI ĐỒNG CỔ ĐÔNG (AGM 2026)
${agmMarkdown ? agmMarkdown : '_Chưa có tài liệu AGM 2026 cho mã này._'}

---

## HƯỚNG DẪN CÂU LỆNH PHÂN TÍCH (SYSTEM PROMPT CHO AI):
Bạn là Chuyên gia Phân tích Tài chính Cao cấp (CFA). Dựa trên 3 nguồn dữ liệu bóc tách độc quyền ở trên (Nghiên cứu chuyên sâu AI, Thuyết minh BCTC Quý 3 & Bán niên 2026, Thông tin AGM 2026):
1. Đánh giá chất lượng tài chính, dòng tiền CFO và áp lực nợ vay/lãi vay từ thuyết minh.
2. Đánh giá Ban Lãnh đạo & tính minh bạch với cổ đông nhỏ lẻ qua tỷ lệ trích Quỹ KTPL tại AGM 2026.
3. Đưa ra kết luận và chấm điểm định giá tổng kết cho mã ${sym} theo thang điểm chuẩn (Benchmark 10% gửi tiết kiệm = 100 điểm, Điểm > 150 là Khả quan, > 200 là Siêu hấp dẫn).
`

  // 6. Prompt tóm tắt
  const compactPrompt = `Bạn là Chuyên gia Phân tích Tài chính Cấp cao (CFA). Dưới đây là hồ sơ dữ liệu tài chính thực tế của mã **${sym} (${companyName})** từ dulieudautu.com:

- Mã: ${sym} (${exchange}) - Ngành: ${sector}
- Thị giá: ${marketPrice != null ? fmtPrice(marketPrice) : '—'}k | Vốn hóa: ${marketCap != null ? fmtBillion(marketCap) : '—'} tỷ | P/E: ${pe != null ? fmtNum(pe, 1) + 'x' : '—'} | Cổ tức: ${divYield != null ? fmtNum(divYield, 1) + '%' : '—'}
${quarterKqkdTable ? `\n${quarterKqkdTable}\n` : ''}
${agmReport && agmReport.ktplRate != null ? `- Tỷ lệ trích Quỹ KTPL: ${agmReport.ktplRate}% LNST` : ''}

YÊU CẦU PHÂN TÍCH & CHẤM ĐIỂM:
Hãy giúp tôi phân tích chi tiết mã ${sym} và chấm điểm định giá theo thang điểm chuẩn (Benchmark 10% = 100đ).`

  return {
    symbol: sym,
    companyName,
    exchange,
    sector,
    updatedDate: todayStr,
    markdownContent: bundleMarkdown,
    compactPrompt,
    pdfLinks: [],
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
