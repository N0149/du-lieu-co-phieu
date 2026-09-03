'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Layers,
  FileText,
  FileSpreadsheet,
  Ship,
  Share2,
  Check,
  Users,
  Target,
  ShieldCheck,
  ArrowUpRight,
  PieChart,
  Percent,
  Award,
  Sparkles,
} from 'lucide-react'
import type { StockDetailData, StockManifestItem } from '@/lib/longlivestock'
import type { Report } from '@/lib/use-reports'
import { cn } from '@/lib/utils'
import { BusinessPlanComparison, BusinessPlanYear } from '@/components/business-plan-comparison'
import { FinancialStatementsExplorer } from '@/components/financial-statements-explorer'
import { CompanyReportsTab } from '@/components/reports/CompanyReportsTab'
import { BankFinancialCharts } from '@/components/stock/BankFinancialCharts'
import { BankingDetailedFinancialCharts } from '@/components/stock/BankingDetailedFinancialCharts'
import { GeneralDetailedFinancialCharts } from '@/components/stock/GeneralDetailedFinancialCharts'
import { FinancialCashFlowAndDividends } from '@/components/stock/FinancialCashFlowAndDividends'
import { ValuationBandsChart } from '@/components/stock/ValuationBandsChart'
import { StockEvaluationHeader } from '@/components/stock/StockEvaluationHeader'
import { CompanyProfileEnhancement } from '@/components/stock/CompanyProfileEnhancement'
import { PeerComparisonView } from '@/components/peer-comparison-view'
import type { DetailedFinancialSnapshot } from '@/lib/local-financials'
import type { BankAnalysisData } from '@/lib/banking-types'
import type { StockEvaluationData } from '@/lib/stock-evaluation-service'
import type { CompanyFullProfileData } from '@/lib/company-profile-types'
import type { FinancialChartPayload } from '@/lib/financial-charts-service'
import type { ValuationHistoryPayload } from '@/lib/valuation-history-service'
import type { DividendHistoryPayload } from '@/lib/dividend-history-service'

export type StockDetailTab =
  | 'profile'
  | 'charts'
  | 'financials'
  | 'peers'
  | 'evaluation'
  | 'reports'

interface StockDetailViewProps {
  stockData: StockDetailData
  relatedStocks?: StockManifestItem[]
  reports?: Report[]
  detailedSnapshot?: DetailedFinancialSnapshot | null
  bankAnalysisData?: BankAnalysisData | null
  evaluationData?: StockEvaluationData | null
  companyProfileData?: CompanyFullProfileData | null
  financialChartQuarter?: FinancialChartPayload | null
  financialChartAnnual?: FinancialChartPayload | null
  valuationHistory?: ValuationHistoryPayload | null
  dividendHistory?: DividendHistoryPayload | null
}

