'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { ValuationHistoryPayload } from '@/lib/valuation-history-service'
import { Target, TrendingUp, TrendingDown, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function formatDateFromSec(sec: number): string {
  const d = new Date(sec * 1000)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(2)
  return `${day}/${month}/${year}`
}

export function ValuationBandsChart({ symbol, data }: ValuationBandsChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('3Y')

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
      displayDate: string
      pe: number | null
      pb: number | null
      ps: number | null
    }> = []

    for (let i = 0; i < dates.length; i++) {
      if (dates[i] >= cutoffSec) {
        points.push({
          dateSec: dates[i],
          displayDate: formatDateFromSec(dates[i]),
          pe: peArr[i] != null && peArr[i]! > 0 ? peArr[i] : null,
          pb: pbArr[i] != null && pbArr[i]! > 0 ? pbArr[i] : null,
          ps: psArr[i] != null && psArr[i]! > 0 ? psArr[i] : null,
        })
      }
    }

    return points
  }, [data, timeframe])

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
              Định giá P/E, P/B theo các dải độ lệch chuẩn (+2SD, +1SD, Median, -1SD, -2SD)
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
      {/* BIỂU ĐỒ 1: DẢI ĐỊNH GIÁ P/E                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="text-xs font-black uppercase tracking-wide text-foreground">
            ĐỊNH GIÁ P/E
          </div>
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
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={filteredPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={['auto', 'auto']} unit="x" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} lần`, 'P/E']}
              />
              {/* 5 Dải độ lệch chuẩn */}
              <ReferenceLine y={peStats.plus2sd} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+2SD (${peStats.plus2sd})`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={peStats.plus1sd} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+1SD (${peStats.plus1sd})`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={peStats.median} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Trung vị (${peStats.median})`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={peStats.minus1sd} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-1SD (${peStats.minus1sd})`, fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={peStats.minus2sd} stroke="#059669" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-2SD (${peStats.minus2sd})`, fill: '#059669', fontSize: 10, position: 'insideTopRight' }} />

              <Line type="monotone" dataKey="pe" name="P/E lịch sử" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* BIỂU ĐỒ 2: DẢI ĐỊNH GIÁ P/B                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="text-xs font-black uppercase tracking-wide text-foreground">
            ĐỊNH GIÁ P/B
          </div>
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
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={filteredPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={['auto', 'auto']} unit="x" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} lần`, 'P/B']}
              />
              {/* 5 Dải độ lệch chuẩn */}
              <ReferenceLine y={pbStats.plus2sd} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+2SD (${pbStats.plus2sd})`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={pbStats.plus1sd} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+1SD (${pbStats.plus1sd})`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={pbStats.median} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Trung vị (${pbStats.median})`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={pbStats.minus1sd} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-1SD (${pbStats.minus1sd})`, fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={pbStats.minus2sd} stroke="#059669" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-2SD (${pbStats.minus2sd})`, fill: '#059669', fontSize: 10, position: 'insideTopRight' }} />

              <Line type="monotone" dataKey="pb" name="P/B lịch sử" stroke="#10b981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* BIỂU ĐỒ 3: DẢI ĐỊNH GIÁ P/S                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="text-xs font-black uppercase tracking-wide text-foreground">
            ĐỊNH GIÁ P/S
          </div>
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
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={filteredPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={['auto', 'auto']} unit="x" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} lần`, 'P/S']}
              />
              {/* 5 Dải độ lệch chuẩn */}
              <ReferenceLine y={psStats.plus2sd} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+2SD (${psStats.plus2sd})`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={psStats.plus1sd} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+1SD (${psStats.plus1sd})`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={psStats.median} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Trung vị (${psStats.median})`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={psStats.minus1sd} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-1SD (${psStats.minus1sd})`, fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
              <ReferenceLine y={psStats.minus2sd} stroke="#059669" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-2SD (${psStats.minus2sd})`, fill: '#059669', fontSize: 10, position: 'insideTopRight' }} />

              <Line type="monotone" dataKey="ps" name="P/S lịch sử" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
