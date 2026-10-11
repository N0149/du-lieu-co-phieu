import { NextResponse } from 'next/server'
import { getFundsSnapshot } from '@/lib/fund-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getFundsSnapshot()
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('[API /api/funds] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải dữ liệu quỹ mở',
      },
      { status: 500 }
    )
  }
}
