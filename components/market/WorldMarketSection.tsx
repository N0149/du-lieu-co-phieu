'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Globe,
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Layers,
  DollarSign,
  AlertCircle,
  Bitcoin,
  ChevronDown,
  ChevronUp,
  LineChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketItem, WorldMarketData } from '@/lib/market-service'
import { CommodityChartModal } from './CommodityChartModal'

interface WorldMarketSectionProps {
  initialData?: WorldMarketData | null
}

export function WorldMarketSection({ initialData }: WorldMarketSectionProps) {
  const [data, setData] = useState<WorldMarketData | null>(initialData || null)
  const [loading, setLoading] = useState<boolean>(!initialData)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Trạng thái mở modal biểu đồ hàng hóa
  const [selectedCommodity, setSelectedCommodity] = useState<{
    symbol: string
    name: string
    unit: string
  } | null>(null)

  // Trạng thái thu gọn/mở rộng cho các bảng phụ
  const [showGold, setShowGold] = useState<boolean>(false)
  const [showCrypto, setShowCrypto] = useState<boolean>(false)

  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  })

  const isFetchingRef = useRef(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setErrorMsg(null)

    try {
      const res = await fetch('/api/market/world', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Yêu cầu quá nhanh, vui lòng đợi giây lát')
        }
        throw new Error(`Mã lỗi: ${res.status}`)
      }
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        const now = new Date()
        setLastUpdated(
          `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes()
          ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        )
      } else {
        setErrorMsg(json.error || 'Không thể cập nhật dữ liệu thị trường')
      }
    } catch (err: any) {
      console.error('[WorldMarket Fetch Error]:', err)
      setErrorMsg(err?.message || 'Lỗi kết nối máy chủ dữ liệu thị trường')
    } finally {
      setLoading(false)
      setRefreshing(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }

    // Tự động làm mới mỗi 30 phút (1.800.000 ms)
    const interval = setInterval(() => {
      fetchData(true)
    }, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchData, initialData])

  const renderTable = (
    title: string,
    items: MarketItem[] = [],
    marketHeader = 'Thị trường',
    icon: any,
    onClose?: () => void
  ) => {
    const Icon = icon
    const isCommodity = title === 'Hàng hóa'

    return (
      <div className="flex flex-col h-full rounded-xl border border-white/10 bg-[#161a23] shadow-md overflow-hidden transition-all duration-200 hover:border-white/20">
        {/* Table Header */}
        <div className="flex items-center justify-between border-b border-white/8 bg-[#1c222e] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-md border',
                isCommodity
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F0F3F6]">
                {title}
              </h3>
              {isCommodity && (
                <span className="hidden sm:inline text-[10px] text-amber-400/80 font-normal">
                  (Click xem biểu đồ 1 năm)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#9EACB9]">
              {items.length} mục
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#9EACB9] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Thu gọn bảng này"
              >
                <span>Thu gọn</span>
                <ChevronUp className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-[#12151c]/60 text-[11px] font-semibold text-[#8B98A5]">
                <th className="py-2.5 pl-3 pr-2 w-[18%]">{marketHeader}</th>
                <th className="py-2.5 px-2 w-[32%]">Tên</th>
                <th className="py-2.5 px-2 text-right w-[20%]">Giá</th>
                <th className="py-2.5 px-2 text-right w-[12%]">+/-</th>
                <th className="py-2.5 px-2 text-right w-[14%]">% Ngày</th>
                <th className="py-2.5 pr-3 pl-2 text-right w-[10%]">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && items.length === 0 ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-2.5 px-3">
                      <div className="h-4 w-full bg-white/5 rounded" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8B98A5]">
                    Đang tải dữ liệu thị trường...
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isUp = row.direction === 'up'
                  const isDown = row.direction === 'down'

                  const changeClass = isUp
                    ? 'text-emerald-400'
                    : isDown
                    ? 'text-rose-400'
                    : 'text-amber-300'

                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (isCommodity) {
                          setSelectedCommodity({
                            symbol: row.symbol || row.code || row.name,
                            name: row.fullName || row.name,
                            unit: row.market,
                          })
                        }
                      }}
                      className={cn(
                        'group transition-colors',
                        isCommodity
                          ? 'cursor-pointer hover:bg-amber-500/10'
                          : 'hover:bg-white/[0.03]'
                      )}
                      title={isCommodity ? 'Bấm để xem biểu đồ giá 1 năm' : undefined}
                    >
                      <td
                        className="py-2.5 pl-3 pr-2 font-medium text-[#8B98A5] truncate max-w-[80px]"
                        title={row.market}
                      >
                        {row.market}
                      </td>
                      <td
                        className={cn(
                          'py-2.5 px-2 font-semibold truncate max-w-[130px]',
                          isCommodity
                            ? 'text-[#F0F3F6] group-hover:text-amber-300'
                            : 'text-[#F0F3F6]'
                        )}
                        title={row.fullName || row.name}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{row.name}</span>
                          {isCommodity && (
                            <LineChart className="size-3 text-amber-400/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold font-mono text-[#F0F3F6]">
                        {row.price}
                      </td>
                      <td className={cn('py-2.5 px-2 text-right font-mono font-medium', changeClass)}>
                        {row.change}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium">
                        <span
                          className={cn(
                            'inline-flex items-center justify-end rounded px-1.5 py-0.5 text-[11px] font-semibold',
                            isUp
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isDown
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-300'
                          )}
                        >
                          {row.percent}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 pl-2 text-right font-mono text-[11px] text-[#8B98A5]">
                        {row.date}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Bar: Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
            <Globe className="size-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#F0F3F6]">
              Biến Động Thị Trường Thế Giới
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#9EACB9]">
              <Clock className="size-3.5 text-[#8B98A5]" />
              <span>Cập nhật lúc: <strong className="font-mono text-[#F0F3F6]">{lastUpdated}</strong></span>
              <span className="text-white/20">•</span>
              <span>Tự động làm mới mỗi 30 phút</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#161a23] px-3 py-1.5 text-xs font-semibold text-[#F0F3F6] shadow-sm transition-all hover:bg-white/5 hover:text-white disabled:opacity-50 cursor-pointer"
            title="Làm mới dữ liệu ngay"
          >
            <RefreshCw className={cn('size-3.5 text-emerald-400', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* 3 BẢNG CHÍNH: CHỨNG KHOÁN THẾ GIỚI - HÀNG HÓA - TỶ GIÁ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bảng 1: Chứng khoán thế giới */}
        <div className="min-w-0">
          {renderTable('Chứng khoán thế giới', data?.worldStock, 'Thị trường', Globe)}
        </div>

        {/* Bảng 2: Hàng hóa (Có thể click xem biểu đồ) */}
        <div className="min-w-0">
          {renderTable('Hàng hóa', data?.commodity, 'Đơn vị', Layers)}
        </div>

        {/* Bảng 3: Tỷ giá ngoại tệ */}
        <div className="min-w-0">
          {renderTable('Tỷ giá ngoại tệ', data?.changeRate, 'Cặp tiền', DollarSign)}
        </div>
      </div>

      {/* KHU VỰC CÁC BẢNG BỔ SUNG THU GỌN (GIÁ VÀNG & CRYPTO) */}
      <div className="rounded-xl border border-white/8 bg-[#161a23]/60 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#9EACB9]">
            <span>Xem thêm thị trường khác:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nút bật/tắt Giá vàng */}
            <button
              type="button"
              onClick={() => setShowGold((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm',
                showGold
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/10'
                  : 'border-white/10 bg-[#212631] text-[#9EACB9] hover:bg-white/10 hover:text-[#F0F3F6]'
              )}
            >
              <Coins className="size-3.5 text-amber-400" />
              <span>Giá vàng {data?.goldPrice ? `(${data.goldPrice.length})` : ''}</span>
              {showGold ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {/* Nút bật/tắt Tiền mã hóa Crypto */}
            <button
              type="button"
              onClick={() => setShowCrypto((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm',
                showCrypto
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/10'
                  : 'border-white/10 bg-[#212631] text-[#9EACB9] hover:bg-white/10 hover:text-[#F0F3F6]'
              )}
            >
              <Bitcoin className="size-3.5 text-orange-400" />
              <span>Tiền mã hóa (Crypto) {data?.crypto ? `(${data.crypto.length})` : ''}</span>
              {showCrypto ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* CÁC BẢNG MỞ RỘNG (KHI NGƯỜI DÙNG BẤM MỞ) */}
        {(showGold || showCrypto) && (
          <div className="mt-4 grid grid-cols-1 gap-4 pt-4 border-t border-white/8 md:grid-cols-2">
            {showGold &&
              renderTable('Giá vàng trong nước & thế giới', data?.goldPrice, 'Thị trường', Coins, () =>
                setShowGold(false)
              )}
            {showCrypto &&
              renderTable('Tiền mã hóa (Crypto)', data?.crypto, 'Mã', Bitcoin, () =>
                setShowCrypto(false)
              )}
          </div>
        )}
      </div>

      {/* MODAL BIỂU ĐỒ GIÁ HÀNG HÓA 1 NĂM QUA */}
      {selectedCommodity && (
        <CommodityChartModal
          symbol={selectedCommodity.symbol}
          initialName={selectedCommodity.name}
          unit={selectedCommodity.unit}
          onClose={() => setSelectedCommodity(null)}
        />
      )}
    </div>
  )
}
