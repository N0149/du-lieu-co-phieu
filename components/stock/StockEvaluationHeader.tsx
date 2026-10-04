'use client'

import React from 'react'
import type { StockEvaluationData } from '@/lib/stock-evaluation-service'
import type { StockDetailData } from '@/lib/longlivestock'
import { ArrowDown, ArrowUp, Minus, Sparkles, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockEvaluationHeaderProps {
  stockData: StockDetailData
  evaluationData?: StockEvaluationData | null
  priceChanges: {
    y1: number | null
    ytd: number | null
    lastDate: string | null
  }
  ktplRate?: number | null
  isVip?: boolean
  onToggleVip?: () => void
  onOpenPaywall?: () => void
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function formatVolumeTcbs(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val) || val <= 0) return '—'
  if (val >= 1_000_000_000) {
    const v = val / 1_000_000_000
    return `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ cổ`
  }
  if (val >= 1_000_000) {
    const v = val / 1_000_000
    return `${v.toLocaleString('vi-VN', { maximumFractionDigits: v >= 10 ? 0 : 1 })} triệu cổ`
  }
  if (val >= 1_000) {
    const v = val / 1_000
    return `${v.toLocaleString('vi-VN', { maximumFractionDigits: v >= 10 ? 0 : 1 })} nghìn cổ`
  }
  return `${Number(val).toLocaleString('vi-VN')} cổ`
}

