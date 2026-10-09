'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ExternalLink,
  Bot,
  Cpu,
  TrendingUp,
  Coins,
  Layers,
  Sparkles,
  Calendar,
  X,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChinaNewsItem } from '@/lib/china-news-service'

interface ChinaNewsViewProps {
  initialItems?: ChinaNewsItem[]
  lastUpdated?: string
  dateStr?: string
  savedIds?: string[]
  onToggleBookmark?: (id: string, e?: React.MouseEvent) => void
}

type SubCategory = 'all' | 'ai' | 'tech' | 'economy' | 'investment'

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Gần đây'
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

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  ai: {
    label: 'Trí tuệ nhân tạo (AI)',
    icon: Bot,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  tech: {
    label: 'Công nghệ & Bán dẫn',
    icon: Cpu,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
  },
  economy: {
    label: 'Kinh tế & Thị trường',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  investment: {
    label: 'Xu hướng đầu tư & VC',
    icon: Coins,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
}

export function ChinaNewsView({
  initialItems = [],
  lastUpdated,
  dateStr,
  savedIds = [],
  onToggleBookmark,
}: ChinaNewsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<SubCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')

  const availableSources = useMemo(() => {
    const s = new Set<string>()
    initialItems.forEach((i) => {
      if (i.source) s.add(i.source)
    })
    return ['all', ...Array.from(s)]
  }, [initialItems])

  const categoryCounts = useMemo(() => {
    return {
      all: initialItems.length,
      ai: initialItems.filter((i) => i.category === 'ai').length,
      tech: initialItems.filter((i) => i.category === 'tech').length,
      economy: initialItems.filter((i) => i.category === 'economy').length,
      investment: initialItems.filter((i) => i.category === 'investment').length,
    }
  }, [initialItems])

  const filteredItems = useMemo(() => {
    let list = initialItems

    if (selectedCategory !== 'all') {
      list = list.filter((i) => i.category === selectedCategory)
    }

    if (selectedSource !== 'all') {
      list = list.filter((i) => i.source.toLowerCase().includes(selectedSource.toLowerCase()))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((it) => {
        const inTitleVi = it.titleVi?.toLowerCase().includes(q)
        const inTitleOriginal = it.titleOriginal?.toLowerCase().includes(q)
        const inSource = it.source?.toLowerCase().includes(q)
        const inTags = it.tags?.some((t) => t.toLowerCase().includes(q))
        const inTakeaways = it.takeaways?.some((tw) => tw.toLowerCase().includes(q))
        return inTitleVi || inTitleOriginal || inSource || inTags || inTakeaways
      })
    }

    return list
  }, [initialItems, selectedCategory, selectedSource, searchQuery])

  return (
    <div className="w-full space-y-4 px-3 sm:px-4 lg:px-6 py-4">
      {/* ── Banner Thông tin 24h & Tiết kiệm API ── */}
      <div className="relative overflow-hidden rounded-xl border border-[#202838] bg-gradient-to-r from-[#0d131f] via-[#101726] to-[#0d131f] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇨🇳</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Bản Tin Kinh Tế, AI & Công Nghệ Trung Quốc (24 Giờ Qua)
                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  AI Summarized
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-[#94a3b8] leading-relaxed">
              Tổng hợp và dịch thuật tự động từ các nguồn báo chí uy tín hàng đầu Trung Quốc:
              <span className="font-semibold text-[#cbd5e1]"> 36Kr, QbitAI, Jiqizhixin, Caixin, Wallstreetcn, Yicai</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <div className="flex items-center gap-2 rounded-lg border border-[#232d3f] bg-[#121927] px-3 py-1.5 text-xs text-[#94a3b8]">
              <Calendar className="size-3.5 text-cyan-400" />
              <span>Cập nhật: </span>
              <span className="font-semibold text-white">
                {dateStr || new Date().toLocaleDateString('vi-VN')}
              </span>
              <span className="text-[11px] text-[#64748b]">(1 lần/ngày)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Thanh lọc chuyên mục con (Pills) & Tìm kiếm ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#181d26] pb-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 border cursor-pointer',
              selectedCategory === 'all'
                ? 'bg-[#1e2738] text-white border-cyan-500/50 shadow-sm'
                : 'bg-[#12161f] text-[#8b949e] border-[#222938] hover:bg-[#181f2c] hover:text-white'
            )}
          >
            <Layers className="size-3.5" />
            <span>Tất cả</span>
            <span className="ml-1 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px] font-mono text-[#cbd5e1]">
              {categoryCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('ai')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 border cursor-pointer',
              selectedCategory === 'ai'
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-[#12161f] text-[#8b949e] border-[#222938] hover:bg-[#181f2c] hover:text-cyan-300'
            )}
          >
            <Bot className="size-3.5" />
            <span>Trí tuệ nhân tạo (AI)</span>
            <span className="ml-1 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px] font-mono text-cyan-300">
              {categoryCounts.ai}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('tech')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 border cursor-pointer',
              selectedCategory === 'tech'
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/50 shadow-sm'
                : 'bg-[#12161f] text-[#8b949e] border-[#222938] hover:bg-[#181f2c] hover:text-indigo-300'
            )}
          >
            <Cpu className="size-3.5" />
            <span>Công nghệ & Bán dẫn</span>
            <span className="ml-1 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px] font-mono text-indigo-300">
              {categoryCounts.tech}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('economy')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 border cursor-pointer',
              selectedCategory === 'economy'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-[#12161f] text-[#8b949e] border-[#222938] hover:bg-[#181f2c] hover:text-emerald-300'
            )}
          >
            <TrendingUp className="size-3.5" />
            <span>Kinh tế & Thị trường</span>
            <span className="ml-1 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px] font-mono text-emerald-300">
              {categoryCounts.economy}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('investment')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 border cursor-pointer',
              selectedCategory === 'investment'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-[#12161f] text-[#8b949e] border-[#222938] hover:bg-[#181f2c] hover:text-amber-300'
            )}
          >
            <Coins className="size-3.5" />
            <span>Đầu tư & Vốn VC</span>
            <span className="ml-1 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px] font-mono text-amber-300">
              {categoryCounts.investment}
            </span>
          </button>
        </div>

        {/* Filter Source & Search */}
        <div className="flex items-center gap-2">
          {availableSources.length > 2 && (
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="h-8 rounded-lg border border-[#232a36] bg-[#12161f] px-2.5 text-xs text-[#c9d1d9] outline-none transition-colors hover:border-[#384356] focus:border-cyan-500"
            >
              <option value="all">Tất cả nguồn báo</option>
              {availableSources
                .filter((s) => s !== 'all')
                .map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
            </select>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo chủ đề, tag..."
              className="h-8 w-full rounded-lg border border-[#232a36] bg-[#12161f] pl-8 pr-7 text-xs text-[#f1f5f9] placeholder:text-[#64748b] outline-none transition-colors hover:border-[#384356] focus:border-cyan-500"
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
        </div>
      </div>

      {/* ── Danh sách bài viết dạng Card thông tin ── */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[#64748b]">
          <div className="size-12 rounded-2xl bg-[#161b24] flex items-center justify-center mb-3 text-2xl border border-[#232a36]">
            🇨🇳
          </div>
          <p className="text-sm font-semibold text-[#f1f5f9]">Không có tin tức nào phù hợp</p>
          <p className="text-xs text-[#64748b] mt-1 max-w-sm">
            Thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục khác.
          </p>
          {(selectedCategory !== 'all' || selectedSource !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSelectedSource('all')
                setSearchQuery('')
              }}
              className="mt-3 rounded-lg bg-[#1e2738] px-3.5 py-1.5 text-xs text-cyan-400 font-medium hover:bg-[#253248] transition-colors border border-cyan-500/30 cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.tech
            const CatIcon = catConfig.icon
            const isSaved = savedIds.includes(item.id)

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border border-[#1d2533] bg-[#0e131c] p-4 sm:p-5 transition-all duration-200 hover:border-[#2d394e] hover:bg-[#121824] hover:shadow-lg hover:shadow-black/40"
              >
                <div className="space-y-3">
                  {/* Top Bar: Source + Category + Time + Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Nguồn báo chí uy tín */}
                      <span className="rounded-md bg-[#192232] border border-[#27354d] px-2 py-0.5 text-[11px] font-bold text-[#e2e8f0]">
                        {item.source}
                      </span>

                      {/* Phân loại danh mục */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border',
                          catConfig.bg,
                          catConfig.color,
                          catConfig.border
                        )}
                      >
                        <CatIcon className="size-3" />
                        <span>{catConfig.label}</span>
                      </span>

                      {/* Thời gian đăng */}
                      <span className="text-[11px] font-mono text-[#64748b]">
                        • {formatRelativeTime(item.pubDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onToggleBookmark && (
                        <button
                          type="button"
                          onClick={(e) => onToggleBookmark(item.id, e)}
                          className={cn(
                            'p-1 text-[#64748b] hover:text-amber-400 transition-colors',
                            isSaved && 'text-amber-400'
                          )}
                          title={isSaved ? 'Bỏ lưu' : 'Lưu bài viết'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="size-4 fill-amber-400" />
                          ) : (
                            <Bookmark className="size-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tiêu đề tiếng Việt */}
                  <div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group-hover:text-cyan-400 transition-colors"
                    >
                      <h3 className="text-sm sm:text-[15px] font-bold text-[#f1f5f9] leading-snug">
                        {item.titleVi}
                      </h3>
                    </a>

                    {/* Tiêu đề tiếng Trung gốc (nhỏ mờ bên dưới) */}
                    {item.titleOriginal && (
                      <p
                        className="mt-1 text-[11px] text-[#64748b] line-clamp-1 italic"
                        title={item.titleOriginal}
                      >
                        Gốc: {item.titleOriginal}
                      </p>
                    )}
                  </div>

                  {/* Điểm tin cốt lõi (Takeaways / Bullet Points) */}
                  {item.takeaways && item.takeaways.length > 0 && (
                    <div className="rounded-lg border border-[#1b2331] bg-[#0a0e16]/80 p-3 space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400/90 uppercase tracking-wider">
                        <Sparkles className="size-3" />
                        <span>Điểm tin cốt lõi</span>
                      </div>
                      <ul className="space-y-1 text-xs text-[#cbd5e1] leading-relaxed">
                        {item.takeaways.map((tw, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-cyan-400 font-bold shrink-0 leading-tight">•</span>
                            <span>{tw}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer: Tags & Đọc bài gốc */}
                <div className="mt-4 pt-3 border-t border-[#171d27] flex items-center justify-between gap-2">
                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {item.tags?.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSearchQuery(tag)}
                        className="rounded bg-[#141b26] hover:bg-[#1a2332] px-1.5 py-0.5 text-[10px] font-medium text-[#8b949e] hover:text-cyan-300 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  {/* Nút xem bài gốc */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
                  >
                    <span>Xem bài gốc</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
