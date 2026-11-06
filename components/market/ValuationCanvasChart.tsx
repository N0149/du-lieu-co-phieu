'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Maximize2, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatsBand, ValuationDataPoint } from '@/lib/pe-pb-service'

interface ChartCanvasProps {
  type: 'PE' | 'PB'
  titleSummary: string
  stats: StatsBand | null
  dataPoints: ValuationDataPoint[]
  loading: boolean
  onMaximize?: () => void
  isModal?: boolean
}

interface AdjustedLabel {
  key: string
  text: string
  lineY: number
  textY: number
  color: string
  dash: number[]
  width: number
  isBold?: boolean
}

/** Xuất trực tiếp Canvas sang PNG sắc nét */
export function exportCanvasToPng(canvas: HTMLCanvasElement | null, fileName: string) {
  if (!canvas) return
  try {
    const pngUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = `${fileName}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Lỗi khi xuất biểu đồ sang PNG:', err)
  }
}

export function ValuationCanvasChart({
  type,
  titleSummary,
  stats,
  dataPoints,
  loading,
  onMaximize,
  isModal = false,
}: ChartCanvasProps) {
  const isPE = type === 'PE'
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: isModal ? 380 : 350 })

  // Lắng nghe resize container
  useEffect(() => {
    if (!containerRef.current) return
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 700
        setDimensions({ width: w, height: isModal ? 380 : 350 })
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [isModal])

  const values = useMemo(() => {
    return dataPoints.map((p) => (isPE ? p.pe : p.pb))
  }, [dataPoints, isPE])

  const padLeft = 40
  const padRight = 95
  const padTop = 20
  const padBottom = 35
  const plotWidth = Math.max(10, dimensions.width - padLeft - padRight)
  const plotHeight = Math.max(10, dimensions.height - padTop - padBottom)

  const chartCalculations = useMemo(() => {
    if (!dataPoints.length || !values.length) {
      return {
        yMin: 0,
        yMax: 20,
        yTicks: [] as number[],
        xTicks: [] as { x: number; label: string }[],
        pointsCoord: [] as Array<{ x: number; y: number; point: ValuationDataPoint; val: number }>,
        adjustedLabels: [] as AdjustedLabel[],
        getY: (_val: number) => 0,
      }
    }

    const minData = Math.min(...values)
    const maxData = Math.max(...values)
    const refMin = stats ? Math.min(minData, stats.std2Neg) : minData
    const refMax = stats ? Math.max(maxData, stats.std2Pos) : maxData

    const span = Math.max(0.1, refMax - refMin)
    const rawYMin = Math.max(0, refMin - span * 0.12)
    const rawYMax = refMax + span * 0.12

    const calcYMin = isPE ? Math.floor(rawYMin) : Number((Math.floor(rawYMin * 5) / 5).toFixed(1))
    const calcYMax = isPE ? Math.ceil(rawYMax) : Number((Math.ceil(rawYMax * 5) / 5).toFixed(1))

    const ticks: number[] = []
    const tickCount = 5
    for (let i = 0; i <= tickCount; i++) {
      const val = calcYMin + ((calcYMax - calcYMin) / tickCount) * i
      ticks.push(isPE ? Math.round(val) : Number(val.toFixed(1)))
    }

    const getY = (val: number) => {
      const ratio = (val - calcYMin) / Math.max(0.001, calcYMax - calcYMin)
      return padTop + plotHeight - ratio * plotHeight
    }

    const getX = (index: number) => {
      if (dataPoints.length <= 1) return padLeft
      return padLeft + (index / (dataPoints.length - 1)) * plotWidth
    }

    const coords = dataPoints.map((p, i) => ({
      x: getX(i),
      y: getY(values[i]),
      point: p,
      val: values[i],
    }))

    // X-Ticks: 5 mốc cách đều
    const totalPoints = dataPoints.length
    const targetTickCount = 5
    const xTicksList: { x: number; label: string }[] = []

    if (totalPoints > 1) {
      const tickIndices: number[] = []
      for (let i = 0; i < targetTickCount; i++) {
        const idx = Math.round((i / (targetTickCount - 1)) * (totalPoints - 1))
        tickIndices.push(idx)
      }
      const uniqueIndices = [...new Set(tickIndices)]
      uniqueIndices.forEach((idx) => {
        const pt = dataPoints[idx]
        const parts = (pt?.ymd || '').split('-')
        const label = parts.length >= 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}` : pt?.date || ''
        xTicksList.push({
          x: getX(idx),
          label,
        })
      })
    }

    // Reference labels on right side with collision avoidance
    const rawLabels: AdjustedLabel[] = []
    if (stats) {
      rawLabels.push(
        {
          key: 'std2Pos',
          text: `+2SD (${stats.std2Pos})`,
          lineY: getY(stats.std2Pos),
          textY: getY(stats.std2Pos),
          color: '#ef4444',
          dash: [4, 3],
          width: 1.2,
        },
        {
          key: 'std1Pos',
          text: `+1SD (${stats.std1Pos})`,
          lineY: getY(stats.std1Pos),
          textY: getY(stats.std1Pos),
          color: '#f97316',
          dash: [4, 3],
          width: 1.2,
        },
        {
          key: 'mean',
          text: `TB (${stats.mean})`,
          lineY: getY(stats.mean),
          textY: getY(stats.mean),
          color: '#3b82f6',
          dash: [3, 3],
          width: 1.2,
        },
        {
          key: 'median',
          text: `Trung vị (${stats.median})`,
          lineY: getY(stats.median),
          textY: getY(stats.median),
          color: '#10b981',
          dash: [2, 2],
          width: 1.6,
          isBold: true,
        },
        {
          key: 'std1Neg',
          text: `-1SD (${stats.std1Neg})`,
          lineY: getY(stats.std1Neg),
          textY: getY(stats.std1Neg),
          color: '#34d399',
          dash: [4, 3],
          width: 1.2,
        },
        {
          key: 'std2Neg',
          text: `-2SD (${stats.std2Neg})`,
          lineY: getY(stats.std2Neg),
          textY: getY(stats.std2Neg),
          color: '#a855f7',
          dash: [4, 3],
          width: 1.2,
        }
      )

      rawLabels.sort((a, b) => a.textY - b.textY)

      const minGap = 13
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < rawLabels.length; i++) {
          const prev = rawLabels[i - 1]
          const curr = rawLabels[i]
          const gap = curr.textY - prev.textY
          if (gap < minGap) {
            const shift = (minGap - gap) / 2
            prev.textY -= shift
            curr.textY += shift
          }
        }
      }
    }

    return {
      yMin: calcYMin,
      yMax: calcYMax,
      yTicks: ticks,
      xTicks: xTicksList,
      pointsCoord: coords,
      adjustedLabels: rawLabels,
      getY,
    }
  }, [dataPoints, values, stats, isPE, padLeft, padTop, plotHeight, plotWidth])

  // Vẽ Canvas trực tiếp (GPU accelerated, siêu mượt)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 2) : 2
    const w = dimensions.width
    const h = dimensions.height

    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)

    ctx.save()
    ctx.scale(dpr, dpr)

    // Nền tối chuẩn màu #161a23
    ctx.fillStyle = '#161a23'
    ctx.fillRect(0, 0, w, h)

    const { yMin, yMax, yTicks, xTicks, pointsCoord, adjustedLabels, getY } = chartCalculations

    if (pointsCoord.length > 0) {
      // 1. Vùng định giá cao (Đắt / Rủi ro) - Màu đỏ cam mờ
      if (stats && stats.std1Pos < yMax) {
        const topY = Math.max(padTop, getY(yMax))
        const bottomY = getY(stats.std1Pos)
        const rectH = Math.max(0, bottomY - topY)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'
        ctx.fillRect(padLeft, topY, plotWidth, rectH)
      }

      // 2. Vùng định giá thấp (Rẻ / Hấp dẫn) - Màu xanh lá mờ
      if (stats && stats.std1Neg > yMin) {
        const topY = getY(stats.std1Neg)
        const bottomY = getY(yMin)
        const rectH = Math.max(0, bottomY - topY)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'
        ctx.fillRect(padLeft, topY, plotWidth, rectH)
      }

      // 3. Watermark in chìm trong biểu đồ
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.font = 'bold 17px Inter, system-ui, sans-serif'
      ctx.fillText('Dulieudautu.com', padLeft + plotWidth / 2, padTop + 24)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.font = 'italic 9.5px Inter, system-ui, sans-serif'
      ctx.fillText('Nguồn: dulieudautu.com', padLeft + plotWidth / 2, padTop + 38)

      // 4. Đường lưới ngang trục Y (Grid Lines)
      ctx.textAlign = 'right'
      ctx.font = '10px Inter, system-ui, sans-serif'
      yTicks.forEach((tick) => {
        const y = getY(tick)
        ctx.beginPath()
        ctx.setLineDash([2, 2])
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
        ctx.lineWidth = 1
        ctx.moveTo(padLeft, y)
        ctx.lineTo(padLeft + plotWidth, y)
        ctx.stroke()

        ctx.fillStyle = '#64748b'
        ctx.fillText(String(tick), padLeft - 8, y + 3.5)
      })

      // 5. Nhãn trục X (Ngày tháng)
      ctx.fillStyle = '#64748b'
      ctx.font = '9px Inter, system-ui, sans-serif'
      xTicks.forEach((tick, i) => {
        ctx.textAlign = i === 0 ? 'left' : i === xTicks.length - 1 ? 'right' : 'center'
        ctx.fillText(tick.label, tick.x, padTop + plotHeight + 18)
      })

      // 6. 6 Đường tham chiếu thống kê & Nhãn
      adjustedLabels.forEach((item) => {
        // Đường nét đứt ngang
        ctx.beginPath()
        ctx.setLineDash(item.dash)
        ctx.strokeStyle = item.color
        ctx.lineWidth = item.width
        ctx.moveTo(padLeft, item.lineY)
        ctx.lineTo(padLeft + plotWidth, item.lineY)
        ctx.stroke()

        // Nhãn text chống chồng chữ bên phải
        ctx.textAlign = 'left'
        ctx.fillStyle = item.color
        ctx.font = item.isBold ? 'bold 9.5px Inter, sans-serif' : '500 9.5px Inter, sans-serif'
        ctx.fillText(item.text, padLeft + plotWidth + 6, item.textY + 3.5)
      })

      // 7. Đồ thị chính (Gradient Path)
      const grad = ctx.createLinearGradient(padLeft, 0, padLeft + plotWidth, 0)
      grad.addColorStop(0, '#a855f7')
      grad.addColorStop(0.5, '#818cf8')
      grad.addColorStop(1, '#38bdf8')

      ctx.beginPath()
      ctx.setLineDash([])
      ctx.strokeStyle = grad
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      pointsCoord.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.stroke()

      // 8. Điểm hover tương tác
      if (hoverIndex !== null && pointsCoord[hoverIndex]) {
        const activePt = pointsCoord[hoverIndex]

        // Vertical cursor line
        ctx.beginPath()
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1
        ctx.moveTo(activePt.x, padTop)
        ctx.lineTo(activePt.x, padTop + plotHeight)
        ctx.stroke()

        // Glow outer circle
        ctx.beginPath()
        ctx.setLineDash([])
        ctx.arc(activePt.x, activePt.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(129, 140, 248, 0.3)'
        ctx.fill()

        // Inner circle
        ctx.beginPath()
        ctx.arc(activePt.x, activePt.y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#818cf8'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    ctx.restore()
  }, [chartCalculations, dimensions, hoverIndex, isPE, padLeft, padRight, padTop, padBottom, plotWidth, plotHeight, stats])

  // Xử lý chuột di chuyển tìm điểm gần nhất
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const coords = chartCalculations.pointsCoord
      if (!canvas || !coords.length) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      if (mouseX < padLeft || mouseX > padLeft + plotWidth) {
        setHoverIndex(null)
        return
      }

      const ratio = (mouseX - padLeft) / plotWidth
      const approxIndex = Math.round(ratio * (coords.length - 1))
      const clampedIndex = Math.max(0, Math.min(coords.length - 1, approxIndex))
      setHoverIndex(clampedIndex)
    },
    [chartCalculations.pointsCoord, padLeft, plotWidth]
  )

  const activePoint = hoverIndex !== null ? chartCalculations.pointsCoord[hoverIndex] : null

  const formattedDateHeader = useMemo(() => {
    if (!activePoint?.point?.ymd) return ''
    const [y, m, d] = activePoint.point.ymd.split('-')
    return `${d}-${m}-${y}`
  }, [activePoint])

  const handleDownload = () => {
    const fileName = `${type}_VNINDEX_${new Date().toISOString().slice(0, 10)}`
    exportCanvasToPng(canvasRef.current, fileName)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col rounded-2xl bg-[#161a23] transition-all duration-200',
        !isModal && 'border border-white/10 p-4 shadow-lg hover:border-white/20 sm:p-5'
      )}
    >
      {/* Tiêu đề & Cụm nút hành động Phóng to / Tải về */}
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/8 pb-3">
        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-emerald-400">
          {titleSummary || (isPE ? 'ĐỊNH GIÁ P/E CỦA VN-INDEX' : 'ĐỊNH GIÁ P/B CỦA VN-INDEX')}
        </h3>

        {!isModal && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Nút phóng to */}
            {onMaximize && (
              <button
                type="button"
                onClick={onMaximize}
                className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9EACB9] transition-all hover:bg-white/15 hover:text-white cursor-pointer"
                title="Phóng to biểu đồ"
                aria-label="Phóng to biểu đồ"
              >
                <Maximize2 className="size-3.5" />
              </button>
            )}

            {/* Nút tải về */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9EACB9] transition-all hover:bg-white/15 hover:text-white cursor-pointer"
              title="Tải biểu đồ về máy (PNG)"
              aria-label="Tải biểu đồ về máy"
            >
              <Download className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="relative w-full overflow-hidden select-none">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#161a23]/60 backdrop-blur-[1px]">
            <RefreshCw className="size-6 animate-spin text-emerald-400" />
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
          className="w-full h-auto cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        />

        {/* TOOLTIP DANH SÁCH CHI TIẾT */}
        {activePoint && (
          <div
            className="pointer-events-none absolute top-3 z-30 rounded-xl border border-white/15 bg-[#181c26]/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75 min-w-[170px]"
            style={{
              left:
                activePoint.x > padLeft + plotWidth * 0.55
                  ? `${Math.max(5, ((activePoint.x - 190) / dimensions.width) * 100)}%`
                  : `${Math.min(70, ((activePoint.x + 20) / dimensions.width) * 100)}%`,
            }}
          >
            <div className="border-b border-white/10 pb-1.5 mb-2">
              <span className="font-bold text-[#F0F3F6] text-xs font-mono">
                {formattedDateHeader}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 font-bold text-indigo-400">
                  <span className="size-2 rounded-xs bg-indigo-400" />
                  {isPE ? 'PE' : 'PB'}:
                </span>
                <span className="font-bold font-mono text-[#F0F3F6] text-xs">
                  {activePoint.val}
                </span>
              </div>

              {stats && (
                <>
                  <div className="flex items-center justify-between gap-3 text-[#9EACB9]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-[#ef4444]" />
                      +2 StDv:
                    </span>
                    <span className="font-mono font-medium text-[#ef4444]">
                      {stats.std2Pos}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[#9EACB9]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-[#f97316]" />
                      +1 StDv:
                    </span>
                    <span className="font-mono font-medium text-[#f97316]">
                      {stats.std1Pos}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[#9EACB9]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-[#3b82f6]" />
                      Trung bình:
                    </span>
                    <span className="font-mono font-medium text-[#3b82f6]">
                      {stats.mean}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[#9EACB9]">
                    <span className="flex items-center gap-1.5 font-semibold text-[#F0F3F6]">
                      <span className="size-2 rounded-xs bg-[#10b981]" />
                      Trung vị:
                    </span>
                    <span className="font-mono font-bold text-[#10b981]">
                      {stats.median}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[#9EACB9]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-[#34d399]" />
                      -1 StDv:
                    </span>
                    <span className="font-mono font-medium text-[#34d399]">
                      {stats.std1Neg}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[#9EACB9]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-[#a855f7]" />
                      -2 StDv:
                    </span>
                    <span className="font-mono font-medium text-[#a855f7]">
                      {stats.std2Neg}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend bar */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-white/8 pt-3 text-[11px] font-medium text-[#9EACB9]">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-indigo-400" />
          <span className="text-[#F0F3F6] font-semibold">{isPE ? 'PE' : 'PB'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[#ef4444]" />
          <span>+2 StDv</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[#f97316]" />
          <span>+1 StDv</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[#3b82f6]" />
          <span>Trung bình</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[#10b981]" />
          <span>Trung vị</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[#34d399]" />
          <span>-1 StDv</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[#a855f7]" />
          <span>-2 StDv</span>
        </div>
      </div>
    </div>
  )
}
