// ─────────────────────────────────────────────────────────────────────────────
// lib/mcp/server.ts — Remote MCP Server for Google Gemini, Claude & ChatGPT
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { buildStockAiBundle } from '@/lib/ai-bundle-service'
import { getStock, upside, marginOfSafety } from '@/lib/data'
import reportsData from '@/data/reports-snapshot.json'
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
    version: '1.0.0',
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

  // 6. Tool: Kho báo cáo phân tích & Định giá CTCK
  server.tool(
    'kho_bao_cao_va_upside',
    'Tìm kiếm trong kho 94 báo cáo phân tích định giá của các CTCK hàng đầu (SSI, HSC, VCSC, VNDirect, Mirae Asset). Xem giá mục tiêu, khuyến nghị mua/bán và tiềm năng tăng trưởng.',
    {
      queryOrSymbol: z
        .string()
        .describe('Mã cổ phiếu hoặc từ khóa ngành hàng (ví dụ: HPG, Cảng biển, Dệt may, Thép)'),
    },
    async ({ queryOrSymbol }) => {
      try {
        const qUpper = queryOrSymbol.toUpperCase().trim()
        const qLower = queryOrSymbol.toLowerCase().trim()

        const matched = reports.filter(
          (r) =>
            (r.ticker && r.ticker.toUpperCase() === qUpper) ||
            r.title.toLowerCase().includes(qLower) ||
            r.category.toLowerCase().includes(qLower) ||
            (r.summary && r.summary.toLowerCase().includes(qLower))
        )

        if (matched.length === 0) {
          const topUpside = reports
            .filter((r) => r.ticker && r.targetPrice && r.upside != null)
            .sort((a, b) => (b.upside ?? 0) - (a.upside ?? 0))
            .slice(0, 5)

          return {
            content: [
              {
                type: 'text',
                text: `Không tìm thấy báo cáo khớp từ khóa "${queryOrSymbol}".\nTop 5 cổ phiếu có upside cao nhất trong kho báo cáo:\n${topUpside
                  .map(
                    (r) =>
                      `- [${r.ticker}] ${r.title} | Giá MT: ${r.targetPrice}k | Upside: +${r.upside}% | Khuyến nghị: ${r.recommendation || '—'}`
                  )
                  .join('\n')}`,
              },
            ],
          }
        }

        const lines = matched.slice(0, 6).map((r) => {
          return `- **${r.ticker ? `[${r.ticker}] ` : ''}${r.title}**\n  Ngày: ${r.reportDate || r.date} | Giá MT: ${r.targetPrice ?? '—'}k | Giá TT: ${r.currentPrice ?? '—'}k | Upside: ${r.upside != null ? `+${r.upside}%` : '—'} | Khuyến nghị: ${r.recommendation ?? '—'}\n  Tóm tắt: ${r.summary || 'Không có tóm tắt'}`
        })

        return {
          content: [
            {
              type: 'text',
              text: `### KHO BÁO CÁO PHÂN TÍCH PHÙ HỢP:\n\n${lines.join('\n\n')}`,
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

  return server
}
