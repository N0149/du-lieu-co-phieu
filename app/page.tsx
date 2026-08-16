import { SiteHeader } from '@/components/site-header'
import { QuickJump } from '@/components/stock-search'
import { Screener } from '@/components/screener'
import { HomeKpis } from '@/components/home-kpis'

export default function Page() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {/* Page heading */}
        <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-primary">
              Trang chủ · Sàng lọc định giá
            </p>
            <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              Bộ Lọc Cổ Phiếu Giá Trị
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">
              Danh sách được đồng bộ từ kho báo cáo phân tích: mỗi mã đều đã có bài viết
              (badge{' '}
              <span className="inline-flex items-center gap-1 rounded bg-accent px-1 py-px text-[10px] font-medium text-accent-foreground">
                Báo cáo
              </span>
              ). Nhấp vào một mã để mở bài phân tích tương ứng trong kho báo cáo.
            </p>
          </div>
          <QuickJump />
        </div>

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
