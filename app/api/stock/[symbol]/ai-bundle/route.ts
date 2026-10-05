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

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    // Chặn hoàn toàn việc cào/tải file .md thô hàng loạt để bảo vệ tài sản trí tuệ và cơ sở dữ liệu
    if (format === 'download' || format === 'file') {
      return NextResponse.json(
        {
          error: 'DOWNLOAD_DEPRECATED',
          message:
            'Tính năng tải file thô đã được chuyển đổi thành Trợ lý AI Native trực tiếp trên website dulieudautu.com để bảo vệ bản quyền dữ liệu và mang lại trải nghiệm hỏi đáp tương tác trực quan.',
        },
        { status: 403 }
      )
    }

    const bundle = await buildStockAiBundle(symbol)

    // Trả về metadata và compact prompt cho frontend
    return NextResponse.json({
      symbol: bundle.symbol,
      companyName: bundle.companyName,
      exchange: bundle.exchange,
      sector: bundle.sector,
      updatedDate: bundle.updatedDate,
      compactPrompt: bundle.compactPrompt,
      metrics: bundle.metrics,
      pdfLinks: bundle.pdfLinks,
    })
  } catch (error: unknown) {
    console.error('[ai-bundle] Lỗi khi tạo gói dữ liệu AI:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi server khi tổng hợp dữ liệu AI', message },
      { status: 500 }
    )
  }
}
