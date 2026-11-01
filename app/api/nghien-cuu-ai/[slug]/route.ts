import { NextRequest, NextResponse } from 'next/server'
import {
  getNghienCuuAiReportBySlug,
  getAllNghienCuuAiReports,
  getNghienCuuAiReportsForTicker,
} from '@/lib/nghien-cuu-ai-service'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Thiếu slug báo cáo' }, { status: 400 })
    }

    // Hỗ trợ tra cứu theo slug hoặc mã cổ phiếu
    let report = getNghienCuuAiReportBySlug(slug)
    if (!report && slug.length <= 5) {
      const tickerReports = getNghienCuuAiReportsForTicker(slug)
      if (tickerReports.length > 0) {
        report = getNghienCuuAiReportBySlug(tickerReports[0].slug)
      }
    }

    if (!report) {
      return NextResponse.json(
        { error: `Không tìm thấy báo cáo nghiên cứu AI cho "${slug}"` },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('[API nghien-cuu-ai] Lỗi đọc báo cáo:', error)
    return NextResponse.json(
      { error: 'Lỗi server khi tải báo cáo nghiên cứu AI' },
      { status: 500 }
    )
  }
}
