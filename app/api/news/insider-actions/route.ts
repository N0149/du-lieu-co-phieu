import { NextRequest, NextResponse } from 'next/server'
import { getInsiderActions } from '@/lib/insider-actions-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || undefined
    const force = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100

    const items = await getInsiderActions({
      symbol,
      force,
      limit,
    })

    return NextResponse.json(
      {
        success: true,
        data: items,
        total: items.length,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('[API /api/news/insider-actions] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch insider actions data',
        data: [],
      },
      { status: 500 }
    )
  }
}
