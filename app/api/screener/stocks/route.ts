import { NextResponse } from 'next/server'
import { getEnrichedScreenerStocks } from '@/lib/screener-data-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stocks = getEnrichedScreenerStocks()
    return NextResponse.json({
      success: true,
      total: stocks.length,
      data: stocks,
      updatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Lỗi API /api/screener/stocks:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Lỗi xử lý dữ liệu bộ lọc' },
      { status: 500 },
    )
  }
}
