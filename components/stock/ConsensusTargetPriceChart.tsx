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
  Legend,
} from 'recharts'
import type { ConsensusTargetPayload, TargetPriceTimelinePoint } from '@/lib/consensus-target-price-service'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConsensusTargetPriceChartProps {
  symbol: string
  initialData?: ConsensusTargetPayload | null
}

type Timeframe = '6M' | '1Y' | '2Y' | '3Y' | 'ALL'

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

export function ConsensusTargetPriceChart({ symbol, initialData }: ConsensusTargetPriceChartProps) {
  const [data, setData] = useState<ConsensusTargetPayload | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [timeframe, setTimeframe] = useState<Timeframe>('2Y')

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/stock/${encodeURIComponent(symbol)}/consensus`)
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

  // Lọc dữ liệu theo timeframe
  const filteredTimeline = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return []
    const timeline = data.timeline
    const lastSec = timeline[timeline.length - 1].timestamp

    let cutoffSec = 0
    if (timeframe === '6M') {
      cutoffSec = lastSec - 180 * 86400
    } else if (timeframe === '1Y') {
      cutoffSec = lastSec - 365 * 86400
    } else if (timeframe === '2Y') {
      cutoffSec = lastSec - 2 * 365 * 86400
    } else if (timeframe === '3Y') {
      cutoffSec = lastSec - 3 * 365 * 86400
    } else {
      cutoffSec = 0
    }

    const filtered = timeline.filter((p) => p.timestamp >= cutoffSec)
    // Đảm bảo không quá 200 điểm vẽ để biểu đồ mượt mà nhất
    if (filtered.length <= 160) return filtered
    const step = Math.ceil(filtered.length / 160)
    return filtered.filter((_, idx) => idx % step === 0 || idx === filtered.length - 1)
  }, [data, timeframe])

  if (loading) {
    return (
      <div className="w-full h-80 rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center justify-center gap-3 animate-pulse">
        <Target className="size-8 text-primary/40 animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Đang tổng hợp dữ liệu giá khuyến nghị CTCK...</span>
      </div>
    )
  }

  if (!data || !data.timeline || data.timeline.length === 0 || !data.consensusTargetPrice) {
    return null
  }

  const {
    currentPrice,
    consensusTargetPrice,
    upsidePercent,
    highestTarget,
    lowestTarget,
    activeBrokersCount,
    recommendationSummary,
    latestReports,
  } = data

  const isUpside = upsidePercent != null && upsidePercent > 0

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5">
      {/* ── HEADER & BỘ LỌC ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Target className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                GIÁ KHUYẾN NGHỊ & MỤC TIÊU CTCK
              </h3>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10.5px] font-black text-primary">
                Đồng Thuận
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              So sánh thị giá thực tế với Giá mục tiêu trung bình do các Công ty Chứng khoán phân tích
            </p>
          </div>
        </div>

        {/* Khung thời gian */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
          {(['6M', '1Y', '2Y', '3Y', 'ALL'] as Timeframe[]).map((tf) => (
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

      {/* ── 4 THẺ CHỈ SỐ TỔNG QUAN ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Giá mục tiêu TB */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>Mục Tiêu TB</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-500">
            {fmtPrice(consensusTargetPrice)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Từ <strong className="text-foreground">{activeBrokersCount}</strong> CTCK theo dõi
          </div>
        </div>

        {/* Card 2: Thị giá hiện tại */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Thị Giá Hiện Tại</span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-foreground">
            {fmtPrice(currentPrice)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Mã <strong className="text-foreground">{symbol}</strong>
          </div>
        </div>

        {/* Card 3: Dư địa tăng giá */}
        <div
          className={cn(
            'rounded-xl border p-3 sm:p-4 space-y-1',
            isUpside
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-rose-500/30 bg-rose-500/5'
          )}
        >
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            {isUpside ? <TrendingUp className="size-3.5 text-emerald-500" /> : <TrendingDown className="size-3.5 text-rose-500" />}
            <span>Dư Địa Tăng Trưởng</span>
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black font-mono',
              isUpside ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            )}
          >
            {upsidePercent != null ? `${upsidePercent > 0 ? '+' : ''}${upsidePercent}%` : '—'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {isUpside ? 'Kỳ vọng tăng so với thị giá' : 'Thị giá vượt mục tiêu'}
          </div>
        </div>

        {/* Card 4: Tỷ lệ khuyến nghị */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="size-3.5 text-primary" />
            <span>Đồng Thuận Phân Tích</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-black text-emerald-400">
              {recommendationSummary.buy} MUA
            </span>
            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-black text-amber-400">
              {recommendationSummary.hold} GIỮ
            </span>
            {recommendationSummary.sell > 0 && (
              <span className="rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-xs font-black text-rose-400">
                {recommendationSummary.sell} BÁN
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Biên độ: {fmtNum(lowestTarget)} - {fmtNum(highestTarget)} đ
          </div>
        </div>
      </div>

      {/* ── BIỂU ĐỒ CHÍNH RECHARTS ── */}
      <div className="h-[300px] sm:h-[340px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredTimeline} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCurrentPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const pt = payload[0]?.payload as TargetPriceTimelinePoint
                if (!pt) return null
                return (
                  <div className="rounded-xl border border-border/80 bg-slate-950/95 p-3 shadow-xl text-xs space-y-2 max-w-[280px]">
                    <div className="font-mono font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{pt.date}</span>
                      {pt.upsidePercent != null && (
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded text-[10px] font-mono font-black',
                            pt.upsidePercent >= 0
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          )}
                        >
                          Dư địa: {pt.upsidePercent > 0 ? '+' : ''}{pt.upsidePercent}%
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center justify-between text-amber-400 font-bold">
                        <span>Giá mục tiêu TB:</span>
                        <span>{fmtPrice(pt.targetPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Thị giá thực tế:</span>
                        <span>{fmtPrice(pt.marketPrice)}</span>
                      </div>
                    </div>

                    {/* Báo cáo CTCK ra trong ngày này nếu có */}
                    {pt.reportsOnDate && pt.reportsOnDate.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Báo cáo phát hành:
                        </span>
                        {pt.reportsOnDate.map((rep, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-bold text-primary">{rep.source}:</span>
                            <span className="font-mono text-amber-400 font-bold">{fmtPrice(rep.targetPrice)}</span>
                            {rep.recommendation && (
                              <span className="text-[9.5px] px-1 rounded bg-slate-800 text-slate-300 font-semibold">
                                {rep.recommendation}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {/* Vùng diện tích thị giá */}
            <Area
              type="monotone"
              dataKey="marketPrice"
              name="Giá hiện tại"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorCurrentPrice)"
            />

            {/* Đường bậc thang giá mục tiêu trung bình (WiData style) */}
            <Line
              type="stepAfter"
              dataKey="targetPrice"
              name="Giá mục tiêu trung bình"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#f97316', stroke: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── CHÚ THÍCH (LEGEND) PHONG CÁCH WIDATA ── */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-border/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-500" />
          <span className="font-semibold text-muted-foreground">Giá mục tiêu trung bình (CTCK)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-muted-foreground">Giá hiện tại</span>
        </div>
        <div className="text-[11px] text-muted-foreground italic">
          (Khoảng trống màu xanh biểu thị Dư địa tăng giá tiềm năng)
        </div>
      </div>
    </div>
  )
}
