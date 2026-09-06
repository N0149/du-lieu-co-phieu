'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Building2,
  Layers,
  Check,
} from 'lucide-react'
import { POPULAR_SECTORS } from './screener-constants'
import { cn } from '@/lib/utils'

interface ScreenerTopBarProps {
  selectedExchange: string // '' | 'HOSE' | 'HNX' | 'UPCOM'
  onChangeExchange: (ex: string) => void
  selectedSector: string
  onChangeSector: (sec: string) => void
  selectedTickers: string[]
  onToggleTicker: (ticker: string) => void
  onClearTickers: () => void
  allTickers: { ticker: string; name: string }[]
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  totalCount: number
}

export function ScreenerTopBar({
  selectedExchange,
  onChangeExchange,
  selectedSector,
  onChangeSector,
  selectedTickers,
  onToggleTicker,
  onClearTickers,
  allTickers,
  isSidebarOpen,
  onToggleSidebar,
  totalCount,
}: ScreenerTopBarProps) {
  const [tickerSearchOpen, setTickerSearchOpen] = useState(false)
  const [tickerQuery, setTickerQuery] = useState('')
  const tickerDropdownRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        tickerDropdownRef.current &&
        !tickerDropdownRef.current.contains(e.target as Node)
      ) {
        setTickerSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTickerOptions = allTickers
    .filter((t) => {
      if (!tickerQuery.trim()) return true
      const q = tickerQuery.toLowerCase().trim()
      return (
        t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
      )
    })
    .slice(0, 30)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#161a22] px-4 py-3 text-sm text-foreground shadow-sm">
      {/* Khối bên trái: Nút thu gọn sidebar + Các bộ lọc nhanh */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Nút bật/tắt Sidebar */}
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Thu gọn thanh bộ lọc' : 'Mở rộng thanh bộ lọc'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#1f2430] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground active:scale-95"
        >
          {isSidebarOpen ? (
            <ChevronsLeft className="size-4" />
          ) : (
            <ChevronsRight className="size-4" />
          )}
        </button>

        {/* Chọn Sàn */}
        <div className="relative min-w-[130px]">
          <select
            value={selectedExchange}
            onChange={(e) => onChangeExchange(e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-white/10 bg-[#1f2430] px-3 pr-8 text-xs font-medium text-foreground transition-colors hover:border-white/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Chọn sàn (Tất cả)</option>
            <option value="HOSE">Sàn HOSE (TP.HCM)</option>
            <option value="HNX">Sàn HNX (Hà Nội)</option>
            <option value="UPCOM">Sàn UPCOM</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Chọn Ngành */}
        <div className="relative min-w-[150px] max-w-[210px]">
          <select
            value={selectedSector}
            onChange={(e) => onChangeSector(e.target.value)}
            className="h-9 w-full appearance-none truncate rounded-lg border border-white/10 bg-[#1f2430] px-3 pr-8 text-xs font-medium text-foreground transition-colors hover:border-white/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Chọn ngành (Tất cả)</option>
            {POPULAR_SECTORS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Chọn Mã chứng khoán */}
        <div className="relative" ref={tickerDropdownRef}>
          <button
            type="button"
            onClick={() => setTickerSearchOpen(!tickerSearchOpen)}
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#1f2430] px-3 text-xs font-medium transition-colors hover:border-white/20',
              selectedTickers.length > 0
                ? 'border-primary/50 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Building2 className="size-3.5" />
            <span>
              {selectedTickers.length === 0
                ? 'Chọn mã chứng khoán'
                : `${selectedTickers.length} mã đã chọn`}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>

          {/* Dropdown tìm và chọn mã */}
          {tickerSearchOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-white/15 bg-[#1b202a] p-2 shadow-2xl backdrop-blur-md">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Gõ mã CK hoặc tên công ty..."
                  value={tickerQuery}
                  onChange={(e) => setTickerQuery(e.target.value)}
                  autoFocus
                  className="h-8 w-full rounded-md border border-white/10 bg-[#12161f] pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {selectedTickers.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-white/10 pb-2">
                  {selectedTickers.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                    >
                      {t}
                      <X
                        className="size-3 cursor-pointer hover:text-foreground"
                        onClick={() => onToggleTicker(t)}
                      />
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={onClearTickers}
                    className="text-[10px] text-muted-foreground hover:text-destructive underline ml-auto"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs">
                {filteredTickerOptions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    Không tìm thấy mã phù hợp
                  </div>
                ) : (
                  filteredTickerOptions.map((item) => {
                    const isSelected = selectedTickers.includes(item.ticker)
                    return (
                      <button
                        key={item.ticker}
                        type="button"
                        onClick={() => onToggleTicker(item.ticker)}
                        className={cn(
                          'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors',
                          isSelected
                            ? 'bg-primary/15 text-primary'
                            : 'hover:bg-white/5 text-foreground',
                        )}
                      >
                        <div>
                          <span className="font-bold">{item.ticker}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground truncate inline-block max-w-[160px] align-bottom">
                            {item.name}
                          </span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-primary" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Khối bên phải: Tổng số lượng mã */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground hidden sm:inline">Tìm thấy:</span>
        <span className="rounded-md bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
          {totalCount.toLocaleString('vi-VN')} mã
        </span>
      </div>
    </div>
  )
}
