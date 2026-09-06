'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts'
import type { InsiderTradeItem } from '@/lib/company-profile-types'
import type { StockPriceHistoryPayload, DailyPricePoint } from '@/lib/stock-price-history-service'
import { History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, UserCheck, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsiderTradingPriceChartProps {
  symbol: string
  trades?: InsiderTradeItem[]
  initialPricePayload?: StockPriceHistoryPayload | null
}

type Timeframe = '6M' | '1Y' | '2Y' | '3Y' | 'ALL'
type TradeFilter = 'ALL' | 'BUY' | 'SELL'

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

// Chuyển chuỗi ngày DD/MM/YYYY sang unix timestamp seconds
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

export function InsiderTradingPriceChart({
  symbol,
  trades = [],
  initialPricePayload,
}: InsiderTradingPriceChartProps) {
  const [tradeList, setTradeList] = useState<InsiderTradeItem[]>(trades)
  const [pricePayload, setPricePayload] = useState<StockPriceHistoryPayload | null>(
    initialPricePayload || null
  )
  const [loading, setLoading] = useState(!initialPricePayload || (!trades || trades.length === 0))
  const [timeframe, setTimeframe] = useState<Timeframe>('2Y')
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>('ALL')

  useEffect(() => {
    if (trades && trades.length > 0) {
      setTradeList(trades)
    } else {
      fetch(`/api/stock/${encodeURIComponent(symbol)}/insider`)
        .then((res) => res.json())
        .then((d) => {
          if (Array.isArray(d?.trades)) {
            setTradeList(d.trades)
          }
        })
        .catch(() => {})
    }
  }, [symbol, trades])

  useEffect(() => {
    if (initialPricePayload) {
      setPricePayload(initialPricePayload)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/stock/${encodeURIComponent(symbol)}/prices?years=3`)
      .then((res) => {
        if (!res.ok) throw new Error('Không lấy được giá')
        return res.json()
      })
      .then((data) => {
        setPricePayload(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [symbol, initialPricePayload])

  // Lọc chuỗi giá theo timeframe
  const filteredPrices = useMemo(() => {
    if (!pricePayload?.points || pricePayload.points.length === 0) return []
    const pts = pricePayload.points
    const lastSec = pts[pts.length - 1].time

    let cutoffSec = 0
    if (timeframe === '6M') cutoffSec = lastSec - 180 * 86400
    else if (timeframe === '1Y') cutoffSec = lastSec - 365 * 86400
    else if (timeframe === '2Y') cutoffSec = lastSec - 2 * 365 * 86400
    else if (timeframe === '3Y') cutoffSec = lastSec - 3 * 365 * 86400
    else cutoffSec = 0

    const list = pts.filter((p) => p.time >= cutoffSec)
    if (list.length <= 160) return list
    const step = Math.ceil(list.length / 160)
    return list.filter((_, i) => i % step === 0 || i === list.length - 1)
  }, [pricePayload, timeframe])

  // Ghép các giao dịch nội bộ vào các điểm ngày trên biểu đồ giá
  const tradesWithPoints = useMemo(() => {
    if (!tradeList || tradeList.length === 0 || filteredPrices.length === 0) return []

    const validTrades = tradeList.filter((t) => {
      if (tradeFilter === 'BUY') return t.action === 'BUY'
      if (tradeFilter === 'SELL') return t.action === 'SELL'
      return t.action === 'BUY' || t.action === 'SELL'
    })

    const results: Array<{
      trade: InsiderTradeItem
      matchedDate: string
      price: number
      isBuy: boolean
    }> = []

    for (const trade of validTrades) {
      const tradeSec = parseDateStrToSec(trade.tradeDate)
      if (!tradeSec) continue

      // Tìm điểm giá gần nhất với ngày giao dịch
      let closestPt = filteredPrices[0]
      let minDiff = Math.abs(closestPt.time - tradeSec)

      for (const pt of filteredPrices) {
        const diff = Math.abs(pt.time - tradeSec)
        if (diff < minDiff) {
          minDiff = diff
          closestPt = pt
        }
      }

      // Chỉ ghép nếu sai lệch không quá 7 ngày
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
  }, [tradeList, filteredPrices, tradeFilter])

  // Thống kê nhanh giao dịch nội bộ
  const buyTrades = tradeList.filter((t) => t.action === 'BUY')
  const sellTrades = tradeList.filter((t) => t.action === 'SELL')
  const totalBuyVol = buyTrades.reduce((acc, c) => acc + (c.volumeTraded || c.volumeRegistered || 0), 0)
  const totalSellVol = sellTrades.reduce((acc, c) => acc + (c.volumeTraded || c.volumeRegistered || 0), 0)

  if (loading) {
    return (
      <div className="w-full h-72 rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center justify-center gap-3 animate-pulse">
        <History className="size-8 text-primary/40 animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Đang chuẩn bị biểu đồ giao dịch nội bộ...</span>
      </div>
    )
  }

  if (filteredPrices.length === 0) return null

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5">
      {/* ── HEADER & BỘ LỌC ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500">
            <History className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-foreground">
                GIAO DỊCH NỘI BỘ QUA THỜI GIAN
              </h3>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10.5px] font-black text-primary">
                Trực Quan
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Vị trí điểm Mua / Bán của ban lãnh đạo và người nội bộ đính trực tiếp trên diễn biến giá
            </p>
          </div>
        </div>

        {/* Lọc hành vi & Khung thời gian */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc Mua/Bán */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setTradeFilter('ALL')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                tradeFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setTradeFilter('BUY')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                tradeFilter === 'BUY'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-emerald-500 hover:text-emerald-400'
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span>Mua ({buyTrades.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTradeFilter('SELL')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                tradeFilter === 'SELL'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-rose-500 hover:text-rose-400'
              )}
            >
              <span className="size-1.5 rounded-full bg-rose-400" />
              <span>Bán ({sellTrades.length})</span>
            </button>
          </div>

          {/* Lọc Timeframe */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
            {(['6M', '1Y', '2Y', '3Y', 'ALL'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
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

      {/* ── THỐNG KÊ TỔNG LƯỢNG MUA / BÁN CỦA LÃNH ĐẠO ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Tổng Lãnh Đạo Mua</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-500 dark:text-emerald-400">
            {fmtNum(totalBuyVol)} CP
          </div>
          <div className="text-[11px] text-muted-foreground">
            {buyTrades.length} lượt giao dịch mua
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" />
            <span>Tổng Lãnh Đạo Bán</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-500 dark:text-rose-400">
            {fmtNum(totalSellVol)} CP
          </div>
          <div className="text-[11px] text-muted-foreground">
            {sellTrades.length} lượt giao dịch bán
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Tín Hiệu Hành Động</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-foreground">
            {totalBuyVol > totalSellVol ? (
              <span className="text-emerald-500">MUA RÒNG +{fmtNum(totalBuyVol - totalSellVol)} CP</span>
            ) : totalSellVol > totalBuyVol ? (
              <span className="text-rose-500">BÁN RÒNG -{fmtNum(totalSellVol - totalBuyVol)} CP</span>
            ) : (
              <span>CÂN BẰNG</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Tổng {trades.length} giao dịch gần nhất
          </div>
        </div>
      </div>

      {/* ── BIỂU ĐỒ ĐƯỜNG GIÁ KÈM REFERENCE DOTS ── */}
      <div className="h-[300px] sm:h-[350px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredPrices} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
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
                const pt = payload[0]?.payload as DailyPricePoint
                if (!pt) return null

                // Tìm các giao dịch nội bộ gắn với ngày này
                const dayTrades = tradesWithPoints.filter((t) => t.matchedDate === pt.date)

                return (
                  <div className="rounded-xl border border-border/80 bg-slate-950/95 p-3 shadow-xl text-xs space-y-2 max-w-[300px]">
                    <div className="font-mono font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{pt.date}</span>
                      <span className="text-primary font-bold">Thị giá: {fmtPrice(pt.close)}</span>
                    </div>

                    {dayTrades.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10.5px] font-extrabold uppercase text-amber-400">
                          {dayTrades.length} Giao dịch nội bộ ghi nhận:
                        </span>
                        {dayTrades.map((item, idx) => {
                          const t = item.trade
                          return (
                            <div key={idx} className="rounded-lg bg-slate-900 border border-slate-800 p-2 space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-200">{t.traderName}</span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.2 rounded text-[10px] font-black',
                                    item.isBuy
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  )}
                                >
                                  {item.isBuy ? 'MUA' : 'BÁN'}: {fmtNum(t.volumeTraded || t.volumeRegistered)} CP
                                </span>
                              </div>
                              {t.traderPosition && (
                                <div className="text-[10px] text-slate-400">{t.traderPosition}</div>
                              )}
                              <div className="text-[10px] font-mono text-slate-400">
                                Ngày công bố/kết thúc: {t.tradeDate}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground italic">
                        Không có giao dịch nội bộ trong phiên này
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {/* Đường giá thị trường */}
            <Line
              type="monotone"
              dataKey="close"
              name="Giá hiện tại"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff' }}
            />

            {/* Các điểm đính giao dịch nội bộ trên đường giá (Chấm tròn WiData) */}
            {tradesWithPoints.map((item, idx) => {
              const color = item.isBuy ? '#10b981' : '#f43f5e'
              return (
                <ReferenceDot
                  key={idx}
                  x={item.matchedDate}
                  y={item.price}
                  r={5.5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── CHÚ THÍCH (LEGEND) CHUẨN WIDATA ── */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-border/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
          <span className="font-semibold text-foreground">Mua (Ban lãnh đạo / Cổ đông lớn)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 shadow-xs" />
          <span className="font-semibold text-foreground">Bán (Ban lãnh đạo / Cổ đông lớn)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-[#0ea5e9] rounded" />
          <span className="font-semibold text-muted-foreground">Giá hiện tại ({symbol})</span>
        </div>
      </div>
    </div>
  )
}
