import { NextRequest, NextResponse } from 'next/server'
import { buildStockAiBundle } from '@/lib/ai-bundle-service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    if (!symbol) {
      return NextResponse.json({ error: 'Mã cổ phiếu không hợp lệ' }, { status: 400 })
    }

    const bundle = await buildStockAiBundle(symbol)
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    // Nếu yêu cầu tải file trực tiếp (.md)
    if (format === 'download' || format === 'file') {
      const filename = `${symbol.toUpperCase()}_Ho_So_AI_${new Date().toISOString().slice(0, 10)}.md`
      return new NextResponse(bundle.markdownContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(bundle)
  } catch (error: any) {
    console.error('[ai-bundle] Lỗi khi tạo gói dữ liệu AI:', error)
    return NextResponse.json(
      { error: 'Lỗi server khi tổng hợp dữ liệu AI', message: error?.message },
      { status: 500 }
    )
  }
}
