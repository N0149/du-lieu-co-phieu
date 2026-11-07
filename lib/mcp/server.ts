// ─────────────────────────────────────────────────────────────────────────────
// lib/mcp/server.ts — Remote MCP Server for Google Gemini, Claude & ChatGPT
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { buildStockAiBundle } from '@/lib/ai-bundle-service'
import { getBctcReport } from '@/lib/bctc-service'
import { getAgmReport } from '@/lib/agm-service'
import { getStock, upside, marginOfSafety } from '@/lib/data'
import { getEnrichedScreenerStocks, type ScreenerStockItem } from '@/lib/screener-data-service'
import { getDisclosuresBySymbol, getRecentMarketDisclosures, type CorporateDisclosure } from '@/lib/disclosures'
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
    name: 'dulieudautu.com',
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
            const scLive = r.currentScore != null ? `**${r.currentScore} ĐIỂM** [${r.currentClassification || ''}] (Điểm gốc: ${r.score}đ)` : (r.score != null ? `${r.score} ĐIỂM` : 'Chuyên đề')
            const deltaStr = r.scoreDelta != null ? (r.scoreDelta > 0 ? ` (+${r.scoreDelta}đ)` : r.scoreDelta < 0 ? ` (${r.scoreDelta}đ)` : '') : ''
            const pxLive = r.currentPrice ? `${r.currentPrice}k (Thị giá hiện tại)` : (r.price ? `${r.price}k` : '—')
            lines.push(
              `- **[${r.ticker || 'CHUYÊN ĐỀ'}] ${r.title}**\n` +
              `  • Điểm định giá hiện tại: ${scLive}${deltaStr}\n` +
              `  • Thị giá: ${pxLive} | Ngày nghiên cứu: ${r.date} (Giá gốc: ${r.price ? `${r.price}k` : '—'})\n` +
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
    'Tra cứu danh mục các bài Nghiên Cứu Chuyên Sâu AI & Hệ Điểm Định Giá Lãi Kép độc quyền (tự động điều chỉnh theo thị giá thời gian thực; quy chuẩn Benchmark gửi tiết kiệm 10%/năm = 100 điểm). Lọc theo mã cổ phiếu, từ khóa hoặc mức điểm xếp hạng.',
    {
      queryOrSymbol: z
        .string()
        .optional()
        .describe('Mã cổ phiếu (ví dụ: SJE, S55, LHG, ABT, MWG) hoặc từ khóa (ví dụ: Thủy điện, KCN, Cao su, BCTC Quý 3). Bỏ trống để lấy toàn bộ.'),
      minScore: z
        .number()
        .optional()
        .describe('Lọc cổ phiếu có điểm định giá hiện tại tối thiểu (ví dụ: 150 để lấy nhóm Khả quan & Siêu hấp dẫn, 200 để lấy nhóm Siêu hấp dẫn)'),
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
          list = list.filter((r) => (r.currentScore ?? r.score) != null && (r.currentScore ?? r.score)! >= minScore)
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
          let scInfo = 'Chuyên đề phân tích'
          if (r.currentScore != null) {
            const deltaStr = r.scoreDelta != null ? (r.scoreDelta > 0 ? ` (+${r.scoreDelta}đ do thị giá thấp hơn giá NC)` : r.scoreDelta < 0 ? ` (${r.scoreDelta}đ do thị giá cao hơn giá NC)` : ' (bằng giá gốc)') : ''
            scInfo = `**${r.currentScore} ĐIỂM** [${r.currentClassification || 'Khả quan'}]${deltaStr} (Điểm gốc lúc NC: ${r.score}đ)`
          } else if (r.score != null) {
            scInfo = `**${r.score} ĐIỂM** (${r.classification || 'Phân tích'})`
          }

          const pxCurrent = r.currentPrice ? `${r.currentPrice}k` : '—'
          const pxResearch = r.price ? `${r.price}k` : '—'

          return `### [${r.ticker || 'CHUYÊN ĐỀ'}] ${r.title}\n` +
            `- **Mã cổ phiếu**: ${r.ticker || '—'}\n` +
            `- **Điểm định giá hiện tại**: ${scInfo}\n` +
            `- **Thị giá hiện tại**: ${pxCurrent} | **Giá lúc nghiên cứu**: ${pxResearch} (${r.date})\n` +
            `- **Tóm tắt cốt lõi**: ${r.summary}\n` +
            `- **Mã định danh (slug)**: \`${r.slug}\`\n` +
            `- *Gợi ý: Gọi tool "doc_toan_van_nghien_cuu_ai" với symbol="${r.ticker}" hoặc slug="${r.slug}" để đọc toàn văn bài viết.*`
        })

        return {
          content: [
            {
              type: 'text',
              text: `## KHO NGHIÊN CỨU CHUYÊN SÂU AI & HỆ ĐIỂM ĐỊNH GIÁ (${list.length} bài phù hợp):\n*(Ghi chú: Điểm số tự động điều chỉnh linh hoạt theo thị giá hiện tại: Điểm_hiện_tại = Điểm_gốc × (Giá_gốc / Giá_hiện_tại))*\n\n${itemsText.join('\n\n---\n\n')}`,
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

  // 10. Tool MỚI: Đọc toàn văn nội dung bài Nghiên CỨu Chuyên Sâu AI
  server.tool(
    'doc_toan_van_nghien_cuu_ai',
    'Đọc TOÀN VĂN nội dung bài Nghiên Cứu Chuyên Sâu AI của một mã cổ phiếu (ví dụ: SJE, S55, ABT, LHG, MWG, CAT, IDV, VCP, DRI...). Bao gồm: Phân tích 5 trụ cột (Forensic), Bóc tách BCTC & Nợ vay, Định giá từng phần (SOTP/RNAV), Chấm điểm sinh lời lãi kép theo giá hiện tại, Bảng số liệu đối chiếu tài chính, Rủi ro & Khuyến nghị.',
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

        let scoreInfo = ''
        if (detail.currentScore != null) {
          const deltaSign = detail.scoreDelta != null && detail.scoreDelta > 0 ? '+' : ''
          scoreInfo = `\n- **Điểm định giá theo thị giá hiện tại (${detail.currentPrice ?? '—'}k)**: **${detail.currentScore} ĐIỂM** (${detail.currentClassification || 'Khả quan'}) [Biến động: ${deltaSign}${detail.scoreDelta ?? 0} điểm]\n- **Điểm gốc lúc nghiên cứu**: ${detail.score} ĐIỂM (${detail.classification}) tại giá ${detail.price}k\n- *Quy tắc: Điểm hiện tại = Điểm gốc × (Giá gốc / Giá hiện tại)*`
        } else if (detail.score != null) {
          scoreInfo = `\n- **Điểm xếp hạng định giá**: **${detail.score} ĐIỂM** (${detail.classification})`
        }

        const headerInfo = `# ${detail.displayTitle}\n` +
          `- **Mã cổ phiếu**: ${detail.ticker || '—'}\n` +
          `- **Ngày nghiên cứu**: ${detail.date}` +
          scoreInfo +
          (detail.price ? `\n- **Thị giá lúc phân tích**: ${detail.price} nghìn đồng` : '') +
          (detail.currentPrice ? ` | **Thị giá hiện tại**: ${detail.currentPrice} nghìn đồng` : '') +
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

  // 11. Tool: Bộ lọc cổ phiếu thông minh (Screener)
  server.tool(
    'bo_loc_co_phieu',
    'Sàng lọc cổ phiếu thông minh trên toàn bộ 1.530+ mã (HOSE, HNX, UPCoM) theo các tiêu chí tài chính chuyên sâu: Ngành, Sàn, P/E, P/B, ROE, Tỷ suất cổ tức (Dividend Yield), Vốn hóa, Tỷ lệ trích Quỹ KTPL, và Điểm đánh giá AI 360.',
    {
      sector: z
        .string()
        .optional()
        .describe('Ngành nghề kinh doanh (ví dụ: "Cảng biển", "Thép", "Ngân hàng", "Bất động sản", "Thực phẩm & Đồ uống", "Hóa chất", "Bán lẻ", "Dầu khí", "Điện", "Thủy sản", "Công nghệ thông tin")'),
      exchange: z
        .enum(['HOSE', 'HNX', 'UPCOM', 'ALL'])
        .optional()
        .describe('Sàn niêm yết: HOSE, HNX, UPCOM hoặc ALL (mặc định ALL)'),
      minRoe: z
        .number()
        .optional()
        .describe('ROE tối thiểu (%) - ví dụ: 15 để lọc các doanh nghiệp có ROE >= 15%'),
      maxPe: z
        .number()
        .optional()
        .describe('Chỉ số P/E tối đa (lần) - ví dụ: 10 để lọc cổ phiếu có P/E <= 10x'),
      maxPb: z
        .number()
        .optional()
        .describe('Chỉ số P/B tối đa (lần) - ví dụ: 1.5 để lọc cổ phiếu định giá P/B <= 1.5x'),
      minDividendYield: z
        .number()
        .optional()
        .describe('Tỷ suất cổ tức tối thiểu (%) - ví dụ: 5 để lọc cổ phiếu có cổ tức tiền mặt >= 5%'),
      maxKtplRate: z
        .number()
        .optional()
        .describe('Tỷ lệ trích Quỹ Khen thưởng Phúc lợi tối đa (%) - ví dụ: 10 để lọc doanh nghiệp tôn trọng cổ đông, trích KTPL <= 10% LNST'),
      minMarketCap: z
        .number()
        .optional()
        .describe('Vốn hóa thị trường tối thiểu (tỷ VNĐ) - ví dụ: 1000 cho công ty vốn hóa >= 1.000 tỷ'),
      sortBy: z
        .enum(['roe', 'pe', 'pb', 'marketCap', 'dy', 'upside', 'score360'])
        .optional()
        .describe('Tiêu chí sắp xếp: "roe" (ROE cao nhất), "pe" (P/E thấp nhất), "pb" (P/B rẻ nhất), "dy" (Cổ tức cao nhất), "marketCap" (Vốn hóa lớn nhất), "upside" (Tiềm năng tăng giá lớn nhất), "score360" (Điểm 360 cao nhất). Mặc định là "roe".'),
      limit: z
        .number()
        .optional()
        .describe('Số lượng cổ phiếu hiển thị tối đa (mặc định 15, tối đa 30)'),
    },
    async ({
      sector,
      exchange,
      minRoe,
      maxPe,
      maxPb,
      minDividendYield,
      maxKtplRate,
      minMarketCap,
      sortBy = 'roe',
      limit = 15,
    }) => {
      try {
        const stocks = getEnrichedScreenerStocks()
        let filtered = stocks

        if (sector && sector.trim()) {
          const s = sector.toLowerCase().trim()
          filtered = filtered.filter(
            (st) =>
              (st.sector && st.sector.toLowerCase().includes(s)) ||
              (st.icbL1 && st.icbL1.toLowerCase().includes(s)) ||
              (st.icbL2 && st.icbL2.toLowerCase().includes(s))
          )
        }

        if (exchange && exchange !== 'ALL') {
          const ex = exchange.toUpperCase()
          filtered = filtered.filter((st) => st.exchange?.toUpperCase() === ex)
        }

        if (minRoe != null) {
          filtered = filtered.filter((st) => st.roe != null && st.roe >= minRoe)
        }

        if (maxPe != null) {
          filtered = filtered.filter((st) => st.pe != null && st.pe > 0 && st.pe <= maxPe)
        }

        if (maxPb != null) {
          filtered = filtered.filter((st) => st.pb != null && st.pb > 0 && st.pb <= maxPb)
        }

        if (minDividendYield != null) {
          filtered = filtered.filter((st) => st.dy != null && st.dy >= minDividendYield)
        }

        if (maxKtplRate != null) {
          filtered = filtered.filter((st) => st.ktplRate == null || st.ktplRate <= maxKtplRate)
        }

        if (minMarketCap != null) {
          filtered = filtered.filter((st) => st.marketCap != null && st.marketCap >= minMarketCap)
        }

        // Sắp xếp kết quả
        filtered.sort((a, b) => {
          if (sortBy === 'pe') return (a.pe ?? 999) - (b.pe ?? 999)
          if (sortBy === 'pb') return (a.pb ?? 999) - (b.pb ?? 999)
          if (sortBy === 'dy') return (b.dy ?? -999) - (a.dy ?? -999)
          if (sortBy === 'marketCap') return (b.marketCap ?? -999) - (a.marketCap ?? -999)
          if (sortBy === 'upside') return (b.upside ?? -999) - (a.upside ?? -999)
          if (sortBy === 'score360') return (b.score360 ?? -999) - (a.score360 ?? -999)
          return (b.roe ?? -999) - (a.roe ?? -999) // default: roe
        })

        const totalMatched = filtered.length
        const displayLimit = Math.min(limit, 30)
        const topList = filtered.slice(0, displayLimit)

        if (topList.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy cổ phiếu nào thỏa mãn đồng thời các tiêu chí đã chọn. Bạn có thể nới lỏng điều kiện lọc (ví dụ: hạ minRoe hoặc tăng maxPe) để tìm kiếm thêm cơ hội.`,
              },
            ],
          }
        }

        const criteriaList: string[] = []
        if (sector) criteriaList.push(`Ngành: "${sector}"`)
        if (exchange && exchange !== 'ALL') criteriaList.push(`Sàn: ${exchange}`)
        if (minRoe != null) criteriaList.push(`ROE >= ${minRoe}%`)
        if (maxPe != null) criteriaList.push(`P/E <= ${maxPe}x`)
        if (maxPb != null) criteriaList.push(`P/B <= ${maxPb}x`)
        if (minDividendYield != null) criteriaList.push(`Cổ tức >= ${minDividendYield}%`)
        if (maxKtplRate != null) criteriaList.push(`Quỹ KTPL <= ${maxKtplRate}%`)
        if (minMarketCap != null) criteriaList.push(`Vốn hóa >= ${fmtBillion(minMarketCap)} tỷ`)

        const tableRows = topList.map((st, idx) => {
          const p = st.price ? fmtPrice(st.price) : '—'
          const pe = st.pe != null ? fmtNum(st.pe, 1) + 'x' : '—'
          const pb = st.pb != null ? fmtNum(st.pb, 1) + 'x' : '—'
          const roe = st.roe != null ? fmtNum(st.roe, 1) + '%' : '—'
          const dy = st.dy != null && st.dy > 0 ? fmtNum(st.dy, 1) + '%' : '—'
          const cap = st.marketCap ? fmtBillion(st.marketCap) : '—'
          const ktpl = st.ktplRate != null ? fmtNum(st.ktplRate, 1) + '%' : '—'
          const score = st.score360 != null ? `${st.score360}/10` : '—'

          return `| ${idx + 1} | **${st.ticker}** | ${st.name} | ${st.exchange} | ${st.sector || '—'} | ${p} | ${pe} | ${pb} | ${roe} | ${dy} | ${cap} | ${ktpl} | ${score} |`
        })

        const markdownText = [
          `### KẾT QUẢ SÀNG LỌC CỔ PHIẾU (Tìm thấy ${totalMatched} mã thỏa mãn, hiển thị top ${topList.length}):`,
          `- **Tiêu chí lọc**: ${criteriaList.length > 0 ? criteriaList.join(' | ') : 'Tất cả 1.530+ mã'}`,
          `- **Sắp xếp theo**: ${sortBy.toUpperCase()}\n`,
          `| STT | Mã CP | Tên Doanh Nghiệp | Sàn | Ngành | Thị giá (k) | P/E | P/B | ROE | Cổ tức | Vốn hóa (tỷ) | Quỹ KTPL | Điểm 360 |`,
          `|:---:|:---:|:---|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|`,
          ...tableRows,
          `\n> **Gợi ý phân tích tiếp theo**: Bạn có thể gọi tool \`tra_cuu_ho_so_tai_chinh\` hoặc \`so_sanh_co_phieu\` với các mã tiêu biểu ở trên để phân tích sâu dòng tiền, nợ vay ngân hàng và tài sản ngầm.`,
        ].join('\n')

        return {
          content: [
            {
              type: 'text',
              text: markdownText,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi sàng lọc cổ phiếu: ${String(err)}` }],
        }
      }
    }
  )

  // 12. Tool: So sánh đối đầu các cổ phiếu (Peer Comparison Matrix)
  server.tool(
    'so_sanh_co_phieu',
    'So sánh đối đầu toàn diện từ 2 đến 5 mã cổ phiếu (cùng ngành hoặc khác ngành). Đối chiếu trực tiếp: Định giá (P/E, P/B), Khả năng sinh lời (ROE, ROA, Biên LN gộp, Biên LN ròng), Đòn bẩy & Sức khỏe tài chính (Nợ vay, Tiền mặt, Nợ/VCSH), Chính sách cổ tức & Quỹ KTPL, và Điểm đánh giá AI 360.',
    {
      symbols: z
        .array(z.string().min(3).max(5))
        .min(2)
        .max(5)
        .describe('Danh sách từ 2 đến 5 mã cổ phiếu cần so sánh đối đầu (ví dụ: ["HPG", "HSG", "NKG"] hoặc ["GMD", "HAH", "DVP"])'),
    },
    async ({ symbols }) => {
      try {
        const syms = symbols.map((s) => s.toUpperCase().trim())
        const allStocks = getEnrichedScreenerStocks()
        const stockMap = new Map(allStocks.map((st) => [st.ticker.toUpperCase(), st]))

        const matchedStocks: ScreenerStockItem[] = []
        for (const s of syms) {
          const found = stockMap.get(s)
          if (found) {
            matchedStocks.push(found)
          } else {
            const fallback = getStock(s)
            if (fallback) {
              matchedStocks.push({
                ticker: fallback.ticker,
                name: fallback.name,
                exchange: (fallback.exchange as any) || 'HOSE',
                sector: fallback.sector || '',
                icbL1: fallback.sector || '',
                icbL2: fallback.sector || '',
                price: fallback.marketPrice || null,
                marketCap: fallback.marketCap || null,
                pe: fallback.forwardPE || null,
                peAdjusted: null,
                pb: null,
                roe: null,
                roa: null,
                eps: null,
                bvps: null,
                div: null,
                dy: fallback.dividendYield || null,
                change1w: null,
                change1m: null,
                change3m: null,
                change6m: null,
                change1y: null,
                change3y: null,
                changeYtd: null,
                rsi14: null,
                volume20d: null,
                debtToEquity: null,
                netMargin: null,
                grossMargin: null,
                revGrowthYoY: null,
                profitGrowthYoY: null,
                capexGrowth: null,
                cashRatio: null,
                ktplRate: null,
                ktplVnd: null,
                score360: null,
                score360Rating: null,
                reportCount: 0,
                targetPrice: fallback.rnav || null,
                upside: upside(fallback),
                foreignRate: null,
                stateRate: null,
                isVN30: false,
                isPort: false,
              })
            }
          }
        }

        if (matchedStocks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy dữ liệu cho các mã cổ phiếu yêu cầu: ${syms.join(', ')}.`,
              },
            ],
          }
        }

        const headerTickers = matchedStocks.map((s) => `**${s.ticker}**`).join(' | ')
        const headerAlign = matchedStocks.map(() => ':---:').join('|')

        const row = (label: string, getter: (s: ScreenerStockItem) => string) => {
          return `| ${label} | ` + matchedStocks.map(getter).join(' | ') + ' |'
        }

        const lines: string[] = [
          `### BẢNG SO SÁNH ĐỐI ĐẦU: ${matchedStocks.map((s) => s.ticker).join(' VS ')}`,
          `\n#### 1. THÔNG TIN CHUNG & QUY MÔ`,
          `| Tiêu chí | ${headerTickers} |`,
          `|:---|${headerAlign}|`,
          row('Doanh nghiệp', (s) => s.name),
          row('Sàn niêm yết', (s) => s.exchange),
          row('Ngành nghề', (s) => s.sector || '—'),
          row('Thị giá (nghìn đồng)', (s) => s.price ? fmtPrice(s.price) : '—'),
          row('Vốn hóa (tỷ VNĐ)', (s) => s.marketCap ? fmtBillion(s.marketCap) : '—'),

          `\n#### 2. ĐỊNH GIÁ & TIỀM NĂNG TĂNG TRƯỞNG`,
          `| Tiêu chí | ${headerTickers} |`,
          `|:---|${headerAlign}|`,
          row('P/E (lần)', (s) => s.pe != null ? fmtNum(s.pe, 1) + 'x' : '—'),
          row('P/B (lần)', (s) => s.pb != null ? fmtNum(s.pb, 1) + 'x' : '—'),
          row('EPS (VND)', (s) => s.eps != null ? fmtNum(s.eps) : '—'),
          row('BVPS (VND)', (s) => s.bvps != null ? fmtNum(s.bvps) : '—'),
          row('Giá MT CTCK (k)', (s) => s.targetPrice != null ? fmtPrice(s.targetPrice) : '—'),
          row('Tiềm năng Upside', (s) => s.upside != null ? fmtPct(s.upside) : '—'),

          `\n#### 3. KHẢ NĂNG SINH LỜI & HIỆU QUẢ VỐN`,
          `| Tiêu chí | ${headerTickers} |`,
          `|:---|${headerAlign}|`,
          row('ROE (%)', (s) => s.roe != null ? fmtNum(s.roe, 1) + '%' : '—'),
          row('ROA (%)', (s) => s.roa != null ? fmtNum(s.roa, 1) + '%' : '—'),
          row('Biên LN gộp (%)', (s) => s.grossMargin != null ? fmtNum(s.grossMargin, 1) + '%' : '—'),
          row('Biên LN ròng (%)', (s) => s.netMargin != null ? fmtNum(s.netMargin, 1) + '%' : '—'),
          row('Tăng trưởng DT YoY', (s) => s.revGrowthYoY != null ? fmtPct(s.revGrowthYoY) : '—'),
          row('Tăng trưởng LNST YoY', (s) => s.profitGrowthYoY != null ? fmtPct(s.profitGrowthYoY) : '—'),

          `\n#### 4. SỨC KHỎE TÀI CHÍNH & ĐÒN BẨY NỢ`,
          `| Tiêu chí | ${headerTickers} |`,
          `|:---|${headerAlign}|`,
          row('Tổng nợ vay (tỷ VNĐ)', (s) => s.totalDebtQ != null ? fmtBillion(s.totalDebtQ) : '—'),
          row('Tổng tiền mặt & tiền gửi (tỷ VNĐ)', (s) => s.totalCashQ != null ? fmtBillion(s.totalCashQ) : '—'),
          row('Tỷ lệ Nợ vay / VCSH (D/E)', (s) => s.debtToEquity != null ? fmtNum(s.debtToEquity, 2) + 'x' : '—'),

          `\n#### 5. ĐÃI NGỘ CỔ ĐÔNG & ĐÁNH GIÁ 360°`,
          `| Tiêu chí | ${headerTickers} |`,
          `|:---|${headerAlign}|`,
          row('Tỷ suất cổ tức tiền mặt', (s) => s.dy != null && s.dy > 0 ? fmtNum(s.dy, 1) + '%' : '—'),
          row('Trích Quỹ KTPL / LNST', (s) => s.ktplRate != null ? fmtNum(s.ktplRate, 1) + '%' : '—'),
          row('Điểm AI 360°', (s) => s.score360 != null ? `${s.score360}/10 (${s.score360Rating || ''})` : '—'),
        ]

        return {
          content: [
            {
              type: 'text',
              text: lines.join('\n'),
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi so sánh cổ phiếu: ${String(err)}` }],
        }
      }
    }
  )

  // 13. Tool: Tra cứu Sự kiện Doanh nghiệp, Lịch Cổ tức & Giao dịch Nội bộ
  server.tool(
    'su_kien_va_cong_bo_thong_tin',
    'Tra cứu công bố thông tin và sự kiện doanh nghiệp niêm yết mới nhất: Lịch chi trả cổ tức (tiền mặt & cổ phiếu, ngày giao dịch không hưởng quyền - GDKHQ), Giao dịch của Lãnh đạo & Cổ đông lớn, Nghị quyết ĐHĐCĐ & HĐQT, Thông báo cảnh báo / diện kiểm soát.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .optional()
        .describe('Mã cổ phiếu cần tra cứu (ví dụ: HPG, VNM, MWG). Để trống nếu muốn xem sự kiện toàn thị trường.'),
      type: z
        .enum(['TAT_CA', 'CO_TUC', 'GIAO_DICH_NOI_BO', 'DHDCD', 'NGHI_QUYET_HDQT', 'CANH_BAO_KIEM_SOAT'])
        .optional()
        .describe('Loại sự kiện cần lọc: "TAT_CA" (mặc định), "CO_TUC" (Cổ tức tiền mặt/cổ phiếu, GDKHQ), "GIAO_DICH_NOI_BO" (Lãnh đạo & người có liên quan mua/bán), "DHDCD" (Đại hội cổ đông), "NGHI_QUYET_HDQT" (Nghị quyết HĐQT), "CANH_BAO_KIEM_SOAT" (Cảnh báo, đình chỉ, kiểm soát)'),
      limit: z
        .number()
        .optional()
        .describe('Số lượng sự kiện tối đa cần lấy (mặc định 15, tối đa 30)'),
    },
    async ({ symbol, type = 'TAT_CA', limit = 15 }) => {
      try {
        const maxItems = Math.min(limit, 30)
        let list: CorporateDisclosure[] = []

        if (symbol && symbol.trim()) {
          const sym = symbol.toUpperCase().trim()
          list = getDisclosuresBySymbol(sym, 50)
          if (type && type !== 'TAT_CA') {
            list = list.filter((it) => it.doc_type === type)
          }
        } else {
          list = getRecentMarketDisclosures({
            limit: maxItems * 2,
            docType: type === 'TAT_CA' ? undefined : type,
          })
        }

        const items = list.slice(0, maxItems)

        if (items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy sự kiện hay công bố thông tin nào phù hợp với yêu cầu${symbol ? ` cho mã ${symbol.toUpperCase()}` : ''}.`,
              },
            ],
          }
        }

        const lines = items.map((it, idx) => {
          const typeBadge = it.doc_type_label || it.doc_type || 'Thông tin'
          const fileLink = it.file_url ? ` | [Xem văn bản gốc/PDF](${it.file_url})` : ''
          return `${idx + 1}. **[${it.symbol}] ${it.company_name}** (${it.exchange})\n   - **Loại sự kiện**: \`${typeBadge}\` | **Ngày công bố**: ${it.published_at}\n   - **Nội dung**: ${it.title}${fileLink}`
        })

        const titleHeader = symbol
          ? `### SỰ KIỆN & CÔNG BỐ THÔNG TIN MÃ ${symbol.toUpperCase()} (Top ${items.length} tin mới nhất):`
          : `### CÔNG BỐ THÔNG TIN & SỰ KIỆN DOANH NGHIỆP MỚI NHẤT TOÀN THỊ TRƯỜNG (Top ${items.length}):`

        return {
          content: [
            {
              type: 'text',
              text: `${titleHeader}\n\n${lines.join('\n\n')}`,
            },
          ],
        }
      } catch (err: unknown) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi tra cứu sự kiện & công bố thông tin: ${String(err)}` }],
        }
      }
    }
  )

  return server
}
