'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts'
import {
  Calendar,
  Maximize2,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsiderTradeItem } from '@/lib/company-profile-types'
import type { ValuationEpsPayload, ValuationEpsPoint } from '@/lib/valuation-eps-service'
import type { ConsensusTargetPayload, TargetPriceTimelinePoint } from '@/lib/consensus-target-price-service'
import type { StockPriceHistoryPayload, DailyPricePoint } from '@/lib/stock-price-history-service'

interface WiDataStandardRowProps {
  symbol: string
  insiderTrades?: InsiderTradeItem[]
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

function parseDateStrToSec(dStr: string): number {
  if (!dStr) return 0
  const parts = dStr.split('/')
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime() / 1000
  }
  if (dStr.includes('-')) {
    const p = dStr.split('-')
    if (p.length === 3) {
      return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).getTime() / 1000
    }
  }
  return 0
}

/* ════════════════════════════════════════════════════════════════
   CARD 1: ĐỊNH GIÁ (CHUẨN WIDATA 100%)
   ════════════════════════════════════════════════════════════════ */
function WiDataValuationCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ValuationEpsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'day' | 'quarter'>('day')

  useEffect(() => {
    setMounted(true)
    let cancelled = false
    fetch(`/api/stock/${encodeURIComponent(symbol)}/valuation-eps?years=3`)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  const chartPoints = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return []
    const pts = data.timeline
    if (pts.length <= 120) return pts
    const step = Math.ceil(pts.length / 120)
    return pts.filter((_, idx) => idx % step === 0 || idx === pts.length - 1)
  }, [data])

  return (
    <div className="flex flex-col rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-4 shadow-sm transition-all hover:border-[#2d3d5a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            ĐỊNH GIÁ
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <div className="flex items-center gap-1 rounded bg-[#161f30] px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-[#223048]">
            <span>{mode === 'day' ? 'Ngày' : 'Quý'}</span>
            <ChevronDown className="size-3 text-slate-400" />
          </div>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Lịch">
            <Calendar className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Phóng to">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Cài đặt">
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body Chart với Chiều Cao Cố Định 240px */}
      <div className="h-[240px] w-full relative">
        {!mounted || loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 animate-pulse">
            Đang tải dữ liệu Định giá...
          </div>
        ) : chartPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="wdValuationFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#475569" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#1e293b" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} minTickGap={25} />
              <YAxis
                tick={{ fontSize: 9, fill: '#64748b' }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `${Math.round(val / 1000)}K`}
              />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const pt = payload[0]?.payload as ValuationEpsPoint
                  if (!pt) return null
                  return (
                    <div className="rounded-lg border border-[#2d3d5a] bg-[#0c1017] p-2 shadow-xl text-[11px] font-mono space-y-1 text-slate-200">
                      <div className="text-slate-400 border-b border-slate-800 pb-0.5">{pt.date}</div>
                      <div className="flex justify-between gap-3 text-indigo-400 font-bold">
                        <span>Giá đóng cửa:</span>
                        <span>{fmtPrice(pt.price)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-300">
                        <span>Định giá P/E:</span>
                        <span>{fmtPrice(pt.fairPricePe)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-emerald-400">
                        <span>EPS (TTM):</span>
                        <span>{fmtPrice(pt.eps)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              {/* Stepped Area EPS / Định giá */}
              <Area
                type="stepAfter"
                dataKey="fairPricePe"
                name="EPS"
                stroke="#94a3b8"
                strokeWidth={1.8}
                fill="url(#wdValuationFill)"
                isAnimationActive={false}
              />
              {/* Line Thị Giá */}
              <Line
                type="monotone"
                dataKey="price"
                name="P/E"
                stroke="#3b82f6"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Không có dữ liệu định giá
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-start gap-5 pt-2 border-t border-[#1b2334] text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 bg-slate-600 border border-slate-400 rounded-xs inline-block" />
          <span className="font-medium text-slate-300">EPS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-[#3b82f6] rounded inline-block" />
          <span className="font-medium text-slate-300">P/E</span>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   CARD 2: GIÁ KHUYẾN NGHỊ (CHUẨN WIDATA 100%)
   ════════════════════════════════════════════════════════════════ */
function WiDataConsensusCard({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ConsensusTargetPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    let cancelled = false
    fetch(`/api/stock/${encodeURIComponent(symbol)}/consensus`)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  const chartPoints = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return []
    const pts = data.timeline
    if (pts.length <= 120) return pts
    const step = Math.ceil(pts.length / 120)
    return pts.filter((_, idx) => idx % step === 0 || idx === pts.length - 1)
  }, [data])

  return (
    <div className="flex flex-col rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-4 shadow-sm transition-all hover:border-[#2d3d5a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            GIÁ KHUYẾN NGHỊ
          </span>
          {data?.upsidePercent != null && (
            <span
              className={cn(
                'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded',
                data.upsidePercent >= 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              )}
            >
              {data.upsidePercent > 0 ? '+' : ''}
              {data.upsidePercent}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Lịch">
            <Calendar className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Phóng to">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Cài đặt">
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body Chart với Chiều Cao Cố Định 240px */}
      <div className="h-[240px] w-full relative">
        {!mounted || loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 animate-pulse">
            Đang tải giá mục tiêu CTCK...
          </div>
        ) : chartPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="wdTargetGreenArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} minTickGap={25} />
              <YAxis
                tick={{ fontSize: 9, fill: '#64748b' }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `${Math.round(val / 1000)}K`}
              />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const pt = payload[0]?.payload as TargetPriceTimelinePoint
                  if (!pt) return null
                  return (
                    <div className="rounded-lg border border-[#2d3d5a] bg-[#0c1017] p-2 shadow-xl text-[11px] font-mono space-y-1 text-slate-200">
                      <div className="text-slate-400 border-b border-slate-800 pb-0.5">{pt.date}</div>
                      <div className="flex justify-between gap-3 text-amber-500 font-bold">
                        <span>Giá mục tiêu TB:</span>
                        <span>{fmtPrice(pt.targetPrice)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-emerald-400 font-bold">
                        <span>Giá hiện tại:</span>
                        <span>{fmtPrice(pt.marketPrice)}</span>
                      </div>
                      {pt.upsidePercent != null && (
                        <div className="text-[10px] text-slate-300">
                          Dư địa: {pt.upsidePercent > 0 ? '+' : ''}
                          {pt.upsidePercent}%
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              {/* Vùng Giá hiện tại (Green area) */}
              <Area
                type="monotone"
                dataKey="marketPrice"
                name="Giá hiện tại"
                stroke="#10b981"
                strokeWidth={1.8}
                fill="url(#wdTargetGreenArea)"
                isAnimationActive={false}
              />
              {/* Đường Giá mục tiêu trung bình (Orange stepped line) */}
              <Line
                type="stepAfter"
                dataKey="targetPrice"
                name="Giá mục tiêu trung bình"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Chưa có dữ liệu khuyến nghị
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-start gap-5 pt-2 border-t border-[#1b2334] text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#f97316]" />
          <span className="font-medium text-slate-300">Giá mục tiêu trung bình</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#10b981]" />
          <span className="font-medium text-slate-300">Giá hiện tại</span>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   CARD 3: GIAO DỊCH NỘI BỘ QUA THỜI GIAN (CHUẨN WIDATA 100%)
   ════════════════════════════════════════════════════════════════ */
function WiDataInsiderCard({
  symbol,
  trades: propsTrades = [],
}: {
  symbol: string
  trades?: InsiderTradeItem[]
}) {
  const [tradeList, setTradeList] = useState<InsiderTradeItem[]>(propsTrades)
  const [pricePayload, setPricePayload] = useState<StockPriceHistoryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    let cancelled = false
    if (propsTrades && propsTrades.length > 0) {
      setTradeList(propsTrades)
    } else {
      fetch(`/api/stock/${encodeURIComponent(symbol)}/insider`)
        .then((res) => res.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d?.trades)) {
            setTradeList(d.trades)
          }
        })
        .catch(() => {})
    }

    fetch(`/api/stock/${encodeURIComponent(symbol)}/prices?years=3`)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) {
          setPricePayload(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [symbol, propsTrades])

  const filteredPrices = useMemo(() => {
    if (!pricePayload?.points || pricePayload.points.length === 0) return []
    const pts = pricePayload.points
    if (pts.length <= 120) return pts
    const step = Math.ceil(pts.length / 120)
    return pts.filter((_, idx) => idx % step === 0 || idx === pts.length - 1)
  }, [pricePayload])

  // Map điểm giao dịch
  const tradesWithPoints = useMemo(() => {
    if (!tradeList || tradeList.length === 0 || filteredPrices.length === 0) return []

    const validTrades = tradeList.filter((t) => t.action === 'BUY' || t.action === 'SELL')
    const results: Array<{
      trade: InsiderTradeItem
      matchedDate: string
      price: number
      isBuy: boolean
    }> = []

    for (const trade of validTrades) {
      const tradeSec = parseDateStrToSec(trade.tradeDate)
      if (!tradeSec) continue

      let closestPt = filteredPrices[0]
      let minDiff = Math.abs(closestPt.time - tradeSec)
      for (const pt of filteredPrices) {
        const diff = Math.abs(pt.time - tradeSec)
        if (diff < minDiff) {
          minDiff = diff
          closestPt = pt
        }
      }

      if (minDiff <= 7 * 86400) {
        results.push({
          trade,
          matchedDate: closestPt.date,
          price: closestPt.close,
          isBuy: trade.action === 'BUY',
        })
      }
    }
    return results
  }, [tradeList, filteredPrices])

  return (
    <div className="flex flex-col rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-4 shadow-sm transition-all hover:border-[#2d3d5a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            GIAO DỊCH NỘI BỘ QUA THỜI GIAN
          </span>
          {tradesWithPoints.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold">
              {tradesWithPoints.length} điểm
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Phóng to">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Cài đặt">
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body Chart với Chiều Cao Cố Định 240px */}
      <div className="h-[240px] w-full relative">
        {!mounted || loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 animate-pulse">
            Đang tải dữ liệu giao dịch nội bộ...
          </div>
        ) : filteredPrices.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={filteredPrices} margin={{ top: 15, right: 10, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} minTickGap={25} />
              <YAxis
                tick={{ fontSize: 9, fill: '#64748b' }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `${Math.round(val / 1000)}K`}
              />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const pt = payload[0]?.payload as DailyPricePoint
                  if (!pt) return null
                  const dayTrades = tradesWithPoints.filter((t) => t.matchedDate === pt.date)
                  return (
                    <div className="rounded-lg border border-[#2d3d5a] bg-[#0c1017] p-2 shadow-xl text-[11px] font-mono space-y-1 text-slate-200 max-w-[240px]">
                      <div className="text-slate-400 border-b border-slate-800 pb-0.5 flex justify-between">
                        <span>{pt.date}</span>
                        <span className="text-cyan-400 font-bold">{fmtPrice(pt.close)}</span>
                      </div>
                      {dayTrades.length > 0 ? (
                        dayTrades.map((item, idx) => (
                          <div key={idx} className="pt-0.5">
                            <span className={cn('font-bold', item.isBuy ? 'text-emerald-400' : 'text-rose-400')}>
                              {item.isBuy ? '● MUA: ' : '● BÁN: '}
                              {fmtNum(item.trade.volumeTraded || item.trade.volumeRegistered)} CP
                            </span>
                            <div className="text-[10px] text-slate-300 truncate">{item.trade.traderName}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-500 italic">Không có GD nội bộ</div>
                      )}
                    </div>
                  )
                }}
              />
              {/* Line Thị Giá */}
              <Line
                type="monotone"
                dataKey="close"
                name="Giá hiện tại"
                stroke="#0ea5e9"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
              {/* Các điểm Mua / Bán */}
              {tradesWithPoints.map((item, idx) => (
                <ReferenceDot
                  key={idx}
                  x={item.matchedDate}
                  y={item.price}
                  r={5}
                  fill={item.isBuy ? '#10b981' : '#f97316'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Chưa có dữ liệu giá & giao dịch
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-start gap-5 pt-2 border-t border-[#1b2334] text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#10b981]" />
          <span className="font-medium text-slate-300">Mua</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#f97316]" />
          <span className="font-medium text-slate-300">Bán</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-[#0ea5e9] rounded inline-block" />
          <span className="font-medium text-slate-300">Giá hiện tại</span>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   MASTER COMPONENT: HÀNG 3 BIỂU ĐỒ WIDATA CHUẨN (3 CỘT ĐỀU NHAU)
   ════════════════════════════════════════════════════════════════ */
export function WiDataStandardRow({
  symbol,
  insiderTrades = [],
}: WiDataStandardRowProps) {
  return (
    <div className="space-y-3 pt-3 pb-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="size-2 rounded-full bg-cyan-400" />
          <span>Định Giá & Giao Dịch Thị Trường (Chuẩn Hóa)</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">3 Biểu đồ đồng bộ</span>
      </div>

      {/* Grid 3 Cột luôn giữ 3 cột trên màn hình desktop (md:grid-cols-3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        <WiDataValuationCard symbol={symbol} />
        <WiDataConsensusCard symbol={symbol} />
        <WiDataInsiderCard symbol={symbol} trades={insiderTrades} />
      </div>
    </div>
  )
}
