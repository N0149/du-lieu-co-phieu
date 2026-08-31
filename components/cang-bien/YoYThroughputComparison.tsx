'use client'

import React, { useState, useMemo } from 'react'
import { MonthlyRecord, formatDWT, formatCalls } from '@/lib/maritime-types'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
} from 'lucide-react'

interface Props {
  monthlyData: MonthlyRecord[]
  tickerName: string
}

export function YoYThroughputComparison({ monthlyData, tickerName }: Props) {
  // Extract all available years in data
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    monthlyData.forEach((d) => {
      if (d.ym) {
        const y = parseInt(d.ym.slice(0, 4), 10)
        if (!isNaN(y)) years.add(y)
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [monthlyData])

  const defaultCompareYear = availableYears[0] || 2026
  const defaultBaseYear = availableYears[1] || defaultCompareYear - 1

  const [compareYear, setCompareYear] = useState<number>(defaultCompareYear)
  const [baseYear, setBaseYear] = useState<number>(defaultBaseYear)
  const [metric, setMetric] = useState<'calls' | 'dwt'>('calls')

  // Map data by "YYYY-MM"
  const dataMap = useMemo(() => {
    const map = new Map<string, MonthlyRecord>()
    monthlyData.forEach((d) => {
      if (d.ym) map.set(d.ym, d)
    })
    return map
  }, [monthlyData])

  // Check if DWT data exists
  const hasDwtData = useMemo(() => {
    return monthlyData.some(
      (d) => (d.dwt_in && d.dwt_in > 0) || (d.dwt_out && d.dwt_out > 0)
    )
  }, [monthlyData])

  // Compute 12-month comparison rows
  const monthRows = useMemo(() => {
    const rows = []
    let sumBase = 0
    let sumCompare = 0
    let countComparedMonths = 0

    for (let m = 1; m <= 12; m++) {
      const mStr = m.toString().padStart(2, '0')
      const keyBase = `${baseYear}-${mStr}`
      const keyCompare = `${compareYear}-${mStr}`

      const recBase = dataMap.get(keyBase)
      const recCompare = dataMap.get(keyCompare)

      let valBase: number | null = null
      if (recBase) {
        valBase =
          metric === 'dwt'
            ? (recBase.dwt_in || 0) + (recBase.dwt_out || 0)
            : (recBase.in || 0) + (recBase.out || 0)
      }

      let valCompare: number | null = null
      if (recCompare) {
        valCompare =
          metric === 'dwt'
            ? (recCompare.dwt_in || 0) + (recCompare.dwt_out || 0)
            : (recCompare.in || 0) + (recCompare.out || 0)
      }

      let yoyGrowth: number | null = null
      if (valBase !== null && valCompare !== null && valBase > 0) {
        yoyGrowth = ((valCompare - valBase) / valBase) * 100
      }

      const isPartial = Boolean(recCompare?.partial)
      const isEstimated = Boolean(recCompare?.est)
      const hasCompareData = valCompare !== null && valCompare > 0

      if (valCompare !== null && valBase !== null) {
        sumBase += valBase
        sumCompare += valCompare
        countComparedMonths = m
      }

      rows.push({
        month: m,
        valBase,
        valCompare,
        yoyGrowth,
        isPartial,
        isEstimated,
        hasCompareData,
      })
    }

    const cumulativeYoY =
      sumBase > 0 ? ((sumCompare - sumBase) / sumBase) * 100 : null

    return {
      rows,
      sumBase,
      sumCompare,
      cumulativeYoY,
      countComparedMonths,
    }
  }, [dataMap, baseYear, compareYear, metric])

  const formatVal = (val: number | null) => {
    if (val === null || val === undefined) return '—'
    if (metric === 'dwt') {
      return val.toLocaleString('vi-VN') + ' DWT'
    }
    return val.toLocaleString('vi-VN') + ' lượt'
  }

  return (
    <div className="rounded-xl border border-white/8 bg-[#212631] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-4">
      {/* Header with Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F0F3F6] tracking-tight">
                Bảng So Sánh Sản Lượng Cùng Kỳ YoY ({tickerName})
              </h3>
              <p className="text-xs text-[#9EACB9] mt-0.5">
                Đối soát mức tăng trưởng từng tháng giữa Năm {compareYear} và Năm {baseYear}
              </p>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector */}
          {hasDwtData && (
            <div className="inline-flex rounded-lg border border-white/10 bg-[#1A1D26] p-1 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setMetric('calls')}
                className={`rounded-md px-3 py-1.5 transition-all ${
                  metric === 'calls'
                    ? 'bg-emerald-500 text-white font-bold shadow-md'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]'
                }`}
              >
                Số Lượt Tàu
              </button>
              <button
                onClick={() => setMetric('dwt')}
                className={`rounded-md px-3 py-1.5 transition-all ${
                  metric === 'dwt'
                    ? 'bg-emerald-500 text-white font-bold shadow-md'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]'
                }`}
              >
                Trọng Tải DWT
              </button>
            </div>
          )}

          {/* Year Pairs Selector */}
          <div className="flex items-center gap-2 text-xs bg-[#1A1D26] px-3 py-2 rounded-lg border border-white/10">
            <Calendar className="size-3.5 text-emerald-400" />
            <span className="text-[#9EACB9] font-medium">Đối chiếu:</span>
            <select
              value={`${compareYear}-${baseYear}`}
              onChange={(e) => {
                const [c, b] = e.target.value.split('-').map(Number)
                setCompareYear(c)
                setBaseYear(b)
              }}
              className="bg-transparent font-bold text-emerald-400 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y, idx) => {
                const prevY = availableYears[idx + 1] || y - 1
                return (
                  <option key={y} value={`${y}-${prevY}`} className="bg-[#212631] text-[#F0F3F6]">
                    Năm {y} vs {prevY}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Month Indicators (T1 - T12) - STRICT HORIZONTAL STRIP */}
      <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {monthRows.rows.map((r) => {
          let statusColor = 'bg-[#1A1D26]/60 text-[#64748B] border-white/5' // future month
          if (r.hasCompareData) {
            if (r.isPartial) {
              statusColor =
                'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm animate-pulse'
            } else {
              statusColor =
                'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
            }
          }

          return (
            <div
              key={r.month}
              className={`flex-1 min-w-[52px] max-w-[85px] py-2 px-1 flex flex-col items-center justify-center rounded-lg border text-center transition-all ${statusColor}`}
            >
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                T{r.month}
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase font-semibold mt-0.5 whitespace-nowrap opacity-90">
                {r.hasCompareData
                  ? r.isPartial
                    ? 'Đang chạy'
                    : 'Đã chốt'
                  : 'Chưa có'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-lg border border-white/8 bg-[#1A1D26]/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#1A1D26] text-[#9EACB9] border-b border-white/8 uppercase text-[11px] tracking-wider font-semibold">
              <th className="py-3 px-4 font-bold">Tháng</th>
              <th className="py-3 px-4 text-right font-bold">
                {metric === 'dwt' ? 'DWT Qua Cảng' : 'Lượt Tàu Qua Cảng'} {baseYear}
              </th>
              <th className="py-3 px-4 text-right font-bold">
                {metric === 'dwt' ? 'DWT Qua Cảng' : 'Lượt Tàu Qua Cảng'} {compareYear}
              </th>
              <th className="py-3 px-4 text-right font-bold">Tăng Trưởng (YoY)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {monthRows.rows.map((r) => {
              const hasData = r.valBase !== null || r.valCompare !== null
              if (!hasData) return null

              const isPositive = r.yoyGrowth !== null && r.yoyGrowth > 0
              const isNegative = r.yoyGrowth !== null && r.yoyGrowth < 0
              const isZero = r.yoyGrowth !== null && r.yoyGrowth === 0

              return (
                <tr key={r.month} className="hover:bg-white/[0.03] transition-colors font-sans">
                  <td className="py-3 px-4 font-bold text-[#F0F3F6] flex items-center gap-2">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-white/10 text-[11px] font-bold text-emerald-400">
                      T{r.month}
                    </span>
                    {r.isPartial && (
                      <span className="rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-[9px] font-medium border border-amber-500/25">
                        Đang diễn ra
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-[#9EACB9] font-mono">
                    {formatVal(r.valBase)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#F0F3F6] font-mono">
                    {formatVal(r.valCompare)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {r.yoyGrowth !== null ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isNegative
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-white/5 text-[#9EACB9] border-white/10'
                        }`}
                      >
                        {isPositive && <ArrowUpRight className="size-3.5" />}
                        {isNegative && <ArrowDownRight className="size-3.5" />}
                        {isZero && <Minus className="size-3.5" />}
                        <span>
                          {isPositive ? '+' : ''}
                          {r.yoyGrowth.toFixed(1)}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#64748B]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* Cumulative Row (YTD) */}
            <tr className="bg-[#1A1D26] font-bold border-t border-white/10 font-sans">
              <td className="py-3.5 px-4 text-emerald-400 font-bold">
                Lũy Kế {monthRows.countComparedMonths > 0 ? `${monthRows.countComparedMonths} Tháng` : 'Cùng Kỳ'}
              </td>
              <td className="py-3.5 px-4 text-right text-[#9EACB9] font-mono">
                {formatVal(monthRows.sumBase)}
              </td>
              <td className="py-3.5 px-4 text-right text-[#F0F3F6] font-mono text-sm font-bold">
                {formatVal(monthRows.sumCompare)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono">
                {monthRows.cumulativeYoY !== null ? (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${
                      monthRows.cumulativeYoY >= 0
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {monthRows.cumulativeYoY >= 0 ? '+' : ''}
                    {monthRows.cumulativeYoY.toFixed(1)}% YoY
                  </span>
                ) : (
                  <span className="text-[#64748B]">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
