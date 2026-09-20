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
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ListPlus,
  Check,
  X,
  RotateCcw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getGuestWatchlist, addGuestTicker, removeGuestTicker, addBulkGuestTickers } from '@/lib/guest-watchlist'
import {
  getUserWatchlist,
  addTickerToWatchlist,
  removeTickerFromWatchlist,
  syncGuestWatchlist,
  addBulkTickersToWatchlist,
} from '@/lib/watchlist-service'
import { AuthModal } from '@/components/auth/AuthModal'
import { fmtPrice, fmtNum, fmtPct, fmtBillion } from '@/lib/format'
import { cn } from '@/lib/utils'

export type CriteriaKey =
  | 'cap'
  | 'pe'
  | 'pb'
  | 'm1'
  | 'm3'
  | 'ytd'
  | 'w1'
  | 'm6'
  | 'y1'
  | 'roe'
  | 'dy'
  | 'upside'

export interface CriteriaItem {
  key: CriteriaKey
  label: string
  shortLabel: string
  group: 'valuation' | 'price' | 'performance'
  description: string
}

export const ALL_CRITERIA: CriteriaItem[] = [
  // Định giá & Quy mô
  { key: 'cap', label: 'Vốn Hóa (tỷ)', shortLabel: 'Vốn Hóa', group: 'valuation', description: 'Vốn hóa thị trường (tỷ VNĐ)' },
  { key: 'pe', label: 'P/E', shortLabel: 'P/E', group: 'valuation', description: 'Hệ số Giá / Lợi nhuận mỗi cổ phiếu' },
  { key: 'pb', label: 'P/B', shortLabel: 'P/B', group: 'valuation', description: 'Hệ số Giá / Giá trị sổ sách' },
  // Biến động giá
  { key: 'm1', label: '1 Tháng', shortLabel: '1 Tháng', group: 'price', description: 'Hiệu suất biến động giá 1 tháng gần nhất (%)' },
  { key: 'm3', label: '3 Tháng', shortLabel: '3 Tháng', group: 'price', description: 'Hiệu suất biến động giá 3 tháng gần nhất (%)' },
  { key: 'ytd', label: 'YTD', shortLabel: 'YTD', group: 'price', description: 'Hiệu suất biến động giá từ đầu năm đến nay (%)' },
  { key: 'w1', label: '1 Tuần', shortLabel: '1 Tuần', group: 'price', description: 'Hiệu suất biến động giá 1 tuần gần nhất (%)' },
  { key: 'm6', label: '6 Tháng', shortLabel: '6 Tháng', group: 'price', description: 'Hiệu suất biến động giá 6 tháng gần nhất (%)' },
  { key: 'y1', label: '1 Năm', shortLabel: '1 Năm', group: 'price', description: 'Hiệu suất biến động giá 1 năm qua (%)' },
  // Hiệu quả & Cổ tức
  { key: 'roe', label: 'ROE', shortLabel: 'ROE', group: 'performance', description: 'Tỷ suất sinh lời trên vốn chủ sở hữu (%)' },
  { key: 'dy', label: 'Cổ Tức', shortLabel: 'Cổ Tức', group: 'performance', description: 'Tỷ suất cổ tức tiền mặt hàng năm (%)' },
  { key: 'upside', label: 'Upside', shortLabel: 'Upside', group: 'performance', description: 'Biên định giá so với giá trị thực (%)' },
]

export const DEFAULT_COLUMNS: CriteriaKey[] = ['cap', 'pe', 'pb', 'm1', 'm3', 'ytd']

