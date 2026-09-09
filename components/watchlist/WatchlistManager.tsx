'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  Star,
  Plus,
  Trash2,
  Search,
  ArrowUpRight,
  Sparkles,
  LogIn,
  Loader2,
  AlertCircle,
  FolderHeart,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getGuestWatchlist, addGuestTicker, removeGuestTicker } from '@/lib/guest-watchlist'
import {
  getUserWatchlist,
  addTickerToWatchlist,
  removeTickerFromWatchlist,
  syncGuestWatchlist,
} from '@/lib/watchlist-service'
import { AuthModal } from '@/components/auth/AuthModal'
import { fmtPrice, fmtNum, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'

export type StockInfo = {
  ticker: string
  name: string
  exchange: string
  price: number | null
  w1?: number | null
  pe?: number | null
  pb?: number | null
  roe?: number | null
  dy?: number | null
  rnav?: number | null
  upside?: number | null
  status?: string
}

type SortField = 'ticker' | 'price' | 'w1' | 'pe' | 'pb' | 'roe' | 'dy' | 'upside'

type WatchlistManagerProps = {
  allManifestStocks: {
    t: string
    n: string
    e: string
    px: number | null
    pe: number | null
    pb: number | null
    roe: number | null
    dy: number | null
    w1?: number | null
  }[]
  curatedStocks: Record<string, { rnav: number; upside: number; mos: number; status: string; updated: boolean }>
  initialTickers?: string[]
  initialUser?: { email: string; id: string } | null
}

export function WatchlistManager({
  allManifestStocks,
  curatedStocks,
  initialTickers = [],
  initialUser = null,
}: WatchlistManagerProps) {
  const [user, setUser] = useState<any>(initialUser)
  const [tickers, setTickers] = useState<string[]>(initialTickers)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // Khôi phục chế độ xem đã lưu
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('app_watchlist_view_mode')
      if (savedMode === 'table' || savedMode === 'grid') {
        setViewMode(savedMode)
      }
    } catch {}
  }, [])

  const handleToggleViewMode = (mode: 'table' | 'grid') => {
    setViewMode(mode)
    try {
      localStorage.setItem('app_watchlist_view_mode', mode)
    } catch {}
  }

  // Map nhanh danh mục manifest theo ticker
  const stockMap = useMemo(() => {
    const map = new Map<string, (typeof allManifestStocks)[0]>()
    for (const s of allManifestStocks) {
      map.set(s.t.toUpperCase(), s)
    }
    return map
  }, [allManifestStocks])

  // Đồng bộ session & danh mục ngầm phía client
  const syncClientState = async () => {
    const supabase = createClient()
    if (!supabase) {
      const guest = getGuestWatchlist()
      if (guest.length > 0) setTickers(guest)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const currentUser = session?.user ?? null
    if (currentUser) setUser(currentUser)

    if (currentUser) {
      const guestList = getGuestWatchlist()
      if (guestList.length > 0) {
        await syncGuestWatchlist(guestList)
        localStorage.removeItem('dulieudautu_guest_watchlist')
        const res = await getUserWatchlist()
        setTickers(res.items.map((it) => it.ticker.toUpperCase()))
      } else if (tickers.length === 0) {
        const res = await getUserWatchlist()
        setTickers(res.items.map((it) => it.ticker.toUpperCase()))
      }
    } else {
      const guestList = getGuestWatchlist()
      if (guestList.length > 0) {
        setTickers(guestList)
      } else if (tickers.length === 0) {
        setTickers(['FPT', 'LHG', 'MWG', 'DAN'])
      }
    }
  }

  useEffect(() => {
    syncClientState()

    const handleUpdate = () => {
      syncClientState()
    }
    window.addEventListener('watchlist-updated', handleUpdate)
    return () => window.removeEventListener('watchlist-updated', handleUpdate)
  }, [])

  // Thêm mã vào danh mục
  const handleAddTicker = (tickerToAdd: string) => {
    const clean = tickerToAdd.trim().toUpperCase()
    if (!clean || tickers.includes(clean)) return

    setQuery('')
    setSearchFocused(false)
    const updated = [clean, ...tickers]
    setTickers(updated)

    startTransition(async () => {
      if (user) {
        await addTickerToWatchlist(clean)
      } else {
        addGuestTicker(clean)
      }
      window.dispatchEvent(new Event('watchlist-updated'))
    })
  }

  // Xóa mã khỏi danh mục
  const handleRemoveTicker = (tickerToRemove: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const clean = tickerToRemove.trim().toUpperCase()
    const updated = tickers.filter((t) => t !== clean)
    setTickers(updated)

    startTransition(async () => {
      if (user) {
        await removeTickerFromWatchlist(clean)
      } else {
        removeGuestTicker(clean)
      }
      window.dispatchEvent(new Event('watchlist-updated'))
    })
  }

  // Gợi ý tìm kiếm thêm mã mới
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toUpperCase()
    return allManifestStocks
      .filter((s) => s.t.toUpperCase().includes(q) || s.n.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6)
  }, [query, allManifestStocks])

  // Sắp xếp
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(field === 'ticker' || field === 'pe')
    }
  }

  // Lấy dữ liệu chi tiết cho các mã trong watchlist + Áp dụng filter & sort
  const watchlistDetails = useMemo(() => {
    let list: StockInfo[] = tickers.map((t) => {
      const manifest = stockMap.get(t)
      const curated = curatedStocks[t]
      const price = manifest?.px != null ? manifest.px * 1000 : null

      return {
        ticker: t,
        name: manifest?.n || 'Cổ phiếu niêm yết',
        exchange: manifest?.e || 'HOSE',
        price,
        w1: manifest?.w1 ?? null,
        pe: manifest?.pe,
        pb: manifest?.pb,
        roe: manifest?.roe,
        dy: manifest?.dy,
        rnav: curated?.rnav,
        upside: curated?.upside,
        status: curated?.status,
      }
    })

    // Lọc nhanh trong danh mục khi người dùng gõ tìm kiếm nội bộ
    if (filterQuery.trim()) {
      const fq = filterQuery.trim().toLowerCase()
      list = list.filter(
        (s) => s.ticker.toLowerCase().includes(fq) || s.name.toLowerCase().includes(fq)
      )
    }

    // Sắp xếp cột nếu có
    if (sortField) {
      list = [...list].sort((a, b) => {
        let valA: any = a[sortField]
        let valB: any = b[sortField]

        if (valA == null) return 1
        if (valB == null) return -1

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return sortAsc ? valA - valB : valB - valA
      })
    }

    return list
  }, [tickers, stockMap, curatedStocks, filterQuery, sortField, sortAsc])

  return (
    <div className="space-y-4">
      {/* Banner trạng thái tài khoản - Thu gọn thanh mảnh */}
      {!user ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-amber-400" />
            <span>
              Bạn đang dùng <strong>Danh mục lưu tạm</strong>. Đăng nhập để sao lưu trên đám mây & đồng bộ tự động.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          >
            <LogIn className="size-3" />
            <span>Đăng nhập ngay</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-1.5 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>
              Đang đồng bộ với tài khoản: <strong>{user.email}</strong>
            </span>
          </div>
          <span className="text-[11px] text-[#9EACB9]">
            {tickers.length} mã đã lưu
          </span>
        </div>
      )}

      {/* Thanh công cụ: Tìm kiếm thêm mã + Lọc nội bộ + Chuyển chế độ xem */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#14171f] p-2.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Ô tìm kiếm thêm mã mới */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#64748b]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="+ Thêm mã (vd: FPT, HPG, SSI...)"
              className="w-full rounded-lg border border-white/10 bg-[#0e1117] py-1.5 pl-8.5 pr-8 text-xs text-white placeholder-[#64748b] outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b] hover:text-white"
              >
                ×
              </button>
            )}

            {/* Dropdown tìm kiếm */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/10 bg-[#14171f] p-1 shadow-2xl z-40 space-y-0.5 max-h-60 overflow-y-auto">
                {searchResults.map((s) => {
                  const isAlreadyAdded = tickers.includes(s.t.toUpperCase())
                  return (
                    <button
                      key={s.t}
                      type="button"
                      onClick={() => handleAddTicker(s.t)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{s.t}</span>
                        <span className="text-[10px] rounded bg-white/10 px-1 text-[#9EACB9]">{s.e}</span>
                        <span className="truncate max-w-[140px] text-[#9EACB9]">{s.n}</span>
                      </div>
                      {isAlreadyAdded ? (
                        <span className="text-[10px] text-[#64748b]">Đã có</span>
                      ) : (
                        <span className="flex items-center gap-0.5 font-semibold text-emerald-400 text-[11px]">
                          <Plus className="size-3" /> Thêm
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ô lọc nhanh trong danh mục khi có nhiều mã (hữu ích cho danh mục 50-100 mã) */}
          {tickers.length > 5 && (
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Lọc trong danh mục..."
                className="w-full rounded-lg border border-white/8 bg-white/5 py-1.5 px-2.5 text-xs text-[#F0F3F6] placeholder-[#64748b] outline-none transition-colors focus:border-emerald-500/40"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#64748b] hover:text-white"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Công cụ chuyển chế độ xem: Dạng Bảng vs Dạng Thẻ */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-lg border border-white/10 bg-[#0e1117] p-0.5">
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold shadow-xs'
                  : 'text-[#9EACB9] hover:text-white'
              )}
              title="Xem dạng Bảng gọn gàng (hiển thị 100+ mã nhanh nhất)"
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Dạng Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold shadow-xs'
                  : 'text-[#9EACB9] hover:text-white'
              )}
              title="Xem dạng Thẻ (Grid)"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Dạng Thẻ</span>
            </button>
          </div>

          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-mono font-semibold text-[#9EACB9] border border-white/8">
            {watchlistDetails.length}/{tickers.length} mã
          </span>
        </div>
      </div>

      {/* Danh sách Watchlist */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-400" />
          <p className="text-xs">Đang nạp danh mục theo dõi...</p>
        </div>
      ) : watchlistDetails.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-12 text-center">
          <FolderHeart className="mx-auto size-12 text-[#64748b] mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white">
            {filterQuery ? 'Không tìm thấy mã nào khớp bộ lọc' : 'Danh mục của bạn đang trống'}
          </h3>
          <p className="mt-1 text-xs text-[#9EACB9] max-w-sm mx-auto">
            {filterQuery
              ? 'Hãy xóa ô lọc hoặc thêm mã mới vào danh mục.'
              : 'Hãy nhập mã vào ô tìm kiếm phía trên để bắt đầu theo dõi.'}
          </p>
          {!filterQuery && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {['FPT', 'MWG', 'LHG', 'DAN', 'HPG', 'SSI', 'VNM'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleAddTicker(m)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                >
                  <Plus className="size-3" /> {m}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ══════════════════════════════════════════════════════════════════
           CHẾ ĐỘ 1: DẠNG BẢNG GỌN GÀNG (TABLE VIEW - TỐI ƯU CHO 100 MÃ)
           ══════════════════════════════════════════════════════════════════ */
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#12161f] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Table Header với nút sắp xếp */}
              <thead>
                <tr className="border-b border-white/10 bg-[#0e1117] text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider select-none">
                  <th className="py-2.5 pl-3 pr-2 w-10 text-center text-[#64748b]">#</th>
                  <th
                    onClick={() => handleSort('ticker')}
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Mã CK</span>
                      {sortField === 'ticker' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 w-16 text-center">Sàn</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Tên Doanh Nghiệp</th>
                  <th
                    onClick={() => handleSort('price')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Thị Giá (đ)</span>
                      {sortField === 'price' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('w1')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>1 Tuần</span>
                      {sortField === 'w1' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pe')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>P/E</span>
                      {sortField === 'pe' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pb')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>P/B</span>
                      {sortField === 'pb' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('roe')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ROE</span>
                      {sortField === 'roe' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('dy')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Cổ Tức</span>
                      {sortField === 'dy' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('upside')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Upside</span>
                      {sortField === 'upside' ? (
                        sortAsc ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 pr-3 pl-2 text-center w-16">Xóa</th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-white/5">
                {watchlistDetails.map((s, idx) => {
                  const w1 = s.w1
                  const isPositiveW1 = w1 != null && w1 > 0
                  const isNegativeW1 = w1 != null && w1 < 0

                  return (
                    <tr
                      key={s.ticker}
                      className="group hover:bg-white/[0.04] transition-colors"
                    >
                      {/* STT */}
                      <td className="py-2.5 pl-3 pr-2 text-center font-mono text-[11px] text-[#64748b]">
                        {idx + 1}
                      </td>

                      {/* Mã CK */}
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/stock/${s.ticker}`}
                          className="flex items-center gap-1.5 font-mono font-black text-sm text-white group-hover:text-emerald-400 transition-colors"
                        >
                          <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{s.ticker}</span>
                        </Link>
                      </td>

                      {/* Sàn */}
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-mono font-bold',
                            s.exchange === 'HOSE'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : s.exchange === 'HNX'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          )}
                        >
                          {s.exchange}
                        </span>
                      </td>

                      {/* Tên công ty */}
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/stock/${s.ticker}`}
                          className="block truncate max-w-[240px] text-xs text-[#9EACB9] hover:text-white transition-colors"
                          title={s.name}
                        >
                          {s.name}
                        </Link>
                      </td>

                      {/* Thị giá */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-[13px]">
                        {s.price != null ? fmtPrice(s.price) : '—'}
                      </td>

                      {/* Biến động 1W */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold">
                        {w1 != null ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5',
                              isPositiveW1
                                ? 'text-emerald-400'
                                : isNegativeW1
                                ? 'text-rose-400'
                                : 'text-[#8b949e]'
                            )}
                          >
                            {isPositiveW1 ? '+' : ''}
                            {fmtNum(w1, 1)}%
                          </span>
                        ) : (
                          <span className="text-[#64748b]">—</span>
                        )}
                      </td>

                      {/* P/E */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#F0F3F6]">
                        {s.pe != null ? fmtNum(s.pe, 1) : '—'}
                      </td>

                      {/* P/B */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#9EACB9]">
                        {s.pb != null ? fmtNum(s.pb, 1) : '—'}
                      </td>

                      {/* ROE */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {s.roe != null ? (
                          <span className={s.roe >= 15 ? 'text-emerald-400 font-bold' : 'text-[#F0F3F6]'}>
                            {fmtNum(s.roe, 1)}%
                          </span>
                        ) : (
                          <span className="text-[#64748b]">—</span>
                        )}
                      </td>

                      {/* Cổ tức */}
                      <td className="py-2.5 px-3 text-right font-mono text-[#F0F3F6]">
                        {s.dy != null ? `${fmtNum(s.dy, 1)}%` : '—'}
                      </td>

                      {/* Upside */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {s.upside != null ? (
                          <span className="text-emerald-400">{fmtPct(s.upside, 0)}</span>
                        ) : (
                          <span className="text-[#64748b] font-normal">—</span>
                        )}
                      </td>

                      {/* Nút xóa */}
                      <td className="py-2.5 pr-3 pl-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveTicker(s.ticker, e)}
                          title={`Xóa ${s.ticker} khỏi danh mục`}
                          className="flex size-7 items-center justify-center rounded-lg text-[#64748b] hover:bg-rose-500/10 hover:text-rose-400 transition-colors mx-auto cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           CHẾ ĐỘ 2: DẠNG THẺ (CARD GRID VIEW)
           ══════════════════════════════════════════════════════════════════ */
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {watchlistDetails.map((s) => {
            const w1 = s.w1
            const isPositiveW1 = w1 != null && w1 > 0
            const isNegativeW1 = w1 != null && w1 < 0

            return (
              <div
                key={s.ticker}
                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#12161f] p-3.5 transition-all hover:border-emerald-500/40 hover:shadow-md"
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/stock/${s.ticker}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-mono text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                        {s.ticker}
                      </span>
                      <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-mono text-[#9EACB9]">
                        {s.exchange}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#9EACB9]">{s.name}</p>
                  </Link>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleRemoveTicker(s.ticker, e)}
                      title={`Bỏ theo dõi ${s.ticker}`}
                      className="flex size-6 items-center justify-center rounded text-[#64748b] hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                    <Link
                      href={`/stock/${s.ticker}`}
                      className="flex size-6 items-center justify-center rounded text-[#64748b] hover:bg-white/5 hover:text-white transition-colors"
                      title="Mở phân tích chuyên sâu"
                    >
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Các chỉ số */}
                <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-white/8 pt-2 text-center">
                  <div>
                    <p className="text-[9.5px] text-[#9EACB9]">Thị giá</p>
                    <p className="font-mono text-xs font-bold text-white">
                      {s.price != null ? fmtPrice(s.price) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9.5px] text-[#9EACB9]">1 Tuần</p>
                    <p
                      className={cn(
                        'font-mono text-xs font-semibold',
                        isPositiveW1
                          ? 'text-emerald-400'
                          : isNegativeW1
                          ? 'text-rose-400'
                          : 'text-[#8b949e]'
                      )}
                    >
                      {w1 != null ? `${isPositiveW1 ? '+' : ''}${fmtNum(w1, 1)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9.5px] text-[#9EACB9]">ROE</p>
                    <p className="font-mono text-xs font-semibold text-emerald-400">
                      {s.roe != null ? `${fmtNum(s.roe, 1)}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Footer thông số mở rộng */}
                <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-1.5 text-[10px] text-[#9EACB9]">
                  <span>P/E: {s.pe != null ? fmtNum(s.pe, 1) : '—'}</span>
                  {s.upside != null ? (
                    <span className="font-semibold text-emerald-400 font-mono">
                      Upside: {fmtPct(s.upside, 0)}
                    </span>
                  ) : (
                    <span>Cổ tức: {s.dy != null ? `${fmtNum(s.dy, 1)}%` : '—'}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal đăng nhập */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  )
}
