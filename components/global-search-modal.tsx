'use client'

import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ArrowUp,
  X,
  ChevronDown,
  Building2,
  Globe2,
  Layers,
  BarChart3,
  LayoutDashboard,
  Anchor,
  Package,
  TrendingUp,
  CornerDownLeft,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PRESET_SEARCH_ITEMS,
  SearchCategory,
  SearchSubFilter,
  SearchPaletteItem,
} from '@/lib/search-palette-data'
import { getAllStocks, removeVietnameseAccents } from '@/lib/longlivestock'
import { useReports } from '@/lib/use-reports'
import { buildReportStocks } from '@/lib/report-stocks'
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  RECENT_SEARCHES_EVENT,
  type RecentSearchItem,
} from '@/lib/recent-searches'

interface GlobalSearchModalProps {
  open: boolean
  onClose: () => void
}

const DATA_SUB_FILTERS = [
  { id: 'all', label: 'Tất cả dữ liệu' },
  { id: 'stock', label: 'Cổ phiếu' },
  { id: 'sector', label: 'Ngành' },
  { id: 'vn', label: 'Việt Nam' },
  { id: 'us', label: 'Hoa Kỳ' },
  { id: 'cn', label: 'Trung Quốc' },
  { id: 'eu', label: 'Châu Âu' },
  { id: 'market', label: 'Thị trường' },
]

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const { reports } = useReports()
  const [query, setQuery] = useState('')
  const [mainTab, setMainTab] = useState<'all' | 'data' | 'chart' | 'layout'>('all')
  const [dataSubFilter, setDataSubFilter] = useState<SearchSubFilter>('all')
  const [showDataMenu, setShowDataMenu] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const dataMenuRef = useRef<HTMLDivElement>(null)

  // Lắng nghe cập nhật danh sách tìm kiếm gần đây
  useEffect(() => {
    setRecentSearches(getRecentSearches())
    const handleUpdate = () => {
      setRecentSearches(getRecentSearches())
    }
    window.addEventListener(RECENT_SEARCHES_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener(RECENT_SEARCHES_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Focus input & làm mới danh sách gần đây khi mở modal
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      setActiveIndex(0)
    } else {
      setQuery('')
      setMainTab('all')
      setDataSubFilter('all')
      setShowDataMenu(false)
    }
  }, [open])

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dataMenuRef.current && !dataMenuRef.current.contains(e.target as Node)) {
        setShowDataMenu(false)
      }
    }
    if (showDataMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDataMenu])

  // Build complete pool of items: Presets + 1.530 stocks + Reports
  const fullSearchPool = useMemo<SearchPaletteItem[]>(() => {
    const seenTickers = new Set<string>()
    const pool: SearchPaletteItem[] = [...PRESET_SEARCH_ITEMS]

    // Track existing tickers
    PRESET_SEARCH_ITEMS.forEach((p) => {
      if (p.ticker) seenTickers.add(p.ticker.toUpperCase())
    })

    // Add stocks with reports
    try {
      const repStocks = buildReportStocks(reports)
      for (const r of repStocks) {
        const t = r.ticker.toUpperCase()
        if (seenTickers.has(t)) continue
        seenTickers.add(t)
        pool.push({
          id: `stock-rep-${t}`,
          ticker: r.ticker,
          title: r.name ? `${r.ticker} - ${r.name}` : r.ticker,
          subtitle: `Mã ${r.ticker} · Đã có bài phân tích chuyên sâu RNAV`,
          category: 'stock',
          categoryLabel: 'Doanh nghiệp',
          href: `/stock/${encodeURIComponent(r.ticker)}`,
          keywords: [r.ticker.toLowerCase(), r.name?.toLowerCase() || ''],
        })
      }
    } catch {}

    // Add remaining 1.530 stocks
    try {
      const allStocks = getAllStocks()
      for (const s of allStocks) {
        const t = s.t.toUpperCase()
        if (seenTickers.has(t)) continue
        seenTickers.add(t)
        pool.push({
          id: `stock-all-${t}`,
          ticker: s.t,
          title: s.n ? `${s.t} - ${s.n}` : s.t,
          subtitle: `${s.t} · Sàn ${s.e} · Ngành: ${s.s || s.g || 'Đại chúng'}`,
          category: 'stock',
          categoryLabel: 'Doanh nghiệp',
          href: `/stock/${encodeURIComponent(s.t)}`,
          keywords: [s.t.toLowerCase(), s.n?.toLowerCase() || '', s.s?.toLowerCase() || ''],
        })
      }
    } catch {}

    return pool
  }, [reports])

  // Filter items based on active tabs & search query
  const filteredResults = useMemo(() => {
    let list = fullSearchPool

    // Tab filter
    if (mainTab === 'chart') {
      list = list.filter((i) => i.category === 'chart')
    } else if (mainTab === 'layout') {
      list = list.filter((i) => i.category === 'layout')
    } else if (mainTab === 'data') {
      if (dataSubFilter === 'stock') {
        list = list.filter((i) => i.category === 'stock')
      } else if (dataSubFilter === 'sector') {
        list = list.filter((i) => i.category === 'sector')
      } else if (dataSubFilter === 'vn') {
        list = list.filter((i) => i.region === 'VN')
      } else if (dataSubFilter === 'us') {
        list = list.filter((i) => i.region === 'US')
      } else if (dataSubFilter === 'cn') {
        list = list.filter((i) => i.region === 'CN')
      } else if (dataSubFilter === 'eu') {
        list = list.filter((i) => i.region === 'EU')
      } else if (dataSubFilter === 'market') {
        list = list.filter((i) => i.category === 'macro' || i.category === 'sector')
      } else {
        list = list.filter(
          (i) => i.category === 'stock' || i.category === 'macro' || i.category === 'sector'
        )
      }
    }

    // Query search
    const term = query.trim().toLowerCase()
    if (!term) {
      // Khi ô tìm kiếm rỗng: hiển thị mã/nội dung gần đây nếu tab là 'all' hoặc 'data'
      const shouldShowRecent =
        (mainTab === 'all' || (mainTab === 'data' && (dataSubFilter === 'all' || dataSubFilter === 'stock'))) &&
        recentSearches.length > 0

      if (shouldShowRecent) {
        const recentItems: SearchPaletteItem[] = recentSearches.map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          ticker: r.ticker,
          icon: r.icon,
          category: (r.category as any) || 'stock',
          categoryLabel: r.categoryLabel || (r.ticker ? 'Doanh nghiệp' : 'Gần đây'),
          href: r.href,
          isRecent: true,
        }))

        const recentSet = new Set(
          recentItems.map((r) => (r.ticker ? r.ticker.toUpperCase() : r.id))
        )
        const remainingPresets = list.filter(
          (p) => !recentSet.has(p.ticker ? p.ticker.toUpperCase() : p.id)
        )

        return [...recentItems, ...remainingPresets.slice(0, 10)]
      }

      // Default trending order
      return list.slice(0, 15)
    }

    const termNorm = removeVietnameseAccents(term)
    const matches = list.filter((item) => {
      const textToSearch = `${item.ticker || ''} ${item.title} ${item.subtitle || ''} ${(item.keywords || []).join(' ')}`.toLowerCase()
      const textNorm = removeVietnameseAccents(textToSearch)
      return textNorm.includes(termNorm)
    })

    // Nếu có mã trong recent khớp từ khóa, ưu tiên đưa lên đầu và gắn cờ isRecent
    const recentMap = new Map(
      recentSearches.map((r) => [r.ticker ? r.ticker.toUpperCase() : r.id, r])
    )

    const sorted = [...matches].sort((a, b) => {
      const aKey = a.ticker ? a.ticker.toUpperCase() : a.id
      const bKey = b.ticker ? b.ticker.toUpperCase() : b.id
      const aRecent = recentMap.has(aKey) ? 1 : 0
      const bRecent = recentMap.has(bKey) ? 1 : 0
      return bRecent - aRecent
    })

    return sorted.slice(0, 20).map((item) => {
      const key = item.ticker ? item.ticker.toUpperCase() : item.id
      return {
        ...item,
        isRecent: recentMap.has(key),
      }
    })
  }, [fullSearchPool, mainTab, dataSubFilter, query, recentSearches])

  // Select item action
  const handleSelectItem = useCallback(
    (item: SearchPaletteItem) => {
      saveRecentSearch({
        id: item.id,
        ticker: item.ticker,
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        categoryLabel: item.categoryLabel,
        href: item.href,
        icon: item.icon,
      })
      onClose()
      router.push(item.href)
    },
    [onClose, router]
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredResults[activeIndex]
      if (selected) {
        handleSelectItem(selected)
      } else if (query.trim()) {
        onClose()
        // If it looks like a ticker, go to stock and save recent
        const t = query.trim().toUpperCase()
        if (t.length >= 3 && t.length <= 5 && /^[A-Z0-9]+$/.test(t)) {
          const matched = fullSearchPool.find((s) => s.ticker?.toUpperCase() === t)
          saveRecentSearch({
            id: matched ? matched.id : `stock-${t}`,
            ticker: t,
            title: matched?.title || t,
            subtitle: matched?.subtitle || `Mã cổ phiếu ${t}`,
            category: 'stock',
            categoryLabel: 'Doanh nghiệp',
            href: `/stock/${encodeURIComponent(t)}`,
          })
          router.push(`/stock/${t}`)
        } else {
          router.push(`/bao-cao?search=${encodeURIComponent(query.trim())}`)
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      ) as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  const recentCount = !query.trim()
    ? filteredResults.filter((i) => i.isRecent).length
    : 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-12 sm:pt-20">
      {/* Dark Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centered Modal Container */}
      <div
        className="relative z-50 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#232a36] bg-[#0e1117] text-[#9aa0a6] shadow-2xl transition-all font-sans"
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center border-b border-[#1f242d] bg-[#121620] px-4 py-3">
          <Search className="size-4 shrink-0 text-[#64748b]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            placeholder="Tìm kiếm Biểu đồ, Dữ liệu, Bố cục, Cổ phiếu..."
            className="ml-3 flex-1 bg-transparent text-sm text-[#f1f5f9] placeholder:text-[#64748b] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setActiveIndex(0)
                inputRef.current?.focus()
              }}
              className="p-1 text-[#64748b] hover:text-white transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const selected = filteredResults[activeIndex]
              if (selected) {
                handleSelectItem(selected)
              } else if (query.trim()) {
                onClose()
                const t = query.trim().toUpperCase()
                if (t.length >= 3 && t.length <= 5 && /^[A-Z0-9]+$/.test(t)) {
                  const matched = fullSearchPool.find((s) => s.ticker?.toUpperCase() === t)
                  saveRecentSearch({
                    id: matched ? matched.id : `stock-${t}`,
                    ticker: t,
                    title: matched?.title || t,
                    subtitle: matched?.subtitle || `Mã cổ phiếu ${t}`,
                    category: 'stock',
                    categoryLabel: 'Doanh nghiệp',
                    href: `/stock/${encodeURIComponent(t)}`,
                  })
                  router.push(`/stock/${t}`)
                } else {
                  router.push(`/bao-cao?search=${encodeURIComponent(query.trim())}`)
                }
              }
            }}
            className="ml-2 flex size-6 items-center justify-center rounded bg-[#1f242d] text-[#8b949e] hover:bg-[#283142] hover:text-white transition-colors"
            title="Thực hiện tìm kiếm"
          >
            <ArrowUp className="size-3" />
          </button>
        </div>

        {/* Filter Tabs Row (Exact WiData Style) */}
        <div className="relative flex flex-wrap items-center gap-1.5 border-b border-[#181d26] bg-[#0e1117] px-4 py-2 text-xs">
          {/* Tất cả */}
          <button
            type="button"
            onClick={() => {
              setMainTab('all')
              setShowDataMenu(false)
              setActiveIndex(0)
            }}
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              mainTab === 'all'
                ? 'bg-[#1e2430] text-white font-semibold'
                : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
            )}
          >
            Tất cả
          </button>

          {/* Dữ liệu dropdown */}
          <div className="relative" ref={dataMenuRef}>
            <button
              type="button"
              onClick={() => {
                setMainTab('data')
                setShowDataMenu((prev) => !prev)
                setActiveIndex(0)
              }}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors',
                mainTab === 'data'
                  ? 'bg-[#1e2430] text-white font-semibold'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
              )}
            >
              <span>
                {dataSubFilter !== 'all'
                  ? DATA_SUB_FILTERS.find((f) => f.id === dataSubFilter)?.label || 'Dữ liệu'
                  : 'Dữ liệu'}
              </span>
              <ChevronDown className="size-3" />
            </button>

            {/* Dữ liệu Submenu Popup (Shown on click) */}
            {showDataMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 flex flex-wrap gap-1 rounded-lg border border-[#232a36] bg-[#161b24] p-2 shadow-xl backdrop-blur-md w-72">
                {DATA_SUB_FILTERS.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setDataSubFilter(sub.id as SearchSubFilter)
                      setShowDataMenu(false)
                      setActiveIndex(0)
                    }}
                    className={cn(
                      'rounded px-2 py-1 text-[11.5px] transition-colors',
                      dataSubFilter === sub.id
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-[#8b949e] hover:bg-[#1f2633] hover:text-white'
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Biểu đồ */}
          <button
            type="button"
            onClick={() => {
              setMainTab('chart')
              setShowDataMenu(false)
              setActiveIndex(0)
            }}
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              mainTab === 'chart'
                ? 'bg-[#1e2430] text-white font-semibold'
                : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
            )}
          >
            Biểu đồ
          </button>

          {/* Bố cục */}
          <button
            type="button"
            onClick={() => {
              setMainTab('layout')
              setShowDataMenu(false)
              setActiveIndex(0)
            }}
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              mainTab === 'layout'
                ? 'bg-[#1e2430] text-white font-semibold'
                : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
            )}
          >
            Bố cục
          </button>
        </div>

        {/* Quick Recent Searched Tickers Row */}
        {recentSearches.length > 0 && !query.trim() && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#181d26] bg-[#0b0e14] px-4 py-2 text-xs scrollbar-none">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#64748b] shrink-0">
              <Clock className="size-3 text-emerald-400" />
              Gần đây:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {recentSearches.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item as SearchPaletteItem)}
                  className="group inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#232a36] bg-[#141822] py-0.5 pl-2.5 pr-1.5 text-xs text-[#cbd5e1] hover:border-emerald-500/50 hover:bg-[#1a2230] hover:text-white transition-all shrink-0"
                >
                  <span className="font-semibold text-emerald-400">
                    {item.ticker || item.title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRecentSearch(item.ticker || item.id)
                    }}
                    className="rounded-full p-0.5 text-[#64748b] hover:bg-white/10 hover:text-rose-400 transition-colors"
                    title="Xóa khỏi lịch sử"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => clearRecentSearches()}
              className="ml-auto shrink-0 text-[10.5px] text-[#64748b] hover:text-rose-400 transition-colors pl-2"
              title="Xóa toàn bộ lịch sử tìm kiếm"
            >
              Xóa tất cả
            </button>
          </div>
        )}

        {/* Results Section Title (outside <ul> when searching or when no recents) */}
        {(!recentCount || query.trim()) && (
          <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-[#64748b] uppercase">
            {query.trim() ? `Kết quả tìm kiếm (${filteredResults.length})` : 'Xu hướng tìm kiếm'}
          </div>
        )}

        {/* Results List */}
        <ul
          ref={listRef}
          className="max-h-[380px] overflow-y-auto divide-y divide-[#141820] py-1 scrollbar-thin scrollbar-thumb-[#1f242d] scrollbar-track-transparent"
        >
          {filteredResults.length === 0 ? (
            <li className="py-12 text-center text-xs text-[#64748b]">
              Không tìm thấy kết quả phù hợp với từ khóa &quot;{query}&quot;
            </li>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === activeIndex

              // Category color badge
              let badgeColor = 'text-[#60a5fa] bg-[#1e293b]/50' // default blue
              if (item.category === 'macro') badgeColor = 'text-[#fbbf24] bg-[#292218]/60' // amber
              if (item.category === 'sector') badgeColor = 'text-[#c084fc] bg-[#281a38]/60' // purple
              if (item.category === 'chart') badgeColor = 'text-[#34d399] bg-[#132d22]/60' // emerald
              if (item.category === 'layout') badgeColor = 'text-[#f472b6] bg-[#311626]/60' // pink

              return (
                <Fragment key={item.id}>
                  {/* Recent section header */}
                  {idx === 0 && item.isRecent && !query.trim() && (
                    <li
                      key="header-recent"
                      className="flex items-center justify-between px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-[#64748b] uppercase bg-[#0e1117] border-b border-[#141820]"
                    >
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Clock className="size-3" />
                        Mã tìm kiếm gần đây
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearRecentSearches()
                        }}
                        className="text-[10px] font-normal lowercase text-[#64748b] hover:text-rose-400 transition-colors"
                      >
                        xóa lịch sử
                      </button>
                    </li>
                  )}

                  {/* Trending section header */}
                  {idx === recentCount && recentCount > 0 && !query.trim() && (
                    <li
                      key="header-trending"
                      className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-[#64748b] uppercase bg-[#0e1117] border-t border-[#181d26] border-b border-[#141820]"
                    >
                      <TrendingUp className="size-3 text-[#38bdf8]" />
                      Xu hướng tìm kiếm
                    </li>
                  )}

                  <li
                    data-index={idx}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'group flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors',
                      isSelected ? 'bg-[#161c28]' : 'hover:bg-[#121620]'
                    )}
                  >
                    {/* Left + Middle Content */}
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      {/* Prefix: Clock for recent, or Ticker, or Icon */}
                      {item.isRecent ? (
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400"
                          title="Đã tìm kiếm gần đây"
                        >
                          <Clock className="size-3.5" />
                        </span>
                      ) : null}

                      {item.ticker ? (
                        <span className="w-12 shrink-0 font-mono text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {item.ticker}
                        </span>
                      ) : (
                        !item.isRecent && (
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#161b24] text-xs">
                            {item.icon || '📌'}
                          </span>
                        )
                      )}

                      {/* Title & Subtitle */}
                      <div className="flex flex-col min-w-0 truncate leading-tight">
                        <span
                          className={cn(
                            'text-xs font-medium truncate transition-colors',
                            isSelected ? 'text-white' : 'text-[#cbd5e1]'
                          )}
                        >
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-[#64748b] truncate mt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Category Tag & Optional Delete Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10.5px] font-medium transition-colors',
                          item.isRecent ? 'text-emerald-400 bg-emerald-500/10' : badgeColor
                        )}
                      >
                        {item.isRecent ? 'Gần đây' : item.categoryLabel}
                      </span>

                      {item.isRecent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeRecentSearch(item.ticker || item.id)
                          }}
                          className="rounded p-1 text-[#64748b] opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-rose-400 transition-all"
                          title="Xóa khỏi lịch sử"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </li>
                </Fragment>
              )
            })
          )}
        </ul>

        {/* Footer with Hint & Shortcut */}
        <div className="flex items-center justify-between border-t border-[#181d26] bg-[#0b0e14] px-4 py-2.5 text-[11px] text-[#64748b]">
          <div className="flex items-center gap-1.5 truncate">
            <span>💡</span>
            <span className="truncate">
              Mẹo tìm kiếm: &quot;Dữ liệu/Biểu đồ/Bố cục&quot; + &quot;Từ khóa tìm kiếm&quot; + &quot;Tên khu vực/quốc gia&quot;
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0 font-mono text-[10px]">
            <span className="rounded bg-[#161b24] px-1.5 py-0.5">↑↓ di chuyển</span>
            <span className="rounded bg-[#161b24] px-1.5 py-0.5">Enter chọn</span>
            <span className="rounded bg-[#161b24] px-1.5 py-0.5">Esc đóng</span>
          </div>
        </div>
      </div>
    </div>
  )
}
