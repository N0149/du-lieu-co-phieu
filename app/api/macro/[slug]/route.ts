import { NextRequest, NextResponse } from 'next/server';
import { getMacroIndicator, getMacroCatalog, getMacroSummary } from '@/lib/macro-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (slug === 'catalog') {
      const catalog = getMacroCatalog();
      if (!catalog) {
        return NextResponse.json({ error: 'Không tìm thấy catalog' }, { status: 404 });
      }
      return NextResponse.json(catalog);
    }

    if (slug === 'summary') {
      const summary = getMacroSummary();
      if (!summary) {
        return NextResponse.json({ error: 'Không tìm thấy summary' }, { status: 404 });
      }
      return NextResponse.json(summary);
    }

    const data = getMacroIndicator(slug);
    if (!data) {
      return NextResponse.json({ error: `Không tìm thấy chỉ tiêu ${slug}` }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[API /api/macro] Lỗi xử lý:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
