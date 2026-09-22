'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createTextWatermark,
  Time,
} from 'lightweight-charts'
import type { CandleDataPoint } from '@/lib/stock-price-history-service'
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Activity,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TradingViewCandleChartProps {
  symbol: string
  companyName?: string
  initialCandles?: CandleDataPoint[]
  height?: number
  className?: string
  defaultTimeframe?: '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'
  showToolbar?: boolean
}

type TimeframeOption = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'

function formatCompactNumber(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return '—'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString('vi-VN')
}

export function TradingViewCandleChart({
  symbol,
  companyName,
  initialCandles,
  className,
  defaultTimeframe = '6M',
  showToolbar = true,
}: TradingViewCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const hasFittedRef = useRef<boolean>(false)

  const [candles, setCandles] = useState<CandleDataPoint[]>(initialCandles || [])
  const [loading, setLoading] = useState<boolean>(!initialCandles || initialCandles.length === 0)
  const [error, setError] = useState<string | null>(null)

  // Chỉ báo hiển thị
  const [showMA20, setShowMA20] = useState<boolean>(true)
  const [showMA50, setShowMA50] = useState<boolean>(true)
  const [showVolume, setShowVolume] = useState<boolean>(true)

  // Khung thời gian đang chọn
  const [timeframe, setTimeframe] = useState<TimeframeOption>(defaultTimeframe)

  // Trạng thái Fullscreen
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Dữ liệu hiển thị tại con trỏ (hover) hoặc nến mới nhất
  const [legendData, setLegendData] = useState<{
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    change: number
    changePct: number
    ma20?: number
    ma50?: number
  } | null>(null)

  // 1. Nạp dữ liệu nến nếu chưa có sẵn từ SSR
  useEffect(() => {
    let isMounted = true

    if (initialCandles && initialCandles.length > 0) {
      setCandles(initialCandles)
      setLoading(false)
      return
    }

    async function fetchCandles() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}/prices?format=candles&years=5`)
        if (!res.ok) {
          throw new Error(`Không thể nạp dữ liệu nến cho ${symbol}`)
        }
        const data = await res.json()
        if (isMounted) {
          if (data && Array.isArray(data.candles) && data.candles.length > 0) {
            setCandles(data.candles)
          } else {
            setError(`Chưa có dữ liệu nến cho mã ${symbol}`)
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[TradingViewChart] Lỗi tải dữ liệu:', err)
          setError(err.message || 'Lỗi khi tải dữ liệu biểu đồ')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchCandles()
    return () => {
      isMounted = false
    }
  }, [symbol, initialCandles])

  // 2. Đảm bảo nến luôn được khử trùng lặp ngày và sắp xếp tăng dần nghiêm ngặt theo thời gian
  const validCandles = useMemo(() => {
    if (!candles || candles.length === 0) return []
    const map = new Map<string, CandleDataPoint>()
    for (const c of candles) {
      if (!c || !c.time || typeof c.time !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.time)) continue
      if (map.has(c.time)) {
        const existing = map.get(c.time)!
        existing.high = Math.max(existing.high, c.high)
        existing.low = Math.min(existing.low, c.low)
        existing.close = c.close
        existing.volume = (existing.volume || 0) + (c.volume || 0)
      } else {
        map.set(c.time, { ...c })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time))
  }, [candles])

  // 3. Tính toán danh sách MA20 và MA50
  const { ma20Data, ma50Data } = useMemo(() => {
    if (!validCandles || validCandles.length === 0) return { ma20Data: [], ma50Data: [] }

    const ma20: { time: string; value: number }[] = []
    const ma50: { time: string; value: number }[] = []

    for (let i = 0; i < validCandles.length; i++) {
      // MA20
      if (i >= 19) {
        let sum = 0
        for (let j = i - 19; j <= i; j++) sum += validCandles[j].close
        ma20.push({ time: validCandles[i].time, value: Math.round((sum / 20) * 100) / 100 })
      }
      // MA50
      if (i >= 49) {
        let sum = 0
        for (let j = i - 49; j <= i; j++) sum += validCandles[j].close
        ma50.push({ time: validCandles[i].time, value: Math.round((sum / 50) * 100) / 100 })
      }
    }

    return { ma20Data: ma20, ma50Data: ma50 }
  }, [validCandles])

  // Cập nhật nến mặc định vào Legend
  useEffect(() => {
    if (!validCandles || validCandles.length === 0) return
    const last = validCandles[validCandles.length - 1]
    const prev = validCandles.length > 1 ? validCandles[validCandles.length - 2] : null
    const chg = prev ? last.close - prev.close : 0
    const chgPct = prev && prev.close > 0 ? (chg / prev.close) * 100 : 0
    const lastMA20 = ma20Data.length > 0 ? ma20Data[ma20Data.length - 1]?.value : undefined
    const lastMA50 = ma50Data.length > 0 ? ma50Data[ma50Data.length - 1]?.value : undefined

    setLegendData({
      date: last.dateStr || last.time,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      change: Math.round(chg * 100) / 100,
      changePct: Math.round(chgPct * 100) / 100,
      ma20: lastMA20,
      ma50: lastMA50,
    })
  }, [validCandles, ma20Data, ma50Data])

  // 4. Hàm áp dụng phạm vi thời gian (Timeframe) theo số phiên (Logical Range)
  const applyTimeframeRange = useCallback((tf: TimeframeOption, chartInstance?: IChartApi) => {
    const chart = chartInstance || chartRef.current
    if (!chart || validCandles.length === 0) return

    const total = validCandles.length
    if (tf === 'ALL') {
      chart.timeScale().fitContent()
      return
    }

    // Số phiên giao dịch thực tế
    let barCount = 130
    if (tf === '1M') barCount = 22
    else if (tf === '3M') barCount = 66
    else if (tf === '6M') barCount = 130
    else if (tf === '1Y') barCount = 252
    else if (tf === '3Y') barCount = 756

    if (total <= barCount) {
      chart.timeScale().fitContent()
      return
    }

    try {
      chart.timeScale().setVisibleLogicalRange({
        from: total - barCount,
        to: total + 5,
      })
    } catch {
      chart.timeScale().fitContent()
    }
  }, [validCandles])

  // 5. Khởi tạo biểu đồ Lightweight Charts
  useEffect(() => {
    if (!containerRef.current || validCandles.length === 0) return

    // Dọn dẹp biểu đồ cũ nếu có
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const container = containerRef.current
    hasFittedRef.current = false

    // Khởi tạo biểu đồ Dark Theme tối ưu giống FireAnt & TradingView
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#9b9fae',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.45)', style: LineStyle.Dashed },
        horzLines: { color: 'rgba(42, 46, 57, 0.45)', style: LineStyle.Dashed },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#758696',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2a2e39',
        },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.08,
          bottom: 0.22, // 22% đáy cho khối lượng Volume
        },
        alignLabels: true,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#2a2e39',
        rightOffset: 12,
        barSpacing: 9,
        minBarSpacing: 2,
        fixLeftEdge: false,
        visible: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false, // Để cuộn trang mượt mà trên điện thoại
      },
    })
    chartRef.current = chart

    // Watermark chữ mờ mã cổ phiếu ở giữa đồ thị
    try {
      const firstPane = chart.panes()[0]
      if (firstPane) {
        createTextWatermark(firstPane, {
          lines: [
            {
              text: symbol.toUpperCase(),
              color: 'rgba(255, 255, 255, 0.045)',
              fontSize: 72,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontStyle: 'bold',
              lineHeight: 76,
            },
          ],
        })
      }
    } catch {}

    // 1. Thêm Series Nến Nhật (Candlestick Series)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',           // Xanh ngọc TradingView
      downColor: '#ef5350',         // Đỏ san hô TradingView
      borderVisible: true,
      borderColor: '#26a69a',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickVisible: true,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    })
    candleSeriesRef.current = candleSeries

    candleSeries.setData(
      validCandles.map((c) => ({
        time: c.time as unknown as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    )

    // 2. Thêm Series Khối Lượng (Volume Histogram)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay cùng pane với nến
    })
    volumeSeriesRef.current = volumeSeries

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // 20% chân đồ thị
        bottom: 0,
      },
    })

    volumeSeries.setData(
      validCandles.map((c) => ({
        time: c.time as unknown as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
      }))
    )

    // 3. Thêm đường MA20 (Line Series)
    const ma20Series = chart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    })
    ma20SeriesRef.current = ma20Series
    ma20Series.setData(ma20Data.map((m) => ({ time: m.time as unknown as Time, value: m.value })))

    // 4. Thêm đường MA50 (Line Series)
    const ma50Series = chart.addSeries(LineSeries, {
      color: '#FF9800',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    })
    ma50SeriesRef.current = ma50Series
    ma50Series.setData(ma50Data.map((m) => ({ time: m.time as unknown as Time, value: m.value })))

    // 5. Đăng ký sự kiện Crosshair Move để cập nhật Legend O, H, L, C, Vol
    const candleMap = new Map<string, CandleDataPoint>()
    validCandles.forEach((c) => candleMap.set(c.time, c))

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        // Khôi phục nến mới nhất khi chuột rời vùng vẽ
        const last = validCandles[validCandles.length - 1]
        if (last) {
          const prev = validCandles.length > 1 ? validCandles[validCandles.length - 2] : null
          const chg = prev ? last.close - prev.close : 0
          const chgPct = prev && prev.close > 0 ? (chg / prev.close) * 100 : 0
          setLegendData({
            date: last.dateStr || last.time,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume,
            change: Math.round(chg * 100) / 100,
            changePct: Math.round(chgPct * 100) / 100,
            ma20: ma20Data[ma20Data.length - 1]?.value,
            ma50: ma50Data[ma50Data.length - 1]?.value,
          })
        }
        return
      }

      const timeKey = typeof param.time === 'string'
        ? param.time
        : typeof (param.time as any)?.year === 'number'
        ? `${(param.time as any).year}-${String((param.time as any).month).padStart(2, '0')}-${String((param.time as any).day).padStart(2, '0')}`
        : String(param.time)

      const pointCandle = candleMap.get(timeKey)
      const candleData = param.seriesData.get(candleSeries) as any
      const volData = param.seriesData.get(volumeSeries) as any
      const ma20Val = param.seriesData.get(ma20Series) as any
      const ma50Val = param.seriesData.get(ma50Series) as any

      if (candleData && candleData.close != null) {
        const o = candleData.open ?? 0
        const c = candleData.close ?? 0
        const chg = c - o
        const chgPct = o > 0 ? (chg / o) * 100 : 0
        setLegendData({
          date: pointCandle?.dateStr || timeKey,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || pointCandle?.volume || 0,
          change: Math.round(chg * 100) / 100,
          changePct: Math.round(chgPct * 100) / 100,
          ma20: ma20Val?.value,
          ma50: ma50Val?.value,
        })
      }
    })

    // 6. Tự động co giãn theo kích thước thực của DOM bằng ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width, height })
          if (!hasFittedRef.current) {
            hasFittedRef.current = true
            applyTimeframeRange(timeframe, chartRef.current)
          }
        }
      }
    })
    ro.observe(container)

    // Khởi tạo khung nhìn
    chart.timeScale().fitContent()
    const fitTimer = setTimeout(() => {
      if (chartRef.current) {
        applyTimeframeRange(timeframe, chartRef.current)
      }
    }, 80)

    return () => {
      clearTimeout(fitTimer)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      ma20SeriesRef.current = null
      ma50SeriesRef.current = null
    }
  }, [validCandles, ma20Data, ma50Data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cập nhật hiển thị chỉ báo MA20, MA50, Volume khi toggle
  useEffect(() => {
    if (ma20SeriesRef.current) {
      ma20SeriesRef.current.applyOptions({ visible: showMA20 })
    }
  }, [showMA20])

  useEffect(() => {
    if (ma50SeriesRef.current) {
      ma50SeriesRef.current.applyOptions({ visible: showMA50 })
    }
  }, [showMA50])

  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume })
    }
  }, [showVolume])

  // Xử lý đổi timeframe từ thanh nút bấm
  const handleTimeframeClick = (tf: TimeframeOption) => {
    setTimeframe(tf)
    applyTimeframeRange(tf)
  }

  // Đặt lại góc nhìn vừa vặn toàn bộ
  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
      setTimeframe('ALL')
    }
  }

  // Bật/tắt chế độ toàn màn hình
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
    setTimeout(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
        chartRef.current.timeScale().fitContent()
      }
    }, 100)
  }

  const isUp = legendData ? legendData.close >= legendData.open : true

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border border-[#2B2B43] bg-[#131722] text-[#d1d4dc] transition-all overflow-hidden shadow-lg',
        isFullscreen
          ? 'fixed inset-0 z-[9999] h-screen w-screen rounded-none border-0'
          : 'w-full h-[540px] sm:h-[620px] lg:h-[680px]',
        className
      )}
    >
      {/* ── 1. HEADER TOOLBAR BIỂU ĐỒ (TỐI ƯU DESKTOP & MOBILE) ── */}
      {showToolbar && (
        <div className="flex flex-col gap-1.5 border-b border-[#2A2E39] bg-[#1E222D]/95 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md shrink-0">
          {/* Hàng 1: Mã CK + Thị giá + Biến động (Trái) & Nút Tiện ích Reset/Fullscreen (Phải) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 font-mono text-xs font-black text-emerald-400 shrink-0">
                {symbol.slice(0, 3)}
              </div>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-mono text-sm sm:text-base font-black tracking-wide text-white">
                  {symbol}
                </span>
                {companyName && (
                  <span className="hidden md:inline text-xs text-muted-foreground/75 truncate max-w-[180px]">
                    {companyName}
                  </span>
                )}
              </div>

              {/* Giá hiện tại & Biến động */}
              {legendData && (
                <div className="flex items-center gap-1.5 font-mono ml-1">
                  <span
                    className={cn(
                      'text-sm sm:text-base font-black',
                      isUp ? 'text-[#26a69a]' : 'text-[#ef5350]'
                    )}
                  >
                    {legendData.close.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] sm:text-xs font-bold flex items-center',
                      isUp ? 'text-[#26a69a]' : 'text-[#ef5350]'
                    )}
                  >
                    {legendData.change >= 0 ? '+' : ''}
                    {legendData.change.toFixed(2)} ({legendData.changePct >= 0 ? '+' : ''}
                    {legendData.changePct.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>

            {/* Nút tiện ích bên phải: Reset Zoom & Fullscreen */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetZoom}
                className="flex size-7 sm:size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                title="Đặt lại góc nhìn vừa vặn toàn bộ"
                aria-label="Đặt lại góc nhìn vừa vặn toàn bộ"
              >
                <RotateCcw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex size-7 sm:size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Hàng 2: Bộ chọn Timeframe + Toggle Chỉ báo (Cuộn ngang êm ái trên mobile) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-0.5 touch-pan-x">
            {/* Bộ chọn khung thời gian */}
            <div className="flex items-center rounded-lg bg-[#131722] p-0.5 border border-[#2A2E39] shrink-0">
              {(['1M', '3M', '6M', '1Y', '3Y', 'ALL'] as TimeframeOption[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => handleTimeframeClick(tf)}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer touch-manipulation',
                    timeframe === tf
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Bật/Tắt Chỉ Báo (MA20, MA50, Volume) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowMA20((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer touch-manipulation',
                  showMA20
                    ? 'bg-[#2962FF]/20 text-[#2962FF] border border-[#2962FF]/40'
                    : 'text-muted-foreground/60 hover:text-muted-foreground bg-transparent'
                )}
                title="Đường trung bình MA20"
              >
                <span className="size-1.5 rounded-full bg-[#2962FF]" />
                MA20
              </button>
              <button
                type="button"
                onClick={() => setShowMA50((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer touch-manipulation',
                  showMA50
                    ? 'bg-[#FF9800]/20 text-[#FF9800] border border-[#FF9800]/40'
                    : 'text-muted-foreground/60 hover:text-muted-foreground bg-transparent'
                )}
                title="Đường trung bình MA50"
              >
                <span className="size-1.5 rounded-full bg-[#FF9800]" />
                MA50
              </button>
              <button
                type="button"
                onClick={() => setShowVolume((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer touch-manipulation',
                  showVolume
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-muted-foreground/60 hover:text-muted-foreground bg-transparent'
                )}
                title="Cột Khối Lượng Khớp Lệnh"
              >
                Vol
              </button>
            </div>
          </div>

          {/* Hàng 3: Chi tiết O, H, L, C, V Legend */}
          {legendData && (
            <div className="flex items-center gap-x-2.5 gap-y-1 overflow-x-auto scrollbar-none font-mono text-[10px] sm:text-[11px] text-[#787b86] pt-0.5 border-t border-[#2A2E39]/40 touch-pan-x">
              <div className="text-white/80 shrink-0 font-semibold">
                {legendData.date}
              </div>
              <div className="shrink-0">
                <span className="text-muted-foreground/60">O: </span>
                <span className="text-white font-medium">{legendData.open.toFixed(2)}</span>
              </div>
              <div className="shrink-0">
                <span className="text-muted-foreground/60">H: </span>
                <span className="text-white font-medium">{legendData.high.toFixed(2)}</span>
              </div>
              <div className="shrink-0">
                <span className="text-muted-foreground/60">L: </span>
                <span className="text-white font-medium">{legendData.low.toFixed(2)}</span>
              </div>
              <div className="shrink-0">
                <span className="text-muted-foreground/60">C: </span>
                <span className={cn("font-bold", isUp ? 'text-[#26a69a]' : 'text-[#ef5350]')}>{legendData.close.toFixed(2)}</span>
              </div>
              <div className="shrink-0">
                <span className="text-muted-foreground/60">V: </span>
                <span className="text-white font-medium">
                  {formatCompactNumber(legendData.volume)}
                </span>
              </div>
              {showMA20 && legendData.ma20 != null && (
                <div className="text-[#2962FF] font-semibold shrink-0">
                  <span>MA20: </span>
                  <span>{legendData.ma20.toFixed(2)}</span>
                </div>
              )}
              {showMA50 && legendData.ma50 != null && (
                <div className="text-[#FF9800] font-semibold shrink-0">
                  <span>MA50: </span>
                  <span>{legendData.ma50.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 2. KHU VỰC CANVAS RENDER BIỂU ĐỒ ── */}
      <div className="relative w-full flex-1 touch-pan-y overflow-hidden">
        {/* Container render của Lightweight Charts */}
        <div
          ref={containerRef}
          className="w-full h-full touch-pan-y"
        />

        {/* Trạng thái nạp dữ liệu */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#131722]/80 backdrop-blur-xs">
            <Loader2 className="size-7 animate-spin text-emerald-400" />
            <span className="font-mono text-xs text-muted-foreground">
              Đang tải nến kỹ thuật {symbol}...
            </span>
          </div>
        )}

        {/* Thông báo lỗi nếu nạp thất bại */}
        {error && !loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#131722]/90 p-4 text-center">
            <Activity className="size-8 text-rose-400" />
            <p className="text-sm font-semibold text-rose-300">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                setError(null)
              }}
              className="mt-2 rounded-xl bg-primary/20 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/30 transition-all cursor-pointer"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {/* Logo TradingView đặc trưng góc dưới trái */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none select-none flex items-center gap-1.5 px-1.5 py-1 rounded bg-[#131722]/80 border border-[#2A2E39]/60 backdrop-blur-xs">
          <svg className="size-4 text-white" viewBox="0 0 36 28" fill="currentColor">
            <path d="M14 22H7V11H14V22ZM21 22H15V6H21V22ZM28 22H22V16H28V22ZM0 25.5C0 26.88 1.12 28 2.5 28H33.5C34.88 28 36 26.88 36 25.5V2.5C36 1.12 34.88 0 33.5 0H2.5C1.12 0 0 1.12 0 2.5V25.5Z" />
          </svg>
          <span className="font-mono text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
            TradingView
          </span>
        </div>
      </div>
    </div>
  )
}
