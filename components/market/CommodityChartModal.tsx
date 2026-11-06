'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommodityPoint {
  date: string
  ymd: string
  price: number
  timestamp: number
}

interface CommodityData {
  symbol: string
  ticker: string
  name: string
  unit: string
  currentPrice: number
  changePercent: number
  minPrice: number
  maxPrice: number
  avgPrice: number
  firstDate: string
  lastDate: string
  points: CommodityPoint[]
}

interface CommodityChartModalProps {
  symbol: string | null
  initialName?: string
  unit?: string
  onClose: () => void
}

// Đầy đủ các mốc thời gian: 1 tháng, 3 tháng, 6 tháng, 1 năm, 3 năm, 5 năm, 10 năm
const RANGES = [
  { key: '1m', label: '1 Tháng' },
  { key: '3m', label: '3 Tháng' },
  { key: '6m', label: '6 Tháng' },
  { key: '1y', label: '1 Năm' },
  { key: '3y', label: '3 Năm' },
  { key: '5y', label: '5 Năm' },
  { key: '10y', label: '10 Năm' },
]

export function CommodityChartModal({
  symbol,
  initialName,
  unit,
  onClose,
}: CommodityChartModalProps) {
  const [range, setRange] = useState<string>('10y')
  const [data, setData] = useState<CommodityData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 820, height: 400 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Đóng modal khi bấm Escape và khóa cuộn trang
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // Lắng nghe resize container
  useEffect(() => {
    if (!canvasContainerRef.current) return
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const w = canvasContainerRef.current.clientWidth || 820
        setDimensions({ width: w, height: 400 })
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(canvasContainerRef.current)
    return () => ro.disconnect()
  }, [])

  // Fetch dữ liệu lịch sử
  useEffect(() => {
    if (!symbol) return

    let isMounted = true
    setLoading(true)
    setError(null)

    fetch(`/api/market/commodity-history?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return
        if (json.success && json.data) {
          setData(json.data)
        } else {
          setError(json.error || 'Không thể tải lịch sử giá hàng hóa này')
        }
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi kết nối máy chủ dữ liệu hàng hóa')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [symbol, range])

  const padLeft = 50
  const padRight = 55
  const padTop = 30
  const padBottom = 40
  const plotWidth = Math.max(10, dimensions.width - padLeft - padRight)
  const plotHeight = Math.max(10, dimensions.height - padTop - padBottom)

  const points = data?.points || []
  const prices = useMemo(() => points.map((p) => p.price), [points])
  const isLongTerm = range === '3y' || range === '5y' || range === '10y'

  const chartCalc = useMemo(() => {
    if (!points.length || !prices.length) {
      return {
        yMin: 0,
        yMax: 100,
        yTicks: [] as number[],
        xTicks: [] as { x: number; label: string }[],
        pointsCoord: [] as Array<{ x: number; y: number; point: CommodityPoint; val: number }>,
        avgY: 0,
        getY: (_v: number) => 0,
      }
    }

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const span = Math.max(0.01, max - min)
    const rawYMin = Math.max(0, min - span * 0.1)
    const rawYMax = max + span * 0.1

    const calcYMin = Number(rawYMin.toFixed(2))
    const calcYMax = Number(rawYMax.toFixed(2))

    const ticks: number[] = []
    for (let i = 0; i <= 5; i++) {
      const val = calcYMin + ((calcYMax - calcYMin) / 5) * i
      ticks.push(Number(val.toFixed(2)))
    }

    const getY = (val: number) => {
      const ratio = (val - calcYMin) / Math.max(0.001, calcYMax - calcYMin)
      return padTop + plotHeight - ratio * plotHeight
    }

    const getX = (index: number) => {
      if (points.length <= 1) return padLeft
      return padLeft + (index / (points.length - 1)) * plotWidth
    }

    const coords = points.map((p, i) => ({
      x: getX(i),
      y: getY(prices[i]),
      point: p,
      val: prices[i],
    }))

    const xTicksList: { x: number; label: string }[] = []
    const targetCount = 6
    if (points.length > 1) {
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.round((i / (targetCount - 1)) * (points.length - 1))
        const pt = points[idx]
        if (pt) {
          let label = pt.date.slice(0, 5)
          if (isLongTerm) {
            const parts = (pt.ymd || '').split('-')
            label = parts.length >= 2 ? `${parts[1]}/${parts[0].slice(-2)}` : pt.date
          }
          xTicksList.push({
            x: getX(idx),
            label,
          })
        }
      }
    }

    const average = data?.avgPrice ? getY(data.avgPrice) : getY((min + max) / 2)

    return {
      yMin: calcYMin,
      yMax: calcYMax,
      yTicks: ticks,
      xTicks: xTicksList,
      pointsCoord: coords,
      avgY: average,
      getY,
    }
  }, [points, prices, data?.avgPrice, isLongTerm, padLeft, padTop, plotHeight, plotWidth])

  // Vẽ Canvas trực tiếp siêu sắc nét và siêu mượt
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

    // Nền tối
    ctx.fillStyle = '#12151c'
    ctx.fillRect(0, 0, w, h)

    const { yMin, yMax, yTicks, xTicks, pointsCoord, avgY, getY } = chartCalc

    if (pointsCoord.length > 0) {
      // 1. Watermark in chìm thương hiệu
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.font = 'bold 18px Inter, system-ui, sans-serif'
      ctx.fillText('Dulieudautu.com', padLeft + plotWidth / 2, padTop + 30)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.font = 'italic 10px Inter, system-ui, sans-serif'
      ctx.fillText('Nguồn: dulieudautu.com', padLeft + plotWidth / 2, padTop + 45)

      // 2. Đường lưới ngang Y
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

      // 3. Nhãn trục X (Ngày)
      ctx.fillStyle = '#64748b'
      ctx.font = '9.5px Inter, system-ui, sans-serif'
      xTicks.forEach((tick, i) => {
        ctx.textAlign = i === 0 ? 'left' : i === xTicks.length - 1 ? 'right' : 'center'
        ctx.fillText(tick.label, tick.x, padTop + plotHeight + 20)
      })

      // 4. Đường trung bình nét đứt (Avg Line)
      if (avgY) {
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = '#818cf8'
        ctx.lineWidth = 1.2
        ctx.moveTo(padLeft, avgY)
        ctx.lineTo(padLeft + plotWidth, avgY)
        ctx.stroke()

        ctx.textAlign = 'left'
        ctx.fillStyle = '#818cf8'
        ctx.font = 'bold 9.5px Inter, sans-serif'
        ctx.fillText(`TB (${data?.avgPrice})`, padLeft + plotWidth + 4, avgY + 3.5)
      }

      // 5. Vùng diện tích mờ (Area Gradient)
      const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight)
      areaGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)')
      areaGrad.addColorStop(1, 'rgba(245, 158, 11, 0.01)')

      ctx.beginPath()
      ctx.setLineDash([])
      pointsCoord.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      const lastX = pointsCoord[pointsCoord.length - 1].x
      const firstX = pointsCoord[0].x
      const bottomY = padTop + plotHeight
      ctx.lineTo(lastX, bottomY)
      ctx.lineTo(firstX, bottomY)
      ctx.closePath()
      ctx.fillStyle = areaGrad
      ctx.fill()

      // 6. Đường cong giá chính (Line Gradient)
      const lineGrad = ctx.createLinearGradient(padLeft, 0, padLeft + plotWidth, 0)
      lineGrad.addColorStop(0, '#f59e0b')
      lineGrad.addColorStop(0.5, '#fbbf24')
      lineGrad.addColorStop(1, '#f97316')

      ctx.beginPath()
      ctx.setLineDash([])
      ctx.strokeStyle = lineGrad
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      pointsCoord.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.stroke()

      // 7. Điểm hover tương tác
      if (hoverIndex !== null && pointsCoord[hoverIndex]) {
        const activePt = pointsCoord[hoverIndex]

        ctx.beginPath()
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1
        ctx.moveTo(activePt.x, padTop)
        ctx.lineTo(activePt.x, padTop + plotHeight)
        ctx.stroke()

        ctx.beginPath()
        ctx.setLineDash([])
        ctx.arc(activePt.x, activePt.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(245, 158, 11, 0.35)'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(activePt.x, activePt.y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    ctx.restore()
  }, [chartCalc, data?.avgPrice, dimensions, hoverIndex, padLeft, padRight, padTop, padBottom, plotWidth, plotHeight])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const coords = chartCalc.pointsCoord
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
    [chartCalc.pointsCoord, padLeft, plotWidth]
  )

  const activePoint = hoverIndex !== null ? chartCalc.pointsCoord[hoverIndex] : null

  const handleDownloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `${symbol || 'COMMODITY'}_CHART_${range.toUpperCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Lỗi xuất PNG hàng hóa:', err)
    }
  }

  if (!symbol || !mounted) return null

  const isUp = (data?.changePercent ?? 0) >= 0

  return createPortal(
    <div
      className="portal-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="portal-modal-content relative flex flex-col w-full max-w-4xl rounded-3xl border border-white/20 bg-[#161a23] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Layers className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#F0F3F6]">
                  {data?.name || initialName || symbol}
                </h3>
                {(data?.unit || unit) && (
                  <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-[#9EACB9]">
                    {data?.unit || unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9EACB9] mt-0.5">
                Biểu đồ diễn biến giá hàng hóa thế giới
                {data?.firstDate ? ` (${data.firstDate} – ${data.lastDate})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={loading || !!error}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#F0F3F6] hover:bg-white/15 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title="Tải ảnh PNG"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Đóng popup"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 4 Thẻ chỉ số thống kê nhanh */}
        {data && !error && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Giá hiện tại */}
            <div className="rounded-xl border border-white/10 bg-[#1c222e] p-3">
              <span className="text-[11px] font-medium text-[#9EACB9]">Giá hiện tại</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-extrabold font-mono text-[#F0F3F6]">
                  {data.currentPrice.toLocaleString('en-US')}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-bold font-mono',
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {isUp ? <TrendingUp className="size-3 mr-0.5" /> : <TrendingDown className="size-3 mr-0.5" />}
                  {isUp ? '+' : ''}
                  {data.changePercent}%
                </span>
              </div>
            </div>

            {/* Đáy trong kỳ */}
            <div className="rounded-xl border border-white/10 bg-[#1c222e] p-3">
              <span className="text-[11px] font-medium text-[#9EACB9]">Đáy trong kỳ (Low)</span>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-400">
                {data.minPrice.toLocaleString('en-US')}
              </p>
            </div>

            {/* Đỉnh trong kỳ */}
            <div className="rounded-xl border border-white/10 bg-[#1c222e] p-3">
              <span className="text-[11px] font-medium text-[#9EACB9]">Đỉnh trong kỳ (High)</span>
              <p className="mt-1 text-lg font-bold font-mono text-rose-400">
                {data.maxPrice.toLocaleString('en-US')}
              </p>
            </div>

            {/* Giá trung bình */}
            <div className="rounded-xl border border-white/10 bg-[#1c222e] p-3">
              <span className="text-[11px] font-medium text-[#9EACB9]">Trung bình (Avg)</span>
              <p className="mt-1 text-lg font-bold font-mono text-indigo-400">
                {data.avgPrice.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        )}

        {/* Bộ lọc khoảng thời gian đầy đủ 7 mốc */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#12151c] p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-lg px-2.5 sm:px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                  range === r.key
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-[#9EACB9]">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-amber-400 inline-block" />
              <span>Giá đóng cửa</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 border-b border-dashed border-indigo-400 inline-block" />
              <span>Trung bình ({data?.avgPrice})</span>
            </span>
          </div>
        </div>

        {/* Vùng vẽ biểu đồ Canvas GPU Siêu Nhanh */}
        <div
          ref={canvasContainerRef}
          className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#12151c] p-2 sm:p-4 select-none"
        >
          {loading && (
            <div className="flex h-[320px] w-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="size-6 animate-spin text-amber-400" />
                <span className="text-xs text-[#9EACB9]">Đang tải dữ liệu biểu đồ {range.toUpperCase()}...</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex h-[320px] w-full flex-col items-center justify-center text-center p-6">
              <p className="text-sm text-rose-400 font-medium">{error}</p>
              <p className="text-xs text-[#9EACB9] mt-1">
                Dữ liệu hợp đồng tương lai của mặt hàng này hiện chưa sẵn sàng từ sàn quốc tế.
              </p>
            </div>
          )}

          {!loading && !error && points.length > 0 && (
            <canvas
              ref={canvasRef}
              style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
              className="w-full h-auto cursor-crosshair block"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            />
          )}

          {/* Floating Tooltip khi hover */}
          {activePoint && (
            <div
              className="pointer-events-none absolute top-3 z-30 rounded-xl border border-white/15 bg-[#181c26]/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75 min-w-[160px]"
              style={{
                left:
                  activePoint.x > padLeft + plotWidth * 0.55
                    ? `${Math.max(5, ((activePoint.x - 180) / dimensions.width) * 100)}%`
                    : `${Math.min(70, ((activePoint.x + 20) / dimensions.width) * 100)}%`,
              }}
            >
              <p className="font-semibold text-[#8B98A5] mb-1 font-mono text-[11px]">
                {activePoint.point.date} ({activePoint.point.ymd})
              </p>
              <div className="space-y-1">
                <p className="font-bold text-amber-400 text-sm font-mono">
                  Giá: <span className="text-[#F0F3F6] text-base">{activePoint.val}</span> {data?.unit}
                </p>
                {data?.avgPrice && (
                  <p className="text-[11px] text-[#9EACB9]">
                    So với TB ({data.avgPrice}):{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        activePoint.val >= data.avgPrice ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {activePoint.val >= data.avgPrice ? '+' : ''}
                      {(((activePoint.val - data.avgPrice) / data.avgPrice) * 100).toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
