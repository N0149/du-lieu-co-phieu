import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import {
  getDashboardSummary,
  getNationalMap,
  getNationalTraffic,
  getAllStocksIntel,
  formatDWT,
  formatCalls,
} from '@/lib/maritime'
import { PortAuthoritiesStrip } from '@/components/cang-bien/PortAuthoritiesStrip'
import { MaritimeStockGrid } from '@/components/cang-bien/MaritimeStockGrid'
import { LivePortCallsTable } from '@/components/cang-bien/LivePortCallsTable'
import { MaritimeSubNav } from '@/components/cang-bien/MaritimeSubNav'
import {
  Anchor,
  Ship,
  TrendingUp,
  Activity,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowUpRight,
  Layers,
  LayoutGrid,
  Sparkles,
  Zap,
  Globe2,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dữ Liệu Cảng Biển & Tình Báo Hàng Hải Việt Nam | Phân Tích Chuyên Sâu',
  description:
    'Nền tảng tình báo hàng hải và dữ liệu vận hành cảng biển Việt Nam: trọng tải tàu (DWT), số lượt tàu ra/vào theo từng bến và mã cổ phiếu niêm yết (PHP, GMD, DVP, DXP, SGP, PDN, CDN...).',
}

export default function CangBienPage() {
  const summary = getDashboardSummary()
  const mapData = getNationalMap()
  const trafficData = getNationalTraffic()
  const stocksIntel = getAllStocksIntel()

  const ports = trafficData?.ports || summary?.port_authorities || []
  const stocks = summary?.stocks || []
  const liveCalls = summary?.recent_port_calls || []
  const kpis = summary?.kpis || {
    total_port_authorities: 15,
    total_calls_30d: 15693,
    total_dwt_30d: 207933660,
    tracked_stocks_count: 11,
    live_port_calls_count: 100,
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-teal-500 selection:text-slate-950">
      {/* Site Header */}
      <SiteHeader />

      {/* Top Banner / Oceanic Hero */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-12 overflow-hidden">
        {/* Ambient Gradient Glow Lights */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 right-1/4 translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/15 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto max-w-[1600px] px-4 relative z-10 space-y-6 sm:space-y-8">
          {/* Breadcrumb & Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-slate-200 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="size-3 text-slate-600" />
              <span className="text-teal-400 font-bold">Cảng Biển &amp; Tình Báo Hàng Hải</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <MaritimeSubNav activeTab="tong-quan" />
          </div>

          {/* Hero Titles */}
          <div className="max-w-3xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-black text-teal-300 shadow-sm shadow-teal-500/10">
              <Activity className="size-3.5 text-teal-400" />
              <span>DỮ LIỆU VẬN HÀNH THỜI GIAN THỰC</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Tình Báo Hàng Hải &amp; Dữ Liệu Cảng Biển
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
              Theo dõi trọng tải tàu (DWT) và số lượt tàu cập bến thực tế từ 15 Cảng vụ Hàng hải —
              dự phóng sản lượng và doanh thu cổ phiếu cảng biển trước khi BCTC quý công bố 45–90 ngày.
            </p>
          </div>

          {/* Elevated Glass KPI Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            {/* Card 1: Port Authorities */}
            <div className="group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 sm:p-5 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-teal-500/40 transition-all hover:-translate-y-0.5">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Anchor className="size-3.5 text-teal-400" />
                  Cảng vụ theo dõi
                </span>
                <span className="size-2 rounded-full bg-teal-400 animate-pulse" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
                {kpis.total_port_authorities}
              </div>
              <div className="text-[11px] text-teal-400 font-semibold mt-1">
                Từ Quảng Ninh tới Cà Mau
              </div>
            </div>

            {/* Card 2: Calls 30d */}
            <div className="group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 sm:p-5 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-sky-500/40 transition-all hover:-translate-y-0.5">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Ship className="size-3.5 text-sky-400" />
                  Lượt tàu / 30 ngày
                </span>
                <span className="size-2 rounded-full bg-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300 mt-2 tracking-tight">
                {formatCalls(kpis.total_calls_30d)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">
                Quét tự động ca điều động
              </div>
            </div>

            {/* Card 3: DWT 30d */}
            <div className="group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 sm:p-5 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-emerald-500/40 transition-all hover:-translate-y-0.5">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-emerald-400" />
                  Tổng DWT / 30 ngày
                </span>
                <span className="size-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-2 tracking-tight">
                {formatDWT(kpis.total_dwt_30d)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">
                Trọng tải tàu qua cầu bến
              </div>
            </div>

            {/* Card 4: Tracked Stocks */}
            <div className="group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 sm:p-5 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-amber-500/40 transition-all hover:-translate-y-0.5">
              <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-amber-400" />
                  Mã cổ phiếu gắn bến
                </span>
                <span className="size-2 rounded-full bg-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2 tracking-tight">
                {kpis.tracked_stocks_count} Mã
              </div>
              <div className="text-[11px] text-amber-300/80 font-semibold mt-1">
                PHP, GMD, DVP, DXP, MIPEC...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8 space-y-12">
        {/* Section 1: Stock Grid for Investors */}
        <section className="space-y-4">
          <MaritimeStockGrid stocks={stocks} stocksIntel={stocksIntel} />
        </section>

        {/* Teaser Banner: Global Freight Rates Tab */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-teal-950/20 to-slate-900/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shrink-0">
              <Globe2 className="size-5" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-white">
                Chỉ Số Cước Vận Tải Biển Quốc Tế 10 Năm (2016 – 2026)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Biến động cước hàng rời (BDI), container viễn dương (Drewry WCI) và tàu dầu (BDTI, BCTI)
              </p>
            </div>
          </div>
          <Link
            href="/cang-bien/cuoc-van-tai"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 px-4 py-2 text-xs font-black shadow-md shadow-teal-500/20 hover:brightness-110 transition-all shrink-0"
          >
            <span>Xem Biểu Đồ 10 Năm</span>
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* Section 2: Live Port Calls Table (Full Width) */}
        <section className="space-y-4">
          <LivePortCallsTable calls={liveCalls} />
        </section>

        {/* Section 3: 15 Port Authorities Summary (Collapsible) */}
        <section className="space-y-4">
          <PortAuthoritiesStrip ports={ports} />
        </section>

        {/* Section 4: Value Proposition & Framework */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-slate-900/70 to-slate-950/95 p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <ShieldCheck className="size-4.5" />
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                Tại sao Dữ liệu Điều động Tàu thật lại tạo ra Lợi thế Đầu tư?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2 hover:border-teal-500/40 transition-colors">
                <div className="text-sm font-black text-teal-300 flex items-center gap-1.5">
                  <Zap className="size-4 text-teal-400" />
                  <span>1. Tín hiệu sớm hơn BCTC</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  BCTC chỉ xuất hiện sau khi kết thúc quý 45–90 ngày. Trong khi đó, mỗi chuyến tàu cập bến
                  được ghi nhận từng ca điều động thực tế, giúp bạn ước lượng chính xác sản lượng ngay trong quý.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2 hover:border-sky-500/40 transition-colors">
                <div className="text-sm font-black text-sky-300 flex items-center gap-1.5">
                  <Anchor className="size-4 text-sky-400" />
                  <span>2. Bến nước sâu &amp; Giá cước</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bến nước sâu (Lạch Huyện, Cái Mép) có khung giá dịch vụ bốc dỡ cao hơn 50–80% so với bến sông.
                  Nhận diện tỷ trọng tàu ghé bến nước sâu giúp dự báo biên lợi nhuận gộp bùng nổ.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-2 hover:border-amber-500/40 transition-colors">
                <div className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="size-4 text-amber-400" />
                  <span>3. Phân biệt Cảng thuần vs Holding</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hệ thống phân tách rõ rệt giữa các mã cảng thuần (PHP, DVP, DXP, MIPEC) có doanh thu gắn trực tiếp
                  với từng mét cầu bến và các tập đoàn đa ngành, loại bỏ hoàn toàn nhiễu số liệu.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
