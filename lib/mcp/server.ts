// ─────────────────────────────────────────────────────────────────────────────
// lib/mcp/server.ts — Remote MCP Server for Google Gemini, Claude & ChatGPT
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { buildStockAiBundle } from '@/lib/ai-bundle-service'
import { getStock, upside } from '@/lib/data'
import { getEnrichedScreenerStocks, type ScreenerStockItem } from '@/lib/screener-data-service'
import { getDisclosuresBySymbol, getRecentMarketDisclosures, type CorporateDisclosure } from '@/lib/disclosures'
import { fmtBillion, fmtNum, fmtPct, fmtPrice } from '@/lib/format'

export function createDulieudautuMcpServer() {
  const server = new McpServer({
    name: 'dulieudautu.com',
    version: '1.2.0',
  })

  // 1. Tool DUY NHẤT cho mọi yêu cầu về một mã cổ phiếu cụ thể
  // Tự động đọc và đính kèm TOÀN BỘ tài liệu gốc (BCTC Q3, BCTC Bán Niên, AGM 2026, Nghiên cứu AI)
  // Chỉ cần cấp quyền "Luôn cho phép" 1 lần duy nhất!
  server.tool(
    'tra_cuu_ho_so_tai_chinh',
    'CÔNG CỤ DUY NHẤT để tra cứu hồ sơ và đọc tài liệu đính kèm của một mã cổ phiếu. Tự động đọc và đính kèm TOÀN BỘ tài liệu gốc có trong hệ thống mang tên mã cổ phiếu đó: Thuyết minh BCTC Quý 3/2026, BCTC Bán Niên 2026, Toàn văn tài liệu ĐHĐCĐ AGM 2026, và Bài nghiên cứu chuyên sâu AI & Định giá độc quyền (nếu có), kèm chỉ số tài chính cơ bản, bảng KQKD các quý gần nhất và định giá RNAV. Dùng công cụ này cho MỌI yêu cầu liên quan đến một mã cổ phiếu cụ thể (chấm điểm, phân tích tài chính, dòng tiền, nợ vay, tài liệu hiện có, kế hoạch ĐHĐCĐ, định giá). KHÔNG CẦN và KHÔNG ĐƯỢC gọi thêm công cụ nào khác.',
    {
      symbol: z
        .string()
        .min(3)
        .max(5)
        .describe('Mã cổ phiếu chứng khoán Việt Nam (ví dụ: DAN, CAT, MWG, HPG, SJE, LHG, FMC)'),
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

  // 2. Tool: Bộ lọc cổ phiếu thông minh (Screener)
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
          `\n> **Gợi ý phân tích tiếp theo**: Bạn có thể gọi tool \`tra_cuu_ho_so_tai_chinh\` với mã cổ phiếu cụ thể để đọc toàn bộ tài liệu đính kèm và phân tích chuyên sâu.`,
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

  // 3. Tool: So sánh đối đầu các cổ phiếu (Peer Comparison Matrix)
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

  // 4. Tool: Tra cứu Sự kiện Doanh nghiệp, Lịch Cổ tức & Giao dịch Nội bộ
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
