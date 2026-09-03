'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  Clock,
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

// Đầy đủ các mốc thời gian theo yêu cầu: 1 tháng, 3 tháng, 6 tháng, 1 năm, 3 năm, 5 năm, 10 năm
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
  // Mặc định mở 10 năm theo yêu cầu
  const [range, setRange] = useState<string>('10y')
  const [data, setData] = useState<CommodityData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Đóng modal khi bấm Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
      .catch((err) => {
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

  // Kích thước SVG
  const svgWidth = 820
  const svgHeight = 400
  const padLeft = 50
  const padRight = 55
  const padTop = 30
  const padBottom = 40
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  const points = data?.points || []
  const prices = useMemo(() => points.map((p) => p.price), [points])

  const isLongTerm = range === '3y' || range === '5y' || range === '10y'

  const { yMin, yMax, yTicks, xTicks, pathString, areaPathString, pointsCoord, avgY } = useMemo(() => {
    if (!points.length || !prices.length) {
      return { yMin: 0, yMax: 100, yTicks: [], xTicks: [], pathString: '', areaPathString: '', pointsCoord: [], avgY: 0 }
    }

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const span = Math.max(0.01, max - min)
    const rawYMin = Math.max(0, min - span * 0.1)
    const rawYMax = max + span * 0.1

    const calcYMin = Number(rawYMin.toFixed(2))
    const calcYMax = Number(rawYMax.toFixed(2))

    // 5 ticks trục Y
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

    // Đường line
    let dLine = ''
    coords.forEach((pt, i) => {
      dLine += i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    })

    // Vùng diện tích mờ (Area fill)
    let dArea = ''
    if (coords.length > 0) {
      const firstX = coords[0].x.toFixed(1)
      const lastX = coords[coords.length - 1].x.toFixed(1)
      const bottomY = (padTop + plotHeight).toFixed(1)
      dArea = `${dLine} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
    }

    // Trục X (6 mốc ngày trải đều)
    const xTicksList: { x: number; label: string }[] = []
    const targetCount = 6
    if (points.length > 1) {
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.round((i / (targetCount - 1)) * (points.length - 1))
        const pt = points[idx]
        if (pt) {
          let label = pt.date.slice(0, 5) // DD/MM mặc định
          if (isLongTerm) {
            // Hiển thị MM/YY cho 3y, 5y, 10y (ví dụ 01/18, 08/26)
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
      pathString: dLine,
      areaPathString: dArea,
      pointsCoord: coords,
      avgY: average,
    }
  }, [points, prices, data?.avgPrice, isLongTerm, padLeft, padTop, plotHeight, plotWidth])

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !pointsCoord.length) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const scaleX = svgWidth / rect.width
    const svgMouseX = mouseX * scaleX

    if (svgMouseX < padLeft || svgMouseX > padLeft + plotWidth) {
      setHoverIndex(null)
      return
    }

    const ratio = (svgMouseX - padLeft) / plotWidth
    const approxIndex = Math.round(ratio * (pointsCoord.length - 1))
    const clampedIndex = Math.max(0, Math.min(pointsCoord.length - 1, approxIndex))
    setHoverIndex(clampedIndex)
  }

  const activePoint = hoverIndex !== null ? pointsCoord[hoverIndex] : null

  const handleDownloadPng = () => {
    if (!svgRef.current) return
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    const svgString = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = svgWidth * scale
      canvas.height = svgHeight * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#161a23'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${symbol || 'COMMODITY'}_CHART_${range.toUpperCase()}.png`
      link.click()
      URL.revokeObjectURL(blobURL)
    }
    img.src = blobURL
  }

  if (!symbol) return null

  const isUp = (data?.changePercent ?? 0) >= 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl rounded-3xl border border-white/20 bg-[#161a23] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto"
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
                {data?.unit && (
                  <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-[#9EACB9]">
                    {data.unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9EACB9] mt-0.5">
                Biểu đồ diễn biến giá hàng hóa thế giới ({data?.firstDate} – {data?.lastDate})
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

        {/* Vùng vẽ biểu đồ SVG */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#12151c] p-2 sm:p-4 select-none">
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
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[420px] cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="commLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="commAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Watermark in chìm thương hiệu */}
              <g pointerEvents="none">
                <text
                  x={padLeft + plotWidth / 2}
                  y={padTop + 30}
                  textAnchor="middle"
                  fontSize="18"
                  fill="rgba(255,255,255,0.18)"
                  fontWeight="bold"
                  letterSpacing="0.8"
                >
                  Dulieudautu.com
                </text>
                <text
                  x={padLeft + plotWidth / 2}
                  y={padTop + 45}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.12)"
                  fontStyle="italic"
                >
                  Nguồn: dulieudautu.com
                </text>
              </g>

              {/* Đường lưới ngang Y */}
              {yTicks.map((tick, i) => {
                const ratio = (tick - yMin) / Math.max(0.001, yMax - yMin)
                const y = padTop + plotHeight - ratio * plotHeight
                return (
                  <g key={`comm-ytick-${i}`}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + plotWidth}
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fill="#64748b"
                      fontFamily="monospace"
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}

              {/* Nhãn trục X (Ngày) */}
              {xTicks.map((tick, i) => (
                <text
                  key={`comm-xtick-${i}`}
                  x={tick.x}
                  y={padTop + plotHeight + 20}
                  textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                  fontSize="9.5"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              ))}

              {/* Đường trung bình nét đứt (Avg Line) */}
              {avgY && (
                <g>
                  <line
                    x1={padLeft}
                    y1={avgY}
                    x2={padLeft + plotWidth}
                    y2={avgY}
                    stroke="#818cf8"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                  <text
                    x={padLeft + plotWidth + 4}
                    y={avgY + 3.5}
                    fontSize="9.5"
                    fill="#818cf8"
                    fontWeight="bold"
                  >
                    TB ({data?.avgPrice})
                  </text>
                </g>
              )}

              {/* Vùng diện tích mờ dưới đường giá */}
              {areaPathString && (
                <path d={areaPathString} fill="url(#commAreaGrad)" />
              )}

              {/* Đường cong giá chính */}
              {pathString && (
                <path
                  d={pathString}
                  fill="none"
                  stroke="url(#commLineGrad)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Con trỏ di chuột hover */}
              {activePoint && (
                <g pointerEvents="none">
                  <line
                    x1={activePoint.x}
                    y1={padTop}
                    x2={activePoint.x}
                    y2={padTop + plotHeight}
                    stroke="#ffffff"
                    strokeOpacity="0.4"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="6"
                    fill="#f59e0b"
                    fillOpacity="0.35"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="3.5"
                    fill="#ffffff"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          )}

          {/* Floating Tooltip khi hover */}
          {activePoint && (
            <div
              className="pointer-events-none absolute top-3 z-30 rounded-xl border border-white/15 bg-[#181c26]/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75 min-w-[160px]"
              style={{
                left:
                  activePoint.x > padLeft + plotWidth * 0.55
                    ? `${Math.max(5, ((activePoint.x - 180) / svgWidth) * 100)}%`
                    : `${Math.min(70, ((activePoint.x + 20) / svgWidth) * 100)}%`,
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
    </div>
  )
}
