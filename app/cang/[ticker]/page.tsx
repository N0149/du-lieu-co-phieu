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
import { MaritimeSubNav } from '@/components/cang-bien/MaritimeSubNav'
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
  Sparkles,
  Zap,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-teal-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      {/* Top Header / Breadcrumb */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-10 overflow-hidden">
        {/* Ambient Gradient Glow Lights */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 right-1/4 translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-[1600px] px-4 space-y-6 relative z-10">
          {/* Breadcrumbs & Sub-nav */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-slate-200 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <Link href="/cang-bien" className="hover:text-slate-200 transition-colors">
                Cảng Biển
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <span className="text-teal-400 font-bold">{intel.ticker}</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <MaritimeSubNav activeTab="tong-quan" />
          </div>

          {/* Title Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-300">
                  {intel.ticker}
                </span>
                <h1 className="text-xl sm:text-3xl font-extrabold text-white">
                  {intel.name}
                </h1>
                {intel.pure_play ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 shadow-xs">
                    <CheckCircle className="size-3.5 text-emerald-400" />
                    Cảng thuần
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300 shadow-xs">
                    <Layers className="size-3.5 text-amber-400" />
                    {intel.category === 'fleet' ? 'Đội tàu' : 'Đa cảng'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 font-medium">
                <MapPin className="size-3.5 text-teal-400 shrink-0" />
                <span>Khu vực hoạt động: <strong className="text-slate-200">{intel.region || 'Việt Nam'}</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/cang-bien"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-extrabold text-slate-200 hover:border-teal-500/40 hover:bg-slate-800 transition-all shadow-md"
              >
                <ArrowLeft className="size-3.5 text-teal-400" />
                <span>Về Danh Mục Cảng Biển</span>
              </Link>
            </div>
          </div>

          {/* Scope Note Banner */}
          {intel.scope_note && (
            <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 to-slate-900/40 p-4 text-xs text-slate-300 flex items-start gap-3 shadow-inner">
              <Info className="size-4.5 text-teal-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{intel.scope_note}</p>
            </div>
          )}

          {/* Elevated Glass KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-1">
            {/* KPI 1 */}
            <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-teal-500/40 transition-all">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Tháng gần nhất ({latestMonth?.ym || '—'})</span>
                <span className="size-2 rounded-full bg-teal-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300 mt-1.5 tracking-tight">
                {(latestMonth?.in || 0) + (latestMonth?.out || 0)} lượt
              </div>
              <div className="text-[11px] text-teal-400 font-semibold mt-0.5">
                {latestDwt > 0 ? formatDWT(latestDwt) : `Vào: ${latestMonth?.in || 0} | Ra: ${latestMonth?.out || 0}`}
              </div>
            </div>

            {/* KPI 2 */}
            <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-sky-500/40 transition-all">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Tháng trước ({prevMonth?.ym || '—'})</span>
                <span className="size-2 rounded-full bg-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-1.5 tracking-tight">
                {(prevMonth?.in || 0) + (prevMonth?.out || 0)} lượt
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {prevDwt > 0 ? formatDWT(prevDwt) : `Vào: ${prevMonth?.in || 0} | Ra: ${prevMonth?.out || 0}`}
              </div>
            </div>

            {/* KPI 3 */}
            <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-emerald-500/40 transition-all">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Cầu bến quản lý</span>
                <span className="size-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5 tracking-tight">
                {berths.length} Bến
              </div>
              <div className="text-[11px] text-emerald-300/80 font-semibold mt-0.5">
                Gắn trực tiếp từng bến
              </div>
            </div>

            {/* KPI 4 */}
            <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-amber-500/40 transition-all">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span>Tổng DWT lịch sử</span>
                <span className="size-2 rounded-full bg-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1.5 tracking-tight">
                {totalDwtHistory > 0 ? formatDWT(totalDwtHistory) : formatCalls(totalCallsHistory)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {formatCalls(totalCallsHistory)} ({monthlyData.length} tháng)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8 space-y-10">
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
          <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <Anchor className="size-4.5" />
              </span>
              <h3 className="text-base font-extrabold text-slate-100">
                Danh Sách Cầu Bến Thuộc {intel.ticker}
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
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-bold text-teal-400 border border-slate-700">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200">{bName}</span>
                    </div>
                    {isDeepSea ? (
                      <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-0.5 text-[10px] font-bold text-sky-300 shadow-xs">
                        Bến Nước Sâu (Giá cao)
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] text-slate-400 border border-slate-700/50">
                        Bến Sông / Tổng hợp
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Tariff & Price Insights */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <DollarSign className="size-4.5" />
              </span>
              <h3 className="text-base font-extrabold text-slate-100">
                Khung Giá Dịch Vụ &amp; Biên Lợi Nhuận Gộp
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
              <p>
                Áp dụng theo <strong className="text-slate-200">Quyết định 810/QĐ-BGTVT</strong> (kế thừa Thông tư 39/2023/TT-BGTVT):
              </p>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Khung giá bốc dỡ Container thường:</span>
                  <span className="font-black text-teal-400">~260.000 – 450.000 VNĐ / TEU</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Bến nước sâu (Lạch Huyện, Cái Mép):</span>
                  <span className="font-black text-sky-400">~52 – 85 USD / cont (Cao hơn ~50-80%)</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 Khi doanh nghiệp dịch chuyển cơ cấu sản lượng sang các bến nước sâu công suất lớn,
                biên lợi nhuận gộp thường cải thiện mạnh mẽ trước khi BCTC quý phản ánh.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: 10 Most Recent Vessel Calls */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Ship className="size-4.5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-100">
                  Nhật Ký 10 Chuyến Tàu Gần Nhất Thuộc {intel.ticker}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lịch trình chi tiết ngày giờ, trọng tải DWT và cầu bến tiếp nhận
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-300 bg-teal-500/15 px-3 py-1 rounded-xl border border-teal-500/30">
              {Math.min(tickerCalls.length, 10)} chuyến gần nhất
            </span>
          </div>

          {tickerCalls.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3.5 font-bold">Ngày Giờ Điều Động</th>
                    <th className="py-3 px-3.5 font-bold">Tên Tàu</th>
                    <th className="py-3 px-3.5 font-bold">Hướng</th>
                    <th className="py-3 px-3.5 font-bold">Trọng Tải (DWT)</th>
                    <th className="py-3 px-3.5 font-bold">Kích Thước (LOA/Mớn)</th>
                    <th className="py-3 px-3.5 font-bold">Cầu Bến Cập</th>
                    <th className="py-3 px-3.5 font-bold">Nguồn Ghi Nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {tickerCalls.slice(0, 10).map((c: any, idx: number) => {
                    const isIn = c.call_direction === 'in'
                    const isOut = c.call_direction === 'out'
                    const timeDisplay = c.scheduled_time || c.call_date

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors font-sans group">
                        <td className="py-3 px-3.5 text-slate-300 font-mono text-xs whitespace-nowrap font-medium">
                          {timeDisplay}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-100 whitespace-nowrap group-hover:text-teal-300 transition-colors">
                          <div className="flex items-center gap-2">
                            <Ship className="size-3.5 text-teal-400 shrink-0" />
                            <span>{c.vessel_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {isIn ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                              Vào cảng
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-sky-500/15 text-sky-400 px-2 py-0.5 text-[10px] font-bold border border-sky-500/30">
                              Rời cảng
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-black text-teal-300 font-mono whitespace-nowrap">
                          {c.dwt ? c.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-slate-400 text-xs whitespace-nowrap font-mono">
                          {c.loa ? `${c.loa}m` : '—'} / {c.draft ? `${c.draft}m` : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-slate-200 font-medium whitespace-nowrap">
                          {c.berth_name || '—'}
                        </td>
                        <td className="py-3 px-3.5 text-[11px] text-slate-400 whitespace-nowrap">
                          {c.source || 'Cảng vụ Hàng hải'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-xs text-slate-400">
              Đang đồng bộ nhật ký điều động tàu cho <strong>{intel.name}</strong>.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
