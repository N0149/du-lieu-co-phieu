'use client'

import React from 'react'
import type { StockEvaluationData } from '@/lib/stock-evaluation-service'
import type { StockDetailData } from '@/lib/longlivestock'
import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react'
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

  const bookValueBn = equityFromFin ?? computedFromBvps ?? (m?.bookValue && sharesVal ? Math.round((m.bookValue * sharesVal) / 1_000_000_000) : null)
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
  const epsDisplay = epsVal != null && epsVal !== 0 ? `${fmtNum(epsVal, 1)} VND` : '—'

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

  // 3. Danh sách 9 tiêu chí xếp theo 3 cột x 3 hàng đúng thứ tự trong ảnh
  // Cột 1: Vốn hóa, KLGD TB15D, KLCP lưu hành (D)
  // Cột 2: Giá trị sổ sách, EPS, EV/EBITDA
  // Cột 3: P/E (D), P/B (D), Kiểm toán
  const basicMetrics = [
    // Hàng 1
    { label: 'Vốn hóa', value: capDisplay },
    { label: 'Giá trị sổ sách', value: bookValueDisplay },
    { label: 'P/E (D)', value: peDisplay },

    // Hàng 2
    { label: 'KLGD TB15D', value: volDisplay },
    { label: 'EPS', value: epsDisplay },
    { label: 'P/B (D)', value: pbDisplay },

    // Hàng 3
    { label: 'KLCP lưu hành (D)', value: sharesDisplay },
    { label: 'EV/EBITDA', value: evEbitdaDisplay },
    { label: 'Kiểm toán', value: auditorDisplay, isAuditor: true },
  ]

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
      {/* ── THANH GIÁ TRỰC TIẾP (LIVE QUOTE) ── */}
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

        {dateDisplay && (
          <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
            Đóng cửa {dateDisplay}
          </span>
        )}
      </div>

      {/* ── BẢNG CHỈ TIÊU & CỘT VIP PHÍA PHẢI (CHỖ KHOANH ĐỎ) ── */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-6 lg:gap-8 pt-1">
        {/* 3 CỘT TIÊU CHÍ CƠ BẢN (9 CHỈ TIÊU) */}
        <div className="flex-1 grid grid-cols-3 gap-x-3 sm:gap-x-6 lg:gap-x-10 gap-y-3 sm:gap-y-3.5">
          {basicMetrics.map((item) => {
            const isHighlight = item.isAuditor && item.value !== '—'
            return (
              <div key={item.label} className="min-w-0 flex flex-col">
                <span className="text-xs sm:text-[13px] text-muted-foreground font-normal tracking-tight truncate">
                  {item.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 sm:mt-1 font-sans text-xs sm:text-sm md:text-base font-bold tabular-nums truncate',
                    isHighlight
                      ? 'text-orange-400 dark:text-orange-400 font-extrabold'
                      : 'text-foreground'
                  )}
                >
                  {item.value}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── MỤC RIÊNG: ĐẶT VÀO ĐÚNG KHU VỰC KHOANH ĐỎ GỌN GÀNG (MỞ MIỄN PHÍ TRẢI NGHIỆM ĐẦY ĐỦ) ── */}
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

          {/* Nội dung 2 mục: Tỷ lệ trích ngoài cổ đông và P/E thực tế (Hiển thị đầy đủ 100%) */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 py-1.5">
            {/* Mục 1: Tỷ lệ trích ngoài cổ đông (KTPL, Thưởng BĐH, Thù lao HĐQT) */}
            <div className="min-w-0 flex flex-col">
              <span className="text-xs text-muted-foreground font-medium truncate" title="Tỷ lệ LNST trích cho Quỹ KTPL, Thưởng Ban điều hành/NQL và Thù lao HĐQT/BKS">
                Trích Ngoài Cổ Đông (ĐHĐCĐ)
              </span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-sans text-xs sm:text-sm md:text-base font-black tabular-nums text-amber-600 dark:text-amber-400">
                  {ktplRate != null ? `${ktplRate}%` : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground truncate" title="Gồm KTPL, Thưởng BĐH và Thù lao HĐQT">
                  {ktplRate != null && ktplRate > 0 ? 'KTPL & Thưởng' : ktplRate === 0 ? '0% Trích' : 'chưa có'}
                </span>
              </div>
            </div>

            {/* Mục 2: P/E Thực Tế (Sau Trích Lập) */}
            <div className="min-w-0 flex flex-col">
              <span className="text-xs text-muted-foreground font-medium truncate" title="P/E thực tế tính trên phần Lợi nhuận sau thuế mà Cổ đông thực nhận">
                P/E Thực Tế (Sau Trích Lập)
              </span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-sans text-xs sm:text-sm md:text-base font-black tabular-nums text-foreground">
                  {adjustedPeVal != null ? `${fmtNum(adjustedPeVal, 1)} lần` : peDisplay}
                </span>
                {peVal != null && ktplRate != null && ktplRate > 0 && (
                  <span className="text-[10px] text-muted-foreground line-through" title="P/E danh nghĩa chưa trừ các khoản trích ngoài cổ đông">
                    ({peDisplay})
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
  )
}
