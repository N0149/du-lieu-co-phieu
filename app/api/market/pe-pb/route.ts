import { NextRequest, NextResponse } from 'next/server'
import { getPePbRawData, filterValuationData } from '@/lib/pe-pb-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '10y'
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const rawData = await getPePbRawData()
    const result = filterValuationData(rawData, period, from, to)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('[PE-PB API Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải dữ liệu P/E & P/B VN-Index',
      },
      { status: 500 }
    )
  }
}
