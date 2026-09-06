import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { Screener } from '@/components/screener'
import { HomeKpis } from '@/components/home-kpis'

export const metadata: Metadata = {
  title: 'Nghiên Cứu Chuyên Sâu AI - Định Giá RNAV & Báo Cáo',
  description:
    'Nghiên cứu chuyên sâu AI, định giá RNAV cổ phiếu, phân tích bóc tách giá trị tài sản doanh nghiệp niêm yết và kho báo cáo phân tích.',
  alternates: {
    canonical: '/nghien-cuu-ai',
  },
}

export default function NghienCuuAiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {/* KPI strip — tự đếm/tính từ kho báo cáo */}
        <HomeKpis />

        <Screener />

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Ghi chú: Số liệu mang tính minh họa cho mục đích trình bày sản phẩm. Giá và định giá RNAV
          tính theo đơn vị nghìn đồng/cổ phiếu. Đây không phải là khuyến nghị đầu tư.
        </p>
      </main>
    </div>
  )
}
