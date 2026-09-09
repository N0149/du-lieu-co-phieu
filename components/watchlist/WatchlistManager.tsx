'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  Star,
  Plus,
  Trash2,
  TrendingUp,
  Search,
  ArrowUpRight,
  Sparkles,
  LogIn,
  Loader2,
  AlertCircle,
  FolderHeart,
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
  pe?: number | null
  pb?: number | null
  roe?: number | null
  dy?: number | null
  rnav?: number | null
  upside?: number | null
  status?: string
}

type WatchlistManagerProps = {
  allManifestStocks: { t: string; n: string; e: string; px: number | null; pe: number | null; pb: number | null; roe: number | null; dy: number | null }[]
  curatedStocks: Record<string, { rnav: number; upside: number; mos: number; status: string; updated: boolean }>
}

export function WatchlistManager({ allManifestStocks, curatedStocks }: WatchlistManagerProps) {
  const [user, setUser] = useState<any>(null)
  const [tickers, setTickers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // Map nhanh danh mục manifest theo ticker
  const stockMap = useMemo(() => {
    const map = new Map<string, (typeof allManifestStocks)[0]>()
    for (const s of allManifestStocks) {
      map.set(s.t.toUpperCase(), s)
    }
    return map
  }, [allManifestStocks])

  // Tải danh mục ban đầu
  const loadWatchlist = async () => {
    setLoading(true)
    const supabase = createClient()

    if (!supabase) {
      setTickers(getGuestWatchlist())
      setLoading(false)
      return
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser) {
      // Đã đăng nhập -> Lấy từ Supabase
      const guestList = getGuestWatchlist()
      if (guestList.length > 0) {
        await syncGuestWatchlist(guestList)
        localStorage.removeItem('dulieudautu_guest_watchlist')
      }

      const res = await getUserWatchlist()
      const serverTickers = res.items.map((it) => it.ticker.toUpperCase())
      setTickers(serverTickers)
    } else {
      // Khách -> Lấy từ localStorage
      const guestList = getGuestWatchlist()
      // Nếu là lần đầu tiên truy cập và chưa có mã nào, đặt mặc định 4 mã mẫu
      if (guestList.length === 0) {
        const defaults = ['FPT', 'LHG', 'MWG', 'DAN']
        setTickers(defaults)
      } else {
        setTickers(guestList)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadWatchlist()

    const handleUpdate = () => {
      loadWatchlist()
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
  const handleRemoveTicker = (tickerToRemove: string) => {
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

  // Gợi ý tìm kiếm
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toUpperCase()
    return allManifestStocks
      .filter((s) => s.t.toUpperCase().includes(q) || s.n.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6)
  }, [query, allManifestStocks])

  // Lấy dữ liệu chi tiết cho các mã trong watchlist
  const watchlistDetails = useMemo(() => {
    return tickers.map((t) => {
      const manifest = stockMap.get(t)
      const curated = curatedStocks[t]
      const price = manifest?.px != null ? manifest.px * 1000 : null

      return {
        ticker: t,
        name: manifest?.n || 'Cổ phiếu niêm yết',
        exchange: manifest?.e || 'HOSE',
        price,
        pe: manifest?.pe,
        pb: manifest?.pb,
        roe: manifest?.roe,
        dy: manifest?.dy,
        rnav: curated?.rnav,
        upside: curated?.upside,
        status: curated?.status,
      }
    })
  }, [tickers, stockMap, curatedStocks])

  return (
    <div className="space-y-6">
      {/* Banner chế độ khách vs Đã đăng nhập */}
      {!user ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-amber-400" />
            <span>
              Bạn đang dùng <strong>Danh mục khách (Lưu tạm trên trình duyệt)</strong>. Đăng nhập để lưu trên đám mây và đồng bộ giữa máy tính & điện thoại.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-black transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <LogIn className="size-3.5" />
            <span>Đăng nhập ngay</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-400" />
            <span>
              Đang đồng bộ danh mục với tài khoản: <strong>{user.email}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Thanh công cụ thêm mã cổ phiếu */}
      <div className="relative max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 size-4 text-[#64748b]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Nhập mã hoặc tên công ty (vd: FPT, HPG, SSI...)"
            className="w-full rounded-xl border border-white/10 bg-[#14171f] py-2.5 pl-10 pr-10 text-xs text-white placeholder-[#64748b] outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 text-xs text-[#64748b] hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown danh sách kết quả tìm kiếm */}
        {searchFocused && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/10 bg-[#14171f] p-1 shadow-2xl z-40 space-y-0.5">
            {searchResults.map((s) => {
              const isAlreadyAdded = tickers.includes(s.t.toUpperCase())
              return (
                <button
                  key={s.t}
                  type="button"
                  onClick={() => handleAddTicker(s.t)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-white/5 cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-white">{s.t}</span>
                    <span className="text-[10px] rounded bg-white/10 px-1 text-[#9EACB9]">{s.e}</span>
                    <span className="truncate max-w-[200px] text-[#9EACB9]">{s.n}</span>
                  </div>
                  {isAlreadyAdded ? (
                    <span className="text-[11px] text-[#64748b]">Đã thêm</span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <Plus className="size-3.5" /> Thêm
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Danh sách thẻ Watchlist */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-400" />
          <p className="text-xs">Đang tải danh mục theo dõi...</p>
        </div>
      ) : watchlistDetails.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-card/40 p-12 text-center">
          <FolderHeart className="mx-auto size-12 text-[#64748b] mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white">Danh mục của bạn đang trống</h3>
          <p className="mt-1 text-xs text-[#9EACB9] max-w-sm mx-auto">
            Hãy tìm kiếm mã cổ phiếu ở ô tìm kiếm phía trên hoặc bấm biểu tượng ⭐ tại trang chi tiết để theo dõi.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['FPT', 'MWG', 'LHG', 'DAN', 'HPG'].map((m) => (
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
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {watchlistDetails.map((s) => {
            return (
              <div
                key={s.ticker}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-lg shadow-xs"
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/stock/${s.ticker}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                        {s.ticker}
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#9EACB9]">
                        {s.exchange}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#9EACB9]">{s.name}</p>
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveTicker(s.ticker)}
                      title={`Bỏ theo dõi ${s.ticker}`}
                      className="flex size-7 items-center justify-center rounded-lg text-[#64748b] transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <Link
                      href={`/stock/${s.ticker}`}
                      className="flex size-7 items-center justify-center rounded-lg text-[#64748b] transition-colors hover:bg-white/5 hover:text-white"
                      title="Mở phân tích chuyên sâu"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>

                {/* Các chỉ số tài chính */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-center">
                  <div>
                    <p className="text-[10px] text-[#9EACB9]">Thị giá</p>
                    <p className="font-mono text-sm font-bold text-white">
                      {s.price != null ? fmtPrice(s.price) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9EACB9]">P/E</p>
                    <p className="font-mono text-sm font-semibold text-[#F0F3F6]">
                      {s.pe != null ? fmtNum(s.pe, 1) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9EACB9]">ROE</p>
                    <p className="font-mono text-sm font-semibold text-emerald-400">
                      {s.roe != null ? `${fmtNum(s.roe, 1)}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Footer thông số mở rộng (Cổ tức / RNAV) */}
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5 text-[11px] text-[#9EACB9]">
                  <span>Cổ tức: {s.dy != null ? `${fmtNum(s.dy, 1)}%` : '—'}</span>
                  {s.upside != null ? (
                    <span className="font-semibold text-emerald-400 font-mono">
                      Upside: {fmtPct(s.upside, 0)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#64748b]">P/B: {s.pb != null ? fmtNum(s.pb, 1) : '—'}</span>
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
