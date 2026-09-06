'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { ValuationEpsPayload, ValuationEpsPoint } from '@/lib/valuation-eps-service'
import { Target, TrendingUp, TrendingDown, Layers, Calculator, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockValuationEpsChartProps {
  symbol: string
  initialData?: ValuationEpsPayload | null
}

type Timeframe = '1Y' | '2Y' | '3Y' | '5Y' | 'ALL'
type ViewMode = 'FAIR_PE' | 'EPS'

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

export function StockValuationEpsChart({ symbol, initialData }: StockValuationEpsChartProps) {
  const [data, setData] = useState<ValuationEpsPayload | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [timeframe, setTimeframe] = useState<Timeframe>('3Y')
  const [viewMode, setViewMode] = useState<ViewMode>('FAIR_PE')

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/stock/${encodeURIComponent(symbol)}/valuation-eps?years=5`)
      .then((res) => {
        if (!res.ok) throw new Error('Không có dữ liệu')
        return res.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [symbol, initialData])

  // Lọc theo timeframe
  const filteredTimeline = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return []
    const timeline = data.timeline
    const lastSec = timeline[timeline.length - 1].timestamp

    let cutoffSec = 0
    if (timeframe === '1Y') cutoffSec = lastSec - 365 * 86400
    else if (timeframe === '2Y') cutoffSec = lastSec - 2 * 365 * 86400
    else if (timeframe === '3Y') cutoffSec = lastSec - 3 * 365 * 86400
    else if (timeframe === '5Y') cutoffSec = lastSec - 5 * 365 * 86400
    else cutoffSec = 0

    const list = timeline.filter((p) => p.timestamp >= cutoffSec)
    if (list.length <= 160) return list
    const step = Math.ceil(list.length / 160)
    return list.filter((_, i) => i % step === 0 || i === list.length - 1)
  }, [data, timeframe])

  if (loading) {
    return (
      <div className="w-full h-80 rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center justify-center gap-3 animate-pulse">
        <Calculator className="size-8 text-primary/40 animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Đang tính toán mô hình Định giá EPS...</span>
      </div>
    )
  }

  if (!data || !data.timeline || data.timeline.length === 0) return null

  const { currentPrice, currentEps, currentPe, medianPe, fairValuePe, peDiffPercent } = data
  const isCheap = peDiffPercent != null && peDiffPercent <= 0

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5">
      {/* ── HEADER & BỘ LỌC ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
            <Calculator className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                ĐỊNH GIÁ DOANH NGHIỆP (EPS & P/E)
              </h3>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10.5px] font-black text-primary">
                Định Giá Kép
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              So sánh biến động thị giá với Giá trị định giá hợp lý theo EPS và P/E trung vị
            </p>
          </div>
        </div>

        {/* Chuyển chế độ & Lọc thời gian */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút chuyển chế độ */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('FAIR_PE')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                viewMode === 'FAIR_PE'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Định giá P/E
            </button>
            <button
              type="button"
              onClick={() => setViewMode('EPS')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                viewMode === 'EPS'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              EPS (TTM)
            </button>
          </div>

          {/* Timeframe */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
            {(['1Y', '2Y', '3Y', '5Y', 'ALL'] as Timeframe[]).map((tf) => (
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
      </div>

      {/* ── 4 THẺ THÔNG SỐ ĐỊNH GIÁ ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-indigo-400" />
            <span>Thị Giá Hiện Tại</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-foreground">
            {fmtPrice(currentPrice)}
          </div>
          <div className="text-[11px] text-muted-foreground">Mã {symbol}</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" />
            <span>EPS (TTM)</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-primary">
            {fmtPrice(currentEps)}
          </div>
          <div className="text-[11px] text-muted-foreground">Lãi cơ bản 4 quý</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-400" />
            <span>Định Giá P/E Mục Tiêu</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-foreground">
            {fmtPrice(fairValuePe)}
          </div>
          <div className="text-[11px] text-muted-foreground">Theo P/E trung vị ({medianPe}x)</div>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 sm:p-4 space-y-1',
            isCheap ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
          )}
        >
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            {isCheap ? <TrendingDown className="size-3.5 text-emerald-500" /> : <TrendingUp className="size-3.5 text-rose-500" />}
            <span>P/E Hiện Tại ({currentPe}x)</span>
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black font-mono',
              isCheap ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            )}
          >
            {peDiffPercent != null ? `${peDiffPercent <= 0 ? '' : '+'}${peDiffPercent}%` : '—'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {isCheap ? 'Đang rẻ hơn trung vị lịch sử' : 'Cao hơn mức trung vị lịch sử'}
          </div>
        </div>
      </div>

      {/* ── BIỂU ĐỒ RECHARTS (WIDATA STEPPED AREA + LINE) ── */}
      <div className="h-[300px] sm:h-[340px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredTimeline} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValuationStep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#475569" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#334155" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#888' }}
              minTickGap={35}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#888' }}
              domain={['auto', 'auto']}
              tickFormatter={(val) => `${Math.round(val / 1000)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const pt = payload[0]?.payload as ValuationEpsPoint
                if (!pt) return null
                return (
                  <div className="rounded-xl border border-border/80 bg-slate-950/95 p-3 shadow-xl text-xs space-y-2 max-w-[260px]">
                    <div className="font-mono font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{pt.date}</span>
                      {pt.pe && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-cyan-400">
                          P/E: {pt.pe}x
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center justify-between text-indigo-400 font-bold">
                        <span>Thị giá đóng cửa:</span>
                        <span>{fmtPrice(pt.price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>Định giá P/E ({medianPe}x):</span>
                        <span>{fmtPrice(pt.fairPricePe)}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>EPS (TTM):</span>
                        <span>{fmtPrice(pt.eps)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />

            {/* Vùng diện tích bậc thang (Stepped Area chuẩn phong cách WiData) */}
            <Area
              type="stepAfter"
              dataKey={viewMode === 'FAIR_PE' ? 'fairPricePe' : 'eps'}
              name={viewMode === 'FAIR_PE' ? 'Định giá hợp lý theo P/E' : 'EPS (TTM)'}
              stroke="#94a3b8"
              strokeWidth={1.8}
              fill="url(#colorValuationStep)"
            />

            {/* Đường giá thị trường (Line) */}
            <Line
              type="monotone"
              dataKey="price"
              name="Giá thị trường"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#38bdf8', stroke: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── CHÚ THÍCH (LEGEND) CHUẨN WIDATA ── */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-border/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2.5 rounded-xs bg-slate-600 border border-slate-400" />
          <span className="font-semibold text-muted-foreground">
            {viewMode === 'FAIR_PE' ? 'Định giá hợp lý theo P/E (Bậc thang)' : 'EPS (TTM) Bậc thang'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-[#38bdf8] rounded" />
          <span className="font-semibold text-muted-foreground">Giá thị trường (P/E)</span>
        </div>
      </div>
    </div>
  )
}
