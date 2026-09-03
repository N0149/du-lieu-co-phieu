'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Calendar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Info,
  Maximize2,
  Download,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ValuationFilterResult, StatsBand, ValuationDataPoint } from '@/lib/pe-pb-service'

interface ValuationChartsSectionProps {
  initialValuation?: ValuationFilterResult | null
}

const PRESETS = [
  { key: 'ytd', label: 'YTD' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: '10y', label: '10Y' },
  { key: 'all', label: 'All' },
]

/** Hàm xuất SVG sang PNG chuẩn sắc nét (Scale 2x) */
function exportSvgToPng(svgElement: SVGSVGElement | null, fileName: string) {
  if (!svgElement) return

  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    const svgString = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = 700 * scale
      canvas.height = 350 * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#161a23'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `${fileName}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobURL)
    }
    img.src = blobURL
  } catch (err) {
    console.error('Error exporting chart to PNG:', err)
  }
}

interface ChartSvgProps {
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
  dash: string
  width: number
  isBold?: boolean
}

function ValuationSvgChart({
  type,
  titleSummary,
  stats,
  dataPoints,
  loading,
  onMaximize,
  isModal = false,
}: ChartSvgProps) {
  const isPE = type === 'PE'
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const svgWidth = 700
  const svgHeight = isModal ? 380 : 350
  const padLeft = 40
  const padRight = 95 // Mở rộng lề phải để nhãn không bị chạm viền
  const padTop = 20
  const padBottom = 35
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  const values = useMemo(() => {
    return dataPoints.map((p) => (isPE ? p.pe : p.pb))
  }, [dataPoints, isPE])

  const { yMin, yMax, yTicks, xTicks, pathString, pointsCoord, adjustedLabels } = useMemo(() => {
    if (!dataPoints.length || !values.length) {
      return {
        yMin: 0,
        yMax: 20,
        yTicks: [],
        xTicks: [],
        pathString: '',
        pointsCoord: [],
        adjustedLabels: [],
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

    let dStr = ''
    coords.forEach((pt, i) => {
      dStr += i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    })

    // ── XỬ LÝ TRỤC X: CHỐNG CHỒNG ĐÈ CHỮ Ở CUỐI TRỤC X ──
    // Chọn 5 mốc cách đều nhau từ đầu đến cuối một cách an toàn
    const totalPoints = dataPoints.length
    const targetTickCount = 5
    const xTicksList: { x: number; label: string }[] = []

    if (totalPoints > 1) {
      const tickIndices: number[] = []
      for (let i = 0; i < targetTickCount; i++) {
        const idx = Math.round((i / (targetTickCount - 1)) * (totalPoints - 1))
        tickIndices.push(idx)
      }

      // Loại bỏ các điểm trùng lặp
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

    // ── XỬ LÝ NHÃN THAM CHIẾU TRỤC Y: CHỐNG CHỒNG ĐÈ CHỮ (TRUNG VỊ & TRUNG BÌNH) ──
    const rawLabels: AdjustedLabel[] = []
    if (stats) {
      rawLabels.push(
        {
          key: 'std2Pos',
          text: `+2SD (${stats.std2Pos})`,
          lineY: getY(stats.std2Pos),
          textY: getY(stats.std2Pos),
          color: '#ef4444',
          dash: '4 3',
          width: 1.2,
        },
        {
          key: 'std1Pos',
          text: `+1SD (${stats.std1Pos})`,
          lineY: getY(stats.std1Pos),
          textY: getY(stats.std1Pos),
          color: '#f97316',
          dash: '4 3',
          width: 1.2,
        },
        {
          key: 'mean',
          text: `TB (${stats.mean})`,
          lineY: getY(stats.mean),
          textY: getY(stats.mean),
          color: '#3b82f6',
          dash: '3 3',
          width: 1.2,
        },
        {
          key: 'median',
          text: `Trung vị (${stats.median})`,
          lineY: getY(stats.median),
          textY: getY(stats.median),
          color: '#10b981',
          dash: '2 2',
          width: 1.6,
          isBold: true,
        },
        {
          key: 'std1Neg',
          text: `-1SD (${stats.std1Neg})`,
          lineY: getY(stats.std1Neg),
          textY: getY(stats.std1Neg),
          color: '#34d399',
          dash: '4 3',
          width: 1.2,
        },
        {
          key: 'std2Neg',
          text: `-2SD (${stats.std2Neg})`,
          lineY: getY(stats.std2Neg),
          textY: getY(stats.std2Neg),
          color: '#a855f7',
          dash: '4 3',
          width: 1.2,
        }
      )

      // Sắp xếp theo textY từ trên xuống (y tăng dần)
      rawLabels.sort((a, b) => a.textY - b.textY)

      // Thuật toán tách các nhãn quá gần nhau (đảm bảo cách nhau tối thiểu 13px)
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
      pathString: dStr,
      pointsCoord: coords,
      adjustedLabels: rawLabels,
    }
  }, [dataPoints, values, stats, isPE, padLeft, padTop, plotHeight, plotWidth])

  const getYCoord = (val: number) => {
    const ratio = (val - yMin) / Math.max(0.001, yMax - yMin)
    return padTop + plotHeight - ratio * plotHeight
  }

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

  const formattedDateHeader = useMemo(() => {
    if (!activePoint?.point?.ymd) return ''
    const [y, m, d] = activePoint.point.ymd.split('-')
    return `${d}-${m}-${y}`
  }, [activePoint])

  const handleDownload = () => {
    const fileName = `${type}_VNINDEX_${new Date().toISOString().slice(0, 10)}`
    exportSvgToPng(svgRef.current, fileName)
  }

  return (
    <div
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

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#161a23]/60 backdrop-blur-[1px]">
            <RefreshCw className="size-6 animate-spin text-emerald-400" />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[420px] cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`lineGrad-${type}-${isModal ? 'modal' : 'main'}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Vùng định giá cao (Đắt / Rủi ro) - Màu đỏ cam mờ */}
          {stats && stats.std1Pos < yMax && (
            <rect
              x={padLeft}
              y={Math.max(padTop, getYCoord(yMax))}
              width={plotWidth}
              height={Math.max(0, getYCoord(stats.std1Pos) - Math.max(padTop, getYCoord(yMax)))}
              fill="#ef4444"
              fillOpacity="0.08"
            />
          )}

          {/* Vùng định giá thấp (Rẻ / Hấp dẫn) - Màu xanh lá mờ */}
          {stats && stats.std1Neg > yMin && (
            <rect
              x={padLeft}
              y={getYCoord(stats.std1Neg)}
              width={plotWidth}
              height={Math.max(0, getYCoord(yMin) - getYCoord(stats.std1Neg))}
              fill="#10b981"
              fillOpacity="0.08"
            />
          )}

          {/* WATERMARK IN CHÌM TRONG BIỂU ĐỒ */}
          <g pointerEvents="none">
            <text
              x={padLeft + plotWidth / 2}
              y={padTop + 24}
              textAnchor="middle"
              fontSize="17"
              fill="rgba(255,255,255,0.18)"
              fontWeight="bold"
              letterSpacing="0.6"
            >
              Dulieudautu.com
            </text>
            <text
              x={padLeft + plotWidth / 2}
              y={padTop + 38}
              textAnchor="middle"
              fontSize="9.5"
              fill="rgba(255,255,255,0.12)"
              fontStyle="italic"
            >
              Nguồn: dulieudautu.com
            </text>
          </g>

          {/* Đường lưới ngang trục Y (Grid Lines) */}
          {yTicks.map((tick, i) => {
            const y = getYCoord(tick)
            return (
              <g key={`y-tick-${i}`}>
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

          {/* Nhãn trục X (Ngày tháng - Đã chống chồng chữ) */}
          {xTicks.map((tick, i) => (
            <text
              key={`x-tick-${i}`}
              x={tick.x}
              y={padTop + plotHeight + 18}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              fontSize="9"
              fill="#64748b"
              fontFamily="monospace"
            >
              {tick.label}
            </text>
          ))}

          {/* 6 ĐƯỜNG THAM CHIẾU THỐNG KÊ (ĐÃ CHỐNG CHỒNG ĐÈ CHỮ Ở CẠNH PHẢI) */}
          {adjustedLabels.map((item) => (
            <g key={`ref-${item.key}`}>
              {/* Đường nét đứt ngang */}
              <line
                x1={padLeft}
                y1={item.lineY}
                x2={padLeft + plotWidth}
                y2={item.lineY}
                stroke={item.color}
                strokeDasharray={item.dash}
                strokeWidth={item.width}
              />
              {/* Nhãn text đã được điều chỉnh khoảng cách Y tránh đè nhau */}
              <text
                x={padLeft + plotWidth + 6}
                y={item.textY + 3.5}
                fontSize="9.5"
                fill={item.color}
                fontWeight={item.isBold ? 'bold' : '500'}
              >
                {item.text}
              </text>
            </g>
          ))}

          {/* ĐƯỜNG ĐỒ THỊ CHÍNH (P/E HOẶC P/B LINE) */}
          {pathString && (
            <path
              d={pathString}
              fill="none"
              stroke={`url(#lineGrad-${type}-${isModal ? 'modal' : 'main'})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Con trỏ Hover tương tác */}
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
                fill="#818cf8"
                fillOpacity="0.3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="3.5"
                fill="#ffffff"
                stroke="#818cf8"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* TOOLTIP DANH SÁCH CHI TIẾT */}
        {activePoint && (
          <div
            className="pointer-events-none absolute top-3 z-30 rounded-xl border border-white/15 bg-[#181c26]/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all duration-75 min-w-[170px]"
            style={{
              left:
                activePoint.x > padLeft + plotWidth * 0.55
                  ? `${Math.max(5, ((activePoint.x - 190) / svgWidth) * 100)}%`
                  : `${Math.min(70, ((activePoint.x + 20) / svgWidth) * 100)}%`,
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

export function ValuationChartsSection({ initialValuation }: ValuationChartsSectionProps) {
  const [data, setData] = useState<ValuationFilterResult | null>(initialValuation || null)
  const [period, setPeriod] = useState<string>('10y')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const [modalChart, setModalChart] = useState<'PE' | 'PB' | null>(null)

  useEffect(() => {
    if (initialValuation?.current?.ymd && initialValuation?.points?.length) {
      setFromDate(initialValuation.points[0]?.ymd || '')
      setToDate(initialValuation.current.ymd || '')
    }
  }, [initialValuation])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalChart(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePeriodChange = async (newPeriod: string) => {
    setPeriod(newPeriod)
    setLoading(true)

    try {
      const res = await fetch(`/api/market/pe-pb?period=${newPeriod}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        if (json.data.points?.length) {
          setFromDate(json.data.points[0]?.ymd || '')
          setToDate(json.data.current?.ymd || '')
        }
      }
    } catch (err) {
      console.error('[Valuation] Period change error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomDateFilter = async () => {
    if (!fromDate || !toDate) return
    setPeriod('')
    setLoading(true)

    try {
      const res = await fetch(`/api/market/pe-pb?from=${fromDate}&to=${toDate}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch (err) {
      console.error('[Valuation] Date filter error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleModalDownload = () => {
    if (!modalChart) return
    const modalSvg = document.querySelector('#modal-chart-container svg') as SVGSVGElement
    const fileName = `${modalChart}_VNINDEX_EXPANDED_${new Date().toISOString().slice(0, 10)}`
    exportSvgToPng(modalSvg, fileName)
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Date Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#161a23] p-1 shadow-sm">
          {PRESETS.map((p) => {
            const active = period === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePeriodChange(p.key)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                  active
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Date Inputs & Latest Date Info */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8B98A5]">Từ</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#161a23] px-2 py-1 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-[#8B98A5]">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#161a23] px-2 py-1 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCustomDateFilter}
              className="rounded-lg border border-white/10 bg-[#212631] px-2.5 py-1 text-xs font-semibold text-[#F0F3F6] hover:bg-white/10 transition-colors cursor-pointer"
            >
              Lọc
            </button>
          </div>

          {data?.latestDate && (
            <span className="text-xs text-[#9EACB9]">
              Dữ liệu cập nhật đến ngày: <strong className="font-mono text-[#F0F3F6]">{data.latestDate}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Grid 2 Biểu Đồ PE & PB Vector Sắc Nét */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ValuationSvgChart
          type="PE"
          titleSummary={data?.peTitleSummary || ''}
          stats={data?.peStats || null}
          dataPoints={data?.points || []}
          loading={loading}
          onMaximize={() => setModalChart('PE')}
        />
        <ValuationSvgChart
          type="PB"
          titleSummary={data?.pbTitleSummary || ''}
          stats={data?.pbStats || null}
          dataPoints={data?.points || []}
          loading={loading}
          onMaximize={() => setModalChart('PB')}
        />
      </div>

      {/* MODAL PHÓNG TO TOÀN MÀN HÌNH (POPUP MODAL) */}
      {modalChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setModalChart(null)}
        >
          <div
            className="relative flex flex-col w-full max-w-5xl rounded-3xl border border-white/20 bg-[#161a23] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            id="modal-chart-container"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Maximize2 className="size-4" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#F0F3F6]">
                    {modalChart === 'PE' ? 'PE VN-Index Lịch Sử' : 'PB VN-Index Lịch Sử'}
                  </h3>
                  <p className="text-xs text-[#9EACB9]">
                    {modalChart === 'PE' ? data?.peTitleSummary : data?.pbTitleSummary}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Tải về + Đóng */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleModalDownload}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#F0F3F6] hover:bg-white/15 transition-colors cursor-pointer shadow-sm"
                  title="Tải ảnh PNG"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalChart(null)}
                  className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                  aria-label="Đóng popup"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Chart Body */}
            <div className="w-full">
              {modalChart === 'PE' ? (
                <ValuationSvgChart
                  type="PE"
                  titleSummary={data?.peTitleSummary || ''}
                  stats={data?.peStats || null}
                  dataPoints={data?.points || []}
                  loading={loading}
                  isModal={true}
                />
              ) : (
                <ValuationSvgChart
                  type="PB"
                  titleSummary={data?.pbTitleSummary || ''}
                  stats={data?.pbStats || null}
                  dataPoints={data?.points || []}
                  loading={loading}
                  isModal={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
