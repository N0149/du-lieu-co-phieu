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
        monthLabel: `Tháng ${m}`,
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
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header with Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Bảng So Sánh Sản Lượng Cùng Kỳ YoY ({tickerName})
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Đối soát mức tăng trưởng từng tháng giữa Năm {compareYear} và Năm {baseYear}
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector */}
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

          {/* Year Pairs Selector */}
          <div className="flex items-center gap-1.5 text-xs bg-background/80 px-2.5 py-1.5 rounded-xl border border-border">
            <Calendar className="size-3.5 text-teal-400" />
            <span className="text-muted-foreground font-medium">Đối chiếu:</span>
            <select
              value={`${compareYear}-${baseYear}`}
              onChange={(e) => {
                const [c, b] = e.target.value.split('-').map(Number)
                setCompareYear(c)
                setBaseYear(b)
              }}
              className="bg-transparent font-bold text-teal-300 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y, idx) => {
                const prevY = availableYears[idx + 1] || y - 1
                return (
                  <option key={y} value={`${y}-${prevY}`} className="bg-slate-900 text-foreground">
                    Năm {y} vs {prevY}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Month Indicators (T1 - T12) - STRICT HORIZONTAL STRIP */}
      <div className="flex items-stretch justify-between gap-1 sm:gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {monthRows.rows.map((r) => {
          let statusColor = 'bg-muted/30 text-muted-foreground border-border/40' // future month
          if (r.hasCompareData) {
            if (r.isPartial) {
              statusColor =
                'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm animate-pulse'
            } else {
              statusColor =
                'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
            }
          }

          return (
            <div
              key={r.month}
              className={`flex-1 min-w-[50px] max-w-[85px] py-1.5 px-1 flex flex-col items-center justify-center rounded-xl border text-center transition-all ${statusColor}`}
            >
              <span className="text-[11px] sm:text-xs font-extrabold tracking-tight">
                T{r.month}
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase font-semibold mt-0.5 whitespace-nowrap opacity-85">
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
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground border-b border-border/80 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3 px-4 font-bold">Tháng</th>
              <th className="py-3 px-4 text-right font-bold">
                {metric === 'dwt' ? 'DWT Qua Cảng' : 'Lượt Tàu Qua Cảng'} {baseYear}
              </th>
              <th className="py-3 px-4 text-right font-bold">
                {metric === 'dwt' ? 'DWT Qua Cảng' : 'Lượt Tàu Qua Cảng'} {compareYear}
              </th>
              <th className="py-3 px-4 text-right font-bold">Tăng Trưởng YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono">
            {monthRows.rows.map((r) => {
              const isPositive = r.yoyGrowth !== null && r.yoyGrowth > 0
              const isNegative = r.yoyGrowth !== null && r.yoyGrowth < 0

              return (
                <tr
                  key={r.month}
                  className="hover:bg-muted/30 transition-colors font-sans"
                >
                  {/* Month Label */}
                  <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">
                    {r.monthLabel}
                  </td>

                  {/* Base Year Value */}
                  <td className="py-2.5 px-4 text-right text-muted-foreground font-mono whitespace-nowrap">
                    {formatVal(r.valBase)}
                  </td>

                  {/* Compare Year Value */}
                  <td className="py-2.5 px-4 text-right font-bold text-slate-100 font-mono whitespace-nowrap">
                    {formatVal(r.valCompare)}
                    {r.isPartial && (
                      <span className="ml-1.5 text-[10px] text-amber-400 font-normal font-sans bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        Đang cập nhật
                      </span>
                    )}
                  </td>

                  {/* YoY Growth % */}
                  <td className="py-2.5 px-4 text-right font-bold font-mono whitespace-nowrap">
                    {r.yoyGrowth !== null ? (
                      <span
                        className={`inline-flex items-center justify-end gap-1 ${
                          isPositive
                            ? 'text-emerald-400'
                            : isNegative
                            ? 'text-rose-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {isPositive && <ArrowUpRight className="size-3.5 shrink-0" />}
                        {isNegative && <ArrowDownRight className="size-3.5 shrink-0" />}
                        {r.yoyGrowth > 0 ? `+${r.yoyGrowth.toFixed(1)}%` : `${r.yoyGrowth.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-sans">—</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* Cumulative Summary Row (Lũy kế cùng kỳ) */}
            <tr className="bg-slate-900/90 font-bold border-t-2 border-teal-500/40 text-sm font-sans">
              <td className="py-3 px-4 text-teal-300">
                Lũy kế cùng kỳ (T1 – T{monthRows.countComparedMonths})
              </td>
              <td className="py-3 px-4 text-right text-slate-300 font-mono">
                {formatVal(monthRows.sumBase)}
              </td>
              <td className="py-3 px-4 text-right text-teal-300 font-mono text-base font-extrabold">
                {formatVal(monthRows.sumCompare)}
              </td>
              <td className="py-3 px-4 text-right font-mono font-extrabold">
                {monthRows.cumulativeYoY !== null ? (
                  <span
                    className={`inline-flex items-center justify-end gap-1 text-sm ${
                      monthRows.cumulativeYoY >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {monthRows.cumulativeYoY >= 0 ? (
                      <ArrowUpRight className="size-4 shrink-0" />
                    ) : (
                      <ArrowDownRight className="size-4 shrink-0" />
                    )}
                    {monthRows.cumulativeYoY >= 0
                      ? `+${monthRows.cumulativeYoY.toFixed(1)}%`
                      : `${monthRows.cumulativeYoY.toFixed(1)}%`}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
