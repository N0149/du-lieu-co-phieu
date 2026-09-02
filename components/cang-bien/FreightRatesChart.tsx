'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Globe2,
  Ship,
  Layers,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Zap,
  BarChart3,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { FreightRatesData, FreightIndexItem } from '@/lib/maritime-types'

interface Props {
  freightData: FreightRatesData | null
  initialSymbol?: string
  fullPageMode?: boolean
}

export function FreightRatesChart({
  freightData,
  initialSymbol = 'BDI',
  fullPageMode = false,
}: Props) {
  const indices = freightData?.indices || {}
  const symbolList = ['BDI', 'WCI', 'BDTI', 'BCTI']
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol)
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y'>('1Y')
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string
    value: number
    change_pct: number
    x: number
    y: number
  } | null>(null)

  const activeIndex: FreightIndexItem | undefined = indices[selectedSymbol]

  // Filter history based on timeRange
  const historyData = useMemo(() => {
    if (!activeIndex || !activeIndex.history) return []
    const all = activeIndex.history
    const count =
      timeRange === '1M'
        ? 5
        : timeRange === '3M'
        ? 13
        : timeRange === '6M'
        ? 26
        : timeRange === '1Y'
        ? 52
        : timeRange === '3Y'
        ? 156
        : timeRange === '5Y'
        ? 260
        : all.length
    return all.slice(-count)
  }, [activeIndex, timeRange])

  // SVG dimensions
  const width = fullPageMode ? 1000 : 700
  const height = fullPageMode ? 360 : 250
  const padding = {
    top: 25,
    right: 55,
    bottom: 35,
    left: 20,
  }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const { minVal, maxVal, pathD, areaD, points, dateLabels } = useMemo(() => {
    if (!historyData.length) {
      return { minVal: 0, maxVal: 0, pathD: '', areaD: '', points: [], dateLabels: [] }
    }
    const vals = historyData.map((d) => d.value)
    const rawMin = Math.min(...vals)
    const rawMax = Math.max(...vals)
    const buffer = (rawMax - rawMin) * 0.08 || 10
    const min = Math.max(0, Math.floor(rawMin - buffer))
    const max = Math.ceil(rawMax + buffer)

    const pts = historyData.map((d, i) => {
      const x = padding.left + (i / Math.max(1, historyData.length - 1)) * chartW
      const y = padding.top + chartH - ((d.value - min) / (max - min || 1)) * chartH
      return { x, y, ...d }
    })

    const path = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '')
    const area = `${path} L ${pts[pts.length - 1].x},${height - padding.bottom} L ${pts[0].x},${
      height - padding.bottom
    } Z`

    // Generate ~5 evenly spaced date labels along X axis
    const labelIndices = [
      0,
      Math.floor(pts.length * 0.25),
      Math.floor(pts.length * 0.5),
      Math.floor(pts.length * 0.75),
      pts.length - 1,
    ]
    const labels = labelIndices.map((idx) => {
      const pt = pts[idx]
      return { x: pt.x, text: pt.date }
    })

    return { minVal: min, maxVal: max, pathD: path, areaD: area, points: pts, dateLabels: labels }
  }, [historyData, chartW, chartH, padding.left, padding.top, padding.bottom, height])

  if (!activeIndex) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
        Đang nạp dữ liệu chỉ số cước vận tải biển quốc tế...
      </div>
    )
  }

  const isPositive = activeIndex.change_pct >= 0
  const formattedVal =
    activeIndex.unit === 'USD/FEU'
      ? `$${activeIndex.latest_value.toLocaleString('vi-VN')}`
      : `${activeIndex.latest_value.toLocaleString('vi-VN')} pts`

  const rangeButtons: Array<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y'> = [
    '1M',
    '3M',
    '6M',
    '1Y',
    '3Y',
    '5Y',
    '10Y',
  ]

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/85 to-slate-950/95 p-5 sm:p-7 shadow-2xl shadow-black/40 backdrop-blur-md space-y-6">
      {/* Top Header & Tag */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-xs">
            <Globe2 className="size-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{activeIndex.name}</span>
              <span className="text-xs font-black text-teal-400 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                {activeIndex.symbol}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {activeIndex.vietnamese_name} — Cập nhật từ {activeIndex.source}
            </p>
          </div>
        </div>

        {/* Index Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800/90 text-xs font-bold">
          {symbolList.map((sym) => {
            const item = indices[sym]
            if (!item) return null
            const isActive = sym === selectedSymbol
            return (
              <button
                key={sym}
                onClick={() => {
                  setSelectedSymbol(sym)
                  setHoveredPoint(null)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                {sym}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Metric Readout & 52-Week Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
        {/* Metric 1: Current Price */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
            Điểm số hiện tại ({activeIndex.latest_date})
          </span>
          <div className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 font-mono tracking-tight mt-1">
            {formattedVal}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              <span>
                {isPositive ? '+' : ''}
                {activeIndex.change_pct}%
              </span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              ({isPositive ? '+' : ''}
              {activeIndex.change_val})
            </span>
          </div>
        </div>

        {/* Metric 2: 52-Week Range */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
            Biên độ 52 Tuần
          </span>
          <div className="text-sm font-extrabold text-slate-200 font-mono mt-1.5">
            Thấp:{' '}
            <strong className="text-slate-400">
              {activeIndex.stats_52w?.low.toLocaleString('vi-VN') || '—'}
            </strong>
          </div>
          <div className="text-sm font-extrabold text-slate-200 font-mono mt-0.5">
            Cao:{' '}
            <strong className="text-teal-300">
              {activeIndex.stats_52w?.high.toLocaleString('vi-VN') || '—'}
            </strong>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">1 năm gần nhất</span>
        </div>

        {/* Metric 3: 10-Year Record Extremes */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
            Kỷ lục 10 Năm (2016-2026)
          </span>
          <div className="text-sm font-extrabold text-slate-200 font-mono mt-1.5 flex items-center gap-1">
            <ArrowUpRight className="size-3.5 text-amber-400 shrink-0" />
            <span>
              Đỉnh: <strong className="text-amber-300 font-black">{activeIndex.stats_10y?.all_time_high.toLocaleString('vi-VN') || '—'}</strong>
            </span>
          </div>
          <div className="text-sm font-extrabold text-slate-200 font-mono mt-0.5 flex items-center gap-1">
            <ArrowDownRight className="size-3.5 text-sky-400 shrink-0" />
            <span>
              Đáy: <strong className="text-sky-300 font-black">{activeIndex.stats_10y?.all_time_low.toLocaleString('vi-VN') || '—'}</strong>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Chu kỳ siêu bão cước</span>
        </div>

        {/* Metric 4: Affected Vietnamese Stocks */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider mb-2">
            Cổ phiếu VN hưởng lợi trực tiếp
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeIndex.affected_stocks.map((ticker) => (
              <Link
                key={ticker}
                href={
                  ticker === 'HAH' || ticker === 'GMD'
                    ? `/cang/${ticker.toLowerCase()}`
                    : `/stock/${ticker.toUpperCase()}`
                }
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-xs font-black text-teal-300 hover:border-teal-500/50 hover:bg-slate-800 transition-colors shadow-xs"
              >
                <span>{ticker}</span>
                <ChevronRight className="size-3 text-slate-400" />
              </Link>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5">Bấm mã để xem phân tích</span>
        </div>
      </div>

      {/* Interactive SVG Chart Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-semibold">
              Chuỗi thời gian:{' '}
              <strong className="text-teal-400">
                {historyData[0]?.date} ➔ {historyData[historyData.length - 1]?.date}
              </strong>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({historyData.length} kỳ tuần/ngày)
            </span>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold shadow-inner">
            {rangeButtons.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r)
                  setHoveredPoint(null)
                }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Container with Tooltip */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/90 shadow-inner">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="freightAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="freightLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = padding.top + chartH * pct
              const val = Math.round(maxVal - (maxVal - minVal) * pct)
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="3 3"
                    strokeWidth="0.8"
                  />
                  <text
                    x={width - padding.right + 8}
                    y={y + 3.5}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {val.toLocaleString('vi-VN')}
                  </text>
                </g>
              )
            })}

            {/* Area Fill */}
            {areaD && <path d={areaD} fill="url(#freightAreaGradient)" />}

            {/* Stroke Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="url(#freightLineGradient)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* X Axis Date Labels */}
            {dateLabels.map((lbl, idx) => (
              <text
                key={idx}
                x={lbl.x}
                y={height - padding.bottom + 18}
                textAnchor={idx === 0 ? 'start' : idx === dateLabels.length - 1 ? 'end' : 'middle'}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {lbl.text}
              </text>
            ))}

            {/* Interactive Hover Point & Vertical Cursor Line */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={height - padding.bottom}
                  stroke="#2dd4bf"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="5"
                  fill="#2dd4bf"
                  stroke="#020617"
                  strokeWidth="2.5"
                />
              </g>
            )}

            {/* Invisible Hitboxes for silky smooth mouse tracking */}
            {points.map((p, idx) => {
              const segW = chartW / points.length
              return (
                <rect
                  key={idx}
                  x={p.x - segW / 2}
                  y={padding.top}
                  width={segW}
                  height={chartH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredPoint(p)}
                />
              )
            })}
          </svg>

          {/* Floating Tooltip Bubble */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border border-teal-500/40 bg-slate-900/95 px-3.5 py-2 shadow-2xl shadow-black/90 backdrop-blur-md text-xs font-mono text-white transition-all transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 10}%`,
              }}
            >
              <div className="text-[10px] text-slate-400 font-sans">{hoveredPoint.date}</div>
              <div className="text-sm font-black text-teal-300 mt-0.5">
                {activeIndex.unit === 'USD/FEU'
                  ? `$${hoveredPoint.value.toLocaleString('vi-VN')}`
                  : `${hoveredPoint.value.toLocaleString('vi-VN')} pts`}
              </div>
              <div
                className={`text-[10px] font-bold ${
                  hoveredPoint.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hoveredPoint.change_pct >= 0 ? '+' : ''}
                {hoveredPoint.change_pct}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Note */}
      <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800/70 text-xs text-slate-400 leading-relaxed">
        <Info className="size-4 text-teal-400 shrink-0 mt-0.5" />
        <p>{activeIndex.summary}</p>
      </div>
    </div>
  )
}
