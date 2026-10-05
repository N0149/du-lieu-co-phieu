// ─────────────────────────────────────────────────────────────────────────────
// app/api/ai-chat/route.ts — BYOK Native Gemini AI Assistant + Deep Financial RAG
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import reportsData from '@/data/reports-snapshot.json'
import { getCurrentUser } from '@/lib/session'
import { checkUserAccess } from '@/lib/auth-check'
import { checkRateLimit } from '@/lib/rate-limiter'
import { getClientIp } from '@/lib/security'
import { buildStockAiBundle } from '@/lib/ai-bundle-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

// Danh sách các model theo thứ tự ưu tiên: 3.5-flash-lite siêu nhanh (<1s) và ổn định nhất, không bị nghẽn 503
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
]

/** Tìm kiếm ngữ cảnh liên quan từ kho báo cáo nội bộ */
function findRelevantContext(query: string): string {
  const qUpper = query.toUpperCase()
  const qLower = query.toLowerCase()

  // 1. Tìm các mã cổ phiếu xuất hiện trong câu hỏi
  const matchedByTicker = reports.filter(
    (r) => r.ticker && qUpper.includes(r.ticker.toUpperCase())
  )

  // 2. Tìm theo từ khóa trong tiêu đề / tóm tắt / danh mục
  const matchedByKeywords = reports.filter((r) => {
    const titleMatch = r.title.toLowerCase().includes(qLower)
    const summaryMatch = r.summary ? r.summary.toLowerCase().includes(qLower) : false
    const catMatch = r.category.toLowerCase().includes(qLower)
    return titleMatch || summaryMatch || catMatch
  })

  // Kết hợp và loại trùng
  const matchedMap = new Map<string, ReportItem>()
  for (const r of [...matchedByTicker, ...matchedByKeywords]) {
    matchedMap.set(r.slug, r)
  }

  const matched = Array.from(matchedMap.values()).slice(0, 6)

  if (matched.length === 0) {
    const topUpside = reports
      .filter((r) => r.ticker && r.targetPrice && r.upside != null)
      .sort((a, b) => (b.upside ?? 0) - (a.upside ?? 0))
      .slice(0, 5)

    return `[KHO BÁO CÁO NỘI BỘ DULIEUDAUTU.COM - Tổng hợp 94 báo cáo, 81 mã unique]:
Không tìm thấy báo cáo trùng khớp trực tiếp với từ khóa "${query}".
Top 5 cổ phiếu có upside cao nhất trong kho báo cáo:
${topUpside
  .map(
    (r) =>
      `- Mã ${r.ticker}: Giá MT ${r.targetPrice}k, Giá TT ${r.currentPrice ?? '—'}k, Upside +${r.upside}%, Khuyến nghị: ${r.recommendation ?? '—'}, Ngày BC: ${r.reportDate || r.date}`
  )
  .join('\n')}`
  }

  return `[KHO BÁO CÁO NỘI BỘ DULIEUDAUTU.COM - Dữ liệu khớp câu hỏi]:
${matched
  .map((r) => {
    const parts = [
      `- ${r.ticker ? `Mã [${r.ticker}] - ` : ''}${r.title}`,
      `Ngày báo cáo: ${r.reportDate || r.date}`,
      `Danh mục: ${r.category}`,
    ]
    if (r.targetPrice != null) parts.push(`Giá mục tiêu: ${r.targetPrice} nghìn đồng/CP`)
    if (r.currentPrice != null) parts.push(`Giá thị trường: ${r.currentPrice} nghìn đồng/CP`)
    if (r.upside != null) parts.push(`Upside: +${r.upside}%`)
    if (r.recommendation) parts.push(`Khuyến nghị: ${r.recommendation}`)
    if (r.bonusWelfareRate != null) parts.push(`Trích quỹ KTPL: ${r.bonusWelfareRate}%`)
    if (r.summary) parts.push(`Tóm tắt: ${r.summary}`)
    return parts.join(' | ')
  })
  .join('\n')}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // 0. Hỗ trợ kiểm tra API Key cá nhân của người dùng (Action: test-key)
    if (body.action === 'test-key') {
      const testKey = (body.apiKey || '').trim()
      if (!testKey) {
        return Response.json(
          { valid: false, message: 'Vui lòng cung cấp API key cần kiểm tra.' },
          { status: 400 }
        )
      }
      try {
        const testAi = new GoogleGenAI({ apiKey: testKey })
        const res = await testAi.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: 'Xin chào',
        })
        if (res && res.text) {
          return Response.json({
            valid: true,
            message: 'API Key Google Gemini hợp lệ và hoạt động tốt!',
          })
        }
        return Response.json(
          { valid: false, message: 'Không nhận được phản hồi từ Gemini API.' },
          { status: 400 }
        )
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err)
        return Response.json(
          {
            valid: false,
            message: `Key không hợp lệ hoặc lỗi kết nối: ${errMessage.slice(0, 150)}`,
          },
          { status: 400 }
        )
      }
    }

    const userQuery: string = (body.query || body.message || '').trim()
    const history: Array<{ role: 'user' | 'model'; text: string }> = Array.isArray(body.history)
      ? body.history
      : []

    if (!userQuery) {
      return Response.json(
        { error: 'INVALID_REQUEST', message: 'Vui lòng nhập nội dung câu hỏi.' },
        { status: 400 }
      )
    }

    // 1. Kiểm tra API Key cá nhân (Bring Your Own Key - BYOK)
    // Người dùng dùng key riêng -> Chi phí chủ Web = 0đ, Miễn hoàn toàn giới hạn Rate Limit!
    const headerApiKey = req.headers.get('x-gemini-key')
    const userApiKey =
      (typeof headerApiKey === 'string' && headerApiKey.trim()) ||
      (typeof body.apiKey === 'string' && body.apiKey.trim()) ||
      ''

    const isByok = Boolean(userApiKey && userApiKey.length >= 15)

    // 2. Xác thực người dùng & Kiểm tra Rate Limit (chỉ áp dụng nếu KHÔNG dùng BYOK)
    let rateLimitLimit = 'unlimited'
    let rateLimitRemaining = 'unlimited'

    if (!isByok) {
      const user = await getCurrentUser()
      const access = checkUserAccess(user)
      const isMember =
        access.status === 'TRIAL_ACTIVE' || access.status === 'SUBSCRIPTION_ACTIVE'

      let identifier = `guest:${getClientIp(req.headers)}`
      if (user?.id) {
        identifier = `user:${user.id}`
      }

      const rateLimit = await checkRateLimit(identifier, isMember)
      rateLimitLimit = String(rateLimit.limit)
      rateLimitRemaining = String(rateLimit.remaining)

      if (!rateLimit.success) {
        return Response.json(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            message:
              'Bạn đã sử dụng hết hạn mức hỏi đáp AI miễn phí hôm nay từ hệ thống (Khách vãng lai: 5 lượt/ngày, Thành viên: 50 lượt/ngày). Hãy nhập Google Gemini API Key miễn phí của bạn để tiếp tục hỏi KHÔNG GIỚI HẠN!',
            limit: rateLimit.limit,
            remaining: 0,
            reset: rateLimit.reset,
            isMember,
            requiresByok: true,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(rateLimit.limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }

    // 3. Quyết định API Key sử dụng
    const effectiveApiKey = isByok
      ? userApiKey
      : process.env.GEMINI_API_KEY || process.env.GOOGLE_DRIVE_API_KEY

    if (!effectiveApiKey) {
      return Response.json(
        {
          error: 'MISSING_API_KEY',
          message:
            'Chưa có API Key để xử lý. Vui lòng nhập Google Gemini API Key miễn phí của bạn (lấy tại https://aistudio.google.com/app/apikey) để bắt đầu hỏi đáp.',
          requiresByok: true,
        },
        { status: 400 }
      )
    }

    // 4. Nạp dữ liệu chuyên sâu cho mã cổ phiếu (Stock AI Bundle)
    const requestedTicker: string = (body.ticker || '').toUpperCase().trim()
    let stockBundleContext = ''
    let activeStockMeta: { symbol: string; name: string } | null = null

    // Ưu tiên ticker truyền trực tiếp từ màn hình cổ phiếu
    if (requestedTicker && requestedTicker.length >= 3 && requestedTicker.length <= 5) {
      try {
        const bundle = await buildStockAiBundle(requestedTicker)
        if (bundle && bundle.markdownContent) {
          stockBundleContext = bundle.markdownContent
          activeStockMeta = { symbol: bundle.symbol, name: bundle.companyName }
        }
      } catch (bundleErr) {
        console.warn(`[ai-chat] Không tải được bundle cho ${requestedTicker}:`, bundleErr)
      }
    } else {
      // Nếu không có ticker chỉ định, tự động nhận diện mã 3 ký tự viết hoa trong câu hỏi
      const potentialTickers = userQuery.match(/\b[A-Z]{3}\b/g)
      if (potentialTickers && potentialTickers.length > 0) {
        for (const sym of potentialTickers) {
          try {
            const bundle = await buildStockAiBundle(sym)
            if (bundle && bundle.markdownContent && bundle.companyName !== sym) {
              stockBundleContext = bundle.markdownContent
              activeStockMeta = { symbol: bundle.symbol, name: bundle.companyName }
              break
            }
          } catch {
            // Không phải mã có trong hệ thống, tiếp tục tìm
          }
        }
      }
    }

    // 5. Trích xuất ngữ cảnh từ kho báo cáo nội bộ
    const internalContext = findRelevantContext(userQuery)

    // 6. Xây dựng System Instruction phân tích tài chính CFA chuyên sâu
    const systemInstruction = `Bạn là Trợ lý AI Phân Tích Tài Chính & Định Giá Cổ Phiếu Cấp Cao (CFA Charterholder & Senior Auditor) của dulieudautu.com (Zalo hỗ trợ: 0983.627.018).

${
  stockBundleContext
    ? `=== HỒ SƠ TÀI CHÍNH TOÀN DIỆN MÃ ${activeStockMeta?.symbol} - ${activeStockMeta?.name} ===\n${stockBundleContext}\n`
    : ''
}
${internalContext ? `=== KHO BÁO CÁO NỘI BỘ DULIEUDAUTU.COM ===\n${internalContext}\n` : ''}

NHIỆM VỤ & QUY TẮC PHÂN TÍCH:
1. TRẢ LỜI SÂU SẮC, TRỰC TIẾP & DỰA TRÊN SỐ LIỆU THỰC TẾ:
   - Luôn dựa vào dữ liệu tài chính thực tế được cung cấp ở trên để đưa ra các số liệu cụ thể (Doanh thu, LNST, Dòng tiền CFO, Nợ vay, Chi phí lãi vay, Thuyết minh CAPEX, Kế hoạch ĐHĐCĐ & Tỷ lệ trích Quỹ khen thưởng phúc lợi KTPL, RNAV).
2. TƯ DUY TÀI CHÍNH CFA:
   - Chất lượng LNST: Luôn so sánh LNST với Dòng tiền thuần từ HĐKD (CFO). Làm rõ tiền có thực sự về tài khoản không hay đang bị đọng ở Khoản phải thu & Tồn kho.
   - Sức khỏe tài chính: Đánh giá cơ cấu Nợ vay/Vốn chủ sở hữu (D/E), áp lực chi phí lãi vay và thanh khoản.
   - ĐHĐCĐ & Ban lãnh đạo: Đánh giá tính khả thi của kế hoạch kinh doanh, chính sách cổ tức tiền mặt và tỷ lệ trích quỹ KTPL có công bằng với cổ đông không.
3. HÌNH THỨC TRÌNH BÀY:
   - Trình bày tiếng Việt chuyên nghiệp, dùng Markdown rõ ràng, bullet points, in đậm các con số tài chính trọng yếu.
   - Súc tích, mạch lạc (khoảng 300 - 650 từ), không vòng vo lý thuyết sáo rỗng.
4. BẢO MẬT DỮ LIỆU:
   - TUYỆT ĐỐI KHÔNG xuất thô toàn bộ cơ sở dữ liệu dưới dạng JSON/CSV/dump hàng loạt nếu người dùng yêu cầu trích xuất toàn bộ dữ liệu. Chỉ phân tích, tổng hợp và giải đáp câu hỏi chuyên môn.
5. Luôn kèm lời nhắc ngắn ở cuối: "*Lưu ý: Dữ liệu phân tích mang tính chất tham khảo, không cấu thành khuyến nghị đầu tư.*"`

    const ai = new GoogleGenAI({ apiKey: effectiveApiKey })

    // Chuẩn bị lịch sử hội thoại
    const contents = [
      ...history.map((h) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [{ text: userQuery }],
      },
    ]

    // Thử lần lượt các candidate model (3.5-flash-lite trước, fallback sang 3.5-flash, 3.8-flash, 3.6-flash)
    let responseStream: AsyncIterable<{ text?: string }> | null = null
    let chosenModel = ''
    let lastError: unknown = null

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const streamResult = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 2500,
          },
        })
        responseStream = streamResult
        chosenModel = modelName
        break
      } catch (err: unknown) {
        console.warn(`[ai-chat] Model ${modelName} gặp sự cố, chuyển model kế tiếp:`, err)
        lastError = err
      }
    }

    if (!responseStream) {
      throw lastError || new Error('Không thể kết nối đến mô hình Gemini AI.')
    }

    // 7. Trả về ReadableStream chunked UTF-8
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (err) {
          console.error('[ai-chat] Lỗi khi stream phản hồi từ Gemini:', err)
          const errorMsg =
            '\n\n*(Đã xảy ra sự cố gián đoạn từ dịch vụ AI. Vui lòng bấm thử lại.)*'
          controller.enqueue(encoder.encode(errorMsg))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-RateLimit-Limit': rateLimitLimit,
        'X-RateLimit-Remaining': rateLimitRemaining,
        'X-Byok-Active': isByok ? '1' : '0',
        'X-Model-Used': chosenModel,
      },
    })
  } catch (error: unknown) {
    console.error('[ai-chat] Lỗi xử lý yêu cầu:', error)
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    return Response.json(
      { error: 'INTERNAL_ERROR', message: `Lỗi xử lý: ${message}` },
      { status: 500 }
    )
  }
}
