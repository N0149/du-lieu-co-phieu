import { NextRequest, NextResponse } from 'next/server'
import {
  getAllNghienCuuAiReports,
  getNghienCuuAiKpis,
} from '@/lib/nghien-cuu-ai-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')
    const minScoreStr = searchParams.get('minScore')
    const query = searchParams.get('q')

    let reports = getAllNghienCuuAiReports()

    if (ticker) {
      const tNorm = ticker.toUpperCase().trim()
      reports = reports.filter((r) => (r.ticker || '').toUpperCase() === tNorm)
    }

    if (minScoreStr) {
      const minScore = parseFloat(minScoreStr)
      if (!isNaN(minScore)) {
        reports = reports.filter((r) => r.score != null && r.score >= minScore)
      }
    }

    if (query) {
      const qLower = query.toLowerCase().trim()
      reports = reports.filter(
        (r) =>
          (r.ticker && r.ticker.toLowerCase().includes(qLower)) ||
          r.title.toLowerCase().includes(qLower) ||
          r.summary.toLowerCase().includes(qLower)
      )
    }

    const kpis = getNghienCuuAiKpis()

    return NextResponse.json({
      reports,
      kpis,
      total: reports.length,
    })
  } catch (error) {
    console.error('[API nghien-cuu-ai] Lỗi danh sách báo cáo:', error)
    return NextResponse.json(
      { error: 'Lỗi server khi lấy danh sách nghiên cứu AI' },
      { status: 500 }
    )
  }
}
