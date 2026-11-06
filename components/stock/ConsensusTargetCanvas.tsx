'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineType,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  LineSeries,
  Time,
} from 'lightweight-charts'
import type { TargetPriceTimelinePoint } from '@/lib/consensus-target-price-service'
import { cn } from '@/lib/utils'

interface ConsensusTargetCanvasProps {
  timeline: TargetPriceTimelinePoint[]
  height?: number
  symbol: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

export function ConsensusTargetCanvas({
  timeline,
  height = 340,
  symbol,
}: ConsensusTargetCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [activePoint, setActivePoint] = useState<TargetPriceTimelinePoint | null>(null)

  // Map theo chuỗi ngày YYYY-MM-DD để tra cứu nhanh khi di chuột
  const pointMap = useMemo(() => {
    const map = new Map<string, TargetPriceTimelinePoint>()
    for (const pt of timeline) {
      if (pt.date) {
        // Chuyển DD/MM/YYYY sang YYYY-MM-DD nếu cần
        let timeKey = pt.date
        if (pt.date.includes('/')) {
          const parts = pt.date.split('/')
          if (parts.length === 3) {
            timeKey = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          }
        }
        map.set(timeKey, pt)
      }
    }
    return map
  }, [timeline])

  // Chuẩn hóa dữ liệu theo chuẩn Time của Lightweight Charts và sắp xếp tăng dần
  const chartData = useMemo(() => {
    const marketData: Array<{ time: Time; value: number }> = []
    const targetData: Array<{ time: Time; value: number }> = []

    for (const pt of timeline) {
      let timeKey = pt.date
      if (pt.date.includes('/')) {
        const parts = pt.date.split('/')
        if (parts.length === 3) {
          timeKey = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }

      if (pt.marketPrice != null && !isNaN(pt.marketPrice)) {
        marketData.push({ time: timeKey as Time, value: pt.marketPrice })
      }
      if (pt.targetPrice != null && !isNaN(pt.targetPrice)) {
        targetData.push({ time: timeKey as Time, value: pt.targetPrice })
      }
    }

    // Sắp xếp tăng dần theo thời gian (bắt buộc cho Lightweight Charts)
    marketData.sort((a, b) => String(a.time).localeCompare(String(b.time)))
    targetData.sort((a, b) => String(a.time).localeCompare(String(b.time)))

    // Loại bỏ các mốc thời gian trùng lặp
    const uniqueMarket: typeof marketData = []
    for (const item of marketData) {
      if (!uniqueMarket.length || uniqueMarket[uniqueMarket.length - 1].time !== item.time) {
        uniqueMarket.push(item)
      }
    }

    const uniqueTarget: typeof targetData = []
    for (const item of targetData) {
      if (!uniqueTarget.length || uniqueTarget[uniqueTarget.length - 1].time !== item.time) {
        uniqueTarget.push(item)
      }
    }

    return { marketData: uniqueMarket, targetData: uniqueTarget }
  }, [timeline])

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
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: false,
        secondsVisible: false,
      },
    })

    // 1. Vùng diện tích thị giá (AreaSeries)
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.25)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => `${Math.round(val / 1000)}k`,
      },
    })

    // 2. Đường bậc thang giá mục tiêu trung bình (LineSeries with Steps)
    const lineSeries = chart.addSeries(LineSeries, {
      color: '#f97316',
      lineWidth: 2,
      lineType: LineType.WithSteps,
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => `${Math.round(val / 1000)}k`,
      },
    })

    areaSeries.setData(chartData.marketData)
    lineSeries.setData(chartData.targetData)

    chart.timeScale().fitContent()

    chartRef.current = chart
    areaSeriesRef.current = areaSeries
    lineSeriesRef.current = lineSeries

    // Crosshair hover listener
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setActivePoint(null)
        return
      }

      const timeStr = String(param.time)
      const matched = pointMap.get(timeStr)
      if (matched) {
        setActivePoint(matched)
      } else {
        // Lấy giá từ series nếu không map được date
        const marketVal = param.seriesData.get(areaSeries) as { value?: number } | undefined
        const targetVal = param.seriesData.get(lineSeries) as { value?: number } | undefined
        if (marketVal?.value != null || targetVal?.value != null) {
          setActivePoint({
            date: timeStr,
            timestamp: 0,
            marketPrice: marketVal?.value ?? 0,
            targetPrice: targetVal?.value ?? 0,
            upsidePercent:
              marketVal?.value && targetVal?.value
                ? Math.round(((targetVal.value - marketVal.value) / marketVal.value) * 100)
                : null,
          })
        } else {
          setActivePoint(null)
        }
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
  }, [chartData, height, pointMap])

  // Lấy điểm cuối cùng làm mặc định hiển thị
  const displayPoint = activePoint || (timeline.length > 0 ? timeline[timeline.length - 1] : null)

  return (
    <div className="relative w-full space-y-2">
      {/* Dynamic tracking header */}
      {displayPoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-foreground">{displayPoint.date}</span>
            {displayPoint.upsidePercent != null && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[11px] font-black',
                  displayPoint.upsidePercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                )}
              >
                Dư địa: {displayPoint.upsidePercent > 0 ? '+' : ''}
                {displayPoint.upsidePercent}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Thị giá:</span>
              <span className="font-bold text-emerald-400">{fmtPrice(displayPoint.marketPrice)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Mục tiêu TB:</span>
              <span className="font-bold text-amber-400">{fmtPrice(displayPoint.targetPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Reports popup on date if active */}
      {displayPoint?.reportsOnDate && displayPoint.reportsOnDate.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs flex flex-wrap items-center gap-3">
          <span className="font-bold uppercase tracking-wider text-amber-400 text-[10.5px]">
            Báo cáo CTCK ({displayPoint.date}):
          </span>
          {displayPoint.reportsOnDate.map((rep, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">{rep.source}:</span>
              <span className="font-mono font-bold text-amber-400">{fmtPrice(rep.targetPrice)}</span>
              {rep.recommendation && (
                <span className="rounded bg-muted/60 px-1 py-0.2 text-[10px] text-muted-foreground">
                  {rep.recommendation}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Canvas container */}
      <div ref={containerRef} className="w-full overflow-hidden" style={{ height: `${height}px` }} />
    </div>
  )
}
