import fs from 'node:fs'
import path from 'node:path'
import { getStockByTicker, getLocalCoreCard } from '@/lib/longlivestock'
import { getStock, upside, marginOfSafety } from '@/lib/data'
import { getLocalFinancialStatements } from '@/lib/financial-statements-db'
import { fmtBillion, fmtNum, fmtPct, fmtPrice } from '@/lib/format'

export interface AttachedStockDoc {
  filename: string
  category: string
  sizeKb: string
  rawMarkdown: string
}

export interface AiBundleResult {
  symbol: string
  companyName: string
  exchange: string
  sector: string
  updatedDate: string
  markdownContent: string
  compactPrompt: string
  attachedFiles: Array<{
    filename: string
    category: string
    sizeKb: string
  }>
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
export function formatQuarterKqkdTable(symbol: string): string {
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
 * Quét toàn bộ tài liệu gốc (.md) trong hệ thống mang tên mã cổ phiếu đó:
 * - Thuyết minh BCTC Quý 3/2026
 * - Thuyết minh BCTC Bán Niên 2026
 * - Tài liệu ĐHĐCĐ AGM 2026
 * - Nghiên cứu chuyên sâu AI & Định giá
 * Tuyệt đối chỉ đọc file có tên bắt đầu bằng mã cổ phiếu (${SYM}_ hoặc ${sym}-)
 */
export function getAttachedDocumentsForStock(tickerSymbol: string): AttachedStockDoc[] {
  const sym = tickerSymbol.toUpperCase().trim()
  const symLower = tickerSymbol.toLowerCase().trim()
  const docs: AttachedStockDoc[] = []

  const targetDirs = [
    { dir: path.join(process.cwd(), 'content', 'bctc', 'Quy_3_2026'), cat: 'Thuyết minh BCTC Quý 3/2026' },
    { dir: path.join(process.cwd(), 'content', 'bctc', 'Ban_Nien_2026'), cat: 'Thuyết minh BCTC Bán Niên 2026' },
    { dir: path.join(process.cwd(), 'content', 'agm', '2026'), cat: 'Tài liệu ĐHĐCĐ AGM 2026' },
    { dir: path.join(process.cwd(), 'content', 'agm', '2025'), cat: 'Tài liệu ĐHĐCĐ AGM 2025' },
    { dir: path.join(process.cwd(), 'content', 'nghien_cuu_ai'), cat: 'Nghiên cứu chuyên sâu AI & Định giá' },
  ]

  for (const target of targetDirs) {
    if (!fs.existsSync(/*turbopackIgnore: true*/ target.dir)) continue
    try {
      const files = fs.readdirSync(/*turbopackIgnore: true*/ target.dir)
      for (const f of files) {
        if (!f.endsWith('.md')) continue
        const u = f.toUpperCase()
        const l = f.toLowerCase()
        const matchUpper = u.startsWith(sym + '_') || u.startsWith(sym + '-') || u.startsWith(sym + '.')
        const matchLower = l.startsWith(symLower + '-') || l.startsWith(symLower + '_')
        if (matchUpper || matchLower) {
          const fullPath = path.join(/*turbopackIgnore: true*/ target.dir, f)
          const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath)
          const content = fs.readFileSync(/*turbopackIgnore: true*/ fullPath, 'utf8')
          docs.push({
            filename: f,
            category: target.cat,
            sizeKb: (stat.size / 1024).toFixed(1),
            rawMarkdown: content,
          })
        }
      }
    } catch {
      // Bỏ qua lỗi đọc từng file
    }
  }

  return docs
}

/**
 * Hàm chính: Tạo gói dữ liệu AI đính kèm trực tiếp các tài liệu bóc tách của mã cổ phiếu
 * Mô phỏng trải nghiệm kéo thả/đính kèm trực tiếp file vào khung chat Gemini
 */
export async function buildStockAiBundle(tickerSymbol: string): Promise<AiBundleResult> {
  const sym = tickerSymbol.toUpperCase().trim()
  const todayStr = new Date().toLocaleDateString('vi-VN')

  // 1. Dữ liệu thông tin cơ bản & định giá từ cơ sở dữ liệu
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

  // 2. Quét chính xác các tài liệu mang tên mã cổ phiếu đó
  const attachedDocs = getAttachedDocumentsForStock(sym)

  // 3. Danh sách tài liệu đính kèm
  const docListSummary =
    attachedDocs.length > 0
      ? attachedDocs.map((d, i) => `${i + 1}. 📄 **${d.filename}** (${d.category} · ${d.sizeKb} KB)`).join('\n')
      : `_Hệ thống hiện chưa có tài liệu bóc tách văn bản (.md) mang tên mã ${sym} trong các kho BCTC Quý 3/2026, BCTC Bán Niên 2026, AGM 2026 hay Nghiên cứu AI._`

  // 4. Nội dung chi tiết từng file đính kèm
  const docSections = attachedDocs
    .map((doc, idx) => {
      return [
        `================================================================================`,
        `📎 [TÀI LIỆU ĐÍNH KÈM ${idx + 1}/${attachedDocs.length}]: ${doc.filename}`,
        `📁 Phân loại: ${doc.category} (${doc.sizeKb} KB)`,
        `================================================================================`,
        doc.rawMarkdown,
      ].join('\n')
    })
    .join('\n\n')

  // 5. Ghép thành Markdown hoàn chỉnh như đính kèm file vào khung chat
  const bundleMarkdown = `# 📎 TÀI LIỆU ĐÍNH KÈM TỰ ĐỘNG CHO MÃ CỔ PHIẾU: ${sym} - ${companyName}
*Nguồn dữ liệu bóc tách: [dulieudautu.com](https://dulieudautu.com) · Cập nhật: ${todayStr}*

## 📂 DANH MỤC TÀI LIỆU ĐÃ ĐÍNH KÈM VÀO PHIÊN CHAT (${attachedDocs.length} tài liệu tìm thấy):
${docListSummary}

${docSections ? `\n${docSections}\n` : ''}

================================================================================
📊 TỔNG QUAN DOANH NGHIỆP & CHỈ SỐ CỐT LÕI: ${sym} (${companyName})
================================================================================
- **Mã cổ phiếu**: ${sym} | **Sàn niêm yết**: ${exchange} | **Ngành**: ${sector}
${companyProfile ? `- **Mô tả doanh nghiệp**: ${companyProfile}` : ''}
- **Thị giá hiện tại**: ${marketPrice != null ? fmtPrice(marketPrice) + ' nghìn VNĐ' : '—'}
- **Vốn hóa thị trường**: ${marketCap != null ? fmtBillion(marketCap) + ' tỷ VNĐ' : '—'}
- **Định giá P/E**: ${pe != null ? fmtNum(pe, 1) + 'x' : '—'} | **P/B**: ${pb != null ? fmtNum(pb, 1) + 'x' : '—'} | **Tỷ suất cổ tức tiền mặt**: ${divYield != null ? fmtNum(divYield, 1) + '%' : '—'}
${rnav != null ? `- **Định giá RNAV (Tài sản ngầm)**: ${fmtPrice(rnav)} nghìn VNĐ (Dư địa tăng: ${up != null ? fmtPct(up, 0) : '—'}, Biên an toàn MOS: ${mos != null ? fmtPct(mos, 0) : '—'})` : ''}

${quarterKqkdTable ? `\n### Bảng Tóm Tắt KQKD Các Quý Gần Nhất:\n${quarterKqkdTable}\n` : ''}

================================================================================
🎯 HƯỚNG DẪN TRẢ LỜI CHO AI (SYSTEM PROMPT):
1. **Trả lời đúng trọng tâm**: Trả lời trực tiếp câu hỏi của người dùng dựa trên các tài liệu đính kèm bên trên.
2. **Nếu người dùng hỏi về tài liệu**: Liệt kê rõ các tài liệu tìm thấy ở mục "DANH MỤC TÀI LIỆU ĐÃ ĐÍNH KÈM" và tóm lược ngắn gọn nội dung của từng file. Nếu chưa có file BCTC thì nêu rõ chỉ có tài liệu AGM (hoặc ngược lại).
3. **Nếu người dùng yêu cầu chấm điểm / phân tích**:
   - Đánh giá chất lượng kinh doanh & dòng tiền từ BCTC.
   - Đánh giá Ban Lãnh đạo & tính minh bạch với cổ đông nhỏ lẻ từ tài liệu AGM (đặc biệt là tỷ lệ trích Quỹ khen thưởng phúc lợi KTPL và thảo luận ĐHĐCĐ).
   - Đưa ra kết luận và chấm điểm định giá tổng kết theo thang điểm chuẩn hóa:
     * Quy chuẩn: Benchmark lãi suất gửi tiết kiệm 10%/năm = 100 điểm.
     * Điểm ≥ 200: Siêu Hấp Dẫn (Cơ hội đầu tư xuất sắc, biên an toàn cao).
     * 150 - 200: Khả Quan (Doanh nghiệp tốt, định giá hợp lý).
     * 100 - 150: Theo Dõi (Bình thường hoặc cần chiết khấu thêm).
     * < 100: Kém Hấp Dẫn (Rủi ro cao hoặc định giá quá đắt).
`

  // 6. Compact prompt cho giao diện web
  const compactPrompt = `Bạn là Chuyên gia Phân tích Tài chính Cấp cao (CFA). Dưới đây là hồ sơ dữ liệu tài chính của mã **${sym} (${companyName})** từ dulieudautu.com:

- Mã: ${sym} (${exchange}) - Ngành: ${sector}
- Thị giá: ${marketPrice != null ? fmtPrice(marketPrice) : '—'}k | Vốn hóa: ${marketCap != null ? fmtBillion(marketCap) : '—'} tỷ | P/E: ${pe != null ? fmtNum(pe, 1) + 'x' : '—'} | Cổ tức: ${divYield != null ? fmtNum(divYield, 1) + '%' : '—'}
- Số tài liệu đính kèm tìm thấy: ${attachedDocs.length} tài liệu (${attachedDocs.map((d) => d.filename).join(', ') || 'Chưa có file .md'})
${quarterKqkdTable ? `\n${quarterKqkdTable}\n` : ''}

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
    attachedFiles: attachedDocs.map((d) => ({
      filename: d.filename,
      category: d.category,
      sizeKb: d.sizeKb,
    })),
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
