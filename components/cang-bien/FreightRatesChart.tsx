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
} from 'lucide-react'
import { FreightRatesData, FreightIndexItem } from '@/lib/maritime-types'

interface Props {
  freightData: FreightRatesData | null
}

export function FreightRatesChart({ freightData }: Props) {
  const indices = freightData?.indices || {}
  const symbolList = ['BDI', 'WCI', 'BDTI', 'BCTI']
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BDI')
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M')
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
        ? 22
        : timeRange === '3M'
        ? 65
        : timeRange === '6M'
        ? 130
        : all.length
    return all.slice(-count)
  }, [activeIndex, timeRange])

  // SVG dimensions
  const width = 680
  const height = 230
  const padding = { top: 20, right: 45, bottom: 28, left: 15 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const { minVal, maxVal, pathD, areaD, points } = useMemo(() => {
    if (!historyData.length) {
      return { minVal: 0, maxVal: 0, pathD: '', areaD: '', points: [] }
    }
    const vals = historyData.map((d) => d.value)
    const rawMin = Math.min(...vals)
    const rawMax = Math.max(...vals)
    const buffer = (rawMax - rawMin) * 0.1 || 10
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

    return { minVal: min, maxVal: max, pathD: path, areaD: area, points: pts }
  }, [historyData, chartW, chartH, padding.left, padding.top, padding.bottom, height])

  if (!activeIndex) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-xs text-slate-400">
        Đang nạp dữ liệu cước vận tải biển quốc tế...
      </div>
    )
  }

  const isPositive = activeIndex.change_pct >= 0
  const formattedVal =
    activeIndex.unit === 'USD/FEU'
      ? `$${activeIndex.latest_value.toLocaleString('vi-VN')}`
      : `${activeIndex.latest_value.toLocaleString('vi-VN')} pts`

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/85 to-slate-950/95 p-4 sm:p-5 shadow-2xl shadow-black/40 backdrop-blur-md flex flex-col justify-between space-y-4">
      {/* Top Header & Tag */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <Globe2 className="size-4" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Chỉ Số Cước Vận Tải Biển Quốc Tế</span>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                LIVE
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Đo lường chi phí thuê tàu hàng rời, dầu khí &amp; giá cước container giao ngay
            </p>
          </div>
        </div>

        {/* Index Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 text-xs font-bold">
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
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {sym}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Metric Readout & Affected Stocks Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/70">
        {/* Left: Value & Daily Change */}
        <div className="sm:col-span-6 flex items-baseline gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block font-sans">
              {activeIndex.vietnamese_name} ({activeIndex.symbol})
            </span>
            <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 font-mono tracking-tight mt-0.5">
              {formattedVal}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
              isPositive
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            <span>
              {isPositive ? '+' : ''}
              {activeIndex.change_pct}%
            </span>
          </div>
        </div>

        {/* Right: Affected Stocks Chips */}
        <div className="sm:col-span-6 flex flex-col sm:items-end justify-center">
          <span className="text-[10px] text-slate-400 font-semibold mb-1">
            Cổ phiếu hưởng lợi trực tiếp:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeIndex.affected_stocks.map((ticker) => (
              <Link
                key={ticker}
                href={ticker === 'HAH' || ticker === 'GMD' ? `/cang/${ticker.toLowerCase()}` : `/stock/${ticker.toUpperCase()}`}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800/90 border border-slate-700 px-2 py-0.5 text-[10px] font-black text-teal-300 hover:border-teal-500/50 hover:bg-slate-800 transition-colors shadow-xs"
              >
                <span>{ticker}</span>
                <ChevronRight className="size-2.5 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">
              Nguồn: <strong className="text-slate-300">{activeIndex.source}</strong>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({activeIndex.latest_date})
            </span>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
            {(['1M', '3M', '6M', '1Y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r)
                  setHoveredPoint(null)
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Container with Tooltip */}
        <div className="relative w-full overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/80">
          {/* Ambient background glow inside chart */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="freightAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
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
                    x={width - padding.right + 6}
                    y={y + 3.5}
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="monospace"
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
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Hover Point & Cursor */}
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
                  r="4.5"
                  fill="#2dd4bf"
                  stroke="#0f172a"
                  strokeWidth="2"
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
              className="pointer-events-none absolute z-20 rounded-xl border border-teal-500/40 bg-slate-900/95 px-3 py-1.5 shadow-2xl shadow-black/80 backdrop-blur-md text-[11px] font-mono text-white transition-all transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 8}%`,
              }}
            >
              <div className="text-[10px] text-slate-400 font-sans">{hoveredPoint.date}</div>
              <div className="font-bold text-teal-300">
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
      <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
        <Info className="size-3.5 text-teal-400 shrink-0 mt-0.5" />
        <p>{activeIndex.summary}</p>
      </div>
    </div>
  )
}
