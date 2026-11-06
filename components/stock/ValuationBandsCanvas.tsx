'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineSeries,
  Time,
} from 'lightweight-charts'

export interface ValuationCanvasPoint {
  time: string // 'YYYY-MM-DD'
  value: number
}

export interface ValuationBandsStats {
  mean: number
  median: number
  plus1sd: number
  plus2sd: number
  minus1sd: number
  minus2sd: number
}

interface ValuationBandsCanvasProps {
  data: ValuationCanvasPoint[]
  stats: ValuationBandsStats
  lineColor?: string
  height?: number
  metricName?: string
  unit?: string
  symbol?: string
}

export function ValuationBandsCanvas({
  data,
  stats,
  lineColor = '#3b82f6',
  height = 260,
  metricName = 'P/E',
  unit = 'x',
  symbol = '',
}: ValuationBandsCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [hoverData, setHoverData] = useState<{
    time: string
    value: number
  } | null>(null)

  // Điểm cuối cùng (mặc định hiển thị khi không hover)
  const lastPoint = data.length > 0 ? data[data.length - 1] : null

  const displayPoint = hoverData || lastPoint

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    // 1. Dọn dẹp biểu đồ cũ
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    const container = containerRef.current

    // 2. Tạo biểu đồ Canvas với Dark Theme tài chính cao cấp
    const chart = createChart(container, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888888',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Dashed },
        horzLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Dashed },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        minBarSpacing: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart

    // 3. Thêm chuỗi đường Line Series vẽ bằng Canvas
    const lineSeries = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (p: number) => `${p.toFixed(2)}${unit}`,
      },
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBackgroundColor: lineColor,
    })

    seriesRef.current = lineSeries

    // Đảm bảo dữ liệu sắp xếp tăng dần theo thời gian và không trùng ngày
    const uniqueMap = new Map<string, number>()
    for (const pt of data) {
      if (pt.time && pt.value != null && !isNaN(pt.value) && pt.value > 0) {
        uniqueMap.set(pt.time, pt.value)
      }
    }

    const sortedData = Array.from(uniqueMap.entries())
      .map(([time, value]) => ({ time: time as Time, value }))
      .sort((a, b) => (a.time > b.time ? 1 : -1))

    if (sortedData.length > 0) {
      lineSeries.setData(sortedData)
      chart.timeScale().fitContent()
    }

    // 4. Vẽ 5 đường tham chiếu (Bands) độ lệch chuẩn trực tiếp lên Canvas
    if (stats.plus2sd > 0) {
      lineSeries.createPriceLine({
        price: stats.plus2sd,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `+2SD (${stats.plus2sd})`,
      })
    }

    if (stats.plus1sd > 0) {
      lineSeries.createPriceLine({
        price: stats.plus1sd,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `+1SD (${stats.plus1sd})`,
      })
    }

    if (stats.median > 0) {
      lineSeries.createPriceLine({
        price: stats.median,
        color: '#94a3b8',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Trung vị (${stats.median})`,
      })
    }

    if (stats.minus1sd > 0) {
      lineSeries.createPriceLine({
        price: stats.minus1sd,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `-1SD (${stats.minus1sd})`,
      })
    }

    if (stats.minus2sd > 0) {
      lineSeries.createPriceLine({
        price: stats.minus2sd,
        color: '#059669',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `-2SD (${stats.minus2sd})`,
      })
    }

    // 5. Đăng ký sự kiện Crosshair để hiện Tooltip tương tác 60fps
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null)
        return
      }

      const pointVal = param.seriesData.get(lineSeries) as { value?: number } | undefined
      if (pointVal && typeof pointVal.value === 'number') {
        const timeStr = typeof param.time === 'string' ? param.time : String(param.time)
        setHoverData({
          time: timeStr,
          value: pointVal.value,
        })
      } else {
        setHoverData(null)
      }
    })

    // 6. Theo dõi co giãn kích thước container tự động
    const ro = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return
      const entry = entries[0]
      const { width, height: h } = entry.contentRect
      if (width > 0 && chartRef.current) {
        chartRef.current.applyOptions({
          width,
          height: h > 0 ? h : height,
        })
      }
    })

    ro.observe(container)

    return () => {
      ro.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [data, stats, lineColor, height, unit])

  return (
    <div className="relative w-full h-full select-none">
      {/* Header số liệu trực tiếp khi hover hoặc mặc định */}
      <div className="absolute top-1.5 left-2 z-10 pointer-events-none flex items-center gap-2 text-[11px]">
        {displayPoint && (
          <div className="flex items-center gap-2 rounded-md bg-[#0f172a]/80 backdrop-blur-xs px-2 py-0.5 border border-slate-700/50">
            <span className="text-slate-400 font-mono">{displayPoint.time}</span>
            <span className="font-bold text-foreground">
              {metricName}:{' '}
              <span style={{ color: lineColor }} className="font-mono">
                {displayPoint.value.toFixed(2)}
                {unit}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
