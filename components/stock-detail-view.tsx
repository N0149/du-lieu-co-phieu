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
  Ship,
  Share2,
  Check,
} from 'lucide-react'
import type { StockDetailData, StockManifestItem } from '@/lib/longlivestock'
import type { Report } from '@/lib/use-reports'
import { cn } from '@/lib/utils'

interface StockDetailViewProps {
  stockData: StockDetailData
  relatedStocks?: StockManifestItem[]
  reports?: Report[]
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
}: StockDetailViewProps) {
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

  // 2. Sắp xếp báo cáo tài chính theo thứ tự giảm dần (mới nhất trước) cho bảng
  const sortedFinancials = useMemo(() => {
    return [...financials].sort((a, b) => b.year - a.year)
  }, [financials])

  // 3. Lấy tối đa 16 năm theo thứ tự tăng dần cho biểu đồ DT/LNST
  const chartFinancials = useMemo(() => {
    return [...financials].sort((a, b) => a.year - b.year).slice(-16)
  }, [financials])

  // 4. Cổ tức và tỷ suất cổ tức gần nhất
  const latestDiv = useMemo(() => {
    if (valuation?.dividend != null) return valuation.dividend
    for (let i = sortedFinancials.length - 1; i >= 0; i--) {
      if (sortedFinancials[i].dividend != null) return sortedFinancials[i].dividend
    }
    return null
  }, [valuation?.dividend, sortedFinancials])

  const divYield = useMemo(() => {
    if (latestDiv != null && market?.price) {
      return (latestDiv / (market.price * 1000)) * 100
    }
    return null
  }, [latestDiv, market?.price])

  // 5. Tính toán cổ đông lớn + phần "Khác"
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

  // 6. Tính toán kích thước SVG cho Biểu đồ giá 5 năm (Compact & Aesthetic)
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

    // Grid lines & labels
    const gridLines = []
    for (let gi = 0; gi <= 3; gi++) {
      const gyy = padT + (gi * plotH) / 3
      const gval = cmax - (gi * (cmax - cmin)) / 3
      gridLines.push({
        y: gyy,
        label: fmt(gval, gval < 100 ? 1 : 0),
      })
    }

    // Volume bars
    const bw = Math.max(1, ((W - padL - padR) / data.length) * 0.6)
    const volBars = data.map((p, i) => {
      const vy = vyPos(p.v)
      const vh = Math.max(0, H - padB - vy)
      return {
        x: xPos(i) - bw / 2,
        y: vy,
        w: bw,
        h: vh,
      }
    })

    // Area & Line Path
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

    // Year markers
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

  // 7. Biểu đồ Doanh thu & LNST + Biên ròng 16 năm (Compact & Aesthetic)
  const revChartData = useMemo(() => {
    if (chartFinancials.length < 2) return null
    const data = chartFinancials
    const n = data.length
    const W = 620
    const H = 220
    const padL = 46
    const padR = 40
    const padT = 14
    const padB = 26
    const plotW = W - padL - padR
    const plotH = H - padT - padB

    const revVals = data.map((f) => f.revenue || 0)
    const profVals = data.map((f) => f.profit || 0)
    const allVals = [...revVals, ...profVals]
    const allMin = Math.min(...allVals)
    const allMax = Math.max(...allVals)
    const hasNeg = allMin < 0
    const rangeMin = hasNeg ? allMin * 1.15 : 0
    const rangeMax = allMax * 1.15 || 1
    const rangeSpan = rangeMax - rangeMin || 1

    const yL = (v: number) => padT + (1 - (v - rangeMin) / rangeSpan) * plotH
    const y0 = yL(0)

    // Net margin scale
    const NM_CAP = 60
    const nmVals = data.map((f) => {
      if (f.net_margin == null) return null
      return Math.max(-NM_CAP, Math.min(NM_CAP, f.net_margin))
    })
    const nmDefined = nmVals.filter((v): v is number => v !== null)
    const nmMin = nmDefined.length ? Math.min(...nmDefined) : 0
    const nmRMin = nmMin < 0 ? nmMin * 1.3 : 0
    const nmRMax = (nmDefined.length ? Math.max(...nmDefined) : 0) * 1.3 || 1
    const nmSpan = nmRMax - nmRMin || 1
    const yR = (v: number) => padT + (1 - (v - nmRMin) / nmSpan) * plotH

    const grpW = plotW / n
    const barW = Math.max(3.5, grpW * 0.34)
    const gap = Math.max(1, grpW * 0.05)

    // Left Grid Lines
    const leftGrid = []
    for (let gi = 0; gi <= 3; gi++) {
      const gyy = padT + (gi * plotH) / 3
      const gval = rangeMax - (gi * rangeSpan) / 3
      leftGrid.push({ y: gyy, label: `${fmt(gval / 1000, 0)}k` })
    }

    // Right Grid Labels (Net Margin %)
    const rightGrid = []
    if (nmDefined.length >= 2) {
      for (let ri = 0; ri <= 3; ri++) {
        const rgyy = padT + (ri * plotH) / 3
        const rgval = nmRMax - (ri * nmSpan) / 3
        rightGrid.push({ y: rgyy, label: `${fmt(rgval, 0)}%` })
      }
    }

    // Bars
    const bars = data.map((f, i) => {
      const cx = padL + i * grpW + grpW / 2
      const bx1 = cx - gap / 2 - barW
      const rev = f.revenue || 0
      const yRev = yL(rev)
      const hRev = Math.abs(y0 - yRev)
      const ryRev = rev >= 0 ? yRev : y0

      const bx2 = cx + gap / 2
      const prf = f.profit || 0
      const yPrf = yL(prf)
      const hPrf = Math.abs(y0 - yPrf)
      const ryPrf = prf >= 0 ? yPrf : y0

      return {
        year: f.year,
        cx,
        revBar: { x: bx1, y: ryRev, w: barW, h: Math.max(1, hRev), val: rev },
        profBar: {
          x: bx2,
          y: ryPrf,
          w: barW,
          h: Math.max(1, hPrf),
          val: prf,
          isNeg: prf < 0,
        },
      }
    })

    // Net Margin Line
    let nmLineD = ''
    let firstPt = true
    data.forEach((f, i) => {
      if (nmVals[i] == null) return
      const cx = padL + i * grpW + grpW / 2
      const py = yR(nmVals[i]!)
      nmLineD += (firstPt ? 'M ' : ' L ') + `${cx.toFixed(1)} ${py.toFixed(1)}`
      firstPt = false
    })

    const nmDots = data
      .map((f, i) => {
        if (nmVals[i] == null) return null
        const cx = padL + i * grpW + grpW / 2
        const py = yR(nmVals[i]!)
        return { cx, py, val: f.net_margin }
      })
      .filter(Boolean)

    return {
      W,
      H,
      padL,
      padR,
      padT,
      padB,
      leftGrid,
      rightGrid,
      bars,
      nmLineD,
      nmDots,
      hasNeg,
      y0,
    }
  }, [chartFinancials])

  // 8. Biểu đồ sản lượng cảng biển (Throughput)
  const tpChartData = useMemo(() => {
    if (!is_port || !throughput || throughput.length === 0) return null
    const n = throughput.length
    const W = 620
    const H = 200
    const padL = 46
    const padR = 20
    const padT = 16
    const padB = 26
    const plotH = H - padT - padB

    const vals = throughput.map((t) => (t.dwt != null ? t.dwt / 1e6 : t.vessels || 0))
    const vmax = Math.max(...vals) * 1.15 || 1
    const grpW = (W - padL - padR) / n
    const bw = grpW * 0.45

    const grid = []
    for (let gi = 0; gi <= 3; gi++) {
      const gyy = padT + (gi * plotH) / 3
      const gval = vmax * (1 - gi / 3)
      grid.push({ y: gyy, label: fmt(gval, 1) })
    }

    const bars = throughput.map((t, i) => {
      const val = t.dwt != null ? t.dwt / 1e6 : t.vessels || 0
      const cx = padL + i * grpW + grpW / 2
      const bx = cx - bw / 2
      const barH = Math.max(0, (val / vmax) * plotH)
      const by = padT + plotH - barH
      return {
        year: t.year,
        cx,
        bx,
        by,
        bw,
        barH,
        val,
      }
    })

    return { W, H, padL, padR, padT, padB, grid, bars }
  }, [is_port, throughput])

  const hasReports = reports && reports.length > 0

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6">
      {/* ── Top Bar / Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/tra-cuu"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại Tra Cứu 1.530 Mã</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs hover:bg-muted hover:text-foreground transition-colors"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
            <span>{copied ? 'Đã sao chép link' : 'Chia sẻ'}</span>
          </button>

          <Link
            href={`/bao-cao?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-sm"
          >
            <FileText className="size-3.5" />
            <span>Kho Báo Cáo Phân Tích →</span>
          </Link>
        </div>
      </div>

      {/* ── Status Warning Banner if any ── */}
      {hasWarning && (
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-semibold shadow-2xs',
            isDelisted
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          )}
        >
          <ShieldAlert className="size-4.5 shrink-0" />
          <span>
            {isDelisted
              ? 'CỔ PHIẾU ĐÃ HỦY NIÊM YẾT. '
              : isSuspended
                ? 'CỔ PHIẾU ĐANG BỊ ĐÌNH CHỈ GIAO DỊCH. '
                : isInactive
                  ? 'CỔ PHIẾU TẠM NGỪNG GIAO DỊCH. '
                  : ''}
            {company.status_note ? `${company.status_note}` : ''}
            {company.status_date && !company.status_note
              ? ` (từ ngày ${fmtDateVN(company.status_date)})`
              : ''}
          </span>
        </div>
      )}

      {/* ── 1. Hero Header & Price Box ── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                {ticker}
              </h1>
              {company.exchange && (
                <span className="rounded-md border border-border bg-secondary/70 px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
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

            <h2 className="text-lg font-bold text-foreground sm:text-xl">
              {company.name}
            </h2>
          </div>

          {/* Price Box */}
          <div className="flex flex-col items-start rounded-xl border border-border bg-muted/30 p-4 shadow-2xs sm:items-end">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Giá đóng cửa gần nhất
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {market.price != null ? fmt(market.price, market.price < 100 ? 1 : 0) : '—'}
              </span>
              <span className="text-xs font-medium text-muted-foreground">nghìn đ</span>
            </div>

            {/* Change Pills */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {priceChanges.y1 != null ? (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold',
                    priceChanges.y1 >= 0
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                  )}
                >
                  {priceChanges.y1 >= 0 ? '+' : '−'}
                  {fmt(Math.abs(priceChanges.y1), 1)}% 1 năm
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  — 1 năm
                </span>
              )}

              {priceChanges.ytd != null ? (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold',
                    priceChanges.ytd >= 0
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                  )}
                >
                  {priceChanges.ytd >= 0 ? '+' : '−'}
                  {fmt(Math.abs(priceChanges.ytd), 1)}% YTD
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  — YTD
                </span>
              )}
            </div>

            {priceChanges.lastDate && (
              <div className="mt-1.5 text-[10.5px] text-muted-foreground">
                Đóng cửa {fmtDateVN(priceChanges.lastDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. CORE CARD: MẢNG KINH DOANH CỐT LÕI (Chuẩn LongLiveStock) ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {/* Core Head */}
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

        {/* Core Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* A. Core Segments Table if available */}
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
            // Fallback Core Snippet & Business line pills
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

          {/* B. Bento Columns (Thị trường đầu ra & Động lực ảnh hưởng) */}
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

          {/* C. Source Citation */}
          {coreCard?.citation && (
            <div className="border-t border-dashed border-border pt-3 text-[11px] text-muted-foreground leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: coreCard.citation }} />
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Dải 10 Chỉ Số Nhanh (Metric Bar) ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Giá hiện tại
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {market.price != null ? `${fmt(market.price, market.price < 100 ? 1 : 0)} k₫` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vốn hoá
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {market.market_cap_ty != null ? `${fmt(market.market_cap_ty)} tỷ` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            P/E
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {valuation.pe != null && valuation.pe > 0 ? fmt(valuation.pe, 1) : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            P/B
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {valuation.pb != null && valuation.pb > 0 ? fmt(valuation.pb, 2) : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            EPS
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {valuation.eps != null ? `${fmt(valuation.eps)} đ` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            BVPS
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {valuation.bvps != null ? `${fmt(valuation.bvps)} đ` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cổ tức TM
          </div>
          <div className="mt-1 font-mono text-xs font-bold text-foreground">
            {latestDiv != null
              ? `${fmt(latestDiv)} đ ${divYield != null ? `(~${fmt(divYield, 1)}%)` : ''}`
              : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Room ngoại
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {market.foreign_pct != null ? `${fmt(market.foreign_pct, 1)}%` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sở hữu NN
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {market.state_pct != null ? `${fmt(market.state_pct, 1)}%` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Đỉnh / Đáy 1 năm
          </div>
          <div className="mt-1 font-mono text-xs font-bold text-foreground">
            {market.high_1y != null && market.low_1y != null
              ? `${fmt(market.high_1y / 1000, 1)} / ${fmt(market.low_1y / 1000, 1)}`
              : '—'}
          </div>
        </div>
      </div>

      {/* ── 4. Prominent Research Report Card if available ── */}
      {hasReports && (
        <div className="rounded-2xl border-2 border-primary/40 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <FileText className="size-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Báo Cáo Phân Tích & Định Giá Chuyên Sâu ({ticker})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tài liệu nghiên cứu độc quyền kèm mô hình định giá mục tiêu và audio podcast
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

          <div className="mt-4 space-y-3">
            {reports.map((r, idx) => {
              const hasTarget = r.targetPrice != null && r.targetPrice > 0
              const hasUpside = r.upside != null
              const isBuy =
                r.recommendation?.toUpperCase() === 'MUA' ||
                r.recommendation?.toUpperCase() === 'KHẢ QUAN'

              return (
                <div
                  key={r.driveDocId || idx}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center shadow-2xs hover:border-primary/50 transition-colors"
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
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-md"
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

      {/* ── 5. Khối Biểu Đồ Kép Tinh Gọn (Price 5Y Weekly + Revenue/Profit 16Y) ── */}
      {(priceChartSvg || revChartData) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* A. Biểu Đồ Giá & Khối Lượng 5 Năm */}
          {priceChartSvg && (
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4.5 shadow-2xs space-y-3">
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

                    {/* Grid lines */}
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

                    {/* Volume bars */}
                    {priceChartSvg.volBars.map((vb, idx) => (
                      <rect
                        key={idx}
                        x={vb.x}
                        y={vb.y}
                        width={vb.w}
                        height={vb.h}
                        fill="#10b981"
                        className="opacity-25 hover:opacity-75 transition-opacity"
                        rx="1"
                      />
                    ))}

                    {/* Area Gradient */}
                    <path d={priceChartSvg.areaD} fill="url(#priceGradAesthetic)" />

                    {/* Price Line */}
                    <path
                      d={priceChartSvg.lineD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Last point glowing pulse dot */}
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

                    {/* Year markers */}
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

          {/* B. Biểu Đồ Doanh Thu & LNST + Biên Ròng */}
          {revChartData && (
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4.5 shadow-2xs space-y-3">
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

                    {/* Left Grid Lines */}
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

                    {/* Zero line if negative profits exist */}
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

                    {/* Right Grid Labels (Net Margin %) */}
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

                    {/* Dual Bars per Year */}
                    {revChartData.bars.map((b) => (
                      <g key={b.year}>
                        {/* Revenue Bar */}
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

                        {/* Profit Bar */}
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

                        {/* Year Label */}
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

                    {/* Net Margin Dashed Line */}
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

                    {/* Net Margin Dots */}
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

      {/* ── 6. Profile & Multi-industry Business lines ── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <Building2 className="size-4 text-primary" />
          <span>Hồ Sơ Doanh Nghiệp & Thông Tin Niêm Yết</span>
        </h3>

        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {profile || 'Chưa có mô tả chi tiết hồ sơ doanh nghiệp.'}
        </p>

        {/* Info Grid */}
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

        {/* Registered Business Lines */}
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

      {/* ── 8. Biểu Đồ Sản Lượng Cảng Biển (Throughput) Dành Cho Cổ Phiếu Cảng ── */}
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

                {/* Grid */}
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

                {/* Bars */}
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

      {/* ── 9. Bảng Báo Cáo Tài Chính Đa Năm Toàn Diện (Fin Table) ── */}
      {sortedFinancials.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
              <Layers className="size-4 text-primary" />
              <span>Bảng Báo Cáo Tài Chính & Chỉ Số Đa Năm ({sortedFinancials.length} Năm)</span>
            </h3>
            <span className="text-xs text-muted-foreground">Đơn vị: Tỷ VNĐ / % / Đồng</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/60 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3.5 py-3 sticky left-0 bg-muted/90 backdrop-blur-xs">Năm</th>
                  <th className="px-3 py-3 text-right">Doanh thu</th>
                  <th className="px-3 py-3 text-right">LNST</th>
                  <th className="px-3 py-3 text-right">Biên gộp</th>
                  <th className="px-3 py-3 text-right">Biên ròng</th>
                  <th className="px-3 py-3 text-right">ROE</th>
                  <th className="px-3 py-3 text-right">ROA</th>
                  <th className="px-3 py-3 text-right">EPS (đ)</th>
                  <th className="px-3 py-3 text-right">BVPS (đ)</th>
                  <th className="px-3 py-3 text-right">D/E</th>
                  <th className="px-3 py-3 text-right">Tăng trưởng DT</th>
                  <th className="px-3 py-3 text-right">Tăng trưởng LNST</th>
                  <th className="px-3 py-3 text-right">Cổ tức (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedFinancials.map((row) => {
                  const isProfNeg = row.profit != null && row.profit < 0
                  const isRoePos = row.roe != null && row.roe > 0
                  const isRoeNeg = row.roe != null && row.roe < 0
                  const isRgPos = row.revenue_growth != null && row.revenue_growth > 0
                  const isRgNeg = row.revenue_growth != null && row.revenue_growth < 0
                  const isPgPos = row.npat_growth != null && row.npat_growth > 0
                  const isPgNeg = row.npat_growth != null && row.npat_growth < 0

                  return (
                    <tr key={row.year} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-foreground sticky left-0 bg-card">
                        {row.year}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground font-medium">
                        {row.revenue != null ? fmt(row.revenue, 0) : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-mono font-bold',
                          isProfNeg ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {row.profit != null ? fmt(row.profit, 0) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                        {row.gross_margin != null ? `${fmt(row.gross_margin, 1)}%` : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-mono',
                          row.net_margin != null && row.net_margin < 0
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-muted-foreground',
                        )}
                      >
                        {row.net_margin != null ? `${fmt(row.net_margin, 1)}%` : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-mono font-bold',
                          isRoePos
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isRoeNeg
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {row.roe != null ? `${fmt(row.roe, 1)}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                        {row.roa != null ? `${fmt(row.roa, 1)}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">
                        {row.eps != null ? fmt(row.eps, 0) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">
                        {row.bvps != null ? fmt(row.bvps, 0) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                        {row.debt_to_equity != null ? fmt(row.debt_to_equity, 2) : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-mono font-semibold',
                          isRgPos
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isRgNeg
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {row.revenue_growth != null
                          ? `${isRgPos ? '+' : ''}${fmt(row.revenue_growth, 1)}%`
                          : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-mono font-semibold',
                          isPgPos
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isPgNeg
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {row.npat_growth != null
                          ? `${isPgPos ? '+' : ''}${fmt(row.npat_growth, 1)}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">
                        {row.dividend != null ? fmt(row.dividend, 0) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 10. Cơ Cấu Cổ Đông Lớn (Shareholders) ── */}
      {shareholderData.items.length > 0 && (
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
      )}

      {/* ── 11. Cổ Phiếu Cùng Ngành (Peers) ── */}
      {relatedStocks.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Cổ Phiếu Cùng Ngành ({company.sector || company.icb_l1})
            </h3>
            <Link
              href={`/tra-cuu`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Xem tất cả trong ngành →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pt-1">
            {relatedStocks.slice(0, 6).map((s) => {
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
        </div>
      )}
    </div>
  )
}
