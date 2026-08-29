import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { CustomsTradeViewer } from '@/components/customs-trade-viewer'
import type { TradeBalancePoint } from '@/components/TradeBalanceChart'
import snapshot from '@/data/customs_trade_snapshot.json'

export const metadata: Metadata = {
  title: 'Thống Kê Xuất Nhập Khẩu - Phân Tích Chuyên Sâu Cổ Phiếu',
  description:
    'Số liệu thống kê xuất nhập khẩu hàng hóa Việt Nam theo kỳ/tháng (nguồn Tổng cục Hải quan) — phục vụ phân tích vĩ mô.',
}

export default async function XuatNhapKhauPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const defaultViewMode = params?.tab === 'tier-a' ? 'tier_a' : 'matrix'
  const tradeBalance = (snapshot as { trade_balance?: TradeBalancePoint[] }).trade_balance ?? []

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {/* Page heading */}
        <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-primary">
            Dữ liệu · Thống kê Hải quan & Cổ phiếu Tier A
          </p>
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Thống Kê Xuất Nhập Khẩu & Phân Loại Cổ Phiếu
          </h1>
          <p className="mt-2 max-w-3xl text-pretty text-sm text-muted-foreground">
            Số liệu xuất nhập khẩu hàng hóa theo kỳ báo cáo của Tổng cục Hải quan Việt Nam (nhóm
            mặt hàng chủ yếu) liên kết trực tiếp với <b>57+ mã niêm yết (Tier A)</b> theo nhóm ngành —
            phục vụ nhận diện sớm tín hiệu kinh doanh và phân tích vĩ mô.
          </p>
        </div>

        <CustomsTradeViewer
          tradeBalanceData={tradeBalance}
          defaultViewMode={defaultViewMode}
        />

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Ghi chú: Số liệu thống kê sơ bộ theo kỳ báo cáo (SO_BO) — có thể thay đổi khi có số
          chính thức. Đơn vị: Lượng theo ĐVT của từng mặt hàng; Trị giá tính bằng USD.
        </p>
      </main>
    </div>
  )
}
