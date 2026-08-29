'use client'

import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import {
  TIER_A_GROUPS,
  TIER_A_STOCKS,
  type TierAStock,
  type TierAGroup,
} from '@/lib/tier-a-stocks'
import { cn } from '@/lib/utils'

interface TierAStocksViewerProps {
  onSelectCommodity?: (commodityName: string) => void
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

export function TierAStocksViewer({ onSelectCommodity }: TierAStocksViewerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL')
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL')
  const [activeModalStock, setActiveModalStock] = useState<TierAStock | null>(null)

  // Filter logic
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

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Value Proposition Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 lg:p-7">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                <span>Kho Dữ Liệu Hải Quan & Cổ Phiếu Niêm Yết</span>
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                Phân Loại <span className="text-primary">57 Mã Niêm Yết (Tier A)</span> Theo Nhóm Ngành XNK
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tập hợp các doanh nghiệp niêm yết trên sàn (HOSE, HNX, UPCOM) có hoạt động kinh doanh
                khớp trực tiếp với các nhóm mặt hàng chủ yếu của <b>Tổng cục Hải quan (TCHQ)</b>.
                Dữ liệu xuất nhập khẩu phát hành định kỳ theo bán nguyệt & tháng — giúp nhà đầu tư nắm bắt
                sớm tín hiệu doanh thu ngành <b>trước khi báo cáo tài chính quý (BCTC) công bố 2–3 tháng</b>.
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-center backdrop-blur">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {TIER_A_STOCKS.length}
                </div>
                <div className="text-[11px] text-muted-foreground">Mã niêm yết Tier A</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-center backdrop-blur">
                <div className="text-2xl font-bold font-mono text-primary">
                  {TIER_A_GROUPS.length}
                </div>
                <div className="text-[11px] text-muted-foreground">Nhóm ngành XNK</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-center backdrop-blur">
                <div className="text-2xl font-bold font-mono text-emerald-500">
                  r = {topCorrelationStock.correlationR?.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">Tương quan cao nhất ({topCorrelationStock.ticker})</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-center backdrop-blur">
                <div className="text-2xl font-bold font-mono text-amber-500">16 năm</div>
                <div className="text-[11px] text-muted-foreground">Kiểm chứng (2009–2026)</div>
              </div>
            </div>
          </div>

          {/* 3 Core Principles Highlight */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Tín hiệu công bố sớm</p>
                <p className="text-[11px] text-muted-foreground">
                  Số hải quan có sau khi kỳ kết thúc 5-10 ngày, đi trước BCTC quý 60-90 ngày.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
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
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <Layers className="size-3.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Khớp đúng mặt hàng</p>
                <p className="text-[11px] text-muted-foreground">
                  Liên kết chuẩn mã TCHQ (Thép, Dệt may, Thủy sản, Phân bón, Cao su).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        {/* Industry Group Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => setSelectedGroup('ALL')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              selectedGroup === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span>Tất cả ngành</span>
            <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
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
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{g.label}</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] dark:bg-white/20">
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
              placeholder="Tìm theo mã CP (VD: HPG, VHC, MSH), tên công ty, mặt hàng Hải quan..."
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
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
                className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden"
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
                className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden"
              >
                <option value="ALL">Tất cả chiều</option>
                <option value="EXPORT">Xuất khẩu</option>
                <option value="BOTH">Xuất & Nhập</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ticker Cards Grid */}
      {filteredStocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
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
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedResults.map(({ group, stocks }) => (
            <div key={group.id} className="space-y-3">
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground sm:text-lg">
                    {group.label}
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {stocks.length} mã
                  </span>
                  {group.avgR && (
                    <span className="hidden rounded border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-block">
                      r trung bình ≈ {group.avgR.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </div>

              {/* Grid of stock cards */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stocks.map((stock) => {
                  const dir = DIRECTION_LABELS[stock.tradeDirection] ?? DIRECTION_LABELS.EXPORT
                  const exCls = EXCHANGE_COLORS[stock.exchange] ?? 'bg-secondary text-foreground'

                  return (
                    <div
                      key={stock.ticker}
                      className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    >
                      <div>
                        {/* Card Top: Ticker & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveModalStock(stock)}
                              className="font-mono text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary"
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
                              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                              title={`Hệ số tương quan Pearson đo trên ${stock.yearsTracked} năm`}
                            >
                              r = {stock.correlationR.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Company Name */}
                        <h4 className="mt-1 line-clamp-1 text-xs font-medium text-foreground/90">
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
                        <div className="mt-2 rounded-md bg-secondary/50 p-2 text-[11px]">
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
                        {onSelectCommodity ? (
                          <button
                            type="button"
                            onClick={() => onSelectCommodity(stock.customsCommodities[0])}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            title={`Lọc số liệu Hải quan cho mặt hàng ${stock.customsCommodities[0]}`}
                          >
                            <BarChart3 className="size-3.5" />
                            <span>Xem số liệu XNK</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveModalStock(stock)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            <Info className="size-3.5" />
                            <span>Xem chi tiết</span>
                          </button>
                        )}

                        <Link
                          href={`/ticker/${stock.ticker}`}
                          className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          <span>Trang mã</span>
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

      {/* 4. Detail Modal */}
      {activeModalStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setActiveModalStock(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-2xl font-bold text-foreground">
                {activeModalStock.ticker}
              </span>
              <span
                className={cn(
                  'rounded border px-2 py-0.5 font-mono text-xs font-semibold',
                  EXCHANGE_COLORS[activeModalStock.exchange],
                )}
              >
                {activeModalStock.exchange}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-medium text-muted-foreground">
                {activeModalStock.groupLabel}
              </span>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-foreground">
              {activeModalStock.name}
            </h3>

            {/* Correlation Callout */}
            {activeModalStock.correlationR && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div>
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Hệ số tương quan Pearson r = {activeModalStock.correlationR.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
                    Đo trên chuỗi {activeModalStock.yearsTracked} năm dữ liệu song song với BCTC
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Tín hiệu mạnh
                  </span>
                </div>
              </div>
            )}

            {/* Matched Customs Commodities */}
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-foreground">Mặt hàng Hải quan tương ứng:</h4>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {activeModalStock.customsCommodities.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      🏷️ {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground">Ý nghĩa phân tích & Mối liên hệ:</h4>
                <p className="mt-1 leading-relaxed text-muted-foreground">
                  {activeModalStock.description}
                </p>
              </div>

              {activeModalStock.keyMarkets && activeModalStock.keyMarkets.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground">Thị trường xuất nhập khẩu chính:</h4>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {activeModalStock.keyMarkets.map((m) => (
                      <span
                        key={m}
                        className="rounded bg-muted px-2 py-0.5 text-xs text-foreground"
                      >
                        🌐 {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-[11px] text-muted-foreground">
                💡 <b>Mẹo phân tích:</b> Theo dõi số liệu kim ngạch xuất khẩu và lượng xuất hàng tháng
                của nhóm mặt hàng trên để ước tính tăng trưởng doanh thu quý của{' '}
                {activeModalStock.ticker} trước khi doanh nghiệp công bố báo cáo tài chính.
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              {onSelectCommodity && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCommodity(activeModalStock.customsCommodities[0])
                    setActiveModalStock(null)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <BarChart3 className="size-3.5" />
                  <span>Xem số liệu Hải quan ({activeModalStock.customsCommodities[0]})</span>
                </button>
              )}

              <Link
                href={`/ticker/${activeModalStock.ticker}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <span>Xem trang cổ phiếu {activeModalStock.ticker}</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