function fmt(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function fmtDateVN(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}

export function StockDetailView({
  stockData,
  relatedStocks = [],
  reports = [],
  detailedSnapshot = null,
  bankAnalysisData = null,
  evaluationData = null,
  companyProfileData = null,
  financialChartQuarter = null,
  financialChartAnnual = null,
  valuationHistory = null,
  dividendHistory = null,
}: StockDetailViewProps) {
  const [activeTab, setActiveTab] = useState<StockDetailTab>('profile')
  const [copied, setCopied] = useState(false)

  const {
    ticker,
    company,
    profile,
    market,
    valuation,
    financials = [],
    shareholders = [],
    price_weekly = [],
    throughput = [],
    is_port = false,
    coreCard = null,
  } = stockData

  // 1. Tính toán biến động giá 1 năm và YTD từ price_weekly
  const priceChanges = useMemo(() => {
    if (!price_weekly || price_weekly.length < 2) {
      return { ytd: null, y1: null, lastDate: null }
    }
    const last = price_weekly[price_weekly.length - 1]
    const lastPrice = last.c
    const year = last.d.slice(0, 4)

    // YTD base: first entry of the current year
    let ytdBase: number | null = null
    for (let i = 0; i < price_weekly.length; i++) {
      if (price_weekly[i].d >= `${year}-01-01`) {
        ytdBase = price_weekly[i].c
        break
      }
    }
    const ytd = ytdBase ? ((lastPrice - ytdBase) / ytdBase) * 100 : null

    // 1-Year base
    const d = new Date(last.d)
    let y1: number | null = null
    if (!isNaN(d.getTime())) {
      const oneYrAgo = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
      const y1Ref = oneYrAgo.toISOString().slice(0, 10)
      let y1Base: number | null = null
      for (let i = 0; i < price_weekly.length; i++) {
        if (price_weekly[i].d >= y1Ref) {
          y1Base = price_weekly[i].c
          break
        }
      }
      if (y1Base) {
        y1 = ((lastPrice - y1Base) / y1Base) * 100
      }
    }

    return { ytd, y1, lastDate: last.d }
  }, [price_weekly])

  // 2. Sắp xếp báo cáo tài chính đa năm (Mới nhất lên đầu)
  const sortedFinancials = useMemo(() => {
    return [...financials].sort((a, b) => b.year - a.year)
  }, [financials])

  // 3. Chuẩn bị dữ liệu cho biểu đồ Doanh thu & LNST đa năm
  const chartFinancials = useMemo(() => {
    return [...financials].sort((a, b) => a.year - b.year)
  }, [financials])

  const latestFin = sortedFinancials[0] || null
  const latestDiv = latestFin?.dividend ?? null
  const divYield =
    latestDiv != null && market.price != null && market.price > 0
      ? (latestDiv / (market.price * 1000)) * 100
      : null

  const hasReports = reports.length > 0

  // 4. Tính toán dữ liệu cổ đông
  const shareholderData = useMemo(() => {
    let knownTotal = 0
    let maxPct = 0
    shareholders.forEach((sh) => {
      const p = sh.pct || 0
      knownTotal += p
      if (p > maxPct) maxPct = p
    })
    const otherPct = knownTotal > 0 && knownTotal < 99.5 ? 100 - knownTotal : 0
    if (otherPct > maxPct) maxPct = otherPct
    maxPct = maxPct || 100
    return { items: shareholders, otherPct, maxPct }
  }, [shareholders])

  const isDelisted = company?.status === 'delisted'
  const isSuspended = company?.status === 'suspended'
  const isInactive = company?.status === 'inactive'
  const hasWarning = isDelisted || isSuspended || isInactive || company?.status_note

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 5. SVG Biểu đồ giá 5 năm (Weekly)
  const priceChartSvg = useMemo(() => {
    if (!price_weekly || price_weekly.length < 2) return null
    const data = price_weekly.slice(-260)
    const W = 620
    const H = 220
    const padL = 46
    const padR = 16
    const padT = 12
    const padB = 26
    const volH = 34
    const plotH = H - padT - padB - volH

    const cs = data.map((p) => p.c)
    const vs = data.map((p) => p.v)
    const cmin = Math.min(...cs) * 0.97
    const cmax = Math.max(...cs) * 1.03
    const vmax = Math.max(...vs) || 1
    const denom = data.length - 1 || 1

    const xPos = (i: number) => padL + (i * (W - padL - padR)) / denom
    const yPos = (c: number) => padT + (1 - (c - cmin) / (cmax - cmin || 1)) * plotH
    const vyPos = (v: number) => H - padB - (v / vmax) * volH

    const gridLines = []
    for (let gi = 0; gi <= 3; gi++) {
      const gyy = padT + (gi * plotH) / 3
      const gval = cmax - (gi * (cmax - cmin)) / 3
      gridLines.push({
        y: gyy,
        label: fmt(gval, gval < 100 ? 1 : 0),
      })
    }

    const bw = Math.max(1, ((W - padL - padR) / data.length) * 0.6)
    const volBars = data.map((p, i) => {
      const vy = vyPos(p.v)
      const vh = Math.max(0, H - padB - vy)
      return {
        x: xPos(i) - bw / 2,
        y: vy,
        width: bw,
        height: vh,
      }
    })

    const li = data.length - 1
    let areaD = `M ${xPos(0).toFixed(1)} ${yPos(data[0].c).toFixed(1)}`
    data.forEach((p, i) => {
      areaD += ` L ${xPos(i).toFixed(1)} ${yPos(p.c).toFixed(1)}`
    })
    areaD += ` L ${xPos(li).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xPos(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`

    let lineD = `M ${xPos(0).toFixed(1)} ${yPos(data[0].c).toFixed(1)}`
    data.forEach((p, i) => {
      lineD += ` L ${xPos(i).toFixed(1)} ${yPos(p.c).toFixed(1)}`
    })

    let lastYr = ''
    const yearMarkers: { x: number; yr: string }[] = []
    data.forEach((p, i) => {
      const yr = p.d.slice(0, 4)
      if (yr !== lastYr && i > 0) {
        lastYr = yr
        yearMarkers.push({ x: xPos(i), yr })
      }
    })

    return {
      W,
      H,
      padL,
      padR,
      padT,
      padB,
      plotH,
      gridLines,
      volBars,
      areaD,
      lineD,
      lastDot: { x: xPos(li), y: yPos(data[li].c) },
      yearMarkers,
      lastPrice: data[li].c,
    }
  }, [price_weekly])

  // 6. SVG Biểu đồ Doanh thu & LNST đa năm
  const revChartData = useMemo(() => {
    if (!chartFinancials || chartFinancials.length < 2) return null
    const data = chartFinancials.slice(-16)
    const W = 620
    const H = 220
    const padL = 46
    const padR = 46
    const padT = 16
    const padB = 26
    const plotH = H - padT - padB
    const plotW = W - padL - padR

    const revs = data.map((d) => d.revenue || 0)
    const profs = data.map((d) => d.profit || 0)
    const nms = data.map((d) => d.net_margin).filter((v): v is number => v != null)

    const maxRev = Math.max(...revs, ...profs, 1)
    const minVal = Math.min(...profs, 0)
    const hasNeg = minVal < 0
    const valRange = maxRev - minVal || 1

    const yVal = (v: number) => padT + (1 - (v - minVal) / valRange) * plotH
    const y0 = yVal(0)

    const minNm = nms.length ? Math.min(...nms, 0) : 0
    const maxNm = nms.length ? Math.max(...nms, 20) : 20
    const nmRange = maxNm - minNm || 1
    const yNm = (nm: number) => padT + (1 - (nm - minNm) / nmRange) * plotH

    const n = data.length
    const slotW = plotW / n
    const groupW = slotW * 0.76
    const barW = Math.max(2, (groupW - 2) / 2)

    const bars = data.map((d, i) => {
      const cx = padL + (i + 0.5) * slotW
      const r = d.revenue || 0
      const p = d.profit || 0

      const ry = yVal(Math.max(0, r))
      const rh = Math.max(1, Math.abs(yVal(r) - y0))

      const py = p >= 0 ? yVal(p) : y0
      const ph = Math.max(1, Math.abs(yVal(p) - y0))

      return {
        year: d.year,
        cx,
        revBar: { x: cx - groupW / 2, y: ry, w: barW, h: rh, val: r },
        profBar: { x: cx - groupW / 2 + barW + 2, y: py, w: barW, h: ph, val: p, isNeg: p < 0 },
        netMargin: d.net_margin ?? null,
      }
    })

    const nmPts = bars
      .filter((b) => b.netMargin != null)
      .map((b) => ({ cx: b.cx, py: yNm(b.netMargin!), val: b.netMargin! }))

    let nmLineD = ''
    if (nmPts.length >= 2) {
      nmLineD = `M ${nmPts[0].cx.toFixed(1)} ${nmPts[0].py.toFixed(1)}`
      for (let i = 1; i < nmPts.length; i++) {
        nmLineD += ` L ${nmPts[i].cx.toFixed(1)} ${nmPts[i].py.toFixed(1)}`
      }
    }

    const leftGrid = []
    for (let gi = 0; gi <= 3; gi++) {
      const gval = minVal + (gi * valRange) / 3
      const gy = yVal(gval)
      leftGrid.push({ y: gy, label: fmt(gval / 1000, gval > 10000 ? 0 : 1) })
    }

    const rightGrid = []
    for (let gi = 0; gi <= 3; gi++) {
      const nmVal = minNm + (gi * nmRange) / 3
      const gy = yNm(nmVal)
      rightGrid.push({ y: gy, label: `${fmt(nmVal, 0)}%` })
    }

    return {
      W,
      H,
      padL,
      padR,
      padB,
      leftGrid,
      rightGrid,
      bars,
      nmLineD,
      nmDots: nmPts,
      hasNeg,
      y0,
    }
  }, [chartFinancials])

  // 7. Biểu đồ sản lượng cảng biển (nếu có)
  const tpChartData = useMemo(() => {
    if (!is_port || !throughput || throughput.length < 2) return null
    const W = 620
    const H = 200
    const padL = 46
    const padR = 16
    const padT = 16
    const padB = 26
    const plotH = H - padT - padB
    const plotW = W - padL - padR

    const vals = throughput.map((t) => t.dwt ?? t.vessels ?? 0)
    const maxVal = Math.max(...vals, 1) * 1.1

    const yVal = (v: number) => padT + (1 - v / maxVal) * plotH
    const n = throughput.length
    const slotW = plotW / n
    const barW = Math.max(6, slotW * 0.55)

    const bars = throughput.map((t, i) => {
      const v = t.dwt ?? t.vessels ?? 0
      const cx = padL + (i + 0.5) * slotW
      const y = yVal(v)
      const h = Math.max(2, H - padB - y)
      return {
        year: t.year,
        cx,
        bx: cx - barW / 2,
        by: y,
        bw: barW,
        barH: h,
        val: v,
      }
    })

    const grid = []
    for (let gi = 0; gi <= 3; gi++) {
      const gval = (gi * maxVal) / 3
      grid.push({ y: yVal(gval), label: fmt(gval, 1) })
    }

    return { W, H, padL, padR, padB, grid, bars }
  }, [is_port, throughput])

  // Cấu hình danh sách 6 Tabs chuẩn
  const TABS = useMemo(() => {
    return [
      {
        id: 'profile' as StockDetailTab,
        label: 'Hồ Sơ Doanh Nghiệp',
        icon: Building2,
        iconColor: 'text-indigo-500',
      },
      {
        id: 'charts' as StockDetailTab,
        label: 'Biểu Đồ Tài Chính',
        icon: BarChart3,
        iconColor: 'text-emerald-500',
      },
      {
        id: 'financials' as StockDetailTab,
        label: 'Báo Cáo Tài Chính',
        icon: FileSpreadsheet,
        iconColor: 'text-amber-500',
      },
      {
        id: 'peers' as StockDetailTab,
        label: 'So sánh trong ngành',
        icon: Users,
        iconColor: 'text-violet-500',
      },
      {
        id: 'evaluation' as StockDetailTab,
        label: 'Đánh Giá 360°',
        icon: Target,
        iconColor: 'text-rose-500',
      },
      {
        id: 'reports' as StockDetailTab,
        label: 'Báo Cáo Phân Tích',
        icon: FileText,
        iconColor: 'text-sky-500',
        badge: 'NEW',
      },
    ]
  }, [])

  return (
    <div className="space-y-5 pb-12">
      {/* ── 0. BREADCRUMB & ACTION BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Về trang chủ</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500">Đã sao chép link</span>
              </>
            ) : (
              <>
                <Share2 className="size-3.5" />
                <span>Chia sẻ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 1. HEADER CÔNG TY & CẢNH BÁO ── */}
      {hasWarning && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Lưu ý cổ phiếu: </span>
            <span>
              {company.status_note ||
                (isDelisted
                  ? 'Cổ phiếu đã huỷ niêm yết.'
                  : isSuspended
                  ? 'Cổ phiếu đang bị tạm ngừng giao dịch.'
                  : 'Cổ phiếu trong diện cảnh báo/kiểm soát.')}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {ticker}
            </h1>
            {company.exchange && (
              <span className="rounded-md bg-secondary px-2.5 py-0.5 font-mono text-xs font-bold text-secondary-foreground uppercase">
                {company.exchange}
              </span>
            )}
            {company.sector && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                {company.sector}
              </span>
            )}
            {company.icb_l1 && (
              <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-muted-foreground">
                {company.icb_l1}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-muted-foreground sm:text-lg">
            {company.name}
          </h2>
        </div>
      </div>

      {/* ── 2. BẢNG TỔNG HỢP: ĐÁNH GIÁ 360° & GIÁ + 10 THẺ KPI (CHUẨN RUATICHSAN) ── */}
      <StockEvaluationHeader
        stockData={stockData}
        evaluationData={evaluationData}
        priceChanges={priceChanges}
      />

      {/* ── 3. THANH ĐIỀU HƯỚNG TAB CHÍNH (THEO CHUẨN GIAO DIỆN GỌN GÀNG) ── */}
      <div className="sticky top-2 z-30 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/80 bg-card/95 p-1.5 backdrop-blur-md shadow-xs scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'size-4 shrink-0 transition-colors',
                  isActive ? 'text-primary-foreground' : tab.iconColor
                )}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-white shadow-2xs animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── 4. NỘI DUNG TỪNG TAB ── */}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 1: HỒ SƠ DOANH NGHIỆP                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Mảng kinh doanh cốt lõi (Core Card) */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex flex-wrap items-center gap-3.5 border-b border-border bg-muted/40 p-4 sm:p-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-xl font-black text-primary">
                {coreCard?.monogram || ticker[0]}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-foreground">
                  {coreCard?.companyName || company.name}
                </h3>
                <p className="truncate text-xs text-muted-foreground">
                  {coreCard?.subtitle || profile || company.sector}
                </p>
              </div>

              {coreCard?.mainMarketTag && (
                <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {coreCard.mainMarketTag}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {coreCard?.segments && coreCard.segments.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Mảng kinh doanh cốt lõi
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/50 font-semibold uppercase tracking-wider text-muted-foreground text-[10.5px]">
                        <tr>
                          <th className="px-4 py-3 min-w-[280px]">Mảng sản phẩm</th>
                          <th className="px-4 py-3 min-w-[220px]">Vai trò</th>
                          <th className="px-4 py-3 min-w-[100px]">Phân khúc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {coreCard.segments.map((seg, i) => (
                          <tr key={i} className="hover:bg-muted/25 transition-colors">
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-bold text-foreground text-[13px]">{seg.segment}</div>
                              <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                                {seg.description}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 align-top text-[12px] leading-relaxed text-foreground/90 font-medium">
                              {seg.role}
                            </td>
                            <td className="px-4 py-3.5 align-top">
                              <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary whitespace-nowrap">
                                {seg.tag}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-foreground/90 sm:text-sm">
                    {coreCard?.snippet || profile || 'Chưa có mô tả chi tiết hoạt động doanh nghiệp.'}
                  </p>
                  {coreCard?.pills && coreCard.pills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {coreCard.pills.map((pill, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bento Columns (Thị trường đầu ra & Động lực) */}
              {coreCard?.bentoCards && coreCard.bentoCards.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-1">
                  {coreCard.bentoCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-muted/20 p-4 shadow-2xs space-y-2.5"
                    >
                      <h4 className="text-xs font-bold text-foreground sm:text-[13px]">
                        {card.title}
                      </h4>
                      <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                        {card.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                            <span dangerouslySetInnerHTML={{ __html: item }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {coreCard?.citation && (
                <div className="border-t border-dashed border-border pt-3 text-[11px] text-muted-foreground leading-relaxed">
                  <span dangerouslySetInnerHTML={{ __html: coreCard.citation }} />
                </div>
              )}
            </div>
          </div>

          {/* Hồ sơ doanh nghiệp & Thông tin niêm yết */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
              <Building2 className="size-4 text-primary" />
              <span>Hồ Sơ Doanh Nghiệp & Thông Tin Niêm Yết</span>
            </h3>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {profile || 'Chưa có mô tả chi tiết hồ sơ doanh nghiệp.'}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 pt-2">
              {company.icb_l1 && (
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Nhóm ngành
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-foreground">{company.icb_l1}</div>
                </div>
              )}

              {company.sector && (
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Ngành (ICB cấp 4)
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-foreground">{company.sector}</div>
                </div>
              )}

              {company.exchange && (
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Sàn niêm yết
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-foreground">{company.exchange}</div>
                </div>
              )}

              {financials.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Dữ liệu tài chính
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-foreground">
                    {financials[0]?.year} – {financials[financials.length - 1]?.year} ({financials.length} năm)
                  </div>
                </div>
              )}
            </div>

            {/* Ngành nghề đăng ký */}
            {company.business_lines && company.business_lines.length > 0 && (
              <div className="border-t border-border/60 pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ngành nghề kinh doanh đăng ký ({company.business_lines.length} ngành nghề)
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {company.business_lines.map((line, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-foreground/80 font-medium"
                    >
                      • {line}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nâng cấp Hồ Sơ Doanh Nghiệp (Cơ cấu cổ đông PieChart, Công ty con & liên kết, Giao dịch nội bộ) */}
          {companyProfileData ? (
            <CompanyProfileEnhancement symbol={ticker} data={companyProfileData} />
          ) : shareholderData.items.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Cơ Cấu Cổ Đông Lớn & Sở Hữu
              </h3>
              <div className="space-y-3 pt-1">
                {shareholderData.items.map((sh, idx) => {
                  const pct = sh.pct || 0
                  const w = Math.round((pct / shareholderData.maxPct) * 100)
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="w-72 truncate text-xs font-semibold text-foreground" title={sh.name}>
                        {sh.name}
                      </div>
                      <div className="flex-1 rounded-full bg-secondary h-3 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, Math.max(2, w))}%` }}
                          className="h-full rounded-full bg-primary transition-all"
                        />
                      </div>
                      <div className="font-mono text-xs font-bold text-primary sm:text-right sm:w-16">
                        {fmt(pct, 2)}%
                      </div>
                    </div>
                  )
                })}

                {shareholderData.otherPct > 0 && (
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4 pt-1">
                    <div className="w-72 truncate text-xs font-medium text-muted-foreground">
                      Cổ đông khác (Trôi nổi tự do)
                    </div>
                    <div className="flex-1 rounded-full bg-secondary h-3 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(2, Math.round((shareholderData.otherPct / shareholderData.maxPct) * 100)))}%`,
                        }}
                        className="h-full rounded-full bg-muted-foreground/50 transition-all"
                      />
                    </div>
                    <div className="font-mono text-xs font-semibold text-muted-foreground sm:text-right sm:w-16">
                      {fmt(shareholderData.otherPct, 2)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2: BIỂU ĐỒ TÀI CHÍNH                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'charts' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* 9 Biểu đồ tài chính chuyên biệt ngành Ngân hàng (Chuỗi thời gian Quý / Năm) */}
          {(financialChartQuarter?.isNganHang || financialChartAnnual?.isNganHang || bankAnalysisData?.isBank) && (financialChartQuarter || financialChartAnnual) && (
            <BankingDetailedFinancialCharts
              symbol={ticker}
              quarterData={financialChartQuarter}
              annualData={financialChartAnnual}
            />
          )}

          {/* 9 Biểu đồ tài chính doanh nghiệp sản xuất / phi ngân hàng (Chuỗi thời gian Quý / Năm) */}
          {!(financialChartQuarter?.isNganHang || financialChartAnnual?.isNganHang || bankAnalysisData?.isBank) && (financialChartQuarter || financialChartAnnual) && (
            <GeneralDetailedFinancialCharts
              symbol={ticker}
              quarterData={financialChartQuarter}
              annualData={financialChartAnnual}
            />
          )}

          {/* Cụm Biểu Đồ Dòng Tiền & Cổ Tức (Cổ tức tỷ đồng, Lịch sử trả cổ tức, Lưu chuyển tiền tệ OCF/ICF/CFF) */}
          {(financialChartQuarter || financialChartAnnual || dividendHistory) && (
            <FinancialCashFlowAndDividends
              symbol={ticker}
              chartData={financialChartQuarter || financialChartAnnual}
              dividendData={dividendHistory}
            />
          )}

          {/* Bộ 3 Dải Định Giá Lịch Sử P/E, P/B, P/S Bands theo độ lệch chuẩn */}
          {valuationHistory && (
            <ValuationBandsChart
              symbol={ticker}
              data={valuationHistory}
            />
          )}

          {/* Biểu đồ chuyên sâu ngành Ngân Hàng (So sánh 27 ngân hàng, Radar 11 chỉ tiêu, Cơ cấu cho vay) */}
          {bankAnalysisData?.isBank && (
            <BankFinancialCharts
              symbol={ticker}
              data={bankAnalysisData}
            />
          )}

          {(priceChartSvg || revChartData) && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Biểu Đồ Giá & Khối Lượng 5 Năm */}
              {priceChartSvg && (
                <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      <span>Lịch Sử Giá & Khối Lượng (5 Năm Tuần)</span>
                    </div>
                    <div className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Gần nhất: {fmt(priceChartSvg.lastPrice, 1)} k₫
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[480px]">
                      <svg
                        viewBox={`0 0 ${priceChartSvg.W} ${priceChartSvg.H}`}
                        className="w-full h-auto select-none"
                      >
                        <defs>
                          <linearGradient id="priceGradAesthetic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                          </linearGradient>
                        </defs>

                        {priceChartSvg.gridLines.map((g, idx) => (
                          <g key={idx}>
                            <line
                              x1={priceChartSvg.padL}
                              y1={g.y}
                              x2={priceChartSvg.W - priceChartSvg.padR}
                              y2={g.y}
                              stroke="currentColor"
                              className="text-border/50"
                              strokeWidth="0.75"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={priceChartSvg.padL - 6}
                              y={g.y + 3.5}
                              textAnchor="end"
                              fontSize="9.5"
                              fontFamily="monospace"
                              className="fill-muted-foreground/75 font-medium"
                            >
                              {g.label}
                            </text>
                          </g>
                        ))}

                        {priceChartSvg.volBars.map((vb, idx) => (
                          <rect
                            key={idx}
                            x={vb.x}
                            y={vb.y}
                            width={vb.width}
                            height={vb.height}
                            fill="#10b981"
                            className="opacity-25 hover:opacity-75 transition-opacity"
                            rx="1"
                          />
                        ))}

                        <path d={priceChartSvg.areaD} fill="url(#priceGradAesthetic)" />

                        <path
                          d={priceChartSvg.lineD}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <circle
                          cx={priceChartSvg.lastDot.x}
                          cy={priceChartSvg.lastDot.y}
                          r="6"
                          fill="#10b981"
                          opacity="0.25"
                        />
                        <circle
                          cx={priceChartSvg.lastDot.x}
                          cy={priceChartSvg.lastDot.y}
                          r="3.5"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />

                        {priceChartSvg.yearMarkers.map((ym, idx) => (
                          <text
                            key={idx}
                            x={ym.x}
                            y={priceChartSvg.H - priceChartSvg.padB + 18}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontFamily="monospace"
                            className="fill-muted-foreground/70 font-medium"
                          >
                            {ym.yr}
                          </text>
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Biểu Đồ Doanh Thu & LNST + Biên Ròng */}
              {revChartData && (
                <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                      <BarChart3 className="size-3.5 text-blue-500" />
                      <span>Doanh Thu, LNST & Biên Ròng ({chartFinancials.length} Năm)</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px] font-semibold">
                      <span className="flex items-center gap-1 text-blue-500">
                        <span className="size-2 rounded-xs bg-blue-500" />
                        <span>DT (tỷ)</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <span className="size-2 rounded-xs bg-emerald-500" />
                        <span>LNST (tỷ)</span>
                      </span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <span className="h-0.5 w-2.5 border-t-2 border-dashed border-amber-500" />
                        <span>Biên ròng (%)</span>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[480px]">
                      <svg
                        viewBox={`0 0 ${revChartData.W} ${revChartData.H}`}
                        className="w-full h-auto select-none"
                      >
                        <defs>
                          <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
                          </linearGradient>
                          <linearGradient id="profBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
                          </linearGradient>
                        </defs>

                        {revChartData.leftGrid.map((g, idx) => (
                          <g key={idx}>
                            <line
                              x1={revChartData.padL}
                              y1={g.y}
                              x2={revChartData.W - revChartData.padR}
                              y2={g.y}
                              stroke="currentColor"
                              className="text-border/50"
                              strokeWidth="0.75"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={revChartData.padL - 6}
                              y={g.y + 3.5}
                              textAnchor="end"
                              fontSize="9.5"
                              fontFamily="monospace"
                              className="fill-muted-foreground/75 font-medium"
                            >
                              {g.label}
                            </text>
                          </g>
                        ))}

                        {revChartData.hasNeg && (
                          <line
                            x1={revChartData.padL}
                            y1={revChartData.y0}
                            x2={revChartData.W - revChartData.padR}
                            y2={revChartData.y0}
                            stroke="currentColor"
                            className="text-rose-500/60"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                          />
                        )}

                        {revChartData.rightGrid.map((g, idx) => (
                          <text
                            key={idx}
                            x={revChartData.W - revChartData.padR + 6}
                            y={g.y + 3.5}
                            textAnchor="start"
                            fontSize="9.5"
                            fontFamily="monospace"
                            fill="#f59e0b"
                            className="font-semibold"
                          >
                            {g.label}
                          </text>
                        ))}

                        {revChartData.bars.map((b) => (
                          <g key={b.year}>
                            <rect
                              x={b.revBar.x}
                              y={b.revBar.y}
                              width={b.revBar.w}
                              height={b.revBar.h}
                              fill="url(#revBarGrad)"
                              className="hover:opacity-90 transition-opacity cursor-pointer"
                              rx="2"
                            >
                              <title>{`Năm ${b.year}: Doanh thu ${fmt(b.revBar.val, 0)} tỷ đ`}</title>
                            </rect>

                            <rect
                              x={b.profBar.x}
                              y={b.profBar.y}
                              width={b.profBar.w}
                              height={b.profBar.h}
                              fill={b.profBar.isNeg ? '#f43f5e' : 'url(#profBarGrad)'}
                              className="hover:opacity-90 transition-opacity cursor-pointer"
                              rx="2"
                            >
                              <title>{`Năm ${b.year}: LNST ${fmt(b.profBar.val, 0)} tỷ đ`}</title>
                            </rect>

                            <text
                              x={b.cx}
                              y={revChartData.H - revChartData.padB + 18}
                              textAnchor="middle"
                              fontSize="9.5"
                              fontFamily="monospace"
                              className="fill-muted-foreground/70 font-medium"
                            >
                              {String(b.year).slice(-2)}
                            </text>
                          </g>
                        ))}

                        {revChartData.nmLineD && (
                          <path
                            d={revChartData.nmLineD}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.6"
                            strokeDasharray="4 2"
                            strokeLinejoin="round"
                          />
                        )}

                        {revChartData.nmDots.map((d, idx) => (
                          <circle
                            key={idx}
                            cx={d!.cx}
                            cy={d!.py}
                            r="2.5"
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth="1"
                            className="cursor-pointer"
                          >
                            <title>{`Biên ròng: ${fmt(d!.val, 1)}%`}</title>
                          </circle>
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Biểu đồ sản lượng cảng biển (nếu có) */}
          {tpChartData && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Ship className="size-3.5 text-sky-500" />
                  <span>Sản Lượng Thông Qua Cảng (Throughput · Triệu DWT / Lượt tàu)</span>
                </div>
                <Link
                  href={`/cang-bien`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Xem bản đồ cảng biển →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                  <svg viewBox={`0 0 ${tpChartData.W} ${tpChartData.H}`} className="w-full h-auto select-none">
                    <defs>
                      <linearGradient id="tpBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {tpChartData.grid.map((g, idx) => (
                      <g key={idx}>
                        <line
                          x1={tpChartData.padL}
                          y1={g.y}
                          x2={tpChartData.W - tpChartData.padR}
                          y2={g.y}
                          stroke="currentColor"
                          className="text-border/50"
                          strokeWidth="0.75"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={tpChartData.padL - 6}
                          y={g.y + 3.5}
                          textAnchor="end"
                          fontSize="9.5"
                          fontFamily="monospace"
                          className="fill-muted-foreground/75 font-medium"
                        >
                          {g.label}
                        </text>
                      </g>
                    ))}

                    {tpChartData.bars.map((b) => (
                      <g key={b.year}>
                        <rect
                          x={b.bx}
                          y={b.by}
                          width={b.bw}
                          height={b.barH}
                          fill="url(#tpBarGrad)"
                          className="hover:opacity-90 transition-opacity cursor-pointer"
                          rx="2"
                        >
                          <title>{`Năm ${b.year}: ${fmt(b.val, 2)} triệu DWT`}</title>
                        </rect>
                        <text
                          x={b.cx}
                          y={tpChartData.H - tpChartData.padB + 18}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontFamily="monospace"
                          className="fill-muted-foreground/70 font-medium"
                        >
                          {b.year}
                        </text>
                        {b.val > 0 && (
                          <text
                            x={b.cx}
                            y={b.by - 6}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontFamily="monospace"
                            className="fill-foreground font-bold"
                          >
                            {fmt(b.val, 1)}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 3: BÁO CÁO TÀI CHÍNH                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'financials' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* A. Kế Hoạch Kinh Doanh & Tỷ Lệ Hoàn Thành (1 năm / 3 năm / 5 năm / 10 năm) */}
          <BusinessPlanComparison ticker={ticker} />

          {/* B. Báo Cáo Tài Chính Chi Tiết 3 Bảng VAS (34 Quý / 16 Năm) */}
          <FinancialStatementsExplorer
            ticker={ticker}
            financials={financials}
            detailedSnapshot={detailedSnapshot}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 4: SO SÁNH TRONG NGÀNH                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'peers' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* A. Bảng & Biểu đồ So Sánh Doanh Nghiệp Cùng Ngành Chuyên Sâu (Chuẩn Ruatichsan) */}
          <PeerComparisonView
            currentTicker={ticker}
            sectorName={company.sector || company.icb_l1 || 'Cùng nhóm ngành'}
            initialPeers={relatedStocks.map((s) => s.t)}
          />

          {/* B. Lưới Thẻ Toàn Bộ Cổ Phiếu Cùng Nhóm Ngành */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-violet-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Danh Sách Cổ Phiếu Cùng Ngành ({company.sector || company.icb_l1 || 'Cùng nhóm ngành'})
                </h3>
              </div>
              <Link
                href={`/tra-cuu`}
                className="text-xs font-bold text-primary hover:underline"
              >
                Tra cứu bộ lọc toàn ngành →
              </Link>
            </div>

            {relatedStocks.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pt-1">
                {relatedStocks.map((s) => {
                  const w1 = s.w1
                  const hasW1 = w1 != null
                  const isW1Pos = hasW1 && w1 > 0
                  const isW1Neg = hasW1 && w1 < 0

                  return (
                    <Link
                      key={s.t}
                      href={`/stock/${s.t}`}
                      className="group flex flex-col justify-between rounded-xl border border-border bg-background p-3.5 transition-all hover:border-primary hover:shadow-xs"
                    >
                      <div>
                        <div className="font-mono text-base font-bold text-primary group-hover:underline">
                          {s.t}
                        </div>
                        <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground" title={s.n}>
                          {s.n}
                        </div>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between gap-1 pt-2 border-t border-border/60">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {s.px != null ? `${fmt(s.px, s.px < 100 ? 1 : 0)} k₫` : '—'}
                        </span>
                        {hasW1 ? (
                          <span
                            className={cn(
                              'font-mono text-[10px] font-bold',
                              isW1Pos
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isW1Neg
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {isW1Pos ? '+' : ''}
                            {fmt(w1, 1)}%
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                <p>Chưa có danh sách đối thủ cùng ngành cụ thể cho mã này.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 5: ĐÁNH GIÁ 360°                                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'evaluation' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Card 1: Sức khỏe tài chính & Khả năng sinh lời */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <ShieldCheck className="size-4 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Hiệu Quả Sinh Lời
                </h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ROE gần nhất:</span>
                  <span className="font-mono font-bold text-foreground">
                    {latestFin?.roe != null ? `${fmt(latestFin.roe, 1)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ROA gần nhất:</span>
                  <span className="font-mono font-bold text-foreground">
                    {latestFin?.roa != null ? `${fmt(latestFin.roa, 1)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Biên lợi nhuận ròng:</span>
                  <span className="font-mono font-bold text-foreground">
                    {latestFin?.net_margin != null ? `${fmt(latestFin.net_margin, 1)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Biên lợi nhuận gộp:</span>
                  <span className="font-mono font-bold text-foreground">
                    {latestFin?.gross_margin != null ? `${fmt(latestFin.gross_margin, 1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Định giá tương đối */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <Target className="size-4 text-rose-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Định Giá Thị Trường
                </h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hệ số P/E:</span>
                  <span className="font-mono font-bold text-foreground">
                    {valuation.pe != null && valuation.pe > 0 ? `${fmt(valuation.pe, 1)} lần` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hệ số P/B:</span>
                  <span className="font-mono font-bold text-foreground">
                    {valuation.pb != null && valuation.pb > 0 ? `${fmt(valuation.pb, 2)} lần` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tỷ suất cổ tức:</span>
                  <span className="font-mono font-bold text-emerald-500">
                    {divYield != null ? `${fmt(divYield, 1)}% / năm` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Giá trị sổ sách (BVPS):</span>
                  <span className="font-mono font-bold text-foreground">
                    {valuation.bvps != null ? `${fmt(valuation.bvps)} đ` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Đòn bẩy & An toàn tài chính */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <Award className="size-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Cơ Cấu Vốn & An Toàn
                </h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nợ vay / Vốn CSH (D/E):</span>
                  <span className="font-mono font-bold text-foreground">
                    {latestFin?.debt_to_equity != null ? `${fmt(latestFin.debt_to_equity, 2)} lần` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tỷ lệ sở hữu nước ngoài:</span>
                  <span className="font-mono font-bold text-foreground">
                    {market.foreign_pct != null ? `${fmt(market.foreign_pct, 1)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tỷ lệ sở hữu nhà nước:</span>
                  <span className="font-mono font-bold text-foreground">
                    {market.state_pct != null ? `${fmt(market.state_pct, 1)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trôi nổi tự do:</span>
                  <span className="font-mono font-bold text-foreground">
                    {shareholderData.otherPct > 0 ? `${fmt(shareholderData.otherPct, 1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 6: BÁO CÁO PHÂN TÍCH                                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* 1. Báo cáo phân tích chuyên sâu độc quyền kèm Audio Podcast (ĐƯA LÊN TRÊN ĐẦU) */}
          {hasReports && (
            <div className="rounded-2xl border-2 border-primary/50 bg-card p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                    <FileText className="size-4.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                        Báo Cáo Phân Tích Chuyên Sâu ({ticker})
                      </h3>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Độc quyền
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tài liệu nghiên cứu kèm mô hình định giá mục tiêu và audio podcast
                    </p>
                  </div>
                </div>
                <Link
                  href={`/bao-cao?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Xem tất cả →
                </Link>
              </div>

              <div className="space-y-3">
                {reports.map((r, idx) => {
                  const hasTarget = r.targetPrice != null && r.targetPrice > 0
                  const hasUpside = r.upside != null
                  const isBuy =
                    r.recommendation?.toUpperCase() === 'MUA' ||
                    r.recommendation?.toUpperCase() === 'KHẢ QUAN'

                  return (
                    <div
                      key={r.driveDocId || idx}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center shadow-2xs hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{r.ticker || ticker}</span>
                          <span className="text-[11px] text-muted-foreground">· Ngày: {r.reportDate || r.date || '—'}</span>
                          {r.recommendation && (
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                isBuy
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                              )}
                            >
                              Khuyến nghị: {r.recommendation}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-foreground hover:text-primary">
                          {r.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          {hasTarget && (
                            <span className="text-muted-foreground">
                              Giá mục tiêu: <b className="font-mono text-foreground">{fmt(r.targetPrice, 1)} k₫</b>
                            </span>
                          )}
                          {hasUpside && (
                            <span className="text-muted-foreground">
                              Tiềm năng tăng giá (Upside):{' '}
                              <b className="font-mono text-emerald-600 dark:text-emerald-400">
                                +{fmt(r.upside, 1)}%
                              </b>
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/bao-cao/${r.driveDocId}`}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-all hover:shadow-md"
                      >
                        <FileText className="size-4" />
                        <span>ĐỌC BÁO CÁO NGAY →</span>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. Báo Cáo Phân Tích & Định Giá Doanh Nghiệp Từ Các CTCK (3.700 báo cáo) */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <FileText className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Báo Cáo Phân Tích & Định Giá Doanh Nghiệp ({ticker})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tổng hợp báo cáo nghiên cứu, khuyến nghị Mua/Bán và giá mục tiêu từ các CTCK hàng đầu (SSI, Vietcap, TCBS, ACBS...)
                  </p>
                </div>
              </div>
            </div>

            <CompanyReportsTab symbol={ticker} />
          </section>
        </div>
      )}
    </div>
  )
}
