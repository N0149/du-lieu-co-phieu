'use client'

import React, { useState, useMemo } from 'react'
import { MonthlyRecord, formatDWT, formatCalls } from '@/lib/maritime-types'
import { BarChart3, TrendingUp, Calendar, Info, Scale, Sparkles } from 'lucide-react'

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
  const svgWidth = Math.max(760, dataToDisplay.length * 38)
  const svgHeight = 290
  const padLeft = metric === 'dwt' ? 62 : 48
  const padRight = 24
  const padTop = 32
  const padBottom = 48
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  const step = dataToDisplay.length > 0 ? plotWidth / dataToDisplay.length : 0
  const barWidth = Math.max(step * 0.65, 6)

  // Y-axis grid ticks
  const yTicks = [0, Math.round(maxVal * 0.33), Math.round(maxVal * 0.66), maxVal]

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-4 sm:p-6 shadow-2xl shadow-black/40 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-sm">
              <BarChart3 className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight">
                {metric === 'dwt' ? 'Trọng Tải Tàu (DWT) Theo Tháng' : 'Sản Lượng Tàu Qua Cảng Theo Tháng'} ({tickerName})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {metric === 'dwt'
                  ? `Tổng trọng tải DWT tàu cập và rời các cầu bến trực thuộc (${dataToDisplay.length} tháng lịch sử)`
                  : `Số lượt tàu cập và rời các cầu bến trực thuộc (${dataToDisplay.length} tháng lịch sử)`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector (Số lượt vs Trọng tải DWT) */}
          {hasDwtData && (
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/80 p-1 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setMetric('calls')}
                className={`rounded-lg px-3 py-1.5 transition-all text-xs ${
                  metric === 'calls'
                    ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Số Lượt Tàu
              </button>
              <button
                onClick={() => setMetric('dwt')}
                className={`rounded-lg px-3 py-1.5 transition-all text-xs ${
                  metric === 'dwt'
                    ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Trọng Tải DWT
              </button>
            </div>
          )}

          {/* Direction Mode Switch */}
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/80 p-1 text-xs font-semibold shadow-inner">
            <button
              onClick={() => setChartMode('both')}
              className={`rounded-lg px-2.5 py-1.5 transition-all ${
                chartMode === 'both'
                  ? 'bg-slate-700 text-slate-100 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vào + Ra
            </button>
            <button
              onClick={() => setChartMode('in')}
              className={`rounded-lg px-2.5 py-1.5 transition-all ${
                chartMode === 'in'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chỉ Vào
            </button>
            <button
              onClick={() => setChartMode('out')}
              className={`rounded-lg px-2.5 py-1.5 transition-all ${
                chartMode === 'out'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chỉ Ra
            </button>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="rounded-xl border border-slate-700 bg-slate-950/80 py-1.5 px-3 text-xs text-slate-200 focus:border-teal-500 focus:outline-none font-bold cursor-pointer"
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
        <div className="flex items-center gap-4 text-slate-400">
          {(chartMode === 'both' || chartMode === 'in') && (
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-emerald-400 shadow-xs shadow-emerald-400/50 shrink-0" />
              <span className="text-slate-200 font-bold">{metric === 'dwt' ? 'DWT Vào' : 'Tàu Vào'}</span>
            </div>
          )}
          {(chartMode === 'both' || chartMode === 'out') && (
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-sky-400 shadow-xs shadow-sky-400/50 shrink-0" />
              <span className="text-slate-200 font-bold">{metric === 'dwt' ? 'DWT Ra' : 'Tàu Ra'}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-amber-400/30 border border-dashed border-amber-400 shrink-0" />
            <span className="text-slate-300 font-medium">Tháng Chưa Đóng Sổ</span>
          </div>
        </div>

        {hoveredIndex !== null && dataToDisplay[hoveredIndex] ? (
          <div className="rounded-xl bg-slate-950 border border-teal-500/60 px-3 py-1.5 text-teal-300 font-bold shadow-lg shadow-teal-500/10 animate-in fade-in">
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
          <div className="text-xs text-slate-500 italic">
            Rê chuột vào từng cột để xem chi tiết số liệu
          </div>
        )}
      </div>

      {/* Responsive Horizontal Scroll SVG Chart */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3 shadow-inner">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[700px] h-[310px] select-none"
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
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray={i === 0 ? '0' : '4 4'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {formatCompact(tick)}
                </text>
              </g>
            )
          })}

          {/* Background Indicator for Hovered Column */}
          {hoveredIndex !== null && dataToDisplay[hoveredIndex] && (
            <rect
              x={padLeft + hoveredIndex * step}
              y={padTop}
              width={step}
              height={plotHeight}
              fill="#0d9488"
              fillOpacity="0.12"
              rx="4"
              pointerEvents="none"
            />
          )}

          {/* Data Bars */}
          {dataToDisplay.map((d, i) => {
            const xCenter = padLeft + i * step + step / 2
            const xBar = xCenter - barWidth / 2

            const inH = Math.max(0, (d.in / maxVal) * plotHeight)
            const outH = Math.max(0, (d.out / maxVal) * plotHeight)
            const totalH = Math.max(0, (d.total / maxVal) * plotHeight)

            const inY = padTop + plotHeight - inH
            const outY = padTop + plotHeight - inH - outH

            const isHovered = hoveredIndex === i

            return (
              <g key={d.ym} pointerEvents="none">
                {/* Mode: Both (Stacked) */}
                {chartMode === 'both' && (
                  <>
                    {/* In Bar (Bottom) */}
                    {d.in > 0 && (
                      <rect
                        x={xBar}
                        y={inY}
                        width={barWidth}
                        height={inH}
                        fill="url(#barInGrad)"
                        rx={d.out > 0 ? 0 : 4}
                        opacity={d.isPartial ? 0.75 : 1}
                      />
                    )}
                    {/* Out Bar (Top) */}
                    {d.out > 0 && (
                      <rect
                        x={xBar}
                        y={outY}
                        width={barWidth}
                        height={outH}
                        fill="url(#barOutGrad)"
                        rx="4"
                        opacity={d.isPartial ? 0.75 : 1}
                      />
                    )}
                  </>
                )}

                {/* Mode: In Only */}
                {chartMode === 'in' && d.in > 0 && (
                  <rect
                    x={xBar}
                    y={inY}
                    width={barWidth}
                    height={inH}
                    fill="url(#barInGrad)"
                    rx="4"
                    opacity={d.isPartial ? 0.75 : 1}
                  />
                )}

                {/* Mode: Out Only */}
                {chartMode === 'out' && d.out > 0 && (
                  <rect
                    x={xBar}
                    y={padTop + plotHeight - outH}
                    width={barWidth}
                    height={outH}
                    fill="url(#barOutGrad)"
                    rx="4"
                    opacity={d.isPartial ? 0.75 : 1}
                  />
                )}

                {/* Value Label on Top of Selected/Hovered Bars */}
                {isHovered && (
                  <text
                    x={xCenter}
                    y={chartMode === 'both' ? outY - 8 : (chartMode === 'in' ? inY - 8 : padTop + plotHeight - outH - 8)}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#5eead4"
                    fontFamily="monospace"
                  >
                    {chartMode === 'both'
                      ? formatCompact(d.total)
                      : chartMode === 'in'
                      ? formatCompact(d.in)
                      : formatCompact(d.out)}
                  </text>
                )}

                {/* Month Label on X-axis */}
                <text
                  x={xCenter}
                  y={padTop + plotHeight + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHovered ? '#2dd4bf' : '#94a3b8'}
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fontFamily="monospace"
                >
                  {d.ym.slice(2)}
                </text>

                {/* Partial Month Asterisk / Indicator */}
                {d.isPartial && (
                  <circle
                    cx={xCenter}
                    cy={padTop + plotHeight + 28}
                    r="2.5"
                    fill="#f59e0b"
                  />
                )}
              </g>
            )
          })}

          {/* Static Hitboxes Layer for Hover Interaction without Re-rendering Glitch */}
          {dataToDisplay.map((_, i) => (
            <rect
              key={`hitbox-${i}`}
              x={padLeft + i * step}
              y={padTop}
              width={step}
              height={plotHeight + 35}
              fill="transparent"
              cursor="pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
