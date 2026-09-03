import { NextResponse } from 'next/server'
import { getCtckFullData } from '@/lib/ctck-service'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // Cache 30 phút

export async function GET() {
  try {
    const data = getCtckFullData()
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('[CTCK API Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Không thể tải dữ liệu thống kê CTCK',
      },
      { status: 500 }
    )
  }
}
