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
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Site Header */}
      <SiteHeader />

      {/* Top Banner / Hero */}
      <div className="relative border-b border-border/70 bg-gradient-to-b from-slate-950 via-slate-900/90 to-background py-8 sm:py-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto max-w-[1600px] px-4 relative z-10 space-y-6">
          {/* Breadcrumb & Sub-navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="size-3 text-muted-foreground/60" />
              <span className="text-teal-400 font-semibold">Cảng Biển & Tình Báo Hàng Hải</span>
            </div>

            {/* Maritime Sub-navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-background/80 p-1 rounded-xl border border-border/70 text-xs font-semibold">
              <Link
                href="/cang-bien"
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 text-slate-950 px-3 py-1.5 font-bold shadow-sm"
              >
                <LayoutGrid className="size-3.5" />
                <span>Tổng quan &amp; Cổ phiếu</span>
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

          {/* Hero Titles */}
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-400">
              <Activity className="size-3.5" />
              <span>DỮ LIỆU VẬN HÀNH THỜI GIAN THỰC</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Tình Báo Hàng Hải & Dữ Liệu Cảng Biển Việt Nam
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Theo dõi trọng tải tàu (DWT) và lượt tàu ra/vào từng bến cảng từ Cảng vụ Hàng hải —
              dự phóng sản lượng & doanh thu các mã cổ phiếu cảng biển trước khi BCTC quý công bố 45–90 ngày.
            </p>
          </div>

          {/* Quick KPI Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Anchor className="size-3.5 text-teal-400" />
                <span>Cảng vụ theo dõi</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-1">
                {kpis.total_port_authorities}
              </div>
              <div className="text-[11px] text-teal-400 font-medium mt-0.5">
                Từ Quảng Ninh tới Cà Mau
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Ship className="size-3.5 text-sky-400" />
                <span>Lượt tàu / 30 ngày</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-sky-400 mt-1">
                {formatCalls(kpis.total_calls_30d)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Cập nhật 05:00 hằng ngày</div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-emerald-400" />
                <span>Tổng DWT / 30 ngày</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">
                {formatDWT(kpis.total_dwt_30d)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Trọng tải tàu qua cảng</div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Layers className="size-3.5 text-amber-400" />
                <span>Mã cổ phiếu gắn bến</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1">
                {kpis.tracked_stocks_count} Mã
              </div>
              <div className="text-[11px] text-amber-400/80 font-medium mt-0.5">
                PHP, GMD, DVP, DXP, SGP...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-[1600px] px-4 pt-8 space-y-10">
        {/* Section 1: Stock Grid for Investors (Primary Focus) */}
        <section className="space-y-4">
          <MaritimeStockGrid stocks={stocks} stocksIntel={stocksIntel} />
        </section>

        {/* Section 2: Live Port Calls Table (Primary Focus) */}
        <section className="space-y-4">
          <LivePortCallsTable calls={liveCalls} />
        </section>

        {/* Section 3: 15 Port Authorities Summary (Collapsible / Bottom) */}
        <section className="space-y-4">
          <PortAuthoritiesStrip ports={ports} />
        </section>

        {/* Section 4: Value Proposition & Framework */}
        <section className="rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 to-slate-950/80 p-6 sm:p-8 shadow-xl">
          <div className="max-w-3xl space-y-4">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="size-5 text-teal-400" />
              Tại sao Dữ liệu Tàu thật lại quyết định lợi thế đầu tư?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                <div className="text-sm font-bold text-teal-300">1. Tín hiệu sớm hơn BCTC</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  BCTC chỉ xuất hiện sau khi kết thúc quý 45–90 ngày. Trong khi đó, mỗi chuyến tàu cập bến
                  được ghi nhận từng ngày, giúp ước lượng sản lượng ngay trong quý.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                <div className="text-sm font-bold text-sky-300">2. Tách bến nước sâu & giá cước</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bến nước sâu (Lạch Huyện, Cái Mép) có khung giá dịch vụ bốc dỡ cao hơn 50–80% so với bến sông.
                  Nhận diện dòng dịch chuyển tàu giúp dự báo biên lợi nhuận gộp.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                <div className="text-sm font-bold text-amber-300">3. Loại bỏ méo mó Holding</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chỉ các mã cảng thuần có doanh thu gắn trực tiếp với bến cụ thể mới đưa vào mô hình đối chiếu,
                  tránh nhầm lẫn với doanh nghiệp đa ngành hoặc holding.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
