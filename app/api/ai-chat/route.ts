// ─────────────────────────────────────────────────────────────────────────────
// app/api/ai-chat/route.ts — Hybrid RAG AI Assistant (Snapshot + Google Search)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import reportsData from '@/data/reports-snapshot.json'
import { getCurrentUser } from '@/lib/session'
import { checkUserAccess } from '@/lib/auth-check'
import { checkRateLimit } from '@/lib/rate-limiter'

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
    // Nếu không khớp mã cụ thể, cung cấp top 5 mã có Upside cao nhất từ kho để tham khảo
    const topUpside = reports
      .filter((r) => r.ticker && r.targetPrice && r.upside != null)
      .sort((a, b) => (b.upside ?? 0) - (a.upside ?? 0))
      .slice(0, 5)

    return `[KHO BÁO CÁO NỘI BỘ DULIEUCOPHIEU.COM - Tổng hợp 94 báo cáo, 81 mã unique]:
Không tìm thấy báo cáo trùng khớp trực tiếp với từ khóa "${query}".
Top 5 cổ phiếu có upside cao nhất trong kho báo cáo:
${topUpside
  .map(
    (r) =>
      `- Mã ${r.ticker}: Giá MT ${r.targetPrice}k, Giá TT ${r.currentPrice ?? '—'}k, Upside +${r.upside}%, Khuyến nghị: ${r.recommendation ?? '—'}, Ngày BC: ${r.reportDate || r.date}`
  )
  .join('\n')}`
  }

  return `[KHO BÁO CÁO NỘI BỘ DULIEUCOPHIEU.COM - Dữ liệu khớp câu hỏi]:
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

    // 1. Đọc và xác thực người dùng
    const user = await getCurrentUser()
    const access = checkUserAccess(user)
    const isMember =
      access.status === 'TRIAL_ACTIVE' || access.status === 'SUBSCRIPTION_ACTIVE'

    // 2. Xác định định danh rate limit
    let identifier = `guest:${req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'}`
    if (user?.id) {
      identifier = `user:${user.id}`
    }

    // 3. Kiểm tra hạn mức Rate Limit
    const rateLimit = await checkRateLimit(identifier, isMember)
    if (!rateLimit.success) {
      return Response.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message:
            'Bạn đã sử dụng hết hạn mức hỏi đáp AI trong ngày (Khách vãng lai: 5 lượt/ngày, Thành viên: 50 lượt/ngày).',
          limit: rateLimit.limit,
          remaining: 0,
          reset: rateLimit.reset,
          isMember,
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

    // 4. Kiểm tra API Key Gemini (ưu tiên GEMINI_API_KEY, fallback GOOGLE_DRIVE_API_KEY)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_DRIVE_API_KEY
    if (!apiKey) {
      return Response.json(
        {
          error: 'MISSING_API_KEY',
          message:
            'Chưa cấu hình GEMINI_API_KEY trong biến môi trường server (Vercel / .env.local). Bạn có thể tạo API key miễn phí tại https://aistudio.google.com/app/apikey',
        },
        { status: 500 }
      )
    }

    // 5. Trích xuất ngữ cảnh RAG từ kho báo cáo nội bộ
    const internalContext = findRelevantContext(userQuery)

    const systemInstruction = `Bạn là Trợ lý AI Phân Tích Chuyên Sâu của website dulieucophieu.com (Cổng Dữ Liệu & Báo Cáo Đầu Tư Chứng Khoán Việt Nam, sáng lập bởi Nguyễn Trung Nhật - Zalo 0983.627.018).

NHIỆM VỤ & QUY TẮC PHẢN HỒI:
1. Giải đáp các thắc mắc về phân tích cổ phiếu, định giá doanh nghiệp, triển vọng ngành hàng, kinh tế vĩ mô và số liệu xuất nhập khẩu tại thị trường chứng khoán Việt Nam.
2. ƯU TIÊN sử dụng dữ liệu từ [KHO BÁO CÁO NỘI BỘ DULIEUCOPHIEU.COM] được cung cấp bên dưới để đưa ra số liệu chuẩn xác nhất (Giá mục tiêu, Upside, Khuyến nghị, Quỹ khen thưởng phúc lợi KTPL).
3. Kết hợp công cụ tìm kiếm Google Search khi cần tra cứu tin tức thời gian thực, sự kiện doanh nghiệp mới nhất hoặc các mã cổ phiếu chưa có trong kho nội bộ.
4. Trình bày bằng tiếng Việt chuyên nghiệp, ngắn gọn, súc tích (dưới 350 từ), dùng Markdown rõ ràng, bullet points, in đậm các con số tài chính trọng yếu.
5. Luôn kèm tuyên bố miễn trách nhiệm ngắn gọn ở cuối: "*Lưu ý: Thông tin mang tính chất tham khảo, không phải khuyến nghị đầu tư.*"`

    const ai = new GoogleGenAI({ apiKey })

    // Chuẩn bị lịch sử hội thoại cho SDK
    const contents = [
      ...history.map((h) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: `${internalContext}

Câu hỏi của người dùng: ${userQuery}`,
          },
        ],
      },
    ]

    let responseStream
    try {
      // Thử gọi với công cụ Google Search
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: 600,
          tools: [{ googleSearch: {} }],
        },
      })
    } catch (toolError) {
      console.warn('[ai-chat] Gọi Google Search gặp lỗi (quota/tier), fallback sang chế độ tiêu chuẩn:', toolError)
      // Fallback không dùng tool nếu key chưa bật search grounding
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: 600,
        },
      })
    }

    // 6. Trả về dạng ReadableStream chunked UTF-8
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
          const errorMsg = '\n\n*(Đã xảy ra lỗi khi đang truyền dữ liệu câu trả lời. Vui lòng thử lại.)*'
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
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
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
