'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Search,
  SlidersHorizontal,
  FileText,
  TrendingUp,
  Award,
  Calendar,
  ExternalLink,
  X,
  Copy,
  Check,
  ChevronRight,
  BookOpen,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  ArrowUpDown,
  Printer,
  ChevronDown,
} from 'lucide-react'
import type { NghienCuuAiReport, NghienCuuAiDetail } from '@/lib/nghien-cuu-ai-service'
import { cn } from '@/lib/utils'

interface Props {
  initialReports: NghienCuuAiReport[]
  kpis: {
    total: number
    superAttractive: number
    favorable: number
    watchlist: number
    avgScore: string
    maxScore: string
    topReport?: NghienCuuAiReport
  }
}

type FilterTier = 'all' | 'super' | 'favorable' | 'watchlist' | 'q3'
type SortMode = 'score_desc' | 'date_desc' | 'ticker_asc'
type ViewMode = 'grid' | 'table'

export function NghienCuuAiExplorer({ initialReports, kpis }: Props) {
  const [reports] = useState<NghienCuuAiReport[]>(initialReports)
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<FilterTier>('all')
  const [sortMode, setSortMode] = useState<SortMode>('score_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Modal đọc toàn văn
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<NghienCuuAiDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copied, setCopied] = useState(false)

  // Mở modal đọc bài
  const handleOpenReport = async (slug: string) => {
    setSelectedSlug(slug)
    setLoadingDetail(true)
    setDetailData(null)
    setCopied(false)

    try {
      const res = await fetch(`/api/nghien-cuu-ai/${encodeURIComponent(slug)}`)
      if (res.ok) {
        const data = await res.json()
        setDetailData(data)
      }
    } catch (e) {
      console.error('Lỗi tải bài viết:', e)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Đóng modal
  const handleCloseModal = () => {
    setSelectedSlug(null)
    setDetailData(null)
  }

  // Sao chép nội dung Markdown
  const handleCopyMarkdown = () => {
    if (!detailData?.markdown) return
    navigator.clipboard.writeText(detailData.markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // In bài viết
  const handlePrint = () => {
    window.print()
  }

  // Lọc và sắp xếp
  const filteredReports = useMemo(() => {
    let list = [...reports]

    // 1. Tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (r) =>
          (r.ticker && r.ticker.toLowerCase().includes(q)) ||
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q)
      )
    }

    // 2. Lọc theo nhóm điểm
    if (tierFilter === 'super') {
      list = list.filter((r) => r.score != null && r.score >= 200)
    } else if (tierFilter === 'favorable') {
      list = list.filter((r) => r.score != null && r.score >= 150 && r.score < 200)
    } else if (tierFilter === 'watchlist') {
      list = list.filter((r) => r.score != null && r.score >= 100 && r.score < 150)
    } else if (tierFilter === 'q3') {
      list = list.filter((r) => r.title.toLowerCase().includes('quy 3') || r.title.toLowerCase().includes('q3') || r.title.includes('31.10.26'))
    }

    // 3. Sắp xếp
    if (sortMode === 'score_desc') {
      list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    } else if (sortMode === 'date_desc') {
      // Parse DD/MM/YYYY
      const parseD = (s: string) => {
        const parts = s.split('/')
        if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime()
        return 0
      }
      list.sort((a, b) => parseD(b.date) - parseD(a.date))
    } else if (sortMode === 'ticker_asc') {
      list.sort((a, b) => (a.ticker || 'ZZZ').localeCompare(b.ticker || 'ZZZ'))
    }

    return list
  }, [reports, searchQuery, tierFilter, sortMode])

  // Badge màu sắc theo điểm định giá
  const renderScoreBadge = (score: number | null, classification: string | null) => {
    if (score == null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/30">
          Chuyên Đề
        </span>
      )
    }

    if (score >= 200) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <Award className="size-3.5" />
          <span>{score} ĐIỂM</span>
          <span className="text-[10px] font-normal text-emerald-300/80">· Siêu Hấp Dẫn</span>
        </span>
      )
    }

    if (score >= 150) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/30">
          <TrendingUp className="size-3.5" />
          <span>{score} ĐIỂM</span>
          <span className="text-[10px] font-normal text-blue-300/80">· Khả Quan</span>
        </span>
      )
    }

    if (score >= 100) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
          <span>{score} ĐIỂM</span>
          <span className="text-[10px] font-normal text-amber-300/80">· Theo Dõi</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30">
        <ShieldAlert className="size-3.5" />
        <span>{score} ĐIỂM</span>
        <span className="text-[10px] font-normal text-rose-300/80">· Thua Tiết Kiệm</span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ 1. BANNER & KPI STRIP ═══ */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1f2e] via-[#141824] to-[#0f121a] p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 size-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 size-60 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
              <Sparkles className="size-3.5 animate-pulse" />
              <span>Cơ Sở Dữ Liệu Nghiên Cứu Chuyên Sâu AI & MCP Tool</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Kho Nghiên Cứu Chuyên Sâu AI
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-[#9EACB9]">
              Hệ thống bóc tách 5 trụ cột tài chính (Forensic), rà soát nợ vay, dòng tiền kinh doanh (OCF)
              và hệ điểm định giá độc quyền quy chiếu{' '}
              <b className="text-emerald-400 font-semibold">Gửi tiết kiệm lãi kép 10%/năm = 100 điểm</b>.
              Toàn bộ dữ liệu được đồng bộ trực tiếp cho khách hàng và công cụ MCP (AI).
            </p>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-xl border border-white/8 bg-[#1f2433]/70 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-[#9EACB9]">Tổng Báo Cáo</div>
              <div className="mt-1 text-2xl font-extrabold text-white font-mono">{kpis.total}</div>
              <div className="mt-0.5 text-[10px] text-emerald-400">Đã đồng bộ</div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-emerald-300">Siêu Hấp Dẫn</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-400 font-mono">
                {kpis.superAttractive}
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-400/80">&gt; 200 điểm</div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-blue-300">Khả Quan</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-400 font-mono">{kpis.favorable}</div>
              <div className="mt-0.5 text-[10px] text-blue-400/80">151 – 200 điểm</div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-amber-300">Điểm Cao Nhất</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-400 font-mono">
                {kpis.maxScore}
              </div>
              <div className="mt-0.5 text-[10px] text-amber-300/80 font-mono">
                {kpis.topReport?.ticker || 'ABT'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC ═══ */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#1c212d] p-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9EACB9]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã CK (SJE, LHG, S55, MWG...), tiêu đề, từ khóa..."
            className="w-full rounded-lg border border-white/10 bg-[#161a23] pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#64748B] focus:border-emerald-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9EACB9] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setTierFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
              tierFilter === 'all'
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
            )}
          >
            Tất cả ({reports.length})
          </button>

          <button
            onClick={() => setTierFilter('super')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
              tierFilter === 'super'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
            )}
          >
            ⭐ Siêu hấp dẫn ({kpis.superAttractive})
          </button>

          <button
            onClick={() => setTierFilter('favorable')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
              tierFilter === 'favorable'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
            )}
          >
            🟢 Khả quan ({kpis.favorable})
          </button>

          <button
            onClick={() => setTierFilter('watchlist')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
              tierFilter === 'watchlist'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
            )}
          >
            🟡 Theo dõi ({kpis.watchlist})
          </button>

          <button
            onClick={() => setTierFilter('q3')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
              tierFilter === 'q3'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
            )}
          >
            📊 BCTC Quý 3 mới
          </button>
        </div>

        {/* View mode toggle & Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-white/10 bg-[#161a23] px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
          >
            <option value="score_desc">Điểm cao nhất</option>
            <option value="date_desc">Mới nhất</option>
            <option value="ticker_asc">Mã CK (A - Z)</option>
          </select>

          <div className="flex rounded-lg border border-white/10 bg-[#161a23] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-[#64748B] hover:text-white'
              )}
              title="Dạng lưới thẻ"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'table' ? 'bg-white/15 text-white' : 'text-[#64748B] hover:text-white'
              )}
              title="Dạng bảng đối chiếu"
            >
              <TableIcon className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ 3. DANH SÁCH BÀI NGHIÊN CỨU ═══ */}
      {filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#1c212d] p-12 text-center text-[#9EACB9]">
          <BookOpen className="mx-auto size-10 text-[#64748B] mb-3" />
          <p className="text-base font-semibold text-white">Không tìm thấy báo cáo phù hợp</p>
          <p className="text-xs text-[#9EACB9] mt-1">Vui lòng thử từ khóa tìm kiếm hoặc bộ lọc khác.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ──── DẠNG LƯỚI THẺ (GRID) ──── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.slug}
              className="group relative flex flex-col justify-between rounded-xl border border-white/8 bg-[#212631] p-5 transition-all duration-200 hover:border-emerald-500/40 hover:bg-[#252b38] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            >
              <div>
                {/* Header card: Ticker & Score Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                      {report.ticker || 'CHUYÊN ĐỀ'}
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[#9EACB9]">
                      {report.date}
                    </span>
                  </div>

                  <div>{renderScoreBadge(report.score, report.classification)}</div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#F0F3F6] line-clamp-2 group-hover:text-white transition-colors mb-2">
                  {report.title}
                </h3>

                {/* Highlights / Summary */}
                <p className="text-xs leading-relaxed text-[#9EACB9] line-clamp-3 mb-4">
                  {report.summary || 'Báo cáo phân tích chuyên sâu 5 trụ cột và định giá.'}
                </p>
              </div>

              {/* Bottom footer: Price & Buttons */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
                <div className="text-xs">
                  {report.price ? (
                    <span className="text-[#9EACB9]">
                      Giá phân tích:{' '}
                      <b className="font-mono text-white">{report.price.toFixed(1)} k₫</b>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#64748B]">BCTC & Định giá SOTP</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {report.ticker && report.ticker !== 'MACRO' && (
                    <Link
                      href={`/stock/${report.ticker}`}
                      className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-xs text-[#9EACB9] hover:text-white transition-colors"
                      title="Xem hồ sơ tài chính 16 năm"
                    >
                      Hồ sơ
                    </Link>
                  )}

                  <button
                    onClick={() => handleOpenReport(report.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all hover:shadow-md cursor-pointer"
                  >
                    <BookOpen className="size-3.5" />
                    <span>Đọc báo cáo</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ──── DẠNG BẢNG ĐỐI CHIẾU (TABLE) ──── */
        <div className="overflow-hidden rounded-xl border border-white/8 bg-[#212631] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-[#1a1d26] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                    Mã CK
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                    Điểm Định Giá
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                    Tiêu Đề Báo Cáo
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                    Ngày Nghiên Cứu
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                    Giá Phân Tích
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReports.map((report) => (
                  <tr
                    key={report.slug}
                    className="transition-colors hover:bg-white/[0.03] cursor-pointer"
                    onClick={() => handleOpenReport(report.slug)}
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      {report.ticker || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {renderScoreBadge(report.score, report.classification)}
                    </td>
                    <td className="px-4 py-3.5 max-w-md">
                      <div className="font-semibold text-white truncate">{report.title}</div>
                      <div className="text-xs text-[#9EACB9] line-clamp-1 mt-0.5">
                        {report.summary}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#9EACB9]">
                      {report.date}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-white">
                      {report.price ? `${report.price.toFixed(1)} k₫` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenReport(report.slug)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-transparent text-emerald-400 hover:text-white px-3 py-1.5 text-xs font-semibold transition-all"
                      >
                        <BookOpen className="size-3.5" />
                        <span>Đọc ngay</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ 4. FULLSCREEN / MODAL READER ═══ */}
      {selectedSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex flex-col w-full max-w-5xl h-[92vh] rounded-2xl border border-white/15 bg-[#171a23] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#1a1e29] px-6 py-4 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {detailData?.ticker && (
                    <span className="rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-xs font-black font-mono border border-emerald-500/30">
                      {detailData.ticker}
                    </span>
                  )}
                  {detailData?.score != null && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white font-mono">
                      {detailData.score} ĐIỂM
                    </span>
                  )}
                  <span className="text-xs text-[#9EACB9]">
                    Ngày: {detailData?.date || '—'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {detailData?.displayTitle || detailData?.title || 'Đang tải báo cáo...'}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {detailData?.ticker && detailData.ticker !== 'MACRO' && (
                  <Link
                    href={`/stock/${detailData.ticker}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-[#9EACB9] hover:text-white transition-colors border border-white/10"
                    title="Mở hồ sơ cổ phiếu tab mới"
                  >
                    <span>Hồ sơ {detailData.ticker}</span>
                    <ExternalLink className="size-3" />
                  </Link>
                )}

                <button
                  onClick={handleCopyMarkdown}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-[#9EACB9] hover:text-white transition-colors border border-white/10"
                  title="Sao chép toàn bộ nội dung Markdown"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Chép MD'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="rounded-lg bg-white/5 hover:bg-white/10 p-1.5 text-[#9EACB9] hover:text-white transition-colors border border-white/10"
                  title="In báo cáo"
                >
                  <Printer className="size-4" />
                </button>

                <button
                  onClick={handleCloseModal}
                  className="rounded-lg bg-white/10 hover:bg-rose-600/80 p-1.5 text-white transition-colors"
                  title="Đóng cửa sổ"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Reader */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-[#F0F3F6] custom-scrollbar">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <div className="size-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                  <p className="text-sm text-[#9EACB9]">Đang tải toàn văn báo cáo nghiên cứu AI...</p>
                </div>
              ) : detailData ? (
                <article className="max-w-4xl mx-auto space-y-6">
                  {/* Summary Callout */}
                  {detailData.summary && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs sm:text-sm leading-relaxed text-emerald-200">
                      <b className="text-emerald-400 font-semibold block mb-1">
                        TÓM TẮT ĐỊNH GIÁ & LUẬN ĐIỂM CỐT LÕI:
                      </b>
                      {detailData.summary}
                    </div>
                  )}

                  {/* HTML Markdown Content */}
                  <div
                    className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4 font-sans text-slate-200 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:border-b [&_h1]:border-white/10 [&_h1]:pb-3 [&_h1]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-emerald-400 [&_h3]:mt-5 [&_strong]:text-white [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                    dangerouslySetInnerHTML={{ __html: detailData.contentHtml }}
                  />
                </article>
              ) : (
                <div className="py-20 text-center text-rose-400">
                  Không thể tải nội dung báo cáo này.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-[#161a23] px-6 py-3 text-xs text-[#9EACB9] shrink-0">
              <div>
                Nguồn: <b className="text-white font-mono">{detailData?.filename || 'Word document'}</b> · Hệ thống Nghiên cứu chuyên sâu AI
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-1 text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
