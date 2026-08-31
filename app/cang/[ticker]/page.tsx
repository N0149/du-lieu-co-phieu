import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import {
  getStockIntel,
  getAllStocksIntel,
  getDashboardSummary,
  formatDWT,
  formatCalls,
} from '@/lib/maritime'
import { PortThroughputChart } from '@/components/cang-bien/PortThroughputChart'
import { YoYThroughputComparison } from '@/components/cang-bien/YoYThroughputComparison'
import {
  Ship,
  Anchor,
  Layers,
  CheckCircle,
  MapPin,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Info,
  Calendar,
  ArrowLeft,
  ExternalLink,
  LayoutGrid,
  Search,
  Database,
} from 'lucide-react'

interface Props {
  params: Promise<{ ticker: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params
  const intel = getStockIntel(ticker)
  if (!intel) {
    return {
      title: `Cảng ${ticker.toUpperCase()} — Dữ liệu sản lượng tàu | Phân Tích Chuyên Sâu`,
    }
  }
  return {
    title: `${intel.name} (${intel.ticker}) — Sản lượng tàu, Trọng tải DWT, Thị phần | Dữ liệu Cảng biển`,
    description: `Số liệu vận hành ${intel.name} (${intel.ticker}): Lượt tàu qua cảng, trọng tải DWT, các bến quản lý, khung giá bốc dỡ và phân tích biên lợi nhuận gộp BCTC.`,
  }
}

export default async function StockPortDetailPage({ params }: Props) {
  const { ticker } = await params
  const intel = getStockIntel(ticker)

  if (!intel) {
    notFound()
  }

  const summary = getDashboardSummary()
  const monthlyData = intel.free?.monthly || []
  const berths = intel.berths || []
  const berthNav = intel.berth_nav || []

  // Filter live calls for this stock
  const tickerCalls = (summary?.recent_port_calls || []).filter(
    (c: any) => c.stock_ticker?.toUpperCase() === intel.ticker.toUpperCase()
  )

  const latestMonth = monthlyData[monthlyData.length - 1]
  const prevMonth = monthlyData[monthlyData.length - 2]
  const totalCallsHistory = monthlyData.reduce(
    (acc, m) => acc + (m.in || 0) + (m.out || 0),
    0
  )
  const totalDwtHistory = monthlyData.reduce(
    (acc, m) => acc + (m.dwt_in || 0) + (m.dwt_out || 0),
    0
  )
  const latestDwt = (latestMonth?.dwt_in || 0) + (latestMonth?.dwt_out || 0)
  const prevDwt = (prevMonth?.dwt_in || 0) + (prevMonth?.dwt_out || 0)

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Site Header */}
      <SiteHeader />

