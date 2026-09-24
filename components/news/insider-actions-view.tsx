'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsiderActionRecord } from '@/lib/insider-actions-service'
import type { CorporateDisclosure } from '@/lib/disclosures'

interface InsiderActionsViewProps {
  initialActions?: InsiderActionRecord[]
  disclosures?: CorporateDisclosure[]
  userWatchlist?: string[]
  watchlistOnly?: boolean
  searchQuery?: string
  onSearchChange?: (q: string) => void
  refreshTrigger?: number
}

type ActionFilter = 'all' | 'reg_buy' | 'reg_sell' | 'done_buy' | 'done_sell'
type VolumeFilter = 'all' | 'over_1m' | '500k_1m' | '100k_500k' | 'under_100k'

export function InsiderActionsView({
  initialActions = [],
  disclosures = [],
  userWatchlist = [],
  watchlistOnly = false,
  searchQuery = '',
  onSearchChange,
  refreshTrigger,
}: InsiderActionsViewProps) {
  const [actions, setActions] = useState<InsiderActionRecord[]>(initialActions)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>('all')
  const [localSearch, setLocalSearch] = useState('')
  const [showLiveFilings, setShowLiveFilings] = useState(true)

  // Effective search query (ưu tiên header search nếu có, kết hợp localSearch)
  const query = (searchQuery || localSearch).trim().toLowerCase()

  // Fetch or Refresh actions
  const fetchActions = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true)
    else if (actions.length === 0) setIsLoading(true)

    try {
      const res = await fetch(`/api/news/insider-actions?limit=100${force ? '&refresh=true' : ''}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          setActions(json.data)
          setLastUpdated(new Date(json.lastUpdated || Date.now()))
        }
      }
    } catch (err) {
      console.error('[InsiderActionsView] Error fetching actions:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [actions.length])

  useEffect(() => {
    if (actions.length === 0) {
      fetchActions(false)
    }
  }, [actions.length, fetchActions])

  // Tự động cập nhật ngầm (Background Polling) mỗi 60 giây
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActions(false)
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchActions])

  // Lắng nghe trigger làm mới từ bên ngoài (nút làm mới trên thanh header)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchActions(true)
    }
  }, [refreshTrigger, fetchActions])

  // Lọc văn bản công bố giao dịch nội bộ tức thì từ Sở (CafeF Live Disclosures)
  const latestInsiderFilings = useMemo(() => {
    return disclosures
      .filter((d) => {
        if (d.doc_type === 'GIAO_DICH_NOI_BO') return true
        const t = d.title.toLowerCase()
        return (
          t.includes('giao dịch') &&
          (t.includes('nội bộ') || t.includes('cổ đông lớn') || t.includes('liên quan') || t.includes('đăng ký'))
        )
      })
      .slice(0, 5)
  }, [disclosures])

  // Lọc dữ liệu giao dịch nội bộ theo các tiêu chí
  const filteredActions = useMemo(() => {
    return actions.filter((item) => {
      // 1. Lọc theo Watchlist
      if (watchlistOnly) {
        if (userWatchlist.length === 0) return false
        if (!userWatchlist.includes(item.symbol.toUpperCase())) return false
      }

      // 2. Tìm kiếm (mã hoặc tên)
      if (query) {
        const matchSymbol = item.symbol.toLowerCase().includes(query)
        const matchName = item.name.toLowerCase().includes(query)
        const matchPos = item.position.toLowerCase().includes(query)
        const matchComp = item.companyName?.toLowerCase().includes(query)
        if (!matchSymbol && !matchName && !matchPos && !matchComp) return false
      }

      // 3. Lọc theo loại giao dịch
      if (actionFilter === 'reg_buy') {
        if (!item.isRegistration || item.actionType !== 'BUY') return false
      } else if (actionFilter === 'reg_sell') {
        if (!item.isRegistration || item.actionType !== 'SELL') return false
      } else if (actionFilter === 'done_buy') {
        if (item.isRegistration || item.actionType !== 'BUY') return false
      } else if (actionFilter === 'done_sell') {
        if (item.isRegistration || item.actionType !== 'SELL') return false
      }

      // 4. Lọc theo khối lượng
      if (volumeFilter === 'over_1m') {
        if (item.shares < 1_000_000) return false
      } else if (volumeFilter === '500k_1m') {
        if (item.shares < 500_000 || item.shares >= 1_000_000) return false
      } else if (volumeFilter === '100k_500k') {
        if (item.shares < 100_000 || item.shares >= 500_000) return false
      } else if (volumeFilter === 'under_100k') {
        if (item.shares >= 100_000) return false
      }

      return true
    })
  }, [actions, watchlistOnly, userWatchlist, query, actionFilter, volumeFilter])

  // Thống kê nhanh (KPI)
  const stats = useMemo(() => {
    let regBuyCount = 0
    let regBuyShares = 0
    let regSellCount = 0
    let regSellShares = 0
    let doneBuyCount = 0
    let doneSellCount = 0

    actions.forEach((a) => {
      if (a.actionType === 'BUY') {
        if (a.isRegistration) {
          regBuyCount++
          regBuyShares += a.shares
        } else {
          doneBuyCount++
        }
      } else if (a.actionType === 'SELL') {
        if (a.isRegistration) {
          regSellCount++
          regSellShares += a.shares
        } else {
          doneSellCount++
        }
      }
    })

    return {
      total: actions.length,
      regBuyCount,
      regBuyShares,
      regSellCount,
      regSellShares,
      doneBuyCount,
      doneSellCount,
    }
  }, [actions])

  return (
    <div className="w-full space-y-4 px-3 py-4 sm:px-4 lg:px-6">
      {/* 1. Thanh cảnh báo Live Stream: Văn bản công bố giao dịch nội bộ tức thì từ Sở */}
      {showLiveFilings && latestInsiderFilings.length > 0 && (
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-[#10192a]/50 to-[#0b0e14] p-3 shadow-md backdrop-blur">
          <div className="flex items-center justify-between pb-2 border-b border-sky-500/15">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-sky-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Văn bản công bố từ Sở vừa nhận (HOSE / HNX / UPCoM)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#64748b] hidden sm:inline">
                Cập nhật tức thì ngay khi Sở phát hành
              </span>
              <button
                type="button"
                onClick={() => setShowLiveFilings(false)}
                className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
                title="Đóng thanh thông báo"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {latestInsiderFilings.slice(0, 3).map((filing) => (
              <div
                key={filing.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-[#1e293b]/70 bg-[#0d131f]/60 p-2.5 hover:border-sky-500/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Link
                      href={`/stock/${filing.symbol}`}
                      className="font-mono text-xs font-bold text-sky-400 hover:underline"
                    >
                      {filing.symbol}
                    </Link>
                    <span className="text-[10px] text-[#64748b] rounded bg-[#1e293b] px-1 py-0.2">
                      {filing.exchange}
                    </span>
                    <span className="text-[10px] text-[#94a3b8]">
                      {filing.published_at.slice(11, 16)}
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1] line-clamp-2 leading-snug" title={filing.title}>
                    {filing.title}
                  </p>
                </div>
                {filing.file_url && (
                  <a
                    href={filing.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 p-1 rounded hover:bg-sky-500/20 text-sky-400 transition-colors"
                    title="Mở văn bản PDF gốc"
                  >
                    <FileText className="size-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. KPI Cards: Thống kê nhanh tâm lý mua bán lãnh đạo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Tổng giao dịch */}
        <div className="rounded-xl border border-[#1e2533] bg-[#121620] p-3 sm:p-3.5">
          <div className="text-[11px] font-medium text-[#7d8590] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="size-3.5 text-blue-400" />
            <span>Tổng giao dịch</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#f1f5f9]">
              {stats.total}
            </span>
            <span className="text-[11px] text-[#64748b]">lượt gần nhất</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">
            Nguồn trực tiếp: <span className="text-[#38bdf8] font-medium">Stockbiz & Sở GDCK</span>
          </div>
        </div>

        {/* Card 2: Đăng ký Mua */}
        <div className="rounded-xl border border-emerald-900/40 bg-gradient-to-br from-[#0e2a1d]/40 to-[#121620] p-3 sm:p-3.5">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-emerald-400" />
            <span>Đăng ký mua mới</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {stats.regBuyCount}
            </span>
            <span className="text-[11px] text-emerald-400/70">lượt đăng ký</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1 truncate">
            Tổng KL: <span className="font-mono text-emerald-300 font-semibold">{(stats.regBuyShares / 1_000_000).toFixed(2)}M cp</span>
          </div>
        </div>

        {/* Card 3: Đăng ký Bán */}
        <div className="rounded-xl border border-rose-900/40 bg-gradient-to-br from-[#2f1118]/40 to-[#121620] p-3 sm:p-3.5">
          <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="size-3.5 text-rose-400" />
            <span>Đăng ký bán mới</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
              {stats.regSellCount}
            </span>
            <span className="text-[11px] text-rose-400/70">lượt đăng ký</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1 truncate">
            Tổng KL: <span className="font-mono text-rose-300 font-semibold">{(stats.regSellShares / 1_000_000).toFixed(2)}M cp</span>
          </div>
        </div>

        {/* Card 4: Tỷ lệ Mua / Bán */}
        <div className="rounded-xl border border-[#1e2533] bg-[#121620] p-3 sm:p-3.5">
          <div className="text-[11px] font-medium text-[#7d8590] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="size-3.5 text-amber-400" />
            <span>Tương quan Mua / Bán</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              {stats.regSellCount > 0 ? (stats.regBuyCount / stats.regSellCount).toFixed(1) + 'x' : '—'}
            </span>
            <span className="text-[11px] text-[#64748b]">tỷ lệ số lệnh</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">
            Đã khớp: <span className="text-emerald-400 font-mono font-medium">{stats.doneBuyCount} mua</span> / <span className="text-rose-400 font-mono font-medium">{stats.doneSellCount} bán</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Bộ lọc nhanh (Transaction Type & Volume) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#1e2533] bg-[#11151e] p-2.5">
        {/* Trái: Nút lọc loại giao dịch */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActionFilter('all')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
              actionFilter === 'all'
                ? 'bg-[#1e293b] text-white font-semibold'
                : 'text-[#8b949e] hover:bg-[#161d28] hover:text-[#cbd5e1]'
            )}
          >
            Tất cả ({actions.length})
          </button>

          <button
            type="button"
            onClick={() => setActionFilter('reg_buy')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
              actionFilter === 'reg_buy'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-emerald-400/80 hover:bg-emerald-500/10'
            )}
          >
            <ArrowUpRight className="size-3 text-emerald-400" />
            <span>Đăng ký mua ({stats.regBuyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActionFilter('reg_sell')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
              actionFilter === 'reg_sell'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                : 'text-rose-400/80 hover:bg-rose-500/10'
            )}
          >
            <ArrowDownRight className="size-3 text-rose-400" />
            <span>Đăng ký bán ({stats.regSellCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActionFilter('done_buy')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
              actionFilter === 'done_buy'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-sky-400/80 hover:bg-sky-500/10'
            )}
          >
            <CheckCircle2 className="size-3 text-sky-400" />
            <span>Đã mua ({stats.doneBuyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActionFilter('done_sell')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
              actionFilter === 'done_sell'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-orange-400/80 hover:bg-orange-500/10'
            )}
          >
            <CheckCircle2 className="size-3 text-orange-400" />
            <span>Đã bán ({stats.doneSellCount})</span>
          </button>
        </div>

        {/* Phải: Lọc quy mô khối lượng + Nút Refresh */}
        <div className="flex items-center gap-2">
          {/* Dropdown khối lượng */}
          <select
            value={volumeFilter}
            onChange={(e) => setVolumeFilter(e.target.value as VolumeFilter)}
            className="h-7.5 rounded-lg border border-[#232a36] bg-[#141924] px-2 text-xs text-[#cbd5e1] outline-none transition-colors hover:border-[#3b475c] cursor-pointer"
          >
            <option value="all">Tất cả khối lượng</option>
            <option value="over_1m">&gt; 1.000.000 cp</option>
            <option value="500k_1m">500.000 - 1.000.000 cp</option>
            <option value="100k_500k">100.000 - 500.000 cp</option>
            <option value="under_100k">&lt; 100.000 cp</option>
          </select>

          {/* Nút làm mới */}
          <button
            type="button"
            onClick={() => fetchActions(true)}
            disabled={isRefreshing}
            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-[#232a36] bg-[#141924] px-2.5 text-xs text-[#8b949e] hover:border-[#3b475c] hover:text-white transition-colors cursor-pointer"
            title="Quét lại dữ liệu giao dịch nội bộ mới nhất"
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin text-emerald-400')} />
            <span className="hidden sm:inline text-[11px] font-medium">
              {isRefreshing ? 'Đang tải...' : 'Làm mới'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Bảng Thống kê Giao dịch Nội bộ (Desktop + Mobile Responsive) */}
      <div className="overflow-hidden rounded-xl border border-[#1e2533] bg-[#0d1017]">
        {/* Desktop Header */}
        <div className="hidden lg:grid grid-cols-12 items-center border-b border-[#1e2533] bg-[#121620] px-4 py-2.5 text-xs font-semibold text-[#7d8590]">
          <div className="col-span-2 text-left">Ngày công bố</div>
          <div className="col-span-2 text-left">Mã CK / Doanh nghiệp</div>
          <div className="col-span-3 text-left">Người thực hiện & Chức vụ</div>
          <div className="col-span-2 text-center">Giao dịch</div>
          <div className="col-span-2 text-right">Khối lượng CP</div>
          <div className="col-span-1 text-center">Chi tiết</div>
        </div>

        {/* Loading state */}
        {isLoading && actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#64748b]">
            <RefreshCw className="size-8 animate-spin text-sky-400 mb-3" />
            <p className="text-sm font-medium text-[#f1f5f9]">Đang tải dữ liệu giao dịch nội bộ từ Stockbiz...</p>
            <p className="text-xs text-[#64748b] mt-1">Đang bóc tách các văn bản công bố mua bán mới nhất</p>
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#64748b] px-4">
            <div className="size-12 rounded-2xl bg-[#161b24] flex items-center justify-center mb-3 text-2xl border border-[#232a36]">
              🔍
            </div>
            <p className="text-sm font-semibold text-[#f1f5f9]">Không tìm thấy giao dịch nội bộ phù hợp</p>
            <p className="text-xs text-[#64748b] mt-1 max-w-sm">
              {watchlistOnly
                ? 'Không có giao dịch nội bộ gần đây thuộc các mã trong danh mục Watchlist của bạn.'
                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#181e2b]">
            {filteredActions.map((item) => {
              const isBuy = item.actionType === 'BUY'
              const isSell = item.actionType === 'SELL'
              const isReg = item.isRegistration

              return (
                <div
                  key={item.id}
                  className="flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center px-4 py-3 text-xs hover:bg-[#131824]/70 transition-colors gap-2 lg:gap-0"
                >
                  {/* Cột 1: Ngày */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="font-mono text-[12px] font-medium text-[#cbd5e1]">
                      {item.date}
                    </span>
                    {/* Badge Hôm nay nếu trùng ngày hiện tại */}
                    {item.rawDate.includes('9/24/2026') && (
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                        Mới
                      </span>
                    )}
                  </div>

                  {/* Cột 2: Mã CK & Tên doanh nghiệp */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Link
                      href={`/stock/${item.symbol}`}
                      className="group flex items-center gap-1.5"
                    >
                      <span className="font-mono text-sm font-bold text-white group-hover:text-[#38bdf8] transition-colors">
                        {item.symbol}
                      </span>
                      {item.price && (
                        <span className="text-[11px] font-mono text-[#8b949e]">
                          {item.price.toFixed(1)}
                        </span>
                      )}
                    </Link>
                    <span
                      className="hidden xl:inline text-[11px] text-[#64748b] truncate max-w-[130px]"
                      title={item.companyName}
                    >
                      {item.companyName}
                    </span>
                  </div>

                  {/* Cột 3: Người thực hiện & Chức vụ */}
                  <div className="col-span-3 min-w-0 pr-2">
                    <div className="font-semibold text-[#e2e8f0] truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[#8b949e] truncate flex items-center gap-1 mt-0.5">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.2 text-[10px] font-medium border shrink-0',
                          item.position.includes('Chủ tịch') || item.position.includes('Tổng Giám đốc')
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-[#1a202c] text-[#94a3b8] border-[#2d3748]'
                        )}
                      >
                        {item.position}
                      </span>
                    </div>
                  </div>

                  {/* Cột 4: Loại giao dịch */}
                  <div className="col-span-2 flex justify-start lg:justify-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border',
                        isBuy && isReg && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                        isBuy && !isReg && 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                        isSell && isReg && 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                        isSell && !isReg && 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                        !isBuy && !isSell && 'bg-gray-500/15 text-gray-300 border-gray-500/30'
                      )}
                    >
                      {isBuy && <ArrowUpRight className="size-3" />}
                      {isSell && <ArrowDownRight className="size-3" />}
                      <span>{item.transaction}</span>
                    </span>
                  </div>

                  {/* Cột 5: Khối lượng cổ phiếu */}
                  <div className="col-span-2 text-left lg:text-right w-full lg:w-auto">
                    <div className="font-mono text-sm font-bold text-[#f8fafc]">
                      {item.sharesFormatted}{' '}
                      <span className="text-[10px] text-[#7d8590] font-normal">cp</span>
                    </div>
                    {item.estimatedValue && item.estimatedValue > 0 && (
                      <div className="text-[11px] text-[#64748b] font-mono">
                        ≈ {item.estimatedValue.toLocaleString('vi-VN')} tỷ VNĐ
                      </div>
                    )}
                  </div>

                  {/* Cột 6: Nút liên kết */}
                  <div className="col-span-1 flex justify-start lg:justify-center">
                    <Link
                      href={`/stock/${item.symbol}`}
                      className="rounded p-1 text-[#64748b] hover:bg-[#1f293d] hover:text-[#38bdf8] transition-colors"
                      title={`Xem chi tiết ${item.symbol}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer ghi chú */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748b] pt-2 px-1">
        <div>
          Dữ liệu bóc tách liên tục từ <span className="text-[#94a3b8] font-medium">Stockbiz & Công bố thông tin Sở GDCK</span>. Cập nhật sớm nhất ngay khi công ty có văn bản công bố.
        </div>
        <div className="mt-1 sm:mt-0 font-mono">
          Hiển thị {filteredActions.length} / {actions.length} giao dịch gần nhất
        </div>
      </div>
    </div>
  )
}