function renderCriteriaCell(s: StockInfo, key: CriteriaKey) {
  switch (key) {
    case 'cap':
      return (
        <span className="font-mono text-[#F0F3F6] font-medium">
          {s.cap != null ? fmtBillion(s.cap) : '—'}
        </span>
      )
    case 'pe':
      return (
        <span className="font-mono text-[#F0F3F6]">
          {s.pe != null ? fmtNum(s.pe, 1) : '—'}
        </span>
      )
    case 'pb':
      return (
        <span className="font-mono text-[#9EACB9]">
          {s.pb != null ? fmtNum(s.pb, 1) : '—'}
        </span>
      )
    case 'w1':
    case 'm1':
    case 'm3':
    case 'm6':
    case 'y1':
    case 'ytd': {
      const val = s[key]
      if (val == null) return <span className="text-[#64748b]">—</span>
      const isPos = val > 0
      const isNeg = val < 0
      return (
        <span
          className={cn(
            'font-mono text-xs font-semibold inline-flex items-center gap-0.5',
            isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-[#8b949e]'
          )}
        >
          {isPos ? '+' : ''}
          {fmtNum(val, 1)}%
        </span>
      )
    }
    case 'roe':
      return s.roe != null ? (
        <span className={cn('font-mono font-semibold', s.roe >= 15 ? 'text-emerald-400 font-bold' : 'text-[#F0F3F6]')}>
          {fmtNum(s.roe, 1)}%
        </span>
      ) : (
        <span className="text-[#64748b]">—</span>
      )
    case 'dy':
      return (
        <span className="font-mono text-[#F0F3F6]">
          {s.dy != null ? `${fmtNum(s.dy, 1)}%` : '—'}
        </span>
      )
    case 'upside':
      return s.upside != null ? (
        <span className="font-mono font-bold text-emerald-400">
          {fmtPct(s.upside, 0)}
        </span>
      ) : (
        <span className="text-[#64748b] font-normal">—</span>
      )
    default:
      return <span className="text-[#64748b]">—</span>
  }
}

export type StockInfo = {
  ticker: string
  name: string
  exchange: string
  price: number | null
  cap?: number | null
  pe?: number | null
  pb?: number | null
  w1?: number | null
  m1?: number | null
  m3?: number | null
  m6?: number | null
  y1?: number | null
  ytd?: number | null
  roe?: number | null
  dy?: number | null
  rnav?: number | null
  upside?: number | null
  status?: string
}

type SortField = 'ticker' | 'price' | CriteriaKey

type WatchlistManagerProps = {
  allManifestStocks: {
    t: string
    n: string
    e: string
    px: number | null
    cap?: number | null
    pe?: number | null
    pb?: number | null
    roe?: number | null
    dy?: number | null
    w1?: number | null
    m1?: number | null
    m3?: number | null
    m6?: number | null
    y1?: number | null
    ytd?: number | null
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
  const [visibleColumns, setVisibleColumns] = useState<CriteriaKey[]>(DEFAULT_COLUMNS)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [swapMenuCol, setSwapMenuCol] = useState<CriteriaKey | null>(null)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // Trạng thái nhập danh sách mã hàng loạt
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkInput, setBulkInput] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')

  const parsedBulkTickers = useMemo(() => {
    if (!bulkInput.trim()) return []
    const tokens = bulkInput.toUpperCase().split(/[\s,;\n\r\t]+/)
    const clean = Array.from(
      new Set(tokens.map((t) => t.trim()).filter((t) => t.length >= 2 && t.length <= 10))
    )
    return clean
  }, [bulkInput])

  const handleBulkSubmit = async () => {
    if (parsedBulkTickers.length === 0) return
    setBulkSubmitting(true)
    setBulkMessage('')
    try {
      if (user) {
        const res = await addBulkTickersToWatchlist(parsedBulkTickers)
        if (res.success) {
          setBulkMessage(`✓ Đã thêm thành công ${res.count} mã vào Watchlist của bạn!`)
          setTickers((prev) => Array.from(new Set([...parsedBulkTickers, ...prev])))
          setTimeout(() => {
            setBulkModalOpen(false)
            setBulkInput('')
            setBulkMessage('')
          }, 1200)
        } else {
          setBulkMessage(`Lỗi: ${res.error || 'Không thể lưu danh mục.'}`)
        }
      } else {
        addBulkGuestTickers(parsedBulkTickers)
        setTickers((prev) => Array.from(new Set([...parsedBulkTickers, ...prev])))
        setBulkMessage(`✓ Đã lưu ${parsedBulkTickers.length} mã vào Watchlist tạm!`)
        setTimeout(() => {
          setBulkModalOpen(false)
          setBulkInput('')
          setBulkMessage('')
        }, 1200)
      }
      window.dispatchEvent(new Event('watchlist-updated'))
    } catch {
      setBulkMessage('Đã xảy ra sự cố khi thêm mã.')
    } finally {
      setBulkSubmitting(false)
    }
  }

  // Khôi phục danh sách cột đã lưu từ localStorage
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem('app_watchlist_columns')
      if (savedCols) {
        const parsed = JSON.parse(savedCols)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validKeys = ALL_CRITERIA.map((c) => c.key)
          const clean = parsed.filter((k: any) => validKeys.includes(k))
          if (clean.length > 0) {
            setVisibleColumns(clean)
          }
        }
      }
    } catch {}
  }, [])

  const handleToggleColumn = (key: CriteriaKey) => {
    setVisibleColumns((prev) => {
      let next: CriteriaKey[]
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // Giữ tối thiểu 1 cột so sánh
        next = prev.filter((k) => k !== key)
      } else {
        next = [...prev, key]
      }
      try {
        localStorage.setItem('app_watchlist_columns', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS)
    try {
      localStorage.setItem('app_watchlist_columns', JSON.stringify(DEFAULT_COLUMNS))
    } catch {}
  }

  const handleSelectAllColumns = () => {
    const all = ALL_CRITERIA.map((c) => c.key)
    setVisibleColumns(all)
    try {
      localStorage.setItem('app_watchlist_columns', JSON.stringify(all))
    } catch {}
  }

  const handleSwapColumn = (oldKey: CriteriaKey, newKey: CriteriaKey) => {
    if (oldKey === newKey) {
      setSwapMenuCol(null)
      return
    }
    setVisibleColumns((prev) => {
      let next: CriteriaKey[]
      if (prev.includes(newKey)) {
        next = prev.map((k) => (k === oldKey ? newKey : k === newKey ? oldKey : k))
      } else {
        next = prev.map((k) => (k === oldKey ? newKey : k))
      }
      try {
        localStorage.setItem('app_watchlist_columns', JSON.stringify(next))
      } catch {}
      return next
    })
    setSwapMenuCol(null)
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
      setSortAsc(field === 'ticker' || field === 'pe' || field === 'pb')
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
        cap: manifest?.cap ?? null,
        pe: manifest?.pe ?? null,
        pb: manifest?.pb ?? null,
        w1: manifest?.w1 ?? null,
        m1: manifest?.m1 ?? null,
        m3: manifest?.m3 ?? null,
        m6: manifest?.m6 ?? null,
        y1: manifest?.y1 ?? null,
        ytd: manifest?.ytd ?? null,
        roe: manifest?.roe ?? null,
        dy: manifest?.dy ?? null,
        rnav: curated?.rnav ?? null,
        upside: curated?.upside ?? null,
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

          {/* Nút Nhập hàng loạt */}
          <button
            type="button"
            onClick={() => {
              setBulkModalOpen(true)
              setBulkMessage('')
            }}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0"
            title="Dán danh sách mã cổ phiếu hàng loạt (copy từ Excel, Zalo, ghi chú...)"
          >
            <ListPlus className="size-3.5" />
            <span>Nhập hàng loạt</span>
          </button>

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

        {/* Công cụ Tùy chỉnh cột & Số lượng mã */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setColPickerOpen(!colPickerOpen)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs',
                colPickerOpen
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                  : 'border-white/10 bg-[#0e1117] text-[#9EACB9] hover:text-white hover:border-white/20'
              )}
              title="Tùy chỉnh các cột so sánh cổ phiếu"
            >
              <SlidersHorizontal className="size-3.5 text-emerald-400" />
              <span>Tùy chỉnh cột</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-400">
                {visibleColumns.length}
              </span>
            </button>

            {/* Popover tùy chọn cột */}
            {colPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setColPickerOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/15 bg-[#141822] p-3.5 shadow-2xl z-50 text-left animate-in fade-in duration-150">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-emerald-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Tùy chọn cột so sánh</h4>
                        <p className="text-[10px] text-[#9EACB9]">Bật/tắt các tiêu chí phân tích</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setColPickerOpen(false)}
                      className="rounded p-1 text-[#64748b] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {/* Thanh công cụ nhanh */}
                  <div className="flex items-center justify-between py-2 border-b border-white/8 text-[11px]">
                    <button
                      type="button"
                      onClick={handleResetColumns}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer transition-colors"
                    >
                      <RotateCcw className="size-3" />
                      <span>Mặc định (6 cột)</span>
                    </button>
                    <div className="flex items-center gap-2 text-[#9EACB9]">
                      <button
                        type="button"
                        onClick={handleSelectAllColumns}
                        className="hover:text-white cursor-pointer transition-colors"
                      >
                        Tất cả
                      </button>
                      <span>·</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {visibleColumns.length}/{ALL_CRITERIA.length}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách tiêu chí theo nhóm */}
                  <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-1">
                    {/* Nhóm Định giá & Quy mô */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1 px-1">
                        Quy mô & Định giá
                      </div>
                      <div className="space-y-0.5">
                        {ALL_CRITERIA.filter((c) => c.group === 'valuation').map((item) => {
                          const isSelected = visibleColumns.includes(item.key)
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleToggleColumn(item.key)}
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left',
                                isSelected
                                  ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                                  : 'text-[#9EACB9] hover:bg-white/5 hover:text-white'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'flex size-4 items-center justify-center rounded border transition-colors',
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-500 text-black'
                                      : 'border-white/20 bg-white/5'
                                  )}
                                >
                                  {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                                <span>{item.label}</span>
                              </div>
                              <span className="text-[10px] text-[#64748b]">{item.shortLabel}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Nhóm Biến động giá */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1 px-1">
                        Biến động giá
                      </div>
                      <div className="space-y-0.5">
                        {ALL_CRITERIA.filter((c) => c.group === 'price').map((item) => {
                          const isSelected = visibleColumns.includes(item.key)
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleToggleColumn(item.key)}
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left',
                                isSelected
                                  ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                                  : 'text-[#9EACB9] hover:bg-white/5 hover:text-white'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'flex size-4 items-center justify-center rounded border transition-colors',
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-500 text-black'
                                      : 'border-white/20 bg-white/5'
                                  )}
                                >
                                  {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                                <span>{item.label}</span>
                              </div>
                              <span className="text-[10px] text-[#64748b]">{item.shortLabel}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Nhóm Hiệu quả & Cổ tức */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-1 px-1">
                        Hiệu quả & Cổ tức
                      </div>
                      <div className="space-y-0.5">
                        {ALL_CRITERIA.filter((c) => c.group === 'performance').map((item) => {
                          const isSelected = visibleColumns.includes(item.key)
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleToggleColumn(item.key)}
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left',
                                isSelected
                                  ? 'bg-emerald-500/15 text-emerald-300 font-medium'
                                  : 'text-[#9EACB9] hover:bg-white/5 hover:text-white'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'flex size-4 items-center justify-center rounded border transition-colors',
                                    isSelected
                                      ? 'border-emerald-500 bg-emerald-500 text-black'
                                      : 'border-white/20 bg-white/5'
                                  )}
                                >
                                  {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                                <span>{item.label}</span>
                              </div>
                              <span className="text-[10px] text-[#64748b]">{item.shortLabel}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
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
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           BẢNG THEO DÕI & SO SÁNH CỔ PHIẾU (TABLE VIEW TỐI ƯU TỐC ĐỘ CAO)
           ══════════════════════════════════════════════════════════════════ */
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#12161f] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Table Header với nút sắp xếp và đổi tiêu chí trực tiếp */}
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

                  {/* Các cột so sánh tùy biến linh hoạt */}
                  {visibleColumns.map((colKey) => {
                    const crit = ALL_CRITERIA.find((c) => c.key === colKey)
                    const isSorted = sortField === colKey
                    const isSwapOpen = swapMenuCol === colKey

                    return (
                      <th
                        key={colKey}
                        className="py-2.5 px-3 text-right group/th relative whitespace-nowrap"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleSort(colKey)}
                            className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
                            title={`Sắp xếp theo ${crit?.label || colKey}`}
                          >
                            <span>{crit?.label || colKey}</span>
                            {isSorted ? (
                              sortAsc ? (
                                <ArrowUp className="size-3 text-emerald-400" />
                              ) : (
                                <ArrowDown className="size-3 text-emerald-400" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3 opacity-30 group-hover/th:opacity-80" />
                            )}
                          </button>

                          {/* Nút dropdown đổi tiêu chí cột này */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSwapMenuCol(isSwapOpen ? null : colKey)
                            }}
                            className={cn(
                              'rounded p-0.5 transition-colors cursor-pointer',
                              isSwapOpen
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-[#64748b] hover:bg-white/10 hover:text-white opacity-40 group-hover/th:opacity-100'
                            )}
                            title="Đổi tiêu chí cột này"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </div>

                        {/* Menu dropdown đổi nhanh tiêu chí */}
                        {isSwapOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSwapMenuCol(null)
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-white/15 bg-[#161b26] p-1.5 shadow-2xl z-50 text-left font-normal normal-case animate-in fade-in duration-100">
                              <div className="px-2 py-1 text-[10px] font-bold text-[#8b949e] border-b border-white/8 mb-1">
                                Đổi cột thành:
                              </div>
                              <div className="max-h-56 overflow-y-auto space-y-0.5">
                                {ALL_CRITERIA.map((item) => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSwapColumn(colKey, item.key)
                                    }}
                                    className={cn(
                                      'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-left cursor-pointer transition-colors',
                                      colKey === item.key
                                        ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                                        : 'text-[#9EACB9] hover:bg-white/5 hover:text-white'
                                    )}
                                  >
                                    <span>{item.label}</span>
                                    {colKey === item.key && <Check className="size-3 text-emerald-400" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </th>
                    )
                  })}

                  <th className="py-2.5 pr-3 pl-2 text-center w-16">Xóa</th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-white/5">
                {watchlistDetails.map((s, idx) => (
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

                    {/* Các cột chỉ số so sánh động */}
                    {visibleColumns.map((colKey) => (
                      <td key={colKey} className="py-2.5 px-3 text-right">
                        {renderCriteriaCell(s, colKey)}
                      </td>
                    ))}

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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nhập danh sách mã hàng loạt */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#12161f] p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ListPlus className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nhập danh sách mã hàng loạt</h3>
                  <p className="text-[11px] text-[#9EACB9]">Thêm nhanh từ 1 đến hơn 100 mã cổ phiếu cùng lúc</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-lg p-1.5 text-[#64748b] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <p className="text-xs text-[#9EACB9]">
                Dán danh sách các mã cổ phiếu cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng (copy từ Excel, Zalo, ghi chú...):
              </p>

              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={"Ví dụ:\nAAM ABT ADS AIC BIO BLI BMI BTD BTU BVH\nhoặc mỗi dòng một mã..."}
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-[#0a0d14] p-3 font-mono text-xs text-white placeholder-[#64748b] outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-y"
              />

              {parsedBulkTickers.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-white/5 p-2.5">
                  <div className="flex items-center justify-between text-xs text-emerald-400 mb-1.5 font-semibold">
                    <span>Đã nhận diện: {parsedBulkTickers.length} mã hợp lệ</span>
                    <span className="text-[10px] text-[#9EACB9] font-normal">
                      (Tự động loại trùng lặp)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {parsedBulkTickers.slice(0, 36).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300"
                      >
                        {t}
                      </span>
                    ))}
                    {parsedBulkTickers.length > 36 && (
                      <span className="text-[10px] text-[#9EACB9] self-center">
                        +{parsedBulkTickers.length - 36} mã nữa...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {bulkMessage && (
                <div
                  className={cn(
                    'text-xs font-semibold rounded-lg p-2.5 text-center',
                    bulkMessage.includes('thành công') || bulkMessage.includes('Đã lưu')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  )}
                >
                  {bulkMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-[#9EACB9] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={parsedBulkTickers.length === 0 || bulkSubmitting}
                  onClick={handleBulkSubmit}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-sm"
                >
                  {bulkSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Thêm {parsedBulkTickers.length > 0 ? `${parsedBulkTickers.length} mã` : ''} vào Watchlist</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
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
