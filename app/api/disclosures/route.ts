import { NextRequest, NextResponse } from 'next/server'
import { getDisclosuresBySymbol, getRecentMarketDisclosures } from '@/lib/disclosures'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || searchParams.get('ticker') || ''
    const exchange = searchParams.get('exchange') || 'ALL'
    const docType = searchParams.get('docType') || searchParams.get('type') || 'ALL'
    const importantOnly = searchParams.get('important') === 'true' || searchParams.get('important') === '1'
    const q = searchParams.get('q')?.toLowerCase() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    let items = symbol
      ? getDisclosuresBySymbol(symbol, limit)
      : getRecentMarketDisclosures({ limit, exchange, docType, importantOnly })

    if (q) {
      items = items.filter(
        (it) =>
          it.title?.toLowerCase().includes(q) ||
          it.symbol?.toLowerCase().includes(q) ||
          it.doc_type_label?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      data: items,
      asOf: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[API /api/disclosures] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    )
  }
}
