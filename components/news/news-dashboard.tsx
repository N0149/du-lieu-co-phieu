'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  X,
  SlidersHorizontal,
  ExternalLink,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CorporateDisclosure } from '@/lib/disclosures'
import { getGuestWatchlist } from '@/lib/guest-watchlist'
import { createClient } from '@/lib/supabase/client'
import { getUserWatchlist } from '@/lib/watchlist-service'

export type NewsSnapshotItem = {
  id: string
  title: string
  link: string
  pubDate: string
  source: string
  ticker: string | null
  tickers?: string[]
  category: string
  summary?: string
}

type TabType = 'cong-bo' | 'all' | 'thi-truong' | 'co-phieu' | 'saved'

interface NewsDashboardProps {
  initialNews?: NewsSnapshotItem[]
  initialTrending?: { ticker: string; count: number }[]
  initialDisclosures?: CorporateDisclosure[]
  stockPriceMap?: Record<string, { px: number | null; w1: number | null }>
  defaultTab?: TabType
  initialWatchlist?: string[]
}

function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);?/g, (_, code) => {
      try {
        const num = Number(code)
        return num > 0 && num < 0x10ffff ? String.fromCodePoint(num) : ''
      } catch {
        return ''
      }
    })
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => {
      try {
        const num = parseInt(hex, 16)
        return num > 0 && num < 0x10ffff ? String.fromCodePoint(num) : ''
      } catch {
        return ''
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Vừa xong'
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffMin < 1) return 'Vừa xong'
    if (diffMin < 60) return `${diffMin} phút trước`
    if (diffHour < 24) return `${diffHour} giờ trước`
    if (diffDay === 1) return '1 ngày trước'
    if (diffDay < 7) return `${diffDay} ngày trước`

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
  } catch {
    return 'Gần đây'
  }
}

