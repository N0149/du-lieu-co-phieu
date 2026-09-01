import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { FundDashboard } from '@/components/funds/fund-dashboard'

export const metadata: Metadata = {
  title: 'Quỹ Đầu Tư Mở - Bóc Tách Khẩu Vị & Top Cổ Phiếu Nắm Giữ',
  description:
    'Theo dõi dòng tiền thông minh (Smart Money) từ 68+ quỹ mở Việt Nam (Dragon Capital, VinaCapital, VCBF, SSIAM,...). Thống kê top 10 cổ phiếu và nhóm ngành được gom mua nhiều nhất.',
  openGraph: {
    title: 'Quỹ Đầu Tư Mở - Dữ Liệu Đầu Tư Cổ Phiếu',
    description:
      'Thống kê danh mục đầu tư, giá NAV và hiệu suất sinh lời của các quỹ mở hàng đầu Việt Nam.',
  },
}

export default function QuyMoPage() {
  return (
    <div className="min-h-screen bg-[#111319] text-[#F0F3F6]">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-8">
        <FundDashboard />

        <p className="mt-8 text-[11px] leading-relaxed text-[#8B949E]">
          * Ghi chú: Dữ liệu NAV và danh mục tài sản được tổng hợp từ báo cáo định kỳ công bố của các Công ty Quản lý Quỹ
          (Dragon Capital, VinaCapital, Vietcombank Fund, SSIAM, Mirae Asset,...). Dữ liệu chỉ nhằm mục đích tham khảo và
          không phải là lời khuyên đầu tư tài chính.
        </p>
      </main>
    </div>
  )
}
