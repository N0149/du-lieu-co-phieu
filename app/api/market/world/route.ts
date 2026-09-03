import { NextResponse } from 'next/server'
import { fetchWorldMarketData } from '@/lib/market-service'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // Cache 30 phút (1800 giây)

export async function GET() {
  try {
    const data = await fetchWorldMarketData()

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Không thể tải dữ liệu thị trường từ nguồn cấp',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data,
    })
  } catch (error: any) {
    console.error('[Market World API Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải dữ liệu thị trường thế giới',
      },
      { status: 500 }
    )
  }
}