export function NewsDashboard({
  initialNews = [],
  initialDisclosures = [],
  stockPriceMap = {},
  defaultTab = 'cong-bo',
  initialWatchlist = [],
}: NewsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'cong-bo')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [userWatchlist, setUserWatchlist] = useState<string[]>(initialWatchlist)
  const [news, setNews] = useState<NewsSnapshotItem[]>(initialNews)
  const [disclosures, setDisclosures] = useState<CorporateDisclosure[]>(initialDisclosures)
  const [discExchange, setDiscExchange] = useState<string>('ALL')
  const [discImportantOnly, setDiscImportantOnly] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(40)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [, setTick] = useState(0)

  // Fetch disclosures if empty
  useEffect(() => {
    if (disclosures.length === 0) {
      fetch('/api/disclosures?limit=200')
        .then((r) => r.json())
        .then((d) => {
          if (d.data && Array.isArray(d.data)) setDisclosures(d.data)
        })
        .catch(() => {})
    }
  }, [disclosures.length])

  // Load saved bookmarks & đồng bộ Watchlist thực tế của người dùng
  useEffect(() => {
    let cancelled = false

    try {
      const saved = localStorage.getItem('rnav_saved_news')
      if (saved) {
        setSavedIds(JSON.parse(saved))
      }
    } catch {}

    const syncRealWatchlist = async () => {
      const supabase = createClient()
      if (!supabase) {
        const guest = getGuestWatchlist()
        if (!cancelled && guest.length > 0) setUserWatchlist(guest)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const res = await getUserWatchlist()
          if (!cancelled) {
            setUserWatchlist(res.items.map((it) => it.ticker.toUpperCase()))
          }
        } else {
          const guest = getGuestWatchlist()
          if (!cancelled) {
            setUserWatchlist(guest)
          }
        }
      } catch {
        const guest = getGuestWatchlist()
        if (!cancelled) setUserWatchlist(guest)
      }
    }

    syncRealWatchlist()
    window.addEventListener('watchlist-updated', syncRealWatchlist)
    return () => {
      cancelled = true
      window.removeEventListener('watchlist-updated', syncRealWatchlist)
    }
  }, [])

  // Toggle bookmark handler
  const toggleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSavedIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((item) => item !== id) : [id, ...prev]
      try {
        localStorage.setItem('rnav_saved_news', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Fetch news data (Hỗ trợ force refresh và background polling)
  const fetchNews = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true)
    else if (news.length === 0) setIsLoading(true)

    try {
      const res = await fetch(`/api/news?limit=1000${force ? '&refresh=true' : ''}`)
      if (res.ok) {
        const data = await res.json()
        if (data.items && Array.isArray(data.items)) {
          setNews(data.items)
          setLastUpdated(new Date(data.lastUpdated || Date.now()))
        }
      }
    } catch (err) {
      console.error('Error fetching news:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [news.length])

  // Fetch disclosures data (Hỗ trợ force refresh và polling)
  const fetchDisclosures = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true)
    try {
      const res = await fetch(`/api/disclosures?limit=200${force ? '&refresh=true' : ''}`)
      if (res.ok) {
        const data = await res.json()
        if (data.data && Array.isArray(data.data)) {
          setDisclosures(data.data)
          setLastUpdated(new Date())
        }
      }
    } catch (err) {
      console.error('Error fetching disclosures:', err)
    } finally {
      if (force) setIsRefreshing(false)
    }
  }, [])

  // Initial fetch if empty
  useEffect(() => {
    if (news.length === 0) {
      fetchNews(false)
    }
  }, [fetchNews, news.length])

  // Tự động kéo disclosures mới khi người dùng chuyển sang tab 'cong-bo'
  useEffect(() => {
    if (activeTab === 'cong-bo') {
      fetchDisclosures(false)
    }
  }, [activeTab, fetchDisclosures])

  // TỰ ĐỘNG CẬP NHẬT: Polling mỗi 60 giây (tự động phát hiện tab hiện tại để fetch nguồn tương ứng)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (activeTab === 'cong-bo') {
        fetchDisclosures(false)
      } else {
        fetchNews(false)
      }
    }, 60000)

    // Tự động tính toán lại relative time ("x phút trước") mỗi 30 giây
    const tickInterval = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(tickInterval)
    }
  }, [activeTab, fetchDisclosures, fetchNews])

  // Filter news
  const filteredNews = useMemo(() => {
    let result = news

    // 1. Tab filter
    if (activeTab === 'saved') {
      const savedSet = new Set(savedIds)
      result = result.filter((item) => savedSet.has(item.id))
    } else if (activeTab === 'co-phieu') {
      // Tab Cổ phiếu / Doanh nghiệp: Chỉ hiển thị bài viết có ticker hoặc doanh nghiệp công bố
      result = result.filter(
        (item) => item.ticker || (item.tickers && item.tickers.length > 0) || item.category === 'doanh-nghiep'
      )
    } else if (activeTab === 'thi-truong') {
      result = result.filter((item) => item.category === 'thi-truong' || item.category === 'quoc-te')
    }

    // 2. Source filter
    if (selectedSource !== 'all') {
      result = result.filter((item) => item.source.toLowerCase() === selectedSource.toLowerCase())
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.summary && item.summary.toLowerCase().includes(q)) ||
          (item.ticker && item.ticker.toLowerCase() === q) ||
          (item.tickers && item.tickers.some((t) => t.toLowerCase() === q))
      )
    }

    // 0. Lọc theo Watchlist cá nhân nếu người dùng bật
    if (watchlistOnly) {
      if (userWatchlist.length === 0) return []
      result = result.filter((item) => {
        const t = item.ticker?.toUpperCase()
        if (t && userWatchlist.includes(t)) return true
        if (item.tickers && item.tickers.some((tk) => userWatchlist.includes(tk.toUpperCase()))) return true
        return false
      })
    }

    return result
  }, [news, activeTab, selectedSource, searchQuery, savedIds, watchlistOnly, userWatchlist])

  const displayedNews = useMemo(() => {
    return filteredNews.slice(0, visibleCount)
  }, [filteredNews, visibleCount])

  const filteredDisclosures = useMemo(() => {
    return disclosures.filter((item) => {
      if (discImportantOnly && !item.is_important) return false
      if (watchlistOnly) {
        if (userWatchlist.length === 0) return false
        if (!userWatchlist.includes(item.symbol.toUpperCase())) return false
      }
      if (discExchange !== 'ALL' && item.exchange?.toUpperCase() !== discExchange.toUpperCase()) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.title.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.doc_type_label.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [disclosures, discExchange, discImportantOnly, watchlistOnly, userWatchlist, searchQuery])

  // Available unique sources
  const availableSources = useMemo(() => {
    const s = new Set<string>()
    news.forEach((i) => {
      if (i.source) s.add(i.source)
    })
    return ['all', ...Array.from(s)]
  }, [news])

  return (
    <div className="min-h-screen w-full bg-[#0b0d11] text-[#9aa0a6] font-sans antialiased">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-30 border-b border-[#1f242d] bg-[#0b0d11]/95 backdrop-blur">
        <div className="flex h-12 w-full items-center justify-between px-3 sm:px-4 lg:px-6">
          {/* Left: Navigation Tabs (Tài liệu mới nhất đưa lên ĐẦU TIÊN) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setActiveTab('cong-bo')}
              className={cn(
                'flex items-center gap-1.5 rounded px-3.5 py-1 text-[13px] font-medium transition-all shrink-0',
                activeTab === 'cong-bo'
                  ? 'bg-[#1e2430] text-[#38bdf8] font-bold border border-[#0284c7]/40 shadow-xs'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#38bdf8]'
              )}
            >
              <span>Tài liệu mới nhất</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-all shrink-0',
                activeTab === 'all'
                  ? 'bg-[#1e2430] text-[#ffffff] font-semibold'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
              )}
            >
              Tất cả tin tức
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('thi-truong')}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-all shrink-0',
                activeTab === 'thi-truong'
                  ? 'bg-[#1e2430] text-[#ffffff] font-semibold'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
              )}
            >
              Thị trường
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('co-phieu')}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-all shrink-0',
                activeTab === 'co-phieu'
                  ? 'bg-[#1e2430] text-[#ffffff] font-semibold'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
              )}
            >
              Cổ phiếu
            </button>

            {savedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={cn(
                  'rounded px-3.5 py-1 text-[13px] font-medium transition-all',
                  activeTab === 'saved'
                    ? 'bg-[#1e2430] text-[#eab308]'
                    : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#eab308]'
                )}
              >
                Đã lưu ({savedIds.length})
              </button>
            )}
          </div>

          {/* Right: Search Input & Filter Dropdown (WiData Style) */}
          <div className="flex items-center gap-3">
            {/* Filter by Source dropdown */}
            <div className="hidden sm:block">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="h-7.5 rounded border border-[#232a36] bg-[#12161f] px-2.5 text-xs text-[#c9d1d9] outline-none transition-colors hover:border-[#384356] focus:border-[#3b82f6]"
              >
                <option value="all">Tất cả nguồn</option>
                {availableSources
                  .filter((s) => s !== 'all')
                  .map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="relative w-44 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm"
                className="h-7.5 w-full rounded border border-[#232a36] bg-[#12161f] pl-8 pr-6 text-xs text-[#f1f5f9] placeholder:text-[#64748b] outline-none transition-colors hover:border-[#384356] focus:border-[#3b82f6]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Live indicator & Last updated time */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#64748b]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-[#8b949e]">Tự động cập nhật</span>
              <span className="font-mono text-[#64748b]">
                ({lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'cong-bo') {
                  fetchDisclosures(true)
                } else {
                  fetchNews(true)
                }
              }}
              disabled={isRefreshing}
              className="flex h-7.5 items-center gap-1.5 rounded border border-[#232a36] bg-[#12161f] px-2 text-xs text-[#8b949e] transition-colors hover:border-[#384356] hover:text-white"
              title="Nhấn để quét dữ liệu mới nhất ngay lập tức"
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin text-emerald-400')} />
              <span className="hidden sm:inline font-medium text-[11px]">
                {isRefreshing ? (activeTab === 'cong-bo' ? 'Đang quét Sở…' : 'Đang quét RSS…') : 'Làm mới'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar bộ lọc nhanh: Watchlist đưa lên ĐẦU TIÊN cho toàn bộ tab */}
      <div className="border-b border-[#181d26] bg-[#0d1118] px-3 sm:px-4 lg:px-6 py-2">
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Nút Watchlist đưa lên ĐẦU TIÊN */}
            <button
              type="button"
              onClick={() => setWatchlistOnly(!watchlistOnly)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer',
                watchlistOnly
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md ring-2 ring-amber-500/25'
                  : 'bg-[#161b24] text-amber-400 hover:bg-[#202734] border-amber-500/30'
              )}
              title="Chỉ hiển thị bài viết & công bố của các mã trong Danh mục theo dõi (Watchlist)"
            >
              <Star className={cn('size-3.5', watchlistOnly ? 'fill-black' : 'fill-amber-400')} />
              <span>Watchlist ({userWatchlist.length} mã)</span>
            </button>

            {/* 2. Nút Tin nhạy cảm giá (khi ở tab công bố) */}
            {activeTab === 'cong-bo' && (
              <button
                type="button"
                onClick={() => setDiscImportantOnly(!discImportantOnly)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 shrink-0 border cursor-pointer',
                  discImportantOnly
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow'
                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                )}
                title="Lọc các văn bản công bố nhạy cảm với biến động giá cổ phiếu"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Tin nhạy cảm giá</span>
                <span className="sm:hidden">Nhạy cảm</span>
              </button>
            )}

            {/* Link thêm nhanh mã nếu danh mục trống */}
            {userWatchlist.length === 0 && (
              <Link
                href="/danh-muc"
                className="text-[11px] text-[#38bdf8] hover:underline flex items-center gap-1 ml-1"
              >
                + Thêm mã vào Watchlist
              </Link>
            )}
          </div>

          {/* Tag thông báo số mã đang lọc */}
          {watchlistOnly && userWatchlist.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#9EACB9] shrink-0 truncate max-w-md">
              <span className="text-[#64748b]">Đang lọc:</span>
              <span className="font-mono text-amber-400 font-semibold truncate">
                {userWatchlist.slice(0, 10).join(', ')}
                {userWatchlist.length > 10 ? ` (+${userWatchlist.length - 10} mã)` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'cong-bo' ? (
        <div className="w-full">

          {/* Desktop Table Header (>= md) */}
          <div className="hidden md:flex h-10 w-full items-center border-b border-[#181d26] bg-[#0b0d11] px-4 text-xs font-medium text-[#7d8590] lg:px-6">
            <div className="w-24 sm:w-28 pl-1 text-left">Mã CK</div>
            <div className="w-16 text-center">Sàn</div>
            <div className="w-32 sm:w-36 text-left">Phân loại</div>
            <div className="flex-1 pl-2 text-left">Tiêu đề văn bản công bố</div>
            <div className="w-28 sm:w-36 text-center">Thời gian</div>
            <div className="w-24 sm:w-28 pr-2 text-right">Tài liệu</div>
          </div>

          {/* Table Body */}
          {filteredDisclosures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#64748b] px-4">
              <div className="size-12 rounded-2xl bg-[#161b24] flex items-center justify-center mb-3 text-2xl border border-[#232a36]">
                📋
              </div>
              <p className="text-sm font-semibold text-[#f1f5f9]">
                {watchlistOnly && userWatchlist.length === 0
                  ? 'Danh mục theo dõi của bạn đang trống'
                  : 'Không tìm thấy công bố phù hợp'}
              </p>
              <p className="text-xs text-[#64748b] mt-1 max-w-sm">
                {watchlistOnly
                  ? userWatchlist.length === 0
                    ? 'Bạn chưa thêm mã cổ phiếu nào vào Watchlist. Hãy thêm các cổ phiếu bạn quan tâm để nhận tin công bố riêng biệt.'
                    : `Chưa có công bố nào của các mã trong Watchlist của bạn (${userWatchlist.join(', ')}). Bạn có thể tắt lọc Watchlist để xem toàn bộ tài liệu.`
                  : 'Thử tìm kiếm với mã cổ phiếu hoặc từ khóa khác.'}
              </p>
              {watchlistOnly && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setWatchlistOnly(false)}
                    className="rounded-lg bg-[#1e293b] px-3.5 py-1.5 text-xs text-[#38bdf8] font-medium hover:bg-[#283548] transition-colors border border-[#0284c7]/30 cursor-pointer"
                  >
                    Xem tất cả tài liệu
                  </button>
                  <Link
                    href="/danh-muc"
                    className="rounded-lg bg-amber-500/15 px-3.5 py-1.5 text-xs text-amber-400 font-medium hover:bg-amber-500/25 transition-colors border border-amber-500/30"
                  >
                    {userWatchlist.length === 0 ? 'Thêm cổ phiếu vào Watchlist' : 'Quản lý Watchlist'}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#141820]">
              {filteredDisclosures.slice(0, visibleCount).map((item) => {
                const priceInfo = stockPriceMap[item.symbol]
                const isImportant = Boolean(item.is_important)
                const inWatchlist = userWatchlist.includes(item.symbol.toUpperCase())

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'transition-colors hover:bg-[#121620]',
                      isImportant && 'bg-amber-500/[0.03]'
                    )}
                  >
                    {/* ── 1. GIAO DIỆN MOBILE (< md): Card Stream hiện đại, dễ đọc, không bị ép chữ ── */}
                    <div className="block md:hidden px-3.5 py-3 space-y-2">
                      {/* Dòng 1: Mã CK, Thị giá, Sàn, Nhạy cảm giá và Thời gian */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <Link
                            href={`/stock/${item.symbol}`}
                            className="inline-flex items-center gap-1 font-mono text-sm font-bold text-white hover:text-[#38bdf8] transition-colors"
                          >
                            <span className="rounded bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/30">
                              {item.symbol}
                            </span>
                          </Link>

                          {priceInfo && priceInfo.px != null && (
                            <span className="text-xs font-mono text-[#cbd5e1] font-semibold">
                              {priceInfo.px}
                              {priceInfo.w1 != null && (
                                <span className={cn('ml-1 text-[10.5px]', priceInfo.w1 > 0 ? 'text-emerald-400' : priceInfo.w1 < 0 ? 'text-rose-400' : 'text-slate-400')}>
                                  {priceInfo.w1 > 0 ? `+${priceInfo.w1}%` : `${priceInfo.w1}%`}
                                </span>
                              )}
                            </span>
                          )}

                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[9.5px] font-bold font-mono uppercase',
                            item.exchange === 'HOSE' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                            item.exchange === 'HNX' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25' :
                            'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          )}>
                            {item.exchange || 'UPCOM'}
                          </span>

                          {inWatchlist && (
                            <span className="rounded bg-amber-500/15 text-amber-400 px-1 py-0.5 text-[9.5px] font-bold border border-amber-500/30" title="Mã trong Watchlist">
                              ★
                            </span>
                          )}

                          {isImportant && (
                            <span className="rounded bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[9.5px] font-bold border border-amber-500/30">
                              ⚡ Nhạy cảm
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-[#64748b] shrink-0">
                          {formatRelativeTime(item.published_at || '') || item.published_at}
                        </span>
                      </div>

                      {/* Dòng 2: Tiêu đề công bố - Hiển thị 100% chiều rộng màn hình, chữ to rõ ràng */}
                      <div>
                        {item.file_url ? (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] sm:text-[13.5px] font-medium text-[#e2e8f0] leading-snug hover:text-[#38bdf8] transition-colors line-clamp-3"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <p className="text-[13px] sm:text-[13.5px] font-medium text-[#e2e8f0] leading-snug line-clamp-3">
                            {item.title}
                          </p>
                        )}
                      </div>

                      {/* Dòng 3: Loại văn bản & Nút thao tác mở tài liệu */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="inline-block rounded bg-[#161b24] px-2 py-0.5 text-[10.5px] font-medium text-[#94a3b8] border border-[#232a36]">
                          {item.doc_type_label || 'Công bố thông tin'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/stock/${item.symbol}`}
                            className="inline-flex items-center gap-1 rounded bg-[#161b24] hover:bg-[#1e2430] px-2 py-1 text-[11px] font-medium text-[#94a3b8] hover:text-white transition-colors border border-[#232a36]"
                          >
                            <span>BCTC & Chi tiết</span>
                          </Link>

                          {item.file_url ? (
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-bold text-sky-400 transition-colors border border-sky-500/30"
                            >
                              <span>Xem file</span>
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#475569] px-1">Chưa có file</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── 2. GIAO DIỆN DESKTOP (>= md): Bảng ngang chuẩn WiData ── */}
                    <div className="hidden md:flex min-h-[48px] w-full items-center px-4 py-2.5 lg:px-6">
                      {/* Symbol & Price */}
                      <div className="w-24 sm:w-28 shrink-0">
                        <Link
                          href={`/stock/${item.symbol}`}
                          className="inline-flex items-center gap-1 font-mono text-sm font-bold text-[#f1f5f9] hover:text-[#38bdf8] transition-colors"
                        >
                          <span>{item.symbol}</span>
                          {inWatchlist && <span className="text-amber-400 text-xs" title="Trong Watchlist">★</span>}
                        </Link>
                        {priceInfo && priceInfo.px != null && (
                          <div className="text-[11px] font-mono text-[#8b949e]">
                            <span>{priceInfo.px}</span>
                            {priceInfo.w1 != null && (
                              <span className={cn('ml-1', priceInfo.w1 > 0 ? 'text-[#10b981]' : priceInfo.w1 < 0 ? 'text-[#ef4444]' : 'text-[#8b949e]')}>
                                {priceInfo.w1 > 0 ? `+${priceInfo.w1}%` : `${priceInfo.w1}%`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Exchange */}
                      <div className="w-16 shrink-0 text-center">
                        <span className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold font-mono',
                          item.exchange === 'HOSE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          item.exchange === 'HNX' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        )}>
                          {item.exchange || 'UPCOM'}
                        </span>
                      </div>

                      {/* Doc Type Badge */}
                      <div className="w-32 sm:w-36 shrink-0 pr-2">
                        <span className="rounded bg-[#1a202c] px-2 py-0.5 text-[11px] font-medium text-[#94a3b8] border border-[#2d3748]">
                          {item.doc_type_label || 'CBTT'}
                        </span>
                        {isImportant && (
                          <span className="ml-1 text-[11px] text-amber-400 font-bold" title="Tin nhạy cảm giá">⚡</span>
                        )}
                      </div>

                      {/* Title */}
                      <div className="flex-1 pl-2 pr-4 min-w-0">
                        {item.file_url ? (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-normal text-[#e2e8f0] leading-snug hover:text-[#38bdf8] transition-colors block truncate"
                            title={item.title}
                          >
                            {item.title}
                          </a>
                        ) : (
                          <p className="text-[13px] font-normal text-[#e2e8f0] leading-snug truncate" title={item.title}>
                            {item.title}
                          </p>
                        )}
                      </div>

                      {/* Published Date */}
                      <div className="w-28 sm:w-36 shrink-0 text-center text-xs font-mono text-[#64748b]">
                        {item.published_at}
                      </div>

                      {/* Original Document Link */}
                      <div className="w-24 sm:w-28 shrink-0 text-right pr-2">
                        {item.file_url ? (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-[#161b24] hover:bg-[#222a38] px-2 py-1 text-[11px] font-medium text-[#38bdf8] transition-colors border border-[#232a36]"
                          >
                            <span>Xem file</span>
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#475569]">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Load More Button for Disclosures */}
          {filteredDisclosures.length > visibleCount && (
            <div className="border-t border-[#181d26] bg-[#0b0d11] p-5 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 40)}
                className="rounded border border-[#232a36] bg-[#161a22] px-5 py-2 text-xs font-medium text-[#c9d1d9] transition-colors hover:border-[#384356] hover:bg-[#1e2430] hover:text-white"
              >
                Tải thêm ({filteredDisclosures.length - visibleCount} văn bản còn lại)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Main WiData Table Header */
        <div className="w-full">
          <div className="flex h-10 w-full items-center border-b border-[#181d26] bg-[#0b0d11] px-4 text-xs font-medium text-[#7d8590] lg:px-6">
            <div className="w-10 text-center">
              {/* Bookmark column header */}
            </div>
            <div className="w-28 sm:w-36 pl-1 text-left">
              Thời gian
            </div>
            <div className="flex-1 pl-2 text-left">
              Tiêu đề bài viết
            </div>
            <div className="w-28 sm:w-36 pr-2 text-right">
              Nguồn
            </div>
          </div>

          {/* Loading skeletons */}
          {isLoading && (
            <div className="divide-y divide-[#141820]">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="flex h-12 animate-pulse items-center px-4 lg:px-6">
                  <div className="size-4 w-10 rounded bg-[#161a22]" />
                  <div className="h-3.5 w-28 sm:w-36 rounded bg-[#161a22]" />
                  <div className="flex-1 pl-2">
                    <div className="h-3.5 w-3/4 rounded bg-[#161a22]" />
                  </div>
                  <div className="h-3.5 w-28 sm:w-36 rounded bg-[#161a22]" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && displayedNews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 text-center text-[#64748b] px-4">
              <p className="text-sm font-semibold text-[#f1f5f9]">
                {watchlistOnly
                  ? userWatchlist.length === 0
                    ? 'Danh mục theo dõi của bạn đang trống'
                    : 'Không có tin tức nào về các mã trong Watchlist của bạn'
                  : 'Không có bài viết nào phù hợp bộ lọc'}
              </p>
              <p className="text-xs text-[#64748b] mt-1 max-w-sm">
                {watchlistOnly
                  ? userWatchlist.length === 0
                    ? 'Hãy thêm các mã cổ phiếu bạn quan tâm vào Watchlist để lọc tin nhanh chóng.'
                    : `Hiện chưa có tin bài mới liên quan đến (${userWatchlist.join(', ')}). Bạn có thể tắt lọc Watchlist để xem toàn bộ tin tức.`
                  : 'Thử tìm kiếm với từ khóa khác hoặc chuyển sang nguồn tin khác.'}
              </p>
              {watchlistOnly && userWatchlist.length === 0 ? (
                <Link
                  href="/danh-muc"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs text-black font-bold hover:bg-emerald-400 transition-colors"
                >
                  <Star className="size-3.5 fill-black" />
                  <span>Thêm cổ phiếu vào Watchlist</span>
                </Link>
              ) : (
                (searchQuery || selectedSource !== 'all' || activeTab !== 'all' || watchlistOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedSource('all')
                      setWatchlistOnly(false)
                    }}
                    className="mt-3 rounded bg-[#1e2430] px-3.5 py-1.5 text-xs text-[#c9d1d9] hover:bg-[#283142] hover:text-white cursor-pointer border border-[#2d3748]"
                  >
                    Xem tất cả tin tức
                  </button>
                )
              )}
            </div>
          )}

          {/* WiData News Row Stream */}
          {!isLoading && displayedNews.length > 0 && (
            <div className="divide-y divide-[#141820]">
              {displayedNews.map((item, idx) => {
                const isSaved = savedIds.includes(item.id)
                const relativeTime = formatRelativeTime(item.pubDate)
                const tickersList =
                  item.tickers && item.tickers.length > 0
                    ? item.tickers
                    : item.ticker
                    ? [item.ticker]
                    : []

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="group flex min-h-[46px] w-full items-start px-4 py-2.5 transition-colors hover:bg-[#121620] lg:px-6"
                  >
                    {/* Col 1: Bookmark Icon (WiData Style) */}
                    <div className="flex w-10 shrink-0 items-center justify-center pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(item.id, e)}
                        className={cn(
                          'flex size-5 items-center justify-center rounded transition-colors',
                          isSaved
                            ? 'text-[#eab308]'
                            : 'text-[#374151] hover:text-[#9ca3af] group-hover:text-[#6b7280]'
                        )}
                        title={isSaved ? 'Bỏ lưu' : 'Lưu bài'}
                      >
                        <Bookmark
                          className={cn(
                            'size-3.5',
                            isSaved && 'fill-[#eab308]'
                          )}
                        />
                      </button>
                    </div>

                    {/* Col 2: Relative Time (WiData Style) */}
                    <div className="w-28 sm:w-36 shrink-0 pl-1 pt-0.5 text-left text-xs font-normal text-[#8e95a5]">
                      {relativeTime}
                    </div>

                    {/* Col 3: Title + Ticker Pills (WiData Style) */}
                    <div className="flex-1 pl-2 pr-4">
                      {/* Title */}
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[13px] font-normal leading-snug text-[#e2e8f0] transition-colors hover:text-[#60a5fa]"
                      >
                        {decodeHtmlEntities(item.title)}
                      </a>

                      {/* Ticker Badges (Pills placed directly under title like WiData) */}
                      {tickersList.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {tickersList.map((t) => {
                            const stockData = stockPriceMap[t]
                            const chg = stockData?.w1 ?? 0
                            const isPos = chg > 0
                            const isNeg = chg < 0

                            return (
                              <Link
                                key={t}
                                href={`/stock/${t}`}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 font-mono text-[10.5px] font-medium transition-all hover:brightness-125',
                                  isPos
                                    ? 'bg-[#132a1e] text-[#4ade80] border border-[#22c55e]/30'
                                    : isNeg
                                    ? 'bg-[#2d1417] text-[#f87171] border border-[#ef4444]/30'
                                    : 'bg-[#282012] text-[#fbbf24] border border-[#eab308]/30'
                                )}
                                title={`Xem phân tích mã ${t}`}
                              >
                                <span>{t}</span>
                                <span className="text-[9.5px]">
                                  ({isPos ? `+${chg}%` : `${chg}%`})
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Col 4: Source Name (WiData Style: simple right-aligned text) */}
                    <div className="w-28 sm:w-36 shrink-0 pr-2 pt-0.5 text-right text-xs font-normal text-[#8e95a5]">
                      {item.source}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Load More Button */}
          {!isLoading && filteredNews.length > visibleCount && (
            <div className="border-t border-[#181d26] bg-[#0b0d11] p-5 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 40)}
                className="rounded border border-[#232a36] bg-[#161a22] px-5 py-2 text-xs font-medium text-[#c9d1d9] transition-colors hover:border-[#384356] hover:bg-[#1e2430] hover:text-white"
              >
                Tải thêm tin tức ({filteredNews.length - visibleCount} bài còn lại)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
