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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

type TabType = 'all' | 'thi-truong' | 'co-phieu' | 'saved'

interface NewsDashboardProps {
  initialNews?: NewsSnapshotItem[]
  initialTrending?: { ticker: string; count: number }[]
  stockPriceMap?: Record<string, { px: number | null; w1: number | null }>
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
  stockPriceMap = {},
}: NewsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [news, setNews] = useState<NewsSnapshotItem[]>(initialNews)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(40)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [, setTick] = useState(0)

  // Load saved bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rnav_saved_news')
      if (saved) {
        setSavedIds(JSON.parse(saved))
      }
    } catch {}
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

  // Initial fetch if empty
  useEffect(() => {
    if (news.length === 0) {
      fetchNews(false)
    }
  }, [fetchNews, news.length])

  // TỰ ĐỘNG CẬP NHẬT TIN TỨC: Polling mỗi 60 giây
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchNews(false)
    }, 60000)

    // Tự động tính toán lại relative time ("x phút trước") mỗi 30 giây
    const tickInterval = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(tickInterval)
    }
  }, [fetchNews])

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

    return result
  }, [news, activeTab, selectedSource, searchQuery, savedIds])

  const displayedNews = useMemo(() => {
    return filteredNews.slice(0, visibleCount)
  }, [filteredNews, visibleCount])

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
      {/* Top Header Navigation (Exact WiData Style) */}
      <div className="sticky top-0 z-30 border-b border-[#1f242d] bg-[#0b0d11]/95 backdrop-blur">
        <div className="flex h-12 w-full items-center justify-between px-4 lg:px-6">
          {/* Left: WiData Navigation Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-all',
                activeTab === 'all'
                  ? 'bg-[#1e2430] text-[#ffffff]'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
              )}
            >
              Tất cả tin tức
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('thi-truong')}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-all',
                activeTab === 'thi-truong'
                  ? 'bg-[#1e2430] text-[#ffffff]'
                  : 'text-[#8b949e] hover:bg-[#161a22] hover:text-[#c9d1d9]'
              )}
            >
              Thị trường
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('co-phieu')}
              className={cn(
                'rounded px-3.5 py-1 text-[13px] font-medium transition-all',
                activeTab === 'co-phieu'
                  ? 'bg-[#1e2430] text-[#ffffff]'
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
              onClick={() => fetchNews(true)}
              disabled={isRefreshing}
              className="flex h-7.5 items-center gap-1.5 rounded border border-[#232a36] bg-[#12161f] px-2 text-xs text-[#8b949e] transition-colors hover:border-[#384356] hover:text-white"
              title="Nhấn để quét RSS mới nhất ngay lập tức"
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin text-emerald-400')} />
              <span className="hidden sm:inline font-medium text-[11px]">
                {isRefreshing ? 'Đang quét RSS…' : 'Làm mới'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main WiData Table Header */}
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
          <div className="flex flex-col items-center justify-center py-28 text-center text-[#64748b]">
            <p className="text-sm font-medium text-[#94a3b8]">Không có bài viết nào phù hợp bộ lọc</p>
            {(searchQuery || selectedSource !== 'all' || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedSource('all')
                  setActiveTab('all')
                }}
                className="mt-3 rounded bg-[#1e2430] px-3 py-1.5 text-xs text-[#c9d1d9] hover:bg-[#283142] hover:text-white"
              >
                Xóa toàn bộ bộ lọc
              </button>
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
                      {item.title}
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
    </div>
  )
}
