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
import type { ValuationEpsPoint } from '@/lib/valuation-eps-service'

interface StockValuationEpsCanvasProps {
  timeline: ValuationEpsPoint[]
  viewMode: 'FAIR_PE' | 'EPS'
  medianPe?: number | null
  height?: number
  symbol: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' đ'
}

export function StockValuationEpsCanvas({
  timeline,
  viewMode,
  medianPe,
  height = 340,
  symbol,
}: StockValuationEpsCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [activePoint, setActivePoint] = useState<ValuationEpsPoint | null>(null)

  const pointMap = useMemo(() => {
    const map = new Map<string, ValuationEpsPoint>()
    for (const pt of timeline) {
      if (pt.date) {
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

  const chartData = useMemo(() => {
    const priceData: Array<{ time: Time; value: number }> = []
    const stepData: Array<{ time: Time; value: number }> = []

    for (const pt of timeline) {
      let timeKey = pt.date
      if (pt.date.includes('/')) {
        const parts = pt.date.split('/')
        if (parts.length === 3) {
          timeKey = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }

      if (pt.price != null && !isNaN(pt.price)) {
        priceData.push({ time: timeKey as Time, value: pt.price })
      }

      const stepVal = viewMode === 'FAIR_PE' ? pt.fairPricePe : pt.eps
      if (stepVal != null && !isNaN(stepVal)) {
        stepData.push({ time: timeKey as Time, value: stepVal })
      }
    }

    priceData.sort((a, b) => String(a.time).localeCompare(String(b.time)))
    stepData.sort((a, b) => String(a.time).localeCompare(String(b.time)))

    const uniquePrice: typeof priceData = []
    for (const item of priceData) {
      if (!uniquePrice.length || uniquePrice[uniquePrice.length - 1].time !== item.time) {
        uniquePrice.push(item)
      }
    }

    const uniqueStep: typeof stepData = []
    for (const item of stepData) {
      if (!uniqueStep.length || uniqueStep[uniqueStep.length - 1].time !== item.time) {
        uniqueStep.push(item)
      }
    }

    return { priceData: uniquePrice, stepData: uniqueStep }
  }, [timeline, viewMode])

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

    // 1. Vùng diện tích bậc thang (Stepped Area)
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#94a3b8',
      topColor: 'rgba(71, 85, 105, 0.4)',
      bottomColor: 'rgba(51, 65, 85, 0.15)',
      lineWidth: 2,
      lineType: LineType.WithSteps,
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => `${Math.round(val / 1000)}k`,
      },
    })

    // 2. Đường giá thị trường (Line)
    const lineSeries = chart.addSeries(LineSeries, {
      color: '#38bdf8',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => `${Math.round(val / 1000)}k`,
      },
    })

    areaSeries.setData(chartData.stepData)
    lineSeries.setData(chartData.priceData)

    chart.timeScale().fitContent()

    chartRef.current = chart
    areaSeriesRef.current = areaSeries
    lineSeriesRef.current = lineSeries

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
        const pVal = param.seriesData.get(lineSeries) as { value?: number } | undefined
        const sVal = param.seriesData.get(areaSeries) as { value?: number } | undefined
        if (pVal?.value != null || sVal?.value != null) {
          setActivePoint({
            date: timeStr,
            timestamp: 0,
            price: pVal?.value ?? 0,
            fairPricePe: sVal?.value ?? 0,
            eps: sVal?.value ?? 0,
            pe: null,
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

  const displayPoint = activePoint || (timeline.length > 0 ? timeline[timeline.length - 1] : null)

  return (
    <div className="relative w-full space-y-2">
      {/* Dynamic tracking header */}
      {displayPoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-foreground">{displayPoint.date}</span>
            {displayPoint.pe != null && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-slate-700">
                P/E: {displayPoint.pe}x
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#38bdf8]" />
              <span className="text-muted-foreground">Thị giá:</span>
              <span className="font-bold text-[#38bdf8]">{fmtPrice(displayPoint.price)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-400" />
              <span className="text-muted-foreground">
                {viewMode === 'FAIR_PE' ? `Định giá (${medianPe || '—'}x):` : 'EPS (TTM):'}
              </span>
              <span className="font-bold text-slate-200">
                {fmtPrice(viewMode === 'FAIR_PE' ? displayPoint.fairPricePe : displayPoint.eps)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas container */}
      <div ref={containerRef} className="w-full overflow-hidden" style={{ height: `${height}px` }} />
    </div>
  )
}
