'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Layers,
  Clock,
  CheckCircle2,
  Filter,
  BarChart3,
  Globe2,
  Info,
  Building2,
  ChevronRight,
  Activity,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import {
  TIER_A_GROUPS,
  TIER_A_STOCKS,
  type TierAStock,
  type TierAGroup,
} from '@/lib/tier-a-stocks'
import { CustomsStockProfile } from './customs-stock-profile'
import type { CustomsDriverProfile } from '@/lib/customs-profiles'
import { cn } from '@/lib/utils'

interface TierAStocksViewerProps {
  onSelectCommodity?: (commodityName: string) => void
  initialTicker?: string | null
}

const EXCHANGE_COLORS: Record<string, string> = {
  HOSE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  HNX: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  UPCOM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
}

const DIRECTION_LABELS: Record<string, { label: string; cls: string }> = {
  EXPORT: {
    label: 'Xuất khẩu chính',
    cls: 'bg-primary/10 text-primary border-primary/20',
  },
  IMPORT: {
    label: 'Nhập khẩu chính',
    cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  BOTH: {
    label: 'Xuất & Nhập khẩu',
    cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
}

export function TierAStocksViewer({ onSelectCommodity, initialTicker = null }: TierAStocksViewerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL')
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL')

  // Active modal state
  const [activeModalTicker, setActiveModalTicker] = useState<string | null>(initialTicker)
  const [activeProfile, setActiveProfile] = useState<CustomsDriverProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false)

  // Extra search results from 640+ profiles
  const [extraSearchResults, setExtraSearchResults] = useState<Array<{ ticker: string; profile: CustomsDriverProfile }>>([])

  // Load profile when activeModalTicker changes
  useEffect(() => {
    if (!activeModalTicker) {
      setActiveProfile(null)
      return
    }

    setIsLoadingProfile(true)
    fetch(`/api/customs-trade/profile?ticker=${encodeURIComponent(activeModalTicker)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setActiveProfile(data.profile)
        } else {
          // Fallback to minimal profile if not in 640 profiles
          const stock = TIER_A_STOCKS.find((s) => s.ticker === activeModalTicker)
          if (stock) {
            setActiveProfile({
              name: stock.name,
              sub_head: `Mã Tier A · ${stock.groupLabel}`,
              nganh: stock.groupLabel,
              main_market: stock.keyMarkets?.join(', ') || 'Xuất nhập khẩu',
              segments: [
                {
                  ten: stock.groupLabel,
                  chitiet: stock.description,
                  vaitro: 'Mảng cốt lõi',
                  pill: stock.customsCommodities[0] || 'Xuất khẩu',
                },
              ],
              markets: stock.keyMarkets?.map((m) => `<b>${m}</b> — thị trường trọng điểm`) || [],
              drivers: [
                `<b>Kim ngạch hải quan ${stock.customsCommodities.join(', ')}</b> · Tương quan r = ${stock.correlationR?.toFixed(2) || '0.80'}`,
              ],
              cite: `Hồ sơ phân loại Tier A Hải quan (theo dõi ${stock.yearsTracked || 15} năm).`,
            })
          }
        }
      })
      .catch(() => setActiveProfile(null))
      .finally(() => setIsLoadingProfile(false))
  }, [activeModalTicker])

  // Query 640+ profiles if search is active
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setExtraSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      fetch(`/api/customs-trade/profile?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.results) {
            setExtraSearchResults(data.results)
          }
        })
        .catch(() => {})
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter Tier A stocks
  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return TIER_A_STOCKS.filter((stock) => {
      if (selectedGroup !== 'ALL' && stock.groupId !== selectedGroup) return false
      if (selectedExchange !== 'ALL' && stock.exchange !== selectedExchange) return false
      if (selectedDirection !== 'ALL' && stock.tradeDirection !== selectedDirection) return false
      if (q) {
        const matchTicker = stock.ticker.toLowerCase().includes(q)
        const matchName = stock.name.toLowerCase().includes(q)
        const matchCommodity = stock.customsCommodities.some((c) =>
          c.toLowerCase().includes(q),
        )
        const matchGroup = stock.groupLabel.toLowerCase().includes(q)
        const matchMarkets = stock.keyMarkets?.some((m) => m.toLowerCase().includes(q))
        if (!matchTicker && !matchName && !matchCommodity && !matchGroup && !matchMarkets) {
          return false
        }
      }
      return true
    })
  }, [selectedGroup, selectedExchange, selectedDirection, searchQuery])

  // Grouped results for categorized view
  const groupedResults = useMemo(() => {
    const map = new Map<string, { group: TierAGroup; stocks: TierAStock[] }>()
    for (const g of TIER_A_GROUPS) {
      map.set(g.id, { group: g, stocks: [] })
    }
    for (const stock of filteredStocks) {
      const entry = map.get(stock.groupId)
      if (entry) {
        entry.stocks.push(stock)
      }
    }
    return Array.from(map.values()).filter((g) => g.stocks.length > 0)
  }, [filteredStocks])

  const topCorrelationStock = useMemo(() => {
    return [...TIER_A_STOCKS].sort((a, b) => (b.correlationR ?? 0) - (a.correlationR ?? 0))[0]
  }, [])

  // Sibling stocks for the active modal stock
  const activeStockInfo = useMemo(() => {
    if (!activeModalTicker) return null
    return TIER_A_STOCKS.find((s) => s.ticker === activeModalTicker) || null
  }, [activeModalTicker])

  const siblingStocks = useMemo(() => {
    if (!activeStockInfo) return []
    return TIER_A_STOCKS.filter(
      (s) => s.groupId === activeStockInfo.groupId && s.ticker !== activeStockInfo.ticker
    )
  }, [activeStockInfo])

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Value Proposition Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 lg:p-7 shadow-sm">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400">
                <Sparkles className="size-3.5" />
                <span>Kho Dữ Liệu Hải Quan & Hồ Sơ BCTN Doanh Nghiệp</span>
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                Phân Loại <span className="text-teal-400">57 Mã Niêm Yết (Tier A)</span> & Chuỗi Dữ Liệu Hải Quan
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tập hợp các doanh nghiệp niêm yết trên sàn (HOSE, HNX, UPCOM) có hoạt động kinh doanh
                khớp trực tiếp với các nhóm mặt hàng chủ yếu của <b>Tổng cục Hải quan (TCHQ)</b> kèm
                hồ sơ bóc tách mảng kinh doanh cốt lõi từ <b>Báo cáo thường niên (BCTN)</b> 640+ doanh nghiệp.
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center backdrop-blur shadow-xs">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {TIER_A_STOCKS.length}
                </div>
                <div className="text-[11px] text-muted-foreground">Mã niêm yết Tier A</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center backdrop-blur shadow-xs">
                <div className="text-2xl font-bold font-mono text-teal-400">
                  {TIER_A_GROUPS.length}
                </div>
                <div className="text-[11px] text-muted-foreground">Nhóm ngành XNK</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center backdrop-blur shadow-xs">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  r = {topCorrelationStock.correlationR?.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">Tương quan cao ({topCorrelationStock.ticker})</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center backdrop-blur shadow-xs">
                <div className="text-2xl font-bold font-mono text-amber-400">640+</div>
                <div className="text-[11px] text-muted-foreground">Hồ sơ BCTN trích dẫn</div>
              </div>
            </div>
          </div>

          {/* 3 Core Principles Highlight */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-400">
                <Clock className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Tín hiệu công bố sớm</p>
                <p className="text-[11px] text-muted-foreground">
                  Số hải quan công bố 5-10 ngày sau kỳ, đi trước BCTC quý 60-90 ngày.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <Activity className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Đo tương quan thực tế</p>
                <p className="text-[11px] text-muted-foreground">
                  Hệ số Pearson r đo trực tiếp giữa kim ngạch XNK và doanh thu doanh nghiệp.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
                <Layers className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Khớp đúng chuỗi giá trị</p>
                <p className="text-[11px] text-muted-foreground">
                  Trích dẫn số trang BCTN đối soát từng mảng sản phẩm & thị trường đầu ra.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="space-y-3 rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5 shadow-sm">
        {/* Industry Group Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => setSelectedGroup('ALL')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
              selectedGroup === 'ALL'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                : 'bg-secondary/70 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span>Tất cả ngành</span>
            <span className="rounded-full bg-black/15 dark:bg-white/20 px-1.5 py-0.2 text-[10px]">
              {TIER_A_STOCKS.length}
            </span>
          </button>

          {TIER_A_GROUPS.map((g) => {
            const active = selectedGroup === g.id
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                  active
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-secondary/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{g.label}</span>
                <span className="rounded-full bg-black/15 dark:bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {g.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search and Sub-filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tra cứu 640+ mã CP (VD: ADS, VHC, HPG, DCM, AAA...), mặt hàng Hải quan, BCTN..."
              className="h-10 w-full rounded-xl border border-border bg-background/80 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Exchange filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Sàn:</span>
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="h-9 rounded-xl border border-border bg-background/80 px-2.5 text-xs font-medium text-foreground focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">Tất cả sàn</option>
                <option value="HOSE">HOSE</option>
                <option value="HNX">HNX</option>
                <option value="UPCOM">UPCOM</option>
              </select>
            </div>

            {/* Direction filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Chiều:</span>
              <select
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="h-9 rounded-xl border border-border bg-background/80 px-2.5 text-xs font-medium text-foreground focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">Tất cả chiều</option>
                <option value="EXPORT">Xuất khẩu</option>
                <option value="IMPORT">Nhập khẩu</option>
                <option value="BOTH">Xuất & Nhập</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Suggestions for 640+ Extra Profiles */}
        {extraSearchResults.length > 0 && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3 space-y-2 animate-in fade-in">
            <div className="text-[11px] font-bold text-teal-400 flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              <span>Hồ sơ BCTN khớp từ CSDL 640+ doanh nghiệp:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {extraSearchResults.map(({ ticker, profile }) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setActiveModalTicker(ticker)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1 text-xs text-foreground hover:border-teal-500/50 hover:bg-teal-500/10 transition-all text-left"
                >
                  <span className="font-mono font-bold text-teal-400">{ticker}</span>
                  <span className="truncate max-w-[150px] text-muted-foreground">{profile.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Ticker Cards Grid (Categorized by Group) */}
      {filteredStocks.length === 0 && extraSearchResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Không tìm thấy mã cổ phiếu nào phù hợp với bộ lọc.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedGroup('ALL')
              setSearchQuery('')
              setSelectedExchange('ALL')
              setSelectedDirection('ALL')
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:underline"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedResults.map(({ group, stocks }) => (
            <div key={group.id} className="space-y-3">
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">{group.label}</h3>
                  <span className="rounded-full bg-secondary/80 border border-border px-2 py-0.2 text-xs font-semibold text-muted-foreground">
                    {stocks.length} mã
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Mặt hàng TCHQ:{' '}
                  <span className="font-semibold text-foreground">
                    {group.customsCommodities.join(', ')}
                  </span>
                </div>
              </div>

              {/* Group Stock Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stocks.map((stock) => {
                  const exCls = EXCHANGE_COLORS[stock.exchange] ?? 'bg-muted text-foreground'
                  const dir = DIRECTION_LABELS[stock.tradeDirection] ?? {
                    label: stock.tradeDirection,
                    cls: 'bg-muted text-foreground',
                  }

                  return (
                    <div
                      key={stock.ticker}
                      className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500/50 hover:shadow-lg"
                    >
                      <div>
                        {/* Card Top: Ticker & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveModalTicker(stock.ticker)}
                              className="font-mono text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-teal-400 cursor-pointer"
                            >
                              {stock.ticker}
                            </button>
                            <span
                              className={cn(
                                'rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                                exCls,
                              )}
                            >
                              {stock.exchange}
                            </span>
                          </div>

                          {stock.correlationR && (
                            <span
                              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400"
                              title={`Hệ số tương quan Pearson đo trên ${stock.yearsTracked} năm`}
                            >
                              r = {stock.correlationR.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Company Name */}
                        <h4 className="mt-1 line-clamp-1 text-xs font-semibold text-foreground">
                          {stock.name}
                        </h4>

                        {/* Trade Direction Badge */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                              dir.cls,
                            )}
                          >
                            {dir.label}
                          </span>
                        </div>

                        {/* Matched Customs Commodity */}
                        <div className="mt-2 rounded-xl bg-secondary/50 p-2 text-[11px]">
                          <span className="font-medium text-muted-foreground">Mặt hàng TCHQ: </span>
                          <span className="font-semibold text-foreground">
                            {stock.customsCommodities.join(', ')}
                          </span>
                        </div>

                        {/* Short Note */}
                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {stock.description}
                        </p>

                        {/* Key Markets */}
                        {stock.keyMarkets && stock.keyMarkets.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Thị trường:</span>
                            {stock.keyMarkets.map((m) => (
                              <span
                                key={m}
                                className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-foreground/80"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <button
                          type="button"
                          onClick={() => setActiveModalTicker(stock.ticker)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:underline cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          <span>Hồ sơ BCTN & Chuỗi XNK</span>
                        </button>

                        <Link
                          href={`/ticker/${stock.ticker}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-teal-500 hover:text-slate-950"
                        >
                          <span>Mã CP</span>
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Full Profile Modal Dialog */}
      {activeModalTicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border/80 bg-card p-4 sm:p-7 shadow-2xl space-y-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalTicker(null)}
              className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>

            {isLoadingProfile ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                <Loader2 className="mr-2 size-5 animate-spin text-teal-400" />
                <span>Đang tải hồ sơ doanh nghiệp & chuỗi dữ liệu Hải quan...</span>
              </div>
            ) : activeProfile ? (
              <div className="space-y-6">
                <CustomsStockProfile
                  ticker={activeModalTicker}
                  profile={activeProfile}
                  onSelectCommodity={(comm) => {
                    if (onSelectCommodity) {
                      onSelectCommodity(comm)
                      setActiveModalTicker(null)
                    }
                  }}
                />

                {/* Sibling Peers in Same Industry */}
                {siblingStocks.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2.5">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="size-3.5 text-teal-400" />
                      <span>Mã cùng nhóm {activeStockInfo?.groupLabel}:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {siblingStocks.map((s) => (
                        <button
                          key={s.ticker}
                          type="button"
                          onClick={() => setActiveModalTicker(s.ticker)}
                          className="rounded-lg border border-border bg-secondary/70 hover:bg-teal-500/20 hover:border-teal-500/40 px-2.5 py-1 text-xs font-mono font-bold text-foreground transition-all cursor-pointer"
                        >
                          {s.ticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Không thể tải thông tin hồ sơ cho mã {activeModalTicker}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