export function StockEvaluationHeader({
  stockData,
  evaluationData,
  priceChanges,
  ktplRate = null,
  isVip: isVipProp,
  onToggleVip,
  onOpenPaywall,
}: StockEvaluationHeaderProps) {

  const { market, valuation, ticker, financials = [] } = stockData

  // Quản lý trạng thái Thu gọn (Compact) / Mở rộng (Expanded)
  // Mặc định thu gọn (true) để tiết kiệm tối đa diện tích màn hình
  const [isCompact, setIsCompact] = React.useState<boolean>(true)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('stock_header_compact')
      if (saved !== null) {
        setIsCompact(saved === 'true')
      }
    } catch {}
  }, [])

  const toggleCompact = () => {
    setIsCompact((prev) => {
      const next = !prev
      try {
        localStorage.setItem('stock_header_compact', String(next))
      } catch {}
      return next
    })
  }

  // 1. Quản lý trạng thái Giá thời gian thực (Live Quote)
  const [liveData, setLiveData] = React.useState<{
    price: number | null
    change: number | null
    changePct: number | null
    tradingDate: string | null
  }>({
    price: evaluationData?.price != null ? evaluationData.price : market.price != null ? market.price * 1000 : null,
    change: evaluationData?.priceChange ?? null,
    changePct: evaluationData?.priceChangePct ?? null,
    tradingDate: evaluationData?.tradingDate ?? null,
  })

  // Đồng bộ khi props evaluationData thay đổi từ server
  React.useEffect(() => {
    if (evaluationData) {
      setLiveData({
        price: evaluationData.price != null ? evaluationData.price : market.price != null ? market.price * 1000 : null,
        change: evaluationData.priceChange ?? null,
        changePct: evaluationData.priceChangePct ?? null,
        tradingDate: evaluationData.tradingDate ?? null,
      })
    }
  }, [evaluationData, market.price])

  // Tự động làm mới giá mỗi 60 giây khi người dùng đang mở tab
  React.useEffect(() => {
    let timer: any = null
    const fetchLiveQuote = async () => {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/stock/${ticker}/live-quote`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.price > 0) {
            setLiveData({
              price: data.price,
              change: data.change,
              changePct: data.changePercent,
              tradingDate: data.tradingDate,
            })
          }
        }
      } catch {}
    }

    timer = setInterval(fetchLiveQuote, 60000)
    return () => clearInterval(timer)
  }, [ticker])

  // 1b. Khối lượng giao dịch bình quân 15 ngày (KLGD TB15D)
  const [vol15d, setVol15d] = React.useState<number | null>(evaluationData?.metrics?.volume10d ?? null)

  React.useEffect(() => {
    if (evaluationData?.metrics?.volume10d && evaluationData.metrics.volume10d > 0) {
      setVol15d(evaluationData.metrics.volume10d)
      return
    }
    // Fallback: nếu server chưa có, nạp từ API lịch sử giá 15 ngày gần nhất
    let isMounted = true
    fetch(`/api/stock/${ticker}/prices?years=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.points)) return
        const last15 = data.points.slice(-15)
        if (last15.length > 0) {
          const sum = last15.reduce((acc: number, p: any) => acc + (Number(p.volume) || 0), 0)
          const avg = Math.round(sum / last15.length)
          if (avg > 0) setVol15d(avg)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [ticker, evaluationData?.metrics?.volume10d])

  const currentPrice = liveData.price ?? (evaluationData?.price != null ? evaluationData.price : market.price != null ? market.price * 1000 : 11000)
  const priceDisplay = Number(currentPrice).toLocaleString('vi-VN', { maximumFractionDigits: 0 })

  // Biến động trong phiên
  const changeVal = liveData.change ?? evaluationData?.priceChange ?? 0
  const changePct = liveData.changePct ?? evaluationData?.priceChangePct ?? 0

  const isDown = changeVal < 0 || changePct < 0
  const isUp = changeVal > 0 || changePct > 0

  // Định dạng hiển thị biến động giá tuyệt đối: e.g. -1,30 hoặc +0,50 hoặc 0,00
  const changeDisplay = (isUp ? '+' : '') + Number(changeVal).toLocaleString('vi-VN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Ngày chốt phiên
  const dateDisplay = liveData.tradingDate || evaluationData?.tradingDate || priceChanges.lastDate

  // 2. Tính toán & chuẩn hóa 9 chỉ tiêu cơ bản chuẩn theo mẫu ảnh
  const m = evaluationData?.metrics
  const sharesVal = m?.sharesOut ?? 0
  let rawCap = m?.marketCap ?? market.market_cap_ty ?? 0
  if (rawCap > 10_000_000_000) rawCap = Math.round(rawCap / 1_000_000_000)
  const marketCapBn = (currentPrice > 0 && sharesVal > 0)
    ? Math.round((currentPrice * sharesVal) / 1_000_000_000)
    : rawCap

  // Vốn hóa
  const capDisplay = marketCapBn > 0
    ? `${marketCapBn.toLocaleString('vi-VN')} tỷ`
    : '—'

  // Giá trị sổ sách: Vốn chủ sở hữu (Equity) theo tỷ đồng
  const sortedFin = [...financials].sort((a, b) => b.year - a.year)
  const latestFin = sortedFin[0] || null
  const equityFromFin = latestFin?.equity && latestFin.equity > 0 ? latestFin.equity : null

  const epsVal = m?.eps ?? valuation.eps
  const bvpsVal = m?.bvps ?? valuation.bvps
  const computedFromBvps = (bvpsVal && sharesVal && bvpsVal > 0 && sharesVal > 0)
    ? Math.round((bvpsVal * sharesVal) / 1_000_000_000)
    : null

  const bookValueBn = (m?.bookValue != null && m.bookValue > 0)
    ? m.bookValue
    : (computedFromBvps ?? equityFromFin ?? null)
  const bookValueDisplay = bookValueBn != null && bookValueBn > 0
    ? `${bookValueBn.toLocaleString('vi-VN')} tỷ`
    : (bvpsVal != null && bvpsVal > 0 ? `${fmtNum(bvpsVal)} đ` : '—')

  // P/E (D)
  const peVal = (currentPrice > 0 && epsVal && epsVal > 0)
    ? currentPrice / epsVal
    : (m?.pe ?? valuation.pe)
  const peDisplay = peVal != null && peVal > 0 ? `${fmtNum(peVal, 1)} lần` : '—'

  // P/E sau KTPL (P/E thực tế điều chỉnh theo tỷ lệ trích Quỹ KTPL)
  const adjustedPeVal =
    peVal != null && peVal > 0 && ktplRate != null && ktplRate > 0 && ktplRate < 100
      ? peVal / (1 - ktplRate / 100)
      : null

  // KLGD TB15D
  const vol10dVal = vol15d ?? m?.volume10d ?? null
  const volDisplay = formatVolumeTcbs(vol10dVal)

  // EPS
  const epsDisplay = epsVal != null && epsVal !== 0 ? `${fmtNum(epsVal, Math.abs(epsVal) >= 100 ? 0 : 1)} đ` : '—'

  // P/B (D)
  const pbVal = (currentPrice > 0 && bvpsVal && bvpsVal > 0)
    ? currentPrice / bvpsVal
    : (m?.pb ?? valuation.pb)
  const pbDisplay = pbVal != null && pbVal > 0 ? `${fmtNum(pbVal, 1)} lần` : '—'

  // KLCP lưu hành (D)
  const sharesDisplay = formatVolumeTcbs(sharesVal)

  // EV/EBITDA
  const evEbitdaVal = m?.evEbitda
  const evEbitdaDisplay = evEbitdaVal != null && evEbitdaVal > 0 ? `${fmtNum(evEbitdaVal, 1)} lần` : '—'

  // Kiểm toán
  const auditorDisplay = m?.auditor || '—'

  // 3a. Danh sách 9 tiêu chí cơ bản cho Chế độ Mở rộng (3 cột x 3 hàng)
  // 3a. Danh sách 9 tiêu chí cơ bản cho Chế độ Mở rộng (3 cột x 3 hàng)
  const basicMetrics = [
    // Hàng 1
    { label: 'Vốn hóa', value: capDisplay },
    { label: 'Giá trị sổ sách', value: bookValueDisplay },
    {
      label: 'P/E báo cáo',
      value: peDisplay,
      tooltip: 'Hệ số P/E danh nghĩa theo EPS công bố trên BCTC (chưa điều chỉnh theo ĐHĐCĐ)',
    },

    // Hàng 2
    { label: 'KLGD TB15D', value: volDisplay },
    { label: 'EPS', value: epsDisplay },
    { label: 'P/B (D)', value: pbDisplay },

    // Hàng 3
    { label: 'KLCP lưu hành (D)', value: sharesDisplay },
    { label: 'EV/EBITDA', value: evEbitdaDisplay },
    { label: 'Kiểm toán', value: auditorDisplay, isAuditor: true },
  ]

  // 3b. Danh sách 11 chỉ tiêu đầy đủ cho Chế độ Thu gọn (Lưới 6 cột x 2 hàng siêu gọn)
  const compactMetrics = [
    // Hàng 1 (Desktop 6 cột): Định giá cốt lõi & ĐHĐCĐ
    {
      id: 'cap',
      label: 'Vốn hóa',
      value: capDisplay,
      tooltip: 'Vốn hóa thị trường theo giá hiện tại',
    },
    {
      id: 'bookValue',
      label: 'Giá trị sổ sách',
      value: bookValueDisplay,
      tooltip: 'Vốn chủ sở hữu theo BCTC gần nhất',
    },
    {
      id: 'pe_nominal',
      label: 'P/E báo cáo',
      value: peDisplay,
      tooltip: 'Hệ số P/E danh nghĩa theo EPS công bố trên BCTC (chưa trừ tỷ lệ trích ĐHĐCĐ)',
    },
    {
      id: 'pe_real',
      label: 'P/E thực tế',
      value: adjustedPeVal != null ? `${fmtNum(adjustedPeVal, 1)} lần` : peDisplay,
      sub: peVal != null && ktplRate != null && ktplRate > 0 ? `(Gốc: ${peDisplay})` : (ktplRate === 0 ? 'Không trích' : null),
      highlight: 'amber' as const,
      isRealPe: true,
      badgeText: '★ Chuẩn',
      tooltip: 'P/E thực tế chuẩn xác sau khi đã trừ tỷ lệ trích Quỹ KTPL & Thưởng BĐH (lợi nhuận thực cổ đông nhận)',
    },
    {
      id: 'ktpl',
      label: 'Trích ngoài CĐ',
      value: ktplRate != null ? `${ktplRate}%` : '—',
      sub: ktplRate != null && ktplRate > 0 ? 'KTPL & Thưởng' : ktplRate === 0 ? 'Cổ đông nhận đủ' : null,
      highlight: 'amber' as const,
      isKtpl: true,
      badgeText: 'ĐHĐCĐ',
      tooltip: 'Tỷ lệ LNST trích cho Quỹ KTPL, Thưởng BĐH và Thù lao HĐQT theo NQ ĐHĐCĐ (tiền không thuộc về cổ đông)',
    },
    {
      id: 'pb',
      label: 'P/B (D)',
      value: pbDisplay,
      tooltip: 'Hệ số P/B theo giá trị sổ sách',
    },

    // Hàng 2 (Desktop 6 cột): Định giá phụ, Thanh khoản & Kiểm toán
    {
      id: 'eps',
      label: 'EPS',
      value: epsDisplay,
      tooltip: 'Thu nhập trên mỗi cổ phần 4 quý gần nhất',
    },
    {
      id: 'ev_ebitda',
      label: 'EV/EBITDA',
      value: evEbitdaDisplay,
      tooltip: 'Giá trị doanh nghiệp trên EBITDA',
    },
    {
      id: 'vol15d',
      label: 'KLGD TB15D',
      value: volDisplay,
      tooltip: 'Khối lượng giao dịch khớp lệnh trung bình 15 phiên gần nhất',
    },
    {
      id: 'shares',
      label: 'CP lưu hành',
      value: sharesDisplay,
      tooltip: 'Khối lượng cổ phiếu đang lưu hành',
    },
    {
      id: 'auditor',
      label: 'Kiểm toán',
      value: auditorDisplay,
      colSpan: 2,
      highlight: auditorDisplay !== '—' ? ('orange' as const) : null,
      tooltip: 'Đơn vị kiểm toán độc lập thực hiện kiểm toán BCTC',
    },
  ]

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border bg-card shadow-xs transition-all duration-200',
        isCompact ? 'p-3 sm:px-4 sm:py-3' : 'p-4 sm:p-5'
      )}
    >
      {/* ── CHẾ ĐỘ THU GỌN (COMPACT MODE) ── */}
      {isCompact ? (
        <div className="space-y-2.5">
          {/* Hàng 1: Live Quote + ĐHĐCĐ Mini Pill + Nút chuyển chế độ */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5">
              <span
                className={cn(
                  'font-sans text-xl sm:text-2xl font-black tracking-tight tabular-nums',
                  isDown ? 'text-rose-500' : isUp ? 'text-emerald-500' : 'text-foreground'
                )}
              >
                {priceDisplay}
              </span>

              {/* Biến động giá tuyệt đối */}
              <span
                className={cn(
                  'font-sans text-xs sm:text-sm font-bold tabular-nums',
                  isDown ? 'text-rose-500' : isUp ? 'text-emerald-500' : 'text-muted-foreground'
                )}
              >
                {changeDisplay}
              </span>

              {/* Pill % thay đổi */}
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-sans text-[11px] sm:text-xs font-bold tabular-nums shadow-2xs',
                  isDown
                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                    : isUp
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isDown ? <ArrowDown className="size-3" /> : isUp ? <ArrowUp className="size-3" /> : <Minus className="size-3" />}
                <span>{Math.abs(changePct).toFixed(2)}%</span>
              </span>

              {dateDisplay && (
                <span className="text-[11px] text-muted-foreground font-medium ml-1">
                  Đóng cửa {dateDisplay}
                </span>
              )}
            </div>

            {/* Bên phải: Điểm nhấn ĐHĐCĐ & Nút Mở rộng */}
            <div className="flex items-center gap-2">
              {ktplRate != null && (
                <div
                  className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px]"
                  title="Tỷ lệ trích ngoài cổ đông theo ĐHĐCĐ & P/E thực tế"
                >
                  <Sparkles className="size-3 text-amber-500" />
                  <span className="text-muted-foreground">ĐHĐCĐ:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Trích {ktplRate}%
                  </span>
                  {adjustedPeVal != null && (
                    <>
                      <span className="text-border">|</span>
                      <span className="text-muted-foreground">P/E thực:</span>
                      <span className="font-bold text-foreground">
                        {fmtNum(adjustedPeVal, 1)}x
                      </span>
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={toggleCompact}
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-muted/50 hover:bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer select-none"
                title="Mở rộng để xem thẻ chỉ số chi tiết theo bố cục lớn"
              >
                <span>Mở rộng</span>
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Hàng 2: Lưới chỉ tiêu 6 cột x 2 hàng siêu gọn, đủ 100% thông tin */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-2 border-t border-border/50">
            {compactMetrics.map((item) => {
              // 1. Ô P/E THỰC TẾ & TRÍCH NGOÀI CỔ ĐÔNG (IN ĐẬM NỔI BẬT - ĐẶT KỀ NHAU)
              if (item.isRealPe || item.isKtpl) {
                return (
                  <div
                    key={item.id}
                    className="min-w-0 flex flex-col justify-between rounded-xl p-2 sm:p-2.5 border border-amber-500/50 bg-amber-500/[0.12] dark:bg-amber-950/35 shadow-xs ring-1 ring-amber-500/30 transition-all"
                    title={item.tooltip}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tracking-tight truncate">
                        {item.label}
                      </span>
                      {item.badgeText && (
                        <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-black bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shrink-0">
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-sans text-xs sm:text-[14.5px] font-black tabular-nums text-amber-600 dark:text-amber-300 tracking-tight truncate">
                        {item.value}
                      </span>
                      {item.sub && (
                        <span className="text-[9.5px] text-amber-700/80 dark:text-amber-300/80 font-bold truncate">
                          {item.sub}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }

              // 2. CÁC Ô CHỈ TIÊU CƠ BẢN CÒN LẠI (VỐN HÓA, SÁCH, P/E BÁO CÁO, P/B, EPS, V.V.)
              const isColSpan2 = (item as any).colSpan === 2
              return (
                <div
                  key={item.id}
                  className={cn(
                    "min-w-0 flex flex-col justify-between rounded-xl p-2 sm:p-2.5 border border-border/60 bg-muted/20 dark:bg-[#161c24]/50 shadow-2xs transition-all",
                    isColSpan2 && "col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2"
                  )}
                  title={item.tooltip}
                >
                  <span className="text-[11px] text-muted-foreground font-medium tracking-tight truncate">
                    {item.label}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={cn(
                        'font-sans text-xs sm:text-[13px] font-bold tabular-nums truncate',
                        item.highlight === 'orange'
                          ? 'text-orange-500 dark:text-orange-400 font-extrabold'
                          : 'text-foreground'
                      )}
                    >
                      {item.value}
                    </span>
                    {item.sub && (
                      <span className="text-[10px] text-muted-foreground tabular-nums truncate">
                        {item.sub}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── CHẾ ĐỘ MỞ RỘNG (EXPANDED MODE) ── */
        <div>
          {/* THANH GIÁ TRỰC TIẾP */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-4">
            <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
              <span
                className={cn(
                  'font-sans text-2xl sm:text-3xl font-black tracking-tight tabular-nums',
                  isDown ? 'text-rose-500' : isUp ? 'text-emerald-500' : 'text-foreground'
                )}
              >
                {priceDisplay}
              </span>

              {/* Biến động giá tuyệt đối */}
              <span
                className={cn(
                  'font-sans text-xs sm:text-base font-bold tabular-nums',
                  isDown ? 'text-rose-500' : isUp ? 'text-emerald-500' : 'text-muted-foreground'
                )}
              >
                {changeDisplay}
              </span>

              {/* Pill % thay đổi */}
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 sm:px-2 py-0.5 font-sans text-[11px] sm:text-xs font-bold tabular-nums shadow-xs',
                  isDown
                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                    : isUp
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isDown ? <ArrowDown className="size-3" /> : isUp ? <ArrowUp className="size-3" /> : <Minus className="size-3" />}
                <span>{Math.abs(changePct).toFixed(2)}%</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {dateDisplay && (
                <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                  Đóng cửa {dateDisplay}
                </span>
              )}
              <button
                type="button"
                onClick={toggleCompact}
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-muted/50 hover:bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer select-none"
                title="Thu gọn thẻ này để dành nhiều diện tích hơn cho bảng BCTC và biểu đồ"
              >
                <span>Thu gọn</span>
                <ChevronUp className="size-3.5" />
              </button>
            </div>
          </div>

          {/* BẢNG CHỈ TIÊU & CỘT VIP PHÍA PHẢI */}
          <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-6 lg:gap-8 pt-1">
            {/* 3 CỘT TIÊU CHÍ CƠ BẢN (9 CHỈ TIÊU) */}
            <div className="flex-1 grid grid-cols-3 gap-x-3 sm:gap-x-6 lg:gap-x-10 gap-y-3 sm:gap-y-3.5">
              {basicMetrics.map((item) => {
                const isHighlight = item.isAuditor && item.value !== '—'
                return (
                  <div key={item.label} className="min-w-0 flex flex-col" title={(item as any).tooltip}>
                    <span className="text-xs sm:text-[13px] text-muted-foreground font-normal tracking-tight truncate">
                      {item.label}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5 sm:mt-1">
                      <span
                        className={cn(
                          'font-sans text-xs sm:text-sm md:text-base font-bold tabular-nums truncate',
                          isHighlight
                            ? 'text-orange-400 dark:text-orange-400 font-extrabold'
                            : 'text-foreground'
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* MỤC RIÊNG: ĐHĐCĐ & ĐỊNH GIÁ THỰC */}
            <div className="w-full md:w-56 lg:w-64 xl:w-72 shrink-0 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-card p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              {/* Header nhỏ */}
              <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5">
                  <span className="flex size-5 items-center justify-center rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Sparkles className="size-3" />
                  </span>
                  <span className="font-sans text-[11px] font-bold text-foreground uppercase tracking-wide">
                    ĐHĐCĐ &amp; Định Giá Thực
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Trải Nghiệm
                </span>
              </div>

              {/* Nội dung 2 mục */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 py-1.5">
                {/* Mục 1: Tỷ lệ trích ngoài cổ đông */}
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium truncate" title="Tỷ lệ LNST trích cho Quỹ KTPL, Thưởng Ban điều hành/NQL và Thù lao HĐQT/BKS">
                    Trích Ngoài Cổ Đông (ĐHĐCĐ)
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-sans text-xs sm:text-sm md:text-base font-black tabular-nums text-amber-600 dark:text-amber-400">
                      {ktplRate != null ? `${ktplRate}%` : '—'}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate" title="Gồm KTPL, Thưởng BĐH và Thù lao HĐQT">
                      {ktplRate != null && ktplRate > 0 ? 'KTPL & Thưởng' : ktplRate === 0 ? 'Cổ đông nhận đủ' : 'chưa có'}
                    </span>
                  </div>
                </div>

                {/* Mục 2: P/E Thực Tế */}
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-amber-500 dark:text-amber-400 font-bold truncate" title="P/E thực tế tính trên phần Lợi nhuận sau thuế mà Cổ đông thực nhận">
                      P/E Thực Tế (Sau Trích Lập)
                    </span>
                    <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-black bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                      ★ Chuẩn
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-sans text-xs sm:text-sm md:text-base font-black tabular-nums text-amber-500 dark:text-amber-300">
                      {adjustedPeVal != null ? `${fmtNum(adjustedPeVal, 1)} lần` : peDisplay}
                    </span>
                    {peVal != null && ktplRate != null && ktplRate > 0 && (
                      <span className="text-[10px] text-muted-foreground line-through decoration-rose-500 decoration-[1.5px]" title="P/E danh nghĩa chưa trừ các khoản trích ngoài cổ đông là sai">
                        (Gốc: {peDisplay})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer nhỏ */}
              <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">Lợi nhuận thực nhận cổ đông</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">✓ Đầy đủ</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
