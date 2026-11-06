'use client'

import React, { useState, useMemo } from 'react'
import type { ValuationHistoryPayload } from '@/lib/valuation-history-service'
import { Target, TrendingUp, TrendingDown, Clock, ShieldCheck, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartModal } from './ChartModal'
import { ValuationBandsCanvas } from './ValuationBandsCanvas'

interface ValuationBandsChartProps {
  symbol: string
  data: ValuationHistoryPayload | null
}

type TimeframeOption = 'YTD' | '6M' | '1Y' | '3Y' | '5Y' | 'Max'

function calculateStats(values: number[]) {
  if (!values || values.length === 0) {
    return { mean: 0, sd: 0, median: 0, plus2sd: 0, plus1sd: 0, minus1sd: 0, minus2sd: 0 }
  }

  const valid = values.filter((v) => v > 0)
  if (valid.length === 0) {
    return { mean: 0, sd: 0, median: 0, plus2sd: 0, plus1sd: 0, minus1sd: 0, minus2sd: 0 }
  }

  const n = valid.length
  const sum = valid.reduce((acc, c) => acc + c, 0)
  const mean = sum / n

  const variance = valid.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / n
  const sd = Math.sqrt(variance)

  const sorted = [...valid].sort((a, b) => a - b)
  const mid = Math.floor(n / 2)
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

  return {
    mean: parseFloat(mean.toFixed(2)),
    sd: parseFloat(sd.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    plus2sd: parseFloat((mean + 2 * sd).toFixed(2)),
    plus1sd: parseFloat((mean + sd).toFixed(2)),
    minus1sd: parseFloat(Math.max(0, mean - sd).toFixed(2)),
    minus2sd: parseFloat(Math.max(0, mean - 2 * sd).toFixed(2)),
  }
}

export function ValuationBandsChart({ symbol, data }: ValuationBandsChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('3Y')
  const [expandedBand, setExpandedBand] = useState<'pe' | 'pb' | 'ps' | null>(null)

  // Lọc dữ liệu theo khung thời gian
  const filteredPoints = useMemo(() => {
    if (!data?.dates || data.dates.length === 0) return []
    const dates = data.dates
    const peArr = data.pe || []
    const pbArr = data.pb || []
    const psArr = data.ps || []

    const lastSec = dates[dates.length - 1]
    let cutoffSec = 0

    if (timeframe === 'YTD') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000
      cutoffSec = startOfYear
    } else if (timeframe === '6M') {
      cutoffSec = lastSec - 180 * 86400
    } else if (timeframe === '1Y') {
      cutoffSec = lastSec - 365 * 86400
    } else if (timeframe === '3Y') {
      cutoffSec = lastSec - 3 * 365 * 86400
    } else if (timeframe === '5Y') {
      cutoffSec = lastSec - 5 * 365 * 86400
    } else {
      cutoffSec = 0 // Max
    }

    const points: Array<{
      dateSec: number
      timeStr: string
      pe: number | null
      pb: number | null
      ps: number | null
    }> = []

    for (let i = 0; i < dates.length; i++) {
      if (dates[i] >= cutoffSec) {
        const d = new Date(dates[i] * 1000)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const timeStr = `${yyyy}-${mm}-${dd}`

        points.push({
          dateSec: dates[i],
          timeStr,
          pe: peArr[i] != null && peArr[i]! > 0 ? peArr[i] : null,
          pb: pbArr[i] != null && pbArr[i]! > 0 ? pbArr[i] : null,
          ps: psArr[i] != null && psArr[i]! > 0 ? psArr[i] : null,
        })
      }
    }

    return points
  }, [data, timeframe])

  // Chuỗi dữ liệu nạp vào Canvas GPU (chỉ chứa các giá trị dương hợp lệ)
  const peCanvasPoints = useMemo(() => {
    return filteredPoints
      .filter((p) => p.pe != null && p.pe > 0)
      .map((p) => ({ time: p.timeStr, value: p.pe! }))
  }, [filteredPoints])

  const pbCanvasPoints = useMemo(() => {
    return filteredPoints
      .filter((p) => p.pb != null && p.pb > 0)
      .map((p) => ({ time: p.timeStr, value: p.pb! }))
  }, [filteredPoints])

  const psCanvasPoints = useMemo(() => {
    return filteredPoints
      .filter((p) => p.ps != null && p.ps > 0)
      .map((p) => ({ time: p.timeStr, value: p.ps! }))
  }, [filteredPoints])

  // Thống kê độ lệch chuẩn cho P/E, P/B, P/S
  const peStats = useMemo(() => {
    return calculateStats(filteredPoints.map((p) => p.pe).filter(Boolean) as number[])
  }, [filteredPoints])

  const pbStats = useMemo(() => {
    return calculateStats(filteredPoints.map((p) => p.pb).filter(Boolean) as number[])
  }, [filteredPoints])

  const psStats = useMemo(() => {
    return calculateStats(filteredPoints.map((p) => p.ps).filter(Boolean) as number[])
  }, [filteredPoints])

  if (!data || filteredPoints.length === 0) return null

  // Điểm P/E, P/B, P/S hiện tại gần nhất
  const currentPe = filteredPoints[filteredPoints.length - 1]?.pe
  const currentPb = filteredPoints[filteredPoints.length - 1]?.pb
  const currentPs = filteredPoints[filteredPoints.length - 1]?.ps

  // So sánh với trung vị
  const peDiffMed = currentPe && peStats.median > 0 ? ((currentPe - peStats.median) / peStats.median) * 100 : 0
  const pbDiffMed = currentPb && pbStats.median > 0 ? ((currentPb - pbStats.median) / pbStats.median) * 100 : 0
  const psDiffMed = currentPs && psStats.median > 0 ? ((currentPs - psStats.median) / psStats.median) * 100 : 0

  return (
    <div className="w-full space-y-6">
      {/* ── HEADER & THANH LỌC THỜI GIAN (YTD, 1Y, 3Y, 5Y, MAX) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
            <Target className="size-4" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
              Bộ 3 Dải Định Giá Lịch Sử P/E, P/B, P/S ({symbol})
            </h3>
            <p className="text-xs text-muted-foreground">
              Vẽ trực tiếp trên Canvas GPU 60fps kèm 5 dải độ lệch chuẩn (+2SD, +1SD, Median, -1SD, -2SD)
            </p>
          </div>
        </div>

        {/* Nút lọc khung thời gian */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
          {(['YTD', '6M', '1Y', '3Y', '5Y', 'Max'] as TimeframeOption[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={cn(
                'rounded-lg px-2.5 sm:px-3 py-1 text-xs font-bold transition-all cursor-pointer',
                timeframe === tf
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* BIỂU ĐỒ 1: DẢI ĐỊNH GIÁ P/E (CANVAS)                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="text-xs font-black uppercase tracking-wide text-foreground">
            ĐỊNH GIÁ P/E
          </div>
          <div className="flex items-center gap-2">
            {currentPe != null && (
              <div
                className={cn(
                  'font-mono text-xs font-black px-2.5 py-0.5 rounded-md',
                  peDiffMed <= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                )}
              >
                {currentPe.toFixed(2)} LẦN:{' '}
                {peDiffMed >= 0 ? `CAO HƠN TRUNG VỊ ${peDiffMed.toFixed(1)}%` : `THẤP HƠN TRUNG VỊ ${Math.abs(peDiffMed).toFixed(1)}%`}
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpandedBand('pe')}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md border border-border/50 transition-colors cursor-pointer"
              title="Phóng to / Mở rộng biểu đồ"
            >
              <Maximize2 className="size-3 text-sky-400" />
              <span className="hidden sm:inline">Mở rộng</span>
            </button>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ValuationBandsCanvas
            data={peCanvasPoints}
            stats={peStats}
            lineColor="#3b82f6"
            height={260}
            metricName="P/E"
            unit="x"
            symbol={symbol}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* BIỂU ĐỒ 2: DẢI ĐỊNH GIÁ P/B (CANVAS)                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="text-xs font-black uppercase tracking-wide text-foreground">
            ĐỊNH GIÁ P/B
          </div>
          <div className="flex items-center gap-2">
            {currentPb != null && (
              <div
                className={cn(
                  'font-mono text-xs font-black px-2.5 py-0.5 rounded-md',
                  pbDiffMed <= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                )}
              >
                {currentPb.toFixed(2)} LẦN:{' '}
                {pbDiffMed >= 0 ? `CAO HƠN TRUNG VỊ ${pbDiffMed.toFixed(1)}%` : `THẤP HƠN TRUNG VỊ ${Math.abs(pbDiffMed).toFixed(1)}%`}
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpandedBand('pb')}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md border border-border/50 transition-colors cursor-pointer"
              title="Phóng to / Mở rộng biểu đồ"
            >
              <Maximize2 className="size-3 text-emerald-400" />
              <span className="hidden sm:inline">Mở rộng</span>
            </button>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ValuationBandsCanvas
            data={pbCanvasPoints}
            stats={pbStats}
            lineColor="#10b981"
            height={260}
            metricName="P/B"
            unit="x"
            symbol={symbol}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* BIỂU ĐỒ 3: DẢI ĐỊNH GIÁ P/S (CANVAS)                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="text-xs font-black uppercase tracking-wide text-foreground">
            ĐỊNH GIÁ P/S
          </div>
          <div className="flex items-center gap-2">
            {currentPs != null && (
              <div
                className={cn(
                  'font-mono text-xs font-black px-2.5 py-0.5 rounded-md',
                  psDiffMed <= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                )}
              >
                {currentPs.toFixed(2)} LẦN:{' '}
                {psDiffMed >= 0 ? `CAO HƠN TRUNG VỊ ${psDiffMed.toFixed(1)}%` : `THẤP HƠN TRUNG VỊ ${Math.abs(psDiffMed).toFixed(1)}%`}
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpandedBand('ps')}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md border border-border/50 transition-colors cursor-pointer"
              title="Phóng to / Mở rộng biểu đồ"
            >
              <Maximize2 className="size-3 text-violet-400" />
              <span className="hidden sm:inline">Mở rộng</span>
            </button>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ValuationBandsCanvas
            data={psCanvasPoints}
            stats={psStats}
            lineColor="#8b5cf6"
            height={260}
            metricName="P/S"
            unit="x"
            symbol={symbol}
          />
        </div>
      </div>

      {/* MODAL PHÓNG TO DẢI ĐỊNH GIÁ (CANVAS) */}
      {expandedBand !== null && (
        <ChartModal
          isOpen={expandedBand !== null}
          onClose={() => setExpandedBand(null)}
          title={
            expandedBand === 'pe'
              ? `Dải Định Giá P/E Lịch Sử - ${symbol}`
              : expandedBand === 'pb'
              ? `Dải Định Giá P/B Lịch Sử - ${symbol}`
              : `Dải Định Giá P/S Lịch Sử - ${symbol}`
          }
          subtitle={`Dải độ lệch chuẩn ±1SD, ±2SD và Trung vị lịch sử (${timeframe}) · Chuỗi dữ liệu ${filteredPoints.length} phiên`}
          badge={
            <span className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary font-mono">
              {expandedBand === 'pe' && currentPe != null
                ? `P/E: ${currentPe.toFixed(2)}x (Trung vị: ${peStats.median}x)`
                : expandedBand === 'pb' && currentPb != null
                ? `P/B: ${currentPb.toFixed(2)}x (Trung vị: ${pbStats.median}x)`
                : expandedBand === 'ps' && currentPs != null
                ? `P/S: ${currentPs.toFixed(2)}x (Trung vị: ${psStats.median}x)`
                : 'Định giá'}
            </span>
          }
        >
          <div className="h-[500px] sm:h-[540px] w-full pt-2">
            {expandedBand === 'pe' && (
              <ValuationBandsCanvas
                data={peCanvasPoints}
                stats={peStats}
                lineColor="#3b82f6"
                height={520}
                metricName="P/E"
                unit="x"
                symbol={symbol}
              />
            )}

            {expandedBand === 'pb' && (
              <ValuationBandsCanvas
                data={pbCanvasPoints}
                stats={pbStats}
                lineColor="#10b981"
                height={520}
                metricName="P/B"
                unit="x"
                symbol={symbol}
              />
            )}

            {expandedBand === 'ps' && (
              <ValuationBandsCanvas
                data={psCanvasPoints}
                stats={psStats}
                lineColor="#8b5cf6"
                height={520}
                metricName="P/S"
                unit="x"
                symbol={symbol}
              />
            )}
          </div>
        </ChartModal>
      )}
    </div>
  )
}
