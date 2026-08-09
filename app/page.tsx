import { SiteHeader } from '@/components/site-header'
import { QuickJump } from '@/components/stock-search'
import { Screener } from '@/components/screener'
import { stocks, upside } from '@/lib/data'
import { fmtInt, fmtPct } from '@/lib/format'

export default function Page() {
  const undervalued = stocks.filter((s) => upside(s) > 0).length
  const avgUpside = stocks.reduce((a, s) => a + upside(s), 0) / stocks.length
  const avgDiv = stocks.reduce((a, s) => a + s.dividendYield, 0) / stocks.length

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
              Bộ Lọc Cổ Phiếu Định Giá Rẻ
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">
              Sàng lọc doanh nghiệp giao dịch sâu dưới giá trị tài sản ròng điều chỉnh (RNAV),
              P/E tương lai thấp và tỷ suất cổ tức cao. Nhấp vào một mã để xem phân tích chuyên sâu.
            </p>
          </div>
          <QuickJump />
        </div>

        {/* KPI strip */}
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          <Kpi label="Cổ phiếu trong danh mục" value={fmtInt(stocks.length)} unit="mã" />
          <Kpi label="Đang định giá thấp" value={fmtInt(undervalued)} unit="mã" tone="positive" />
          <Kpi label="Upside trung bình" value={fmtPct(avgUpside, 0)} tone="positive" />
          <Kpi label="Cổ tức trung bình" value={`${avgDiv.toFixed(1)}%`} tone="positive" />
        </div>

        <Screener />

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Ghi chú: Số liệu mang tính minh họa cho mục đích trình bày sản phẩm. Giá và định giá RNAV
          tính theo đơn vị nghìn đồng/cổ phiếu. Đây không phải là khuyến nghị đầu tư.
        </p>
      </main>
    </div>
  )
}

function Kpi({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string
  unit?: string
  tone?: 'positive'
}) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span
          className={`font-mono text-2xl font-bold tabular-nums ${
            tone === 'positive' ? 'text-positive' : 'text-foreground'
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}
