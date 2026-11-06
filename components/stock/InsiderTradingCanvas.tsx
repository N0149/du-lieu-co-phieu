'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineSeries,
  Time,
  createSeriesMarkers,
  SeriesMarker,
} from 'lightweight-charts'
import type { DailyPricePoint } from '@/lib/stock-price-history-service'
import type { InsiderTradeItem } from '@/lib/company-profile-types'
import { cn } from '@/lib/utils'

interface MatchedTrade {
  trade: InsiderTradeItem
  matchedDate: string
  price: number
  isBuy: boolean
}

interface InsiderTradingCanvasProps {
  prices: DailyPricePoint[]
  trades: MatchedTrade[]
  height?: number
  symbol: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN')
}

// Chuyển chuỗi ngày DD/MM/YYYY hoặc timestamp sang YYYY-MM-DD
function toYmd(dateStr: string, timeSec?: number): string {
  if (dateStr && dateStr.includes('/')) {
    const p = dateStr.split('/')
    if (p.length === 3) {
      return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
    }
  }
  if (timeSec) {
    const d = new Date(timeSec * 1000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return dateStr || ''
}

export function InsiderTradingCanvas({
  prices,
  trades,
  height = 350,
  symbol,
}: InsiderTradingCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [activePrice, setActivePrice] = useState<number | null>(null)

  // Map theo YYYY-MM-DD để tra cứu giao dịch và giá
  const dateTradeMap = useMemo(() => {
    const map = new Map<string, MatchedTrade[]>()
    for (const t of trades) {
      const ymd = toYmd(t.matchedDate)
      if (!map.has(ymd)) {
        map.set(ymd, [])
      }
      map.get(ymd)!.push(t)
    }
    return map
  }, [trades])

  // Chuẩn bị dữ liệu đường giá và sắp xếp tăng dần
  const sortedPriceData = useMemo(() => {
    const list: Array<{ time: Time; value: number; rawDate: string }> = []
    for (const p of prices) {
      if (p.close != null && !isNaN(p.close)) {
        const ymd = toYmd(p.date, p.time)
        list.push({ time: ymd as Time, value: p.close, rawDate: p.date })
      }
    }
    list.sort((a, b) => String(a.time).localeCompare(String(b.time)))

    // Loại bỏ điểm trùng thời gian
    const unique: typeof list = []
    for (const item of list) {
      if (!unique.length || unique[unique.length - 1].time !== item.time) {
        unique.push(item)
      }
    }
    return unique
  }, [prices])

  // Chuẩn bị markers cho các giao dịch nội bộ
  const markers = useMemo(() => {
    const result: SeriesMarker<Time>[] = []
    const processedDates = new Set<string>()

    // Sắp xếp trades theo ngày
    const sortedTrades = [...trades].sort((a, b) => {
      const ymdA = toYmd(a.matchedDate)
      const ymdB = toYmd(b.matchedDate)
      return ymdA.localeCompare(ymdB)
    })

    for (const item of sortedTrades) {
      const ymd = toYmd(item.matchedDate)
      if (!ymd) continue

      // Tránh lặp nhiều marker cùng ngày làm đè chữ
      const dayTrades = dateTradeMap.get(ymd) || [item]
      const hasBuy = dayTrades.some((t) => t.isBuy)
      const hasSell = dayTrades.some((t) => !t.isBuy)

      if (!processedDates.has(ymd)) {
        processedDates.add(ymd)

        if (hasBuy && hasSell) {
          result.push({
            time: ymd as Time,
            position: 'aboveBar',
            color: '#f59e0b',
            shape: 'circle',
            text: `M/B (${dayTrades.length})`,
            size: 1.2,
          })
        } else if (hasBuy) {
          result.push({
            time: ymd as Time,
            position: 'belowBar',
            color: '#10b981',
            shape: 'arrowUp',
            text: dayTrades.length > 1 ? `MUA (${dayTrades.length})` : 'MUA',
            size: 1.2,
          })
        } else {
          result.push({
            time: ymd as Time,
            position: 'aboveBar',
            color: '#f43f5e',
            shape: 'arrowDown',
            text: dayTrades.length > 1 ? `BÁN (${dayTrades.length})` : 'BÁN',
            size: 1.2,
          })
        }
      }
    }

    return result
  }, [trades, dateTradeMap])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      width: el.clientWidth || 600,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9EACB9',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: false,
        secondsVisible: false,
      },
    })

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#0ea5e9',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => `${Math.round(val / 1000)}k`,
      },
    })

    lineSeries.setData(sortedPriceData)

    // Đính các điểm markers giao dịch lên đường giá
    if (markers.length > 0) {
      createSeriesMarkers(lineSeries, markers)
    }

    chart.timeScale().fitContent()

    chartRef.current = chart
    lineSeriesRef.current = lineSeries

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setActiveDate(null)
        setActivePrice(null)
        return
      }

      const timeStr = String(param.time)
      setActiveDate(timeStr)

      const sData = param.seriesData.get(lineSeries) as { value?: number } | undefined
      if (sData?.value != null) {
        setActivePrice(sData.value)
      } else {
        setActivePrice(null)
      }
    })

    const ro = new ResizeObserver((entries) => {
      if (!entries.length || !chartRef.current) return
      const cr = entries[0].contentRect
      if (cr.width > 0) {
        chartRef.current.applyOptions({ width: cr.width })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [sortedPriceData, markers, height])

  // Giao dịch phát sinh vào ngày đang active
  const activeDayTrades = activeDate ? dateTradeMap.get(activeDate) || [] : []
  const lastPoint = sortedPriceData.length > 0 ? sortedPriceData[sortedPriceData.length - 1] : null
  const displayDate = activeDate || (lastPoint ? String(lastPoint.time) : '')
  const displayPrice = activePrice ?? (lastPoint ? lastPoint.value : null)

  return (
    <div className="relative w-full space-y-2">
      {/* Header trạng thái tương tác */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-foreground">{displayDate}</span>
          {activeDayTrades.length > 0 && (
            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-black text-amber-400">
              {activeDayTrades.length} Giao dịch nội bộ
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#0ea5e9]" />
            <span className="text-muted-foreground">Thị giá {symbol}:</span>
            <span className="font-bold text-[#0ea5e9]">{fmtPrice(displayPrice)}</span>
          </div>
        </div>
      </div>

      {/* Hiển thị chi tiết giao dịch nội bộ nếu trỏ trúng ngày đó */}
      {activeDayTrades.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs space-y-1.5">
          <div className="font-extrabold uppercase tracking-wider text-amber-400 text-[11px]">
            Chi tiết giao dịch nội bộ ngày {displayDate}:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeDayTrades.map((item, idx) => {
              const t = item.trade
              return (
                <div key={idx} className="rounded-lg bg-card/80 border border-border/80 p-2 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">{t.traderName}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded text-[10.5px] font-black',
                        item.isBuy
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      )}
                    >
                      {item.isBuy ? 'MUA' : 'BÁN'}: {fmtNum(t.volumeTraded || t.volumeRegistered)} CP
                    </span>
                  </div>
                  {t.traderPosition && (
                    <div className="text-[10px] text-muted-foreground">{t.traderPosition}</div>
                  )}
                  <div className="text-[10px] font-mono text-muted-foreground">
                    Ngày công bố: {t.tradeDate}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div ref={containerRef} className="w-full overflow-hidden" style={{ height: `${height}px` }} />
    </div>
  )
}
