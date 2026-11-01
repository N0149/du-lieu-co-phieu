// ─────────────────────────────────────────────────────────────────────────────
// lib/mcp/server.ts — Remote MCP Server for Google Gemini, Claude & ChatGPT
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { buildStockAiBundle } from '@/lib/ai-bundle-service'
import { getBctcReport } from '@/lib/bctc-service'
import { getAgmReport } from '@/lib/agm-service'
import { getStock, upside, marginOfSafety } from '@/lib/data'
import reportsData from '@/data/reports-snapshot.json'
import {
  getAllNghienCuuAiReports,
  getNghienCuuAiReportBySlug,
  getNghienCuuAiReportsForTicker,
  type NghienCuuAiReport,
} from '@/lib/nghien-cuu-ai-service'
import { fmtBillion, fmtNum, fmtPct, fmtPrice } from '@/lib/format'

type ReportItem = {
  slug: string
  ticker: string | null
  title: string
  category: string
  date: string
  reportDate?: string
  driveDocId: string
  summary?: string | null
  targetPrice?: number | null
  currentPrice?: number | null
  recommendation?: string | null
  upside?: number | null
  bonusWelfareRate?: number | null
}

const reports = reportsData as ReportItem[]

export function createDulieudautuMcpServer() {
  const server = new McpServer({
    name: 'Dữ Liệu Đầu Tư (dulieudautu.com)',
    version: '1.1.0',
  })

  // 1. Tool: Tra cứu hồ sơ tài chính toàn diện 16 năm
  server.tool(
    'tra_cuu_ho_so_tai_chinh',
    'Tra cứu hồ sơ tài chính toàn diện: 16 năm BCTC (KQKD, CĐKT, LCTT), Thuyết minh bóc tách CAPEX & nợ vay, Nghị quyết ĐHĐCĐ & tỷ lệ Quỹ KTPL của một mã cổ phiếu.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu chứng khoán Việt Nam (ví dụ: MWG, HPG, DXP, FMC)'),
    },
    async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const bundle = await buildStockAiBundle(sym)
        return {
          content: [
            {
              type: 'text',
              text: bundle.markdownContent,
            },
          ],
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Không thể tổng hợp hồ sơ cho mã ${symbol}: ${msg}`,
            },
          ],
        }
      }
    }
  )

  // 2. Tool: Soi chất lượng dòng tiền CFO vs LNST
  server.tool(
    'soi_chat_luong_dong_tien',
    'Bóc tách sâu chất lượng lợi nhuận: So sánh Lợi nhuận sau thuế (LNST) với Dòng tiền thuần từ HĐKD (CFO). Đánh giá doanh nghiệp có thu tiền thật về không hay bị đọng ở Khoản phải thu và Tồn kho.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu cần soi dòng tiền (ví dụ: DXP, MWG, HPG)'),
    },
    async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const bundle = await buildStockAiBundle(sym)
        return {
          content: [
            {
              type: 'text',
              text: `### PHÂN TÍCH CHẤT LƯỢNG DÒNG TIỀN (CFO) MÃ ${sym} - ${bundle.companyName}:\n\n${bundle.markdownContent}`,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu dòng tiền: ${String(err)}` }],
        }
      }
    }
  )

  // 3. Tool: Soi nợ vay ngân hàng & chi phí lãi vay
  server.tool(
    'soi_no_vay_va_lai_vay',
    'Tra cứu chi tiết cơ cấu nợ vay ngắn hạn, nợ dài hạn, áp lực chi phí lãi vay và chi tiết các ngân hàng chủ nợ từ Thuyết minh BCTC.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu (ví dụ: HPG, NVL, MWG, DXP)'),
    },
    async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const bundle = await buildStockAiBundle(sym)
        return {
          content: [
            {
              type: 'text',
              text: `### CƠ CẤU NỢ VAY & LÃI VAY MÃ ${sym} (${bundle.companyName}):\n\n${bundle.markdownContent}`,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu nợ vay: ${String(err)}` }],
        }
      }
    }
  )

  // 4. Tool: Kế hoạch ĐHĐCĐ & Tỷ lệ trích Quỹ khen thưởng phúc lợi (KTPL)
  server.tool(
    'ke_hoach_dhdcd_va_ktpl',
    'Tra cứu Nghị quyết ĐHĐCĐ mới nhất: Kế hoạch doanh thu & lợi nhuận, chính sách chia cổ tức tiền mặt, và đặc biệt là Tỷ lệ trích Quỹ Khen thưởng Phúc lợi (KTPL) - chỉ số quan trọng đo lường tính minh bạch và công bằng với cổ đông nhỏ lẻ.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu (ví dụ: DXP, VNM, FPT)'),
    },
    async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const bundle = await buildStockAiBundle(sym)
        return {
          content: [
            {
              type: 'text',
              text: `### NGHỊ QUYẾT ĐHĐCĐ & QUỸ KTPL MÃ ${sym}:\n\n${bundle.markdownContent}`,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu ĐHĐCĐ: ${String(err)}` }],
        }
      }
    }
  )

  // 5. Tool: Định giá RNAV & Sàng lọc tài sản
  server.tool(
    'dinh_gia_rnav_tai_san',
    'Tra cứu định giá RNAV (Revalued Net Asset Value), bóc tách giá trị tài sản ngầm, bất động sản, dự án đầu tư và biên an toàn đầu tư.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu định giá RNAV (ví dụ: DXP, VOS, KBC, IDC)'),
    },
    async ({ symbol }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const stock = getStock(sym)
        if (!stock) {
          return {
            content: [
              {
                type: 'text',
                text: `Mã ${sym} hiện chưa có trong cơ sở dữ liệu định giá RNAV độc quyền. Vui lòng tra cứu bảng BCTC thông thường.`,
              },
            ],
          }
        }

        const up = upside(stock)
        const mos = marginOfSafety(stock)

        const lines = [
          `### ĐỊNH GIÁ RNAV & TÀI SẢN NGẦM: ${stock.ticker} - ${stock.name}`,
          `- Sàn niêm yết: ${stock.exchange} | Ngành: ${stock.sector}`,
          `- Thị giá hiện tại: ${fmtPrice(stock.marketPrice)} nghìn đồng`,
          `- Định giá RNAV: ${fmtPrice(stock.rnav)} nghìn đồng`,
          `- Dư địa tăng giá (Upside): ${up != null ? fmtPct(up) : '—'}`,
          `- Biên an toàn (Margin of Safety): ${mos != null ? fmtPct(mos) : '—'}`,
          `- P/E kỳ vọng: ${stock.forwardPE ? fmtNum(stock.forwardPE, 1) + 'x' : '—'} | Cổ tức: ${stock.dividendYield ? fmtNum(stock.dividendYield, 1) + '%' : '—'}`,
          `- Vốn hóa: ${stock.marketCap ? fmtBillion(stock.marketCap) + ' tỷ VNĐ' : '—'}`,
          `- Trạng thái: ${stock.status || 'Đã cập nhật BCTC mới nhất'}`,
        ]

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu RNAV: ${String(err)}` }],
        }
      }
    }
  )

  // 6. Tool: Kho báo cáo phân tích & Định giá CTCK (Kèm Nghiên cứu AI độc quyền)
  server.tool(
    'kho_bao_cao_va_upside',
    'Tìm kiếm trong kho báo cáo phân tích định giá của các CTCK hàng đầu (SSI, HSC, VCSC, VNDirect, Mirae Asset) và các bài Nghiên cứu chuyên sâu AI độc quyền. Xem giá mục tiêu, khuyến nghị mua/bán và tiềm năng tăng trưởng.',
    {
      queryOrSymbol: z
        .string()
        .describe('Mã cổ phiếu hoặc từ khóa ngành hàng (ví dụ: HPG, Cảng biển, Dệt may, Thép, SJE, LHG, S55)'),
    },
    async ({ queryOrSymbol }) => {
      try {
        const qUpper = queryOrSymbol.toUpperCase().trim()
        const qLower = queryOrSymbol.toLowerCase().trim()

        // 1. Kiểm tra trong kho Nghiên cứu chuyên sâu AI độc quyền trước
        const aiReports = getAllNghienCuuAiReports()
        const matchedAi = aiReports.filter(
          (r) =>
            (r.ticker && r.ticker.toUpperCase() === qUpper) ||
            r.title.toLowerCase().includes(qLower) ||
            r.summary.toLowerCase().includes(qLower)
        )

        const matched = reports.filter(
          (r) =>
            (r.ticker && r.ticker.toUpperCase() === qUpper) ||
            r.title.toLowerCase().includes(qLower) ||
            r.category.toLowerCase().includes(qLower) ||
            (r.summary && r.summary.toLowerCase().includes(qLower))
        )

        const lines: string[] = []

        if (matchedAi.length > 0) {
          lines.push(`### 🌟 BÁO CÁO NGHIÊN CỨU CHUYÊN SÂU AI ĐỘC QUYỀN (HỆ ĐIỂM ĐỊNH GIÁ LÃI KÉP):`)
          matchedAi.forEach((r) => {
            lines.push(
              `- **[${r.ticker || 'CHUYÊN ĐỀ'}] ${r.title}**\n` +
              `  • Điểm định giá: **${r.score != null ? `${r.score} ĐIỂM` : 'Chuyên đề'}** (${r.classification || 'Phân tích'})\n` +
              `  • Ngày nghiên cứu: ${r.date} | Thị giá: ${r.price ? `${r.price}k` : '—'}\n` +
              `  • Tóm tắt: ${r.summary}\n` +
              `  • *Gợi ý: Dùng tool "doc_toan_van_nghien_cuu_ai" với slug "${r.slug}" hoặc mã "${r.ticker}" để đọc toàn văn bài viết.*`
            )
          })
          lines.push(`\n---\n`)
        }

        if (matched.length > 0) {
          lines.push(`### 📑 BÁO CÁO PHÂN TÍCH DOANH NGHIỆP TỪ CÁC CTCK:`)
          matched.slice(0, 5).forEach((r) => {
            lines.push(
              `- **${r.ticker ? `[${r.ticker}] ` : ''}${r.title}**\n  Ngày: ${r.reportDate || r.date} | Giá MT: ${r.targetPrice ?? '—'}k | Giá TT: ${r.currentPrice ?? '—'}k | Upside: ${r.upside != null ? `+${r.upside}%` : '—'} | Khuyến nghị: ${r.recommendation ?? '—'}\n  Tóm tắt: ${r.summary || 'Không có tóm tắt'}`
            )
          })
        }

        if (lines.length === 0) {
          const topAi = aiReports
            .filter((r) => r.score != null)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, 5)

          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy báo cáo khớp từ khóa "${queryOrSymbol}".\nTop 5 cổ phiếu có điểm định giá AI cao nhất (Benchmark 10% gửi tiết kiệm = 100 điểm):\n${topAi
                  .map(
                    (r) =>
                      `- [${r.ticker}] ${r.title} | Điểm: ${r.score} ĐIỂM (${r.classification}) | Thị giá: ${r.price ? `${r.price}k` : '—'}`
                  )
                  .join('\n')}`,
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: lines.join('\n\n'),
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu báo cáo: ${String(err)}` }],
        }
      }
    }
  )

  // 7. Tool: Đọc toàn văn Thuyết minh BCTC bóc tách (Bán niên 2026 & Quý 3/2026)
  server.tool(
    'doc_thuyet_minh_bctc',
    'Đọc toàn bộ văn bản bóc tách Thuyết minh Báo cáo tài chính (Bán niên 2026 hoặc Quý 3/2026) của một doanh nghiệp. Bao gồm chi tiết: Nợ vay & chi phí lãi vay ngân hàng, Chi phí xây dựng cơ bản dở dang (CAPEX), Các khoản phải thu, Hàng tồn kho, Đầu tư tài chính.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu (ví dụ: MWG, HPG, DXP, MSN)'),
      period: z
        .enum(['Quy_3_2026', 'Ban_Nien_2026', 'all'])
        .optional()
        .describe('Kỳ báo cáo cần đọc: "Quy_3_2026", "Ban_Nien_2026", hoặc "all" để lấy cả 2 kỳ (mặc định: "all")'),
      reportType: z
        .enum(['HopNhat', 'CongTyMe'])
        .optional()
        .describe('Loại báo cáo: "HopNhat" (mặc định) hoặc "CongTyMe"'),
    },
    async ({ symbol, period = 'all', reportType = 'HopNhat' }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const prefType = reportType || 'HopNhat'
        const blocks: string[] = []

        const periodsToFetch =
          period === 'all'
            ? ['Quy_3_2026', 'Ban_Nien_2026']
            : [period]

        for (const p of periodsToFetch) {
          const rep =
            getBctcReport(sym, prefType, p) ||
            getBctcReport(sym, prefType === 'HopNhat' ? 'CongTyMe' : 'HopNhat', p)

          if (rep && rep.hasReport && rep.sections.length > 0) {
            const secTexts = rep.sections
              .filter((s) => s.rawMarkdown && s.rawMarkdown.trim().length > 0)
              .map((s) => `### ${s.title}\n${s.rawMarkdown}`)

            if (secTexts.length > 0) {
              const label = p === 'Quy_3_2026' ? 'Quý 3/2026' : 'Bán Niên 2026'
              blocks.push(`## THUYẾT MINH BCTC ${label} - ${sym} (${rep.reportTypeLabel}):\n\n${secTexts.join('\n\n')}`)
            }
          }
        }

        if (blocks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Chưa có dữ liệu Thuyết minh BCTC bóc tách cho mã ${sym} trong kỳ yêu cầu (${period}).`,
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: blocks.join('\n\n---\n\n'),
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi đọc thuyết minh BCTC: ${String(err)}` }],
        }
      }
    }
  )

  // 8. Tool: Đọc toàn văn tài liệu Đại hội đồng cổ đông (.md)
  server.tool(
    'doc_toan_van_dhdcd',
    'Đọc toàn văn tài liệu Đại hội đồng cổ đông (.md) đã được bóc tách chi tiết 4 phần: 1. KQKD & Kế hoạch doanh thu/lợi nhuận, 2. Phân phối lợi nhuận, Cổ tức tiền mặt, Tỷ lệ trích Quỹ khen thưởng phúc lợi (KTPL), 3. Phiên thảo luận hỏi đáp trực tiếp (Q&A) với Ban Lãnh đạo, 4. Phương án tăng vốn / phát hành ESOP.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu (ví dụ: MWG, HPG, DXP, MBB)'),
      year: z
        .number()
        .optional()
        .describe('Năm tổ chức ĐHĐCĐ (mặc định: 2026)'),
    },
    async ({ symbol, year = 2026 }) => {
      try {
        const sym = symbol.toUpperCase().trim()
        const targetYear = year || 2026
        const agm = getAgmReport(sym, targetYear) || getAgmReport(sym, 2025)

        if (!agm || !agm.hasReport || agm.sections.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Chưa có tài liệu bóc tách ĐHĐCĐ cho mã ${sym} năm ${targetYear}.`,
              },
            ],
          }
        }

        const parts: string[] = [
          `# ${agm.title}`,
          `- **Mã cổ phiếu**: ${sym}`,
          `- **Năm ĐHĐCĐ**: ${agm.year}`,
        ]

        if (agm.ktplRate != null) {
          parts.push(`- **Tỷ lệ trích Quỹ khen thưởng & phúc lợi (KTPL)**: ${agm.ktplRate}% LNST`)
        }
        if (agm.ktplVnd != null) {
          parts.push(`- **Số tiền trích Quỹ KTPL**: ${fmtBillion(agm.ktplVnd)} tỷ VNĐ`)
        }

        for (const sec of agm.sections) {
          if (sec.rawMarkdown && sec.rawMarkdown.trim().length > 0) {
            parts.push(`## ${sec.title}\n\n${sec.rawMarkdown}`)
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: parts.join('\n\n'),
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi đọc tài liệu ĐHĐCĐ: ${String(err)}` }],
        }
      }
    }
  )

  // 9. Tool MỚI: Tra cứu danh mục bài Nghiên Cứu Chuyên Sâu AI & Hệ Điểm Định Giá
  server.tool(
    'tra_cuu_nghien_cuu_ai',
    'Tra cứu danh mục các bài Nghiên Cứu Chuyên Sâu AI & Hệ Điểm Định Giá Lãi Kép độc quyền (quy chuẩn Benchmark gửi tiết kiệm 10%/năm = 100 điểm). Lọc theo mã cổ phiếu, từ khóa hoặc mức điểm xếp hạng.',
    {
      queryOrSymbol: z
        .string()
        .optional()
        .describe('Mã cổ phiếu (ví dụ: SJE, S55, LHG, ABT, MWG) hoặc từ khóa (ví dụ: Thủy điện, KCN, Cao su, BCTC Quý 3). Bỏ trống để lấy toàn bộ.'),
      minScore: z
        .number()
        .optional()
        .describe('Lọc cổ phiếu có điểm định giá tối thiểu (ví dụ: 150 để lấy nhóm Khả quan & Siêu hấp dẫn, 200 để lấy nhóm Siêu hấp dẫn)'),
    },
    async ({ queryOrSymbol, minScore }) => {
      try {
        let list = getAllNghienCuuAiReports()

        if (queryOrSymbol) {
          const qUpper = queryOrSymbol.toUpperCase().trim()
          const qLower = queryOrSymbol.toLowerCase().trim()
          list = list.filter(
            (r) =>
              (r.ticker && r.ticker.toUpperCase() === qUpper) ||
              r.title.toLowerCase().includes(qLower) ||
              r.summary.toLowerCase().includes(qLower)
          )
        }

        if (minScore != null) {
          list = list.filter((r) => r.score != null && r.score >= minScore)
        }

        if (list.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy bài nghiên cứu chuyên sâu AI nào khớp với điều kiện tìm kiếm.`,
              },
            ],
          }
        }

        const itemsText = list.map((r) => {
          const sc = r.score != null ? `${r.score} ĐIỂM (${r.classification || 'Phân tích'})` : 'Chuyên đề phân tích'
          const px = r.price ? `${r.price}k` : '—'
          return `### [${r.ticker || 'CHUYÊN ĐỀ'}] ${r.title}\n` +
            `- **Mã cổ phiếu**: ${r.ticker || '—'}\n` +
            `- **Điểm định giá lãi kép**: **${sc}**\n` +
            `- **Ngày phân tích**: ${r.date} | **Thị giá**: ${px}\n` +
            `- **Tóm tắt cốt lõi**: ${r.summary}\n` +
            `- **Mã định danh (slug)**: \`${r.slug}\`\n` +
            `- *Gợi ý: Gọi tool "doc_toan_van_nghien_cuu_ai" với symbol="${r.ticker}" hoặc slug="${r.slug}" để đọc toàn văn bài viết.*`
        })

        return {
          content: [
            {
              type: 'text',
              text: `## KHO NGHIÊN CỨU CHUYÊN SÂU AI & HỆ ĐIỂM ĐỊNH GIÁ (${list.length} bài phù hợp):\n\n${itemsText.join('\n\n---\n\n')}`,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu nghiên cứu AI: ${String(err)}` }],
        }
      }
    }
  )

  // 10. Tool MỚI: Đọc toàn văn nội dung bài Nghiên Cứu Chuyên Sâu AI
  server.tool(
    'doc_toan_van_nghien_cuu_ai',
    'Đọc TOÀN VĂN nội dung bài Nghiên Cứu Chuyên Sâu AI của một mã cổ phiếu (ví dụ: SJE, S55, ABT, LHG, MWG, CAT, IDV, VCP, DRI...). Bao gồm: Phân tích 5 trụ cột (Forensic), Bóc tách BCTC & Nợ vay, Định giá từng phần (SOTP/RNAV), Chấm điểm sinh lời lãi kép, Bảng số liệu đối chiếu tài chính, Rủi ro & Khuyến nghị.',
    {
      symbolOrSlug: z
        .string()
        .describe('Mã cổ phiếu (ví dụ: SJE, S55, ABT, LHG, TYA, MWG) HOẶC slug của bài viết (ví dụ: "sje-sje-diem-24-10-2026")'),
    },
    async ({ symbolOrSlug }) => {
      try {
        const query = symbolOrSlug.trim()
        const qUpper = query.toUpperCase()

        // 1. Tìm theo slug trước
        let detail = getNghienCuuAiReportBySlug(query)

        // 2. Nếu không tìm thấy theo slug, tìm theo mã cổ phiếu
        if (!detail) {
          const tickerReports = getNghienCuuAiReportsForTicker(qUpper)
          if (tickerReports.length > 0) {
            // Lấy báo cáo mới nhất hoặc có điểm cao nhất
            detail = getNghienCuuAiReportBySlug(tickerReports[0].slug)
          }
        }

        if (!detail || !detail.markdown) {
          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy tài liệu toàn văn nghiên cứu chuyên sâu AI cho "${symbolOrSlug}". Vui lòng dùng tool "tra_cuu_nghien_cuu_ai" để xem danh sách các mã hiện có.`,
              },
            ],
          }
        }

        const scoreInfo = detail.score != null
          ? `\n- **Điểm xếp hạng định giá**: **${detail.score} ĐIỂM** (${detail.classification})`
          : ''

        const headerInfo = `# ${detail.displayTitle}\n` +
          `- **Mã cổ phiếu**: ${detail.ticker || '—'}\n` +
          `- **Ngày nghiên cứu**: ${detail.date}` +
          scoreInfo +
          (detail.price ? `\n- **Thị giá tại thời điểm phân tích**: ${detail.price} nghìn đồng` : '') +
          `\n\n---\n\n`

        return {
          content: [
            {
              type: 'text',
              text: headerInfo + detail.markdown,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi đọc toàn văn nghiên cứu AI: ${String(err)}` }],
        }
      }
    }
  )

  return server
}
