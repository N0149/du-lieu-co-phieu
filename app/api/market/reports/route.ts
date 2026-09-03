import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketReports } from '@/lib/reports-service'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // Cache 30 phút

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '20', 10)))
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || ''

    const result = await fetchMarketReports(page, pageSize, search, source)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('[Market Reports API Route Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải danh sách báo cáo thị trường',
      },
      { status: 500 }
    )
  }
}
