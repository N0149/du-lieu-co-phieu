'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Search,
  SlidersHorizontal,
  FileText,
  TrendingUp,
  TrendingDown,
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
  RefreshCw,
  Zap,
  Crown,
} from 'lucide-react'
import type { NghienCuuAiReport, NghienCuuAiDetail } from '@/lib/nghien-cuu-ai-service'
import { useAuth } from '@/lib/use-auth'
import { AuthGate } from '@/components/auth/AuthGate'
import { VipUpgradeModal } from '@/components/auth/VipUpgradeModal'
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
type PriceMode = 'current' | 'research'

export function NghienCuuAiExplorer({ initialReports, kpis: initialKpis }: Props) {
  const { isVip, isLoggedIn } = useAuth()
  const [reports] = useState<NghienCuuAiReport[]>(initialReports)
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<FilterTier>('all')
  const [sortMode, setSortMode] = useState<SortMode>('score_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [priceMode, setPriceMode] = useState<PriceMode>('current')

  // Modal đọc toàn văn & Modal VIP
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<NghienCuuAiDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copied, setCopied] = useState(false)
  const [vipModalOpen, setVipModalOpen] = useState(false)
  const [vipModalConfig, setVipModalConfig] = useState<{
    title?: string
    subtitle?: string
  }>({})

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

  // Sao chép nội dung Markdown (Chỉ dành cho Hội viên VIP)
  const handleCopyMarkdown = () => {
    if (!isVip) {
      setVipModalOpen(true)
      return
    }
    if (!detailData?.markdown) return
    navigator.clipboard.writeText(detailData.markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // In bài viết (Chỉ dành cho Hội viên VIP)
  const handlePrint = () => {
    if (!isVip) {
      setVipModalOpen(true)
      return
    }
    window.print()
  }

  // Helper lấy điểm hoạt động tùy thuộc vào chế độ xem (Giá Hiện Tại vs Giá Nghiên Cứu)
  const getActiveScore = (r: NghienCuuAiReport): number | null => {
    return priceMode === 'current' ? (r.currentScore ?? r.score) : r.score
  }

  const getActiveClassification = (r: NghienCuuAiReport): string | null => {
    return priceMode === 'current' ? (r.currentClassification ?? r.classification) : r.classification
  }

  // Tính KPI động theo chế độ giá
  const currentKpis = useMemo(() => {
    const total = reports.length
    const scores = reports.map((r) => getActiveScore(r)).filter((s): s is number => s != null)

    const superAttractive = reports.filter((r) => {
      const sc = getActiveScore(r)
      return sc != null && sc >= 200
    }).length

    const favorable = reports.filter((r) => {
      const sc = getActiveScore(r)
      return sc != null && sc >= 150 && sc < 200
    }).length

    const watchlist = reports.filter((r) => {
      const sc = getActiveScore(r)
      return sc != null && sc >= 100 && sc < 150
    }).length

    const maxScoreVal = scores.length > 0 ? Math.max(...scores) : 0
    const maxScore = maxScoreVal > 0 ? maxScoreVal.toFixed(1) : '—'
    const topReport = reports.find((r) => getActiveScore(r)?.toFixed(1) === maxScore)

    return {
      total,
      superAttractive,
      favorable,
      watchlist,
      maxScore,
      topReport,
    }
  }, [reports, priceMode])

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

    // 2. Lọc theo nhóm điểm (dựa trên Active Score)
    if (tierFilter === 'super') {
      list = list.filter((r) => {
        const sc = getActiveScore(r)
        return sc != null && sc >= 200
      })
    } else if (tierFilter === 'favorable') {
      list = list.filter((r) => {
        const sc = getActiveScore(r)
        return sc != null && sc >= 150 && sc < 200
      })
    } else if (tierFilter === 'watchlist') {
      list = list.filter((r) => {
        const sc = getActiveScore(r)
        return sc != null && sc >= 100 && sc < 150
      })
    } else if (tierFilter === 'q3') {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes('quy 3') ||
          r.title.toLowerCase().includes('q3') ||
          r.title.includes('31.10.26')
      )
    }

    // 3. Sắp xếp
    if (sortMode === 'score_desc') {
      list.sort((a, b) => (getActiveScore(b) ?? -1) - (getActiveScore(a) ?? -1))
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
  }, [reports, searchQuery, tierFilter, sortMode, priceMode])

  // Ẩn số điểm trong tiêu đề đối với khách chưa nâng cấp VIP để không bị lộ bí mật điểm số
  const sanitizeReportTitle = (title: string) => {
    if (isVip) return title
    return title.replace(/(?:điểm\s*)?[-–:]\s*(\d{2,3}(?:\.\d+)?)/gi, '· Định giá: 🔒 ??? Điểm')
  }

  // Badge màu sắc theo điểm định giá
  const renderScoreBadge = (report: NghienCuuAiReport) => {
    // KHÁCH CHƯA VIP: KHÔNG ĐƯỢC BIẾT ĐIỂM BAO NHIÊU VÀ KHÔNG BIẾT NÊN MUA HAY BÁN
    if (!isVip) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setVipModalConfig({
              title: `Mở Khóa Điểm Định Giá & Tín Hiệu ${report.ticker || ''} (VIP)`,
              subtitle: `Khám phá chính xác điểm số định giá lãi kép của ${report.ticker || 'cổ phiếu'} và khuyến nghị Mua/Bán độc quyền từ mô hình AI chuyên sâu.`,
            })
            setVipModalOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-2.5 py-0.5 text-xs font-bold text-amber-300 hover:brightness-110 shadow-xs cursor-pointer group transition-all"
          title="Nâng cấp Hội viên VIP để mở khóa Điểm định giá và Khuyến nghị Mua/Bán"
        >
          <Crown className="size-3 text-amber-300 group-hover:scale-110 transition-transform" />
          <span className="font-mono tracking-wider font-black">🔒 ??? ĐIỂM</span>
          <span className="text-[10px] text-amber-200/90 font-medium">· Tín hiệu VIP</span>
        </button>
      )
    }

    const score = getActiveScore(report)
    const classification = getActiveClassification(report)
    const delta = report.scoreDelta

    if (score == null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/30">
          Chuyên Đề
        </span>
      )
    }

    const deltaPill =
      priceMode === 'current' && delta != null && Math.abs(delta) >= 0.1 ? (
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ml-1.5',
            delta > 0
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
          )}
          title={
            delta > 0
              ? `Điểm tăng +${delta.toFixed(1)} do thị giá hiện tại thấp hơn lúc định giá (biên an toàn cao hơn)`
              : `Điểm giảm ${delta.toFixed(1)} do thị giá tăng so với lúc nghiên cứu (biên an toàn thu hẹp)`
          }
        >
          {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
        </span>
      ) : null

    if (score >= 200) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <Award className="size-3.5" />
          <span>{score.toFixed(1)} ĐIỂM</span>
          {deltaPill}
          <span className="text-[10px] font-normal text-emerald-300/80">· Siêu Hấp Dẫn</span>
        </span>
      )
    }

    if (score >= 150) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/30">
          <TrendingUp className="size-3.5" />
          <span>{score.toFixed(1)} ĐIỂM</span>
          {deltaPill}
          <span className="text-[10px] font-normal text-blue-300/80">· Khả Quan</span>
        </span>
      )
    }

    if (score >= 100) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
          <span>{score.toFixed(1)} ĐIỂM</span>
          {deltaPill}
          <span className="text-[10px] font-normal text-amber-300/80">· Theo Dõi</span>
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30">
        <ShieldAlert className="size-3.5" />
        <span>{score.toFixed(1)} ĐIỂM</span>
        {deltaPill}
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

            {/* Thông báo cập nhật điểm theo thị giá thời gian thực */}
            <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 mt-1">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span>
                <b>Điểm số tự động điều chỉnh theo thị giá thời gian thực:</b>{' '}
                <span className="font-mono text-emerald-200">
                  Điểm = Điểm gốc × (Giá gốc / Giá hiện tại)
                </span>
                . Giá rẻ đi làm tăng biên an toàn &amp; cổ tức kép, giúp điểm số tăng lên!
              </span>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-xl border border-white/8 bg-[#1f2433]/70 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-[#9EACB9]">Tổng Báo Cáo</div>
              <div className="mt-1 text-2xl font-extrabold text-white font-mono">
                {currentKpis.total}
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-400">Đã đồng bộ</div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-emerald-300">Siêu Hấp Dẫn</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-400 font-mono">
                {currentKpis.superAttractive}
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-400/80">&gt; 200 điểm</div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-blue-300">Khả Quan</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-400 font-mono">
                {currentKpis.favorable}
              </div>
              <div className="mt-0.5 text-[10px] text-blue-400/80">151 – 200 điểm</div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 backdrop-blur-sm text-center">
              <div className="text-[11px] font-medium text-amber-300">Điểm Cao Nhất</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-400 font-mono">
                {isVip ? currentKpis.maxScore : '🔒 24x.x'}
              </div>
              <div className="mt-0.5 text-[10px] text-amber-300/80 font-mono flex items-center justify-center gap-1">
                {isVip ? (
                  currentKpis.topReport?.ticker || 'ABT'
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setVipModalConfig({
                        title: 'Mở Khóa Siêu Cổ Phiếu Điểm Cao Nhất (VIP)',
                        subtitle: 'Xem mã cổ phiếu đạt điểm số cao nhất danh mục và toàn bộ phân tích định giá độc quyền.',
                      })
                      setVipModalOpen(true)
                    }}
                    className="hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Crown className="size-2.5" />
                    <span>Mở khóa VIP</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. THANH CÔNG CỤ TÌM KIẾM, CHẾ ĐỘ GIÁ & BỘ LỌC ═══ */}
      <section className="space-y-3 rounded-xl border border-white/8 bg-[#1c212d] p-3.5 shadow-lg">
        {/* Hàng 1: Search & Toggle Chế độ Giá */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9EACB9]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã CK (SJE, LHG, S55, MWG, CAT...), tiêu đề, từ khóa..."
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

          {/* Toggle Chế độ Giá: Giá hiện tại vs Giá lúc nghiên cứu */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg border border-white/10 bg-[#161a23] p-1">
              <button
                onClick={() => setPriceMode('current')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  priceMode === 'current'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-[#9EACB9] hover:text-white'
                )}
                title="Tính điểm theo giá thị trường thời gian thực"
              >
                <Zap className="size-3.5" />
                <span>Điểm Theo Giá Hiện Tại</span>
              </button>

              <button
                onClick={() => setPriceMode('research')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  priceMode === 'research'
                    ? 'bg-white/15 text-white shadow-md border border-white/20'
                    : 'text-[#9EACB9] hover:text-white'
                )}
                title="Xem điểm gốc lúc bóc tách báo cáo tài chính"
              >
                <Calendar className="size-3.5" />
                <span>Điểm Lúc Nghiên Cứu</span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-1.5 transition-colors cursor-pointer',
                  viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-[#64748B] hover:text-white'
                )}
                title="Dạng lưới thẻ"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'rounded-md p-1.5 transition-colors cursor-pointer',
                  viewMode === 'table' ? 'bg-white/15 text-white' : 'text-[#64748B] hover:text-white'
                )}
                title="Dạng bảng đối chiếu"
              >
                <TableIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc phân loại & Sắp xếp */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setTierFilter('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer',
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
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer',
                tierFilter === 'super'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
              )}
            >
              ⭐ Siêu hấp dẫn ({currentKpis.superAttractive})
            </button>

            <button
              onClick={() => setTierFilter('favorable')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer',
                tierFilter === 'favorable'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
              )}
            >
              🟢 Khả quan ({currentKpis.favorable})
            </button>

            <button
              onClick={() => setTierFilter('watchlist')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer',
                tierFilter === 'watchlist'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
              )}
            >
              🟡 Theo dõi ({currentKpis.watchlist})
            </button>

            <button
              onClick={() => setTierFilter('q3')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer',
                tierFilter === 'q3'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-white/5 text-[#9EACB9] hover:bg-white/10'
              )}
            >
              📊 BCTC Quý 3 mới
            </button>
          </div>

          {/* Sắp xếp */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#64748B]">Sắp xếp:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-white/10 bg-[#161a23] px-2.5 py-1.5 text-xs text-white focus:outline-hidden cursor-pointer"
            >
              <option value="score_desc">
                {priceMode === 'current' ? 'Điểm hiện tại cao nhất' : 'Điểm gốc cao nhất'}
              </option>
              <option value="date_desc">Mới nhất</option>
              <option value="ticker_asc">Mã CK (A - Z)</option>
            </select>
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
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isVip ? filteredReports : filteredReports.slice(0, 6)).map((report, idx) => (
              <div
                key={`${report.slug}-${idx}`}
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        <Crown className="size-2.5" />
                        VIP
                      </span>
                    </div>

                    <div>{renderScoreBadge(report)}</div>
                  </div>

                  {/* Title - Đã ẩn số điểm đối với khách chưa VIP */}
                  <h3 className="text-sm font-bold text-[#F0F3F6] line-clamp-2 group-hover:text-white transition-colors mb-2">
                    {sanitizeReportTitle(report.title)}
                  </h3>

                  {/* Highlights / Summary (Chỉ hiển thị phần đầu gây sự tò mò) */}
                  <p className="text-xs leading-relaxed text-[#9EACB9] line-clamp-3 mb-4">
                    {report.summary ? (
                      isVip ? (
                        report.summary
                      ) : (
                        <>
                          <span>{report.summary.slice(0, 115)}... </span>
                          <span className="text-amber-400 font-bold inline-flex items-center gap-0.5 ml-0.5">
                            [👑 Mở khóa VIP]
                          </span>
                        </>
                      )
                    ) : (
                      'Báo cáo phân tích chuyên sâu 5 trụ cột và định giá.'
                    )}
                  </p>
                </div>

                {/* Bottom footer: Price, Delta & Action Buttons */}
                <div className="pt-3 border-t border-white/5 flex flex-col gap-2 mt-auto">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {/* Hiển thị giá thị trường và giá nghiên cứu */}
                    <div className="space-y-0.5">
                      {priceMode === 'current' ? (
                        <>
                          <div className="text-[#9EACB9]">
                            Giá TT hiện tại:{' '}
                            <b className="font-mono text-emerald-400">
                              {report.currentPrice ? `${report.currentPrice.toFixed(1)} k₫` : '—'}
                            </b>
                          </div>
                          {report.price && (
                            <div className="text-[11px] text-[#64748B]">
                              Giá lúc NC: <span className="font-mono">{report.price.toFixed(1)} k₫</span>
                              {report.score != null && (
                                <span> ({isVip ? `${report.score.toFixed(1)}đ` : '🔒 ???đ'})</span>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-[#9EACB9]">
                            Giá lúc nghiên cứu:{' '}
                            <b className="font-mono text-white">
                              {report.price ? `${report.price.toFixed(1)} k₫` : '—'}
                            </b>
                          </div>
                          {report.currentPrice && (
                            <div className="text-[11px] text-[#64748B]">
                              Giá TT hiện tại:{' '}
                              <span className="font-mono text-emerald-400">
                                {report.currentPrice.toFixed(1)} k₫
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
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
                        onClick={() => {
                          if (!isVip) {
                            setVipModalConfig({
                              title: `Mở Khóa Báo Cáo Nghiên Cứu Chuyên Sâu ${report.ticker || ''} (VIP)`,
                              subtitle: `Khám phá 5 trụ cột forensic, rà soát nợ vay, điểm số định giá và khuyến nghị Mua/Bán của ${report.ticker || 'cổ phiếu'}.`,
                            })
                            setVipModalOpen(true)
                            return
                          }
                          handleOpenReport(report.slug)
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-all hover:shadow-md cursor-pointer",
                          isVip
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-black font-black shadow-amber-500/20"
                        )}
                      >
                        {isVip ? <BookOpen className="size-3.5" /> : <Crown className="size-3.5" />}
                        <span>{isVip ? "Đọc báo cáo" : "Đọc báo cáo (VIP)"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CỔNG CHẶN VIP CHO PHẦN BÁO CÁO PHÍA DƯỚI NẾU CHƯA PHẢI VIP */}
          {!isVip && filteredReports.length > 6 && (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-b from-[#1c1722] via-[#14121a] to-[#0f0e15] p-6 sm:p-10 text-center shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-44 w-96 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

              <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 text-amber-300 shadow-xl shadow-amber-500/15">
                <Crown className="size-7 animate-pulse text-amber-300" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300 mb-3">
                <Sparkles className="size-3.5" />
                <span>BẢN XEM TRƯỚC HÉ LỘ · CÒN {filteredReports.length - 6} BÁO CÁO ĐANG KHÓA</span>
              </div>

              <h3 className="relative text-lg sm:text-2xl font-black tracking-tight text-white mb-2">
                Mở Khóa Toàn Bộ {filteredReports.length}+ Siêu Cổ Phiếu Nghiên Cứu Chuyên Sâu AI
              </h3>
              <p className="relative max-w-xl mx-auto text-xs sm:text-sm text-[#c4b5a5] leading-relaxed mb-6">
                Bạn đang xem 6 cổ phiếu mẫu. Nâng cấp Hội viên VIP (chỉ từ 95.000 đ/tháng) để mở khóa 100% điểm số định giá độc quyền, khuyến nghị Mua/Bán và nghe toàn bộ Audio Podcast.
              </p>

              {/* 3 Gói giá thu nhỏ */}
              <div className="relative mb-6 max-w-md mx-auto grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
                  <span className="block text-[10px] text-amber-300/80 font-medium">1 Tháng</span>
                  <span className="block text-xs sm:text-sm font-black text-amber-300">95.000 đ</span>
                </div>
                <div className="relative rounded-xl border border-amber-500/40 bg-amber-500/15 p-2.5 text-center shadow-xs">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.2 text-[8.5px] font-black text-black">
                    Phổ biến nhất
                  </span>
                  <span className="block text-[10px] text-amber-300/80 font-medium">6 Tháng</span>
                  <span className="block text-xs sm:text-sm font-black text-amber-300">495.000 đ</span>
                </div>
                <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-1.5 py-0.2 text-[8.5px] font-black text-white">
                    Tiết kiệm 22%
                  </span>
                  <span className="block text-[10px] text-amber-300/80 font-medium">1 Năm</span>
                  <span className="block text-xs sm:text-sm font-black text-amber-300">890.000 đ</span>
                </div>
              </div>

              {/* Nút CTA Nâng cấp */}
              <button
                type="button"
                onClick={() => {
                  setVipModalConfig({
                    title: 'Mở Khóa Toàn Bộ Kho Nghiên Cứu Chuyên Sâu AI (VIP)',
                    subtitle: 'Nâng cấp Hội viên VIP để mở khóa 100% báo cáo, điểm định giá lãi kép và khuyến nghị Mua/Bán độc quyền.',
                  })
                  setVipModalOpen(true)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-8 py-3 text-xs sm:text-sm font-black text-black shadow-xl shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
              >
                <Crown className="size-4 text-black" />
                <span>👑 NÂNG CẤP VIP ĐỂ XEM TOÀN BỘ ({filteredReports.length} BÁO CÁO)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ──── DẠNG BẢNG ĐỐI CHIẾU (TABLE) ──── */
        <div>
          <div className="overflow-hidden rounded-xl border border-white/8 bg-[#212631] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-[#1a1d26] text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      Mã CK
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      {priceMode === 'current' ? 'Điểm Hiện Tại' : 'Điểm Định Giá'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      Giá TT Hiện Tại
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      Giá Nghiên Cứu
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      Tiêu Đề Báo Cáo
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      Ngày Nghiên Cứu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                      Thao Tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(isVip ? filteredReports : filteredReports.slice(0, 6)).map((report, idx) => (
                    <tr
                      key={`${report.slug}-${idx}`}
                      className="transition-colors hover:bg-white/[0.03] cursor-pointer"
                      onClick={() => {
                        if (!isVip) {
                          setVipModalConfig({
                            title: `Mở Khóa Báo Cáo Nghiên Cứu Chuyên Sâu ${report.ticker || ''} (VIP)`,
                            subtitle: `Khám phá 5 trụ cột forensic, rà soát nợ vay, điểm số định giá và khuyến nghị Mua/Bán của ${report.ticker || 'cổ phiếu'}.`,
                          })
                          setVipModalOpen(true)
                          return
                        }
                        handleOpenReport(report.slug)
                      }}
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{report.ticker || '—'}</span>
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-400">
                            <Crown className="size-2" />
                            VIP
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">{renderScoreBadge(report)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-emerald-400">
                        {report.currentPrice ? `${report.currentPrice.toFixed(1)} k₫` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-[#9EACB9]">
                        {report.price ? `${report.price.toFixed(1)} k₫` : '—'}
                      </td>
                      <td className="px-4 py-3.5 max-w-md">
                        <div className="font-semibold text-white truncate">
                          {sanitizeReportTitle(report.title)}
                        </div>
                        <div className="text-xs text-[#9EACB9] line-clamp-1 mt-0.5">
                          {isVip
                            ? report.summary
                            : `${report.summary?.slice(0, 80) || ''}... [👑 Khóa VIP]`}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[#9EACB9]">
                        {report.date}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isVip) {
                              setVipModalConfig({
                                title: `Mở Khóa Báo Cáo Nghiên Cứu Chuyên Sâu ${report.ticker || ''} (VIP)`,
                                subtitle: `Khám phá 5 trụ cột forensic, rà soát nợ vay, điểm số định giá và khuyến nghị Mua/Bán của ${report.ticker || 'cổ phiếu'}.`,
                              })
                              setVipModalOpen(true)
                              return
                            }
                            handleOpenReport(report.slug)
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                            isVip
                              ? "bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-transparent text-emerald-400 hover:text-white"
                              : "bg-amber-500/20 hover:bg-amber-500 border border-amber-500/30 hover:border-transparent text-amber-400 hover:text-black font-bold"
                          )}
                        >
                          {isVip ? <BookOpen className="size-3.5" /> : <Crown className="size-3.5" />}
                          <span>{isVip ? "Đọc ngay" : "Đọc ngay (VIP)"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CỔNG CHẶN VIP CHO DẠNG BẢNG NẾU CHƯA PHẢI VIP */}
          {!isVip && filteredReports.length > 6 && (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-b from-[#1c1722] via-[#14121a] to-[#0f0e15] p-6 sm:p-10 text-center shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-44 w-96 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

              <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 text-amber-300 shadow-xl shadow-amber-500/15">
                <Crown className="size-7 animate-pulse text-amber-300" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300 mb-3">
                <Sparkles className="size-3.5" />
                <span>BẢN XEM TRƯỚC HÉ LỘ · CÒN {filteredReports.length - 6} BÁO CÁO ĐANG KHÓA</span>
              </div>

              <h3 className="relative text-lg sm:text-2xl font-black tracking-tight text-white mb-2">
                Mở Khóa Toàn Bộ {filteredReports.length}+ Siêu Cổ Phiếu Nghiên Cứu Chuyên Sâu AI
              </h3>
              <p className="relative max-w-xl mx-auto text-xs sm:text-sm text-[#c4b5a5] leading-relaxed mb-6">
                Bạn đang xem 6 cổ phiếu mẫu. Nâng cấp Hội viên VIP (chỉ từ 95.000 đ/tháng) để mở khóa 100% bảng đối chiếu điểm số định giá và tín hiệu Mua/Bán độc quyền.
              </p>

              <button
                type="button"
                onClick={() => {
                  setVipModalConfig({
                    title: 'Mở Khóa Toàn Bộ Kho Nghiên Cứu Chuyên Sâu AI (VIP)',
                    subtitle: 'Nâng cấp Hội viên VIP để mở khóa 100% bảng đối chiếu, điểm số định giá và khuyến nghị Mua/Bán.',
                  })
                  setVipModalOpen(true)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-8 py-3 text-xs sm:text-sm font-black text-black shadow-xl shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
              >
                <Crown className="size-4 text-black" />
                <span>👑 NÂNG CẤP VIP ĐỂ XEM TOÀN BỘ ({filteredReports.length} BÁO CÁO)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ 4. FULLSCREEN / MODAL READER ═══ */}
      {selectedSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex flex-col w-full max-w-5xl h-[92vh] rounded-2xl border border-white/15 bg-[#171a23] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#1a1e29] px-6 py-4 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {detailData?.ticker && (
                    <span className="rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-xs font-black font-mono border border-emerald-500/30">
                      {detailData.ticker}
                    </span>
                  )}
                  {detailData?.currentScore != null ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                      <span>Điểm Hiện Tại: {detailData.currentScore.toFixed(1)}đ</span>
                      {detailData.scoreDelta != null && Math.abs(detailData.scoreDelta) >= 0.1 && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          ({detailData.scoreDelta > 0 ? `+${detailData.scoreDelta.toFixed(1)}` : detailData.scoreDelta.toFixed(1)}đ)
                        </span>
                      )}
                    </span>
                  ) : detailData?.score != null ? (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white font-mono">
                      {detailData.score} ĐIỂM
                    </span>
                  ) : null}

                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    <Crown className="size-2.5" />
                    Độc quyền VIP
                  </span>

                  {detailData?.price && (
                    <span className="text-xs text-[#9EACB9]">
                      Giá NC: <b className="text-white font-mono">{detailData.price.toFixed(1)} k₫</b>
                    </span>
                  )}

                  {detailData?.currentPrice && (
                    <span className="text-xs text-[#9EACB9]">
                      · Giá TT: <b className="text-emerald-400 font-mono">{detailData.currentPrice.toFixed(1)} k₫</b>
                    </span>
                  )}

                  <span className="text-xs text-[#64748B]">
                    · Ngày: {detailData?.date || '—'}
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
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors border cursor-pointer",
                    isVip
                      ? "bg-white/5 hover:bg-white/10 text-[#9EACB9] hover:text-white border-white/10"
                      : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}
                  title={isVip ? "Sao chép toàn bộ nội dung Markdown" : "Chức năng dành riêng cho Hội viên VIP"}
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : isVip ? (
                    <Copy className="size-3.5" />
                  ) : (
                    <Crown className="size-3.5" />
                  )}
                  <span>{copied ? 'Đã chép' : isVip ? 'Chép MD' : 'Chép MD (VIP)'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className={cn(
                    "rounded-lg p-1.5 transition-colors border cursor-pointer",
                    isVip
                      ? "bg-white/5 hover:bg-white/10 text-[#9EACB9] hover:text-white border-white/10"
                      : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}
                  title={isVip ? "In báo cáo" : "Chức năng dành riêng cho Hội viên VIP"}
                >
                  <Printer className="size-4" />
                </button>

                <button
                  onClick={handleCloseModal}
                  className="rounded-lg bg-white/10 hover:bg-rose-600/80 p-1.5 text-white transition-colors cursor-pointer"
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
                  {/* Summary Callout - Luôn hiển thị công khai phần đầu để gây sự tò mò */}
                  {detailData.summary && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-emerald-200 shadow-xs">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5 text-sm">
                        <Sparkles className="size-4" />
                        <span>TÓM TẮT ĐỊNH GIÁ & LUẬN ĐIỂM CỐT LÕI:</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{detailData.summary}</p>
                    </div>
                  )}

                  {/* HTML Markdown Content - Khóa bằng AuthGate cho Hội viên VIP */}
                  <AuthGate
                    isLoggedIn={isLoggedIn}
                    isVip={isVip}
                    requiredTier="vip"
                    variant="blur"
                    blurHeight={280}
                    title={`Mở khóa Toàn Bộ Nghiên Cứu Chuyên Sâu ${detailData.ticker || ''} (VIP)`}
                    subtitle="Báo cáo phân tích chuyên sâu 5 trụ cột và mô hình định giá độc quyền bởi AI dành riêng cho Hội viên VIP (từ 95.000 đ/tháng)."
                    features={[
                      'Bóc tách chi tiết định giá tài sản ngầm, chiết khấu dòng tiền & mô hình RNAV',
                      'Toàn bộ bảng số liệu dự phóng tài chính 3-5 năm & kịch bản rủi ro',
                      'Luận điểm phân tích độc quyền từ mô hình AI chuyên sâu',
                    ]}
                    ctaText="👑 Nâng cấp VIP để đọc toàn bộ"
                  >
                    <div
                      className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4 font-sans text-slate-200 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:border-b [&_h1]:border-white/10 [&_h1]:pb-3 [&_h1]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-emerald-400 [&_h3]:mt-5 [&_strong]:text-white [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: detailData.contentHtml }}
                    />
                  </AuthGate>
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
                className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-1 text-xs font-semibold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nâng cấp VIP */}
      <VipUpgradeModal
        open={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        title={vipModalConfig.title || "Mở Khóa Toàn Bộ Nghiên Cứu Chuyên Sâu AI (VIP)"}
        subtitle={vipModalConfig.subtitle || "Nâng cấp gói Hội viên VIP để mở khóa toàn bộ luận điểm phân tích, mô hình định giá độc quyền và sao chép Markdown nội bộ."}
      />
    </div>
  )
}
