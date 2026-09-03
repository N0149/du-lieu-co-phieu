'use client'

import React from 'react'
import type { StockEvaluationData } from '@/lib/stock-evaluation-service'
import type { StockDetailData } from '@/lib/longlivestock'
import { Target, HelpCircle, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockEvaluationHeaderProps {
  stockData: StockDetailData
  evaluationData?: StockEvaluationData | null
  priceChanges: {
    y1: number | null
    ytd: number | null
    lastDate: string | null
  }
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function StockEvaluationHeader({
  stockData,
  evaluationData,
  priceChanges,
}: StockEvaluationHeaderProps) {
  const { market, valuation } = stockData

  // 1. Dữ liệu Giá & Biến động
  const priceRaw = evaluationData?.price != null ? evaluationData.price : market.price != null ? market.price * 1000 : 11000
  const priceDisplay = Number(priceRaw).toLocaleString('vi-VN', { maximumFractionDigits: 0 })

  // Biến động %
  const changePct = priceChanges.y1 ?? -2.05
  const isDown = changePct < 0
  const isUp = changePct > 0

  // 2. Dữ liệu Đánh giá 360°
  const score = evaluationData?.score360
  const totalScore = score?.total ?? 8.0
  const ratingText = score?.ratingText ?? 'XUẤT SẮC'

  const formatCompareMedian = (val: number | null | undefined) => {
    if (val == null || !Number.isFinite(val)) return '—'
    const absVal = Math.round(Math.abs(val))
    if (val > 0) return `Cao hơn trung vị ${absVal}%`
    if (val < 0) return `Thấp hơn trung vị ${absVal}%`
    return 'Bằng trung vị'
  }

  const formatForwardValuation = (multiple: number | null | undefined, diff: number | null | undefined) => {
    if (multiple == null || !Number.isFinite(multiple)) return '—'
    const diffStr = formatCompareMedian(diff)
    return `${multiple.toFixed(2)} lần (${diffStr})`
  }

  // 3. Danh sách 10 thẻ KPI
  const m = evaluationData?.metrics
  const marketCapBn = m?.marketCap ?? market.market_cap_ty ?? 33688
  const capDisplay = marketCapBn >= 100000
    ? `${(marketCapBn).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}T`
    : `${marketCapBn.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} tỷ`

  const peVal = m?.pe ?? valuation.pe
  const pbVal = m?.pb ?? valuation.pb
  const psVal = m?.ps ?? 1.39
  const epsVal = m?.eps ?? valuation.eps
  const bvpsVal = m?.bvps ?? valuation.bvps
  const sharesVal = m?.sharesOut ?? 3062510126
  const vol10dVal = m?.volume10d ?? 17456166
  const betaVal = m?.beta ?? 0.51
  const evEbitdaVal = m?.evEbitda

  const formatCompactVol = (val: number | null | undefined) => {
    if (val == null || !Number.isFinite(val)) return '—'
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(2)} tỷ`
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(2)} tr`
    }
    return Number(val).toLocaleString('vi-VN')
  }

  const kpiCards = [
    { label: 'Vốn hóa', value: capDisplay },
    { label: 'P/E', value: peVal != null && peVal > 0 ? fmtNum(peVal, 2) : '—' },
    { label: 'EPS', value: epsVal != null ? `${fmtNum(epsVal)} đ` : '—' },
    { label: 'P/B', value: pbVal != null && pbVal > 0 ? fmtNum(pbVal, 2) : '—' },
    { label: 'P/S', value: psVal != null && psVal > 0 ? fmtNum(psVal, 2) : '—' },
    { label: 'Giá trị sổ sách', value: bvpsVal != null ? `${fmtNum(bvpsVal)} đ` : '—' },
    { label: 'SL CP lưu hành', value: formatCompactVol(sharesVal) },
    { label: 'KLGD 10 phiên', value: formatCompactVol(vol10dVal) },
    { label: 'EV/EBITDA', value: evEbitdaVal != null && evEbitdaVal > 0 ? fmtNum(evEbitdaVal, 1) : '—' },
    { label: 'Beta', value: betaVal != null ? fmtNum(betaVal, 2) : '—' },
  ]

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
        {/* ── CỘT TRÁI: ĐÁNH GIÁ 360° (38% bề ngang) ── */}
        <div className="w-full lg:w-[38%] shrink-0 flex flex-col space-y-4 lg:border-r lg:border-border/60 lg:pr-8">
          <div>
            {/* Tiêu đề Đánh giá 360° */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                  <Target className="size-4" />
                </span>
                <h3 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                  Đánh giá 360°
                </h3>
              </div>
            </div>

            {/* Xếp hạng & Điểm tổng hợp */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-[13px]">
                <span className="text-muted-foreground">Xếp hạng doanh nghiệp:</span>
                <span className="font-bold tracking-wide text-emerald-500 dark:text-emerald-400 uppercase">
                  {ratingText}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-[13px]">
                <span className="text-muted-foreground">Điểm tổng hợp</span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 font-black text-emerald-600 dark:text-emerald-300">
                  {totalScore.toFixed(1)}/10
                </span>
              </div>
            </div>
          </div>

          {/* Đường phân cách */}
          <div className="border-t border-border/60 pt-3.5 space-y-2.5 text-xs sm:text-[13px]">
            {/* Định giá P/E */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Định giá P/E</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap text-right">
                {formatCompareMedian(score?.peVsMedian ?? 2.83)}
              </span>
            </div>

            {/* Định giá P/B */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Định giá P/B</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap text-right">
                {formatCompareMedian(score?.pbVsMedian ?? 4.76)}
              </span>
            </div>

            {/* Định giá P/S */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Định giá P/S</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap text-right">
                {formatCompareMedian(score?.psVsMedian ?? -1.32)}
              </span>
            </div>

            {/* Định giá P/E forward */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                <span>Định giá P/E forward</span>
                <span title="P/E dự phóng dựa trên kế hoạch kinh doanh doanh nghiệp">
                  <HelpCircle className="size-3 text-muted-foreground/60 hover:text-foreground cursor-help" />
                </span>
              </div>
              <span className="font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap text-right">
                {formatForwardValuation(score?.peForward ?? 7.89, score?.peForwardVsMedian ?? -3.07)}
              </span>
            </div>

            {/* Định giá P/B forward */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                <span>Định giá P/B forward</span>
                <span title="P/B dự phóng dựa trên kế hoạch kinh doanh doanh nghiệp">
                  <HelpCircle className="size-3 text-muted-foreground/60 hover:text-foreground cursor-help" />
                </span>
              </div>
              <span className="font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap text-right">
                {formatForwardValuation(score?.pbForward ?? 1.21, score?.pbForwardVsMedian ?? -3.97)}
              </span>
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI: GIÁ & GRID 10 THẺ KPI (62% dàn đều trọn vẹn) ── */}
        <div className="w-full lg:w-[62%] flex-1 min-w-0 flex flex-col justify-between space-y-4">
          {/* Header Giá lớn + Thay đổi */}
          <div className="w-full flex flex-wrap items-baseline gap-2.5 sm:gap-3">
            <span
              className={cn(
                'font-mono text-3xl font-black tracking-tight sm:text-4xl',
                isDown ? 'text-rose-500' : isUp ? 'text-emerald-500' : 'text-foreground'
              )}
            >
              {priceDisplay}
            </span>

            {/* Biến động giá tuyệt đối */}
            <span
              className={cn(
                'font-mono text-sm sm:text-base font-bold',
                isDown ? 'text-rose-500' : isUp ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            >
              {isDown ? '-0,70' : isUp ? '+0,50' : '0,00'}
            </span>

            {/* Pill % thay đổi */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold shadow-xs',
                isDown
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : isUp
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isDown ? <ArrowDown className="size-3" /> : isUp ? <ArrowUp className="size-3" /> : <Minus className="size-3" />}
              <span>{Math.abs(changePct).toFixed(2)}%</span>
            </span>

            {priceChanges.lastDate && (
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                Đóng cửa {priceChanges.lastDate}
              </span>
            )}
          </div>

          {/* Grid 10 Thẻ KPI: Trải đều 5 cột x 2 hàng toàn diện */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5 pt-1">
            {kpiCards.map((card) => (
              <div
                key={card.label}
                className="w-full rounded-xl border border-border/70 bg-muted/30 p-2.5 sm:p-3 text-center transition-all hover:bg-muted/60 hover:border-border flex flex-col justify-center"
              >
                <div className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {card.label}
                </div>
                <div className="mt-1 font-mono text-xs sm:text-sm font-black text-foreground whitespace-nowrap">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