      {/* Top Header / Breadcrumb */}
      <div className="border-b border-border/70 bg-gradient-to-b from-slate-950 via-slate-900/90 to-background py-8">
        <div className="mx-auto max-w-[1600px] px-4 space-y-4">
          {/* Breadcrumbs & Sub-nav */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="size-3 text-muted-foreground/60" />
              <Link href="/cang-bien" className="hover:text-foreground transition-colors">
                Cảng Biển
              </Link>
              <ChevronRight className="size-3 text-muted-foreground/60" />
              <span className="text-teal-400 font-semibold">{intel.ticker}</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-background/80 p-1 rounded-xl border border-border/70 text-xs font-semibold">
              <Link
                href="/cang-bien"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
              >
                <LayoutGrid className="size-3.5" />
                <span>Tất cả cảng</span>
              </Link>
              <Link
                href="/cang-bien/tau"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
              >
                <Search className="size-3.5 text-teal-400" />
                <span>Tra cứu tàu</span>
              </Link>
              <Link
                href="/cang-bien/nguon-du-lieu"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
              >
                <Database className="size-3.5 text-sky-400" />
                <span>Nguồn dữ liệu</span>
              </Link>
            </div>
          </div>

          {/* Title Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-teal-400">
                  {intel.ticker}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {intel.name}
                </h1>
                {intel.pure_play ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-xs font-bold text-teal-400">
                    <CheckCircle className="size-3" />
                    Cảng thuần
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                    <Layers className="size-3" />
                    {intel.category === 'fleet' ? 'Đội tàu' : 'Đa cảng'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="size-3.5 text-teal-400" />
                <span>Khu vực: {intel.region || 'Việt Nam'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/cang-bien"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-teal-500/40 hover:bg-teal-500/10 transition-all"
              >
                <ArrowLeft className="size-3.5" />
                <span>Về Bản đồ Toàn quốc</span>
              </Link>
            </div>
          </div>

          {/* Scope Note Banner */}
          {intel.scope_note && (
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="size-4 text-teal-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{intel.scope_note}</p>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 shadow-sm">
              <div className="text-[11px] text-muted-foreground font-medium">
                Tháng gần nhất ({latestMonth?.ym || '—'})
              </div>
              <div className="text-xl font-extrabold text-teal-400 mt-1">
                {(latestMonth?.in || 0) + (latestMonth?.out || 0)} lượt
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {latestDwt > 0 ? formatDWT(latestDwt) : `Vào: ${latestMonth?.in || 0} | Ra: ${latestMonth?.out || 0}`}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 shadow-sm">
              <div className="text-[11px] text-muted-foreground font-medium">
                Tháng trước ({prevMonth?.ym || '—'})
              </div>
              <div className="text-xl font-extrabold text-sky-400 mt-1">
                {(prevMonth?.in || 0) + (prevMonth?.out || 0)} lượt
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {prevDwt > 0 ? formatDWT(prevDwt) : `Vào: ${prevMonth?.in || 0} | Ra: ${prevMonth?.out || 0}`}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 shadow-sm">
              <div className="text-[11px] text-muted-foreground font-medium">
                Số Cầu Bến Quản Lý
              </div>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                {berths.length} Bến
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Cập nhật theo danh mục bến
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 shadow-sm">
              <div className="text-[11px] text-muted-foreground font-medium">
                Tổng Trọng Tải DWT
              </div>
              <div className="text-xl font-extrabold text-amber-400 mt-1">
                {totalDwtHistory > 0 ? formatDWT(totalDwtHistory) : formatCalls(totalCallsHistory)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatCalls(totalCallsHistory)} ({monthlyData.length} tháng)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8 space-y-8">
        {/* Section 1: Monthly Throughput Chart */}
        <section>
          <PortThroughputChart monthlyData={monthlyData} tickerName={intel.ticker} />
        </section>

        {/* Section 2: YoY Comparison Table (Year-over-Year) */}
        <section>
          <YoYThroughputComparison monthlyData={monthlyData} tickerName={intel.ticker} />
        </section>

        {/* Section 3: Affiliated Berths & Tariff Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Berths Card */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Anchor className="size-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Danh Sách Cầu Bến Của {intel.ticker}
              </h3>
            </div>

            <div className="space-y-2.5">
              {berths.map((bName, idx) => {
                const isDeepSea =
                  bName.toLowerCase().includes('lạch huyện') ||
                  bName.toLowerCase().includes('gemalink') ||
                  bName.toLowerCase().includes('tiên sa')
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-teal-400">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{bName}</span>
                    </div>
                    {isDeepSea ? (
                      <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-400">
                        Bến Nước Sâu (Giá cao)
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        Bến Sông / Tổng hợp
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Tariff & Price Insights */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <DollarSign className="size-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Khung Giá Dịch Vụ & Biên Lợi Nhuận Gộp
              </h3>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                Áp dụng theo <strong className="text-foreground">Quyết định 810/QĐ-BGTVT</strong> (kế thừa Thông tư 39/2023/TT-BGTVT):
              </p>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Khung giá bốc dỡ Container thường:</span>
                  <span className="font-bold text-teal-400">~260.000 – 450.000 VNĐ / TEU</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Bến nước sâu (Lạch Huyện, Cái Mép):</span>
                  <span className="font-bold text-sky-400">~52 – 85 USD / cont (Cao hơn ~50-80%)</span>
                </div>
              </div>
              <p className="text-[11px]">
                💡 Khi doanh nghiệp dịch chuyển cơ cấu sản lượng sang các bến nước sâu công suất lớn,
                biên lợi nhuận gộp thường cải thiện mạnh mẽ trước khi BCTC quý phản ánh.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: 10 Most Recent Vessel Calls */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Ship className="size-4" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Nhật Ký 10 Chuyến Tàu Gần Nhất Thuộc {intel.ticker}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lịch trình chi tiết ngày giờ, trọng tải DWT và cầu bến tiếp nhận
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
              {Math.min(tickerCalls.length, 10)} chuyến gần nhất
            </span>
          </div>

          {tickerCalls.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 shadow-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground border-b border-border/80 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3.5">Ngày Giờ Điều Động</th>
                    <th className="py-3 px-3.5">Tên Tàu</th>
                    <th className="py-3 px-3.5">Hướng</th>
                    <th className="py-3 px-3.5">Trọng Tải (DWT)</th>
                    <th className="py-3 px-3.5">Kích Thước (LOA/Mớn)</th>
                    <th className="py-3 px-3.5">Cầu Bến Cập</th>
                    <th className="py-3 px-3.5">Nguồn Ghi Nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {tickerCalls.slice(0, 10).map((c: any, idx: number) => {
                    const isIn = c.call_direction === 'in'
                    const isOut = c.call_direction === 'out'
                    const timeDisplay = c.scheduled_time || c.call_date

                    return (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors font-sans">
                        <td className="py-2.5 px-3.5 text-slate-300 font-mono text-xs whitespace-nowrap font-medium">
                          {timeDisplay}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Ship className="size-3.5 text-teal-400 shrink-0" />
                            <span>{c.vessel_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {isIn ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/20">
                              Vào cảng
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-sky-500/10 text-sky-400 px-2 py-0.5 text-[10px] font-bold border border-sky-500/20">
                              Rời cảng
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-extrabold text-teal-300 font-mono whitespace-nowrap">
                          {c.dwt ? c.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground text-[11px] whitespace-nowrap font-mono">
                          {c.loa ? `${c.loa}m` : '—'} / {c.draft ? `${c.draft}m` : '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-200 font-medium whitespace-nowrap">
                          {c.berth_name || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-[10px] text-muted-foreground whitespace-nowrap">
                          {c.source || 'Cảng vụ Hàng hải'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              Đang đồng bộ nhật ký điều động tàu cho <strong>{intel.name}</strong>.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
