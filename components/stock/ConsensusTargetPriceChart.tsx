'use client'

import React, { useState, useMemo, useEffect } from 'react'
import type { ConsensusTargetPayload } from '@/lib/consensus-target-price-service'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConsensusTargetCanvas } from './ConsensusTargetCanvas'

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

    return timeline.filter((p) => p.timestamp >= cutoffSec)
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

      {/* ── BIỂU ĐỒ CHÍNH LIGHTWEIGHT CHARTS (CANVAS GPU) ── */}
      <div className="w-full pt-2">
        <ConsensusTargetCanvas timeline={filteredTimeline} height={340} symbol={symbol} />
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
