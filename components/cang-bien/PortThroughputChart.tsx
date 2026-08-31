'use client'

import React, { useState, useMemo } from 'react'
import { MonthlyRecord, formatDWT, formatCalls } from '@/lib/maritime-types'
import { BarChart3, TrendingUp, Calendar, Info, Scale } from 'lucide-react'

interface Props {
  monthlyData: MonthlyRecord[]
  tickerName: string
}

export function PortThroughputChart({ monthlyData, tickerName }: Props) {
  const [metric, setMetric] = useState<'calls' | 'dwt'>('calls')
  const [chartMode, setChartMode] = useState<'both' | 'in' | 'out'>('both')
  const [timeRange, setTimeRange] = useState<number>(24) // 12, 24, 36, or 0 (all)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Check if DWT data is available in the dataset
  const hasDwtData = useMemo(() => {
    return monthlyData.some(
      (d) => (d.dwt_in && d.dwt_in > 0) || (d.dwt_out && d.dwt_out > 0)
    )
  }, [monthlyData])

  const dataToDisplay = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return []
    const sliced = timeRange === 0 ? monthlyData : monthlyData.slice(-timeRange)
    return sliced.map((d) => {
      const inVal = metric === 'dwt' ? (d.dwt_in || 0) : (d.in || 0)
      const outVal = metric === 'dwt' ? (d.dwt_out || 0) : (d.out || 0)
      const totalVal = inVal + outVal

      return {
        ym: d.ym,
        in: inVal,
        out: outVal,
        total: totalVal,
        isPartial: Boolean(d.partial),
        isEstimated: Boolean(d.est),
      }
    })
  }, [monthlyData, timeRange, metric])

  // Max value calculation for scaling
  const maxVal = useMemo(() => {
    if (dataToDisplay.length === 0) return 10
    const vals = dataToDisplay.map((d) => {
      if (chartMode === 'in') return d.in
      if (chartMode === 'out') return d.out
      return d.total
    })
    const m = Math.max(...vals, 5)
    return Math.ceil(m * 1.15)
  }, [dataToDisplay, chartMode])

  // Compact formatter for Y-axis and bar tops
  const formatCompact = (val: number) => {
    if (metric === 'calls') {
      if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M'
      if (val >= 1e3) return (val / 1e3).toFixed(0) + 'k'
      return val.toString()
    }
    if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B'
    if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M'
    if (val >= 1e3) return (val / 1e3).toFixed(0) + 'k'
    return val.toString()
  }

  // SVG dimensions
  const svgWidth = Math.max(760, dataToDisplay.length * 36)
  const svgHeight = 280
  const padLeft = metric === 'dwt' ? 58 : 45
  const padRight = 20
  const padTop = 30
  const padBottom = 45
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  const step = dataToDisplay.length > 0 ? plotWidth / dataToDisplay.length : 0
  const barWidth = Math.max(step * 0.65, 6)

  // Y-axis grid ticks
  const yTicks = [0, Math.round(maxVal * 0.33), Math.round(maxVal * 0.66), maxVal]

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BarChart3 className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {metric === 'dwt' ? 'Trọng Tải Tàu (DWT) Theo Tháng' : 'Sản Lượng Tàu Qua Cảng Theo Tháng'} ({tickerName})
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metric === 'dwt'
              ? `Tổng trọng tải DWT tàu cập và rời các cầu bến trực thuộc theo từng tháng (${dataToDisplay.length} tháng)`
              : `Số lượt tàu cập và rời các cầu bến trực thuộc theo từng tháng (${dataToDisplay.length} tháng)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector (Số lượt vs Trọng tải DWT) */}
          {hasDwtData && (
            <div className="inline-flex rounded-xl border border-border bg-background/80 p-1 text-xs font-semibold">
              <button
                onClick={() => setMetric('calls')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  metric === 'calls'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Số Lượt Tàu
              </button>
              <button
                onClick={() => setMetric('dwt')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  metric === 'dwt'
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Trọng Tải DWT
              </button>
            </div>
          )}

          {/* Direction Mode Switch */}
          <div className="inline-flex rounded-xl border border-border bg-background/80 p-1 text-xs font-semibold">
            <button
              onClick={() => setChartMode('both')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                chartMode === 'both'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vào + Ra
            </button>
            <button
              onClick={() => setChartMode('in')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                chartMode === 'in'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chỉ Vào
            </button>
            <button
              onClick={() => setChartMode('out')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                chartMode === 'out'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chỉ Ra
            </button>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="rounded-xl border border-border bg-background/80 py-1 px-2.5 text-xs text-foreground focus:border-teal-500 focus:outline-none font-medium"
          >
            <option value={12}>12 tháng gần nhất</option>
            <option value={24}>24 tháng gần nhất</option>
            <option value={36}>36 tháng gần nhất</option>
            <option value={0}>Toàn bộ ({monthlyData.length} tháng)</option>
          </select>
        </div>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4 text-muted-foreground">
          {(chartMode === 'both' || chartMode === 'in') && (
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-emerald-500 shrink-0" />
              <span className="text-foreground/90 font-medium">{metric === 'dwt' ? 'DWT Vào' : 'Tàu Vào'}</span>
            </div>
          )}
          {(chartMode === 'both' || chartMode === 'out') && (
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-sky-500 shrink-0" />
              <span className="text-foreground/90 font-medium">{metric === 'dwt' ? 'DWT Ra' : 'Tàu Ra'}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-amber-500/40 border border-dashed border-amber-400 shrink-0" />
            <span className="text-foreground/90 font-medium">Tháng Chưa Đóng Sổ</span>
          </div>
        </div>

        {hoveredIndex !== null && dataToDisplay[hoveredIndex] ? (
          <div className="rounded-lg bg-card border border-teal-500/40 px-2.5 py-1 text-teal-400 font-semibold shadow-md animate-in fade-in">
            {metric === 'dwt' ? (
              <>
                Tháng {dataToDisplay[hoveredIndex].ym}: {formatDWT(dataToDisplay[hoveredIndex].in)} vào / {formatDWT(dataToDisplay[hoveredIndex].out)} ra (Tổng: {formatDWT(dataToDisplay[hoveredIndex].total)})
              </>
            ) : (
              <>
                Tháng {dataToDisplay[hoveredIndex].ym}: {dataToDisplay[hoveredIndex].in.toLocaleString('vi-VN')} vào / {dataToDisplay[hoveredIndex].out.toLocaleString('vi-VN')} ra (Tổng: {dataToDisplay[hoveredIndex].total.toLocaleString('vi-VN')} lượt)
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Rê chuột vào từng cột để xem chi tiết
          </div>
        )}
      </div>

      {/* Responsive Horizontal Scroll SVG Chart */}
      <div className="w-full overflow-x-auto rounded-xl border border-border/70 bg-muted/20 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[700px] h-[300px] select-none"
        >
          <defs>
            <linearGradient id="barInGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="barOutGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Y-Axis Grid Lines & Labels */}
          {yTicks.map((tick, i) => {
            const y = padTop + plotHeight - (tick / maxVal) * plotHeight
            return (
              <g key={`ytick-${i}`} pointerEvents="none">
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-muted-foreground font-mono"
                >
                  {formatCompact(tick)}
                </text>
              </g>
            )
          })}

          {/* Bars & X-Axis Labels */}
          {dataToDisplay.map((d, idx) => {
            const colX = padLeft + idx * step
            const x = colX + (step - barWidth) / 2
            const cx = x + barWidth / 2
            const isHovered = hoveredIndex === idx

            // Heights
            const hIn = (d.in / maxVal) * plotHeight
            const hOut = (d.out / maxVal) * plotHeight
            const hTotal = ((d.in + d.out) / maxVal) * plotHeight

            const yBase = padTop + plotHeight

            return (
              <g key={`bar-group-${idx}`}>
                {/* 1. Background highlight on hover (pointer-events none) */}
                {isHovered && (
                  <rect
                    x={colX}
                    y={padTop}
                    width={step}
                    height={plotHeight}
                    fill="#38bdf8"
                    opacity={0.12}
                    pointerEvents="none"
                  />
                )}

                {/* 2. Visual Bars (pointer-events none to prevent hover flicker) */}
                <g pointerEvents="none">
                  {chartMode === 'both' ? (
                    <>
                      {/* Bar In (Bottom portion) */}
                      {d.in > 0 && (
                        <rect
                          x={x}
                          y={yBase - hIn}
                          width={barWidth}
                          height={Math.max(hIn, 2)}
                          fill="url(#barInGrad)"
                          opacity={d.isPartial ? 0.6 : 0.9}
                          stroke={d.isPartial ? '#f59e0b' : 'none'}
                          strokeDasharray={d.isPartial ? '2 2' : 'none'}
                        />
                      )}
                      {/* Bar Out (Top portion) */}
                      {d.out > 0 && (
                        <rect
                          x={x}
                          y={yBase - hIn - hOut}
                          width={barWidth}
                          height={Math.max(hOut, 2)}
                          fill="url(#barOutGrad)"
                          opacity={d.isPartial ? 0.6 : 0.9}
                          rx={3}
                        />
                      )}
                    </>
                  ) : chartMode === 'in' ? (
                    d.in > 0 && (
                      <rect
                        x={x}
                        y={yBase - hIn}
                        width={barWidth}
                        height={Math.max(hIn, 2)}
                        fill="url(#barInGrad)"
                        rx={3}
                        opacity={d.isPartial ? 0.6 : 0.9}
                      />
                    )
                  ) : (
                    d.out > 0 && (
                      <rect
                        x={x}
                        y={yBase - hOut}
                        width={barWidth}
                        height={Math.max(hOut, 2)}
                        fill="url(#barOutGrad)"
                        rx={3}
                        opacity={d.isPartial ? 0.6 : 0.9}
                      />
                    )
                  )}

                  {/* Value number on top if hovered */}
                  {isHovered && (
                    <text
                      x={cx}
                      y={yBase - (chartMode === 'both' ? hTotal : chartMode === 'in' ? hIn : hOut) - 6}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-teal-400 font-mono"
                    >
                      {formatCompact(chartMode === 'both' ? d.total : chartMode === 'in' ? d.in : d.out)}
                    </text>
                  )}

                  {/* X-axis Label (Month/Year) */}
                  <text
                    x={cx}
                    y={yBase + 16}
                    textAnchor="middle"
                    className={`text-[9px] font-mono select-none ${
                      isHovered
                        ? 'fill-teal-400 font-bold'
                        : d.ym.endsWith('-01')
                        ? 'fill-foreground font-bold'
                        : 'fill-muted-foreground font-medium'
                    }`}
                    transform={`rotate(-40, ${cx}, ${yBase + 16})`}
                  >
                    {d.ym.endsWith('-01') ? d.ym : d.ym.slice(5)}
                  </text>
                </g>

                {/* 3. Dedicated Static Hit-box Rect: Captures ALL mouse interactions cleanly without jittering */}
                <rect
                  x={colX}
                  y={padTop}
                  width={step}
                  height={plotHeight + padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex((curr) => (curr === idx ? null : curr))}
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
