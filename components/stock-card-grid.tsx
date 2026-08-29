'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ChevronDown, Inbox, Layers, FileText, BarChart2 } from 'lucide-react'
import type { StockManifestItem } from '@/lib/longlivestock'
import { useReports, reportHref } from '@/lib/use-reports'
import { cn } from '@/lib/utils'

interface StockCardGridProps {
  stocks: StockManifestItem[]
  searchQuery: string
  selectedSector: string
}

type SortKey = 't' | 'cap' | 'roe' | 'pe' | 'px'

const PAGE_SIZE = 60

function fmt(n: number | null | undefined, dec = 1): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function StockCardGrid({ stocks, searchQuery, selectedSector }: StockCardGridProps) {
  const { byTicker } = useReports()
  const [sortKey, setSortKey] = useState<SortKey>('cap')
  const [page, setPage] = useState<number>(1)

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      if (sortKey === 't') {
        return a.t.localeCompare(b.t)
      }
      const valA = a[sortKey]
      const valB = b[sortKey]
      const isNullA = valA == null || isNaN(valA)
      const isNullB = valB == null || isNaN(valB)

      if (isNullA && isNullB) return a.t.localeCompare(b.t)
      if (isNullA) return 1
      if (isNullB) return -1

      if (sortKey === 'pe') {
        return (valA as number) - (valB as number)
      }
      return (valB as number) - (valA as number)
    })
  }, [stocks, sortKey])

  const visibleCount = page * PAGE_SIZE
  const visibleStocks = useMemo(() => {
    return sortedStocks.slice(0, visibleCount)
  }, [sortedStocks, visibleCount])

  const remainingCount = sortedStocks.length - visibleCount

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-sm">
          {selectedSector ? (
            <span className="font-bold text-foreground">
              Ngành <span className="text-primary">"{selectedSector}"</span> · {sortedStocks.length} mã
            </span>
          ) : searchQuery ? (
            <span className="font-bold text-foreground">
              Kết quả tìm kiếm <span className="text-primary">"{searchQuery}"</span> · {sortedStocks.length} mã
            </span>
          ) : (
            <span className="font-bold text-foreground">
              Danh mục toàn thị trường · {sortedStocks.length} mã
            </span>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sắp xếp:</span>
          <select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey)
              setPage(1)
            }}
            className="h-8 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="cap">Vốn hóa ↓</option>
            <option value="roe">ROE ↓</option>
            <option value="pe">P/E ↑</option>
            <option value="px">Giá ↓</option>
            <option value="t">Mã A → Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {visibleStocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Không tìm thấy mã cổ phiếu nào phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visibleStocks.map((stock) => {
            const tickerUpper = stock.t.toUpperCase()
            const report = byTicker.get(tickerUpper)
            const hasReport = !!report

            // Nếu có báo cáo thì link thẳng tới báo cáo, nếu chưa có thì link tới trang tra cứu /stock/[ticker]
            const targetHref = hasReport
              ? `/bao-cao?ticker=${encodeURIComponent(tickerUpper)}`
              : `/stock/${stock.t}`

            const isDelisted = stock.st === 'delisted'
            const isSuspended = stock.st === 'suspended'
            const isInactive = stock.st === 'inactive'
            const hasStatus = isDelisted || isSuspended || isInactive

            const roeVal = stock.roe
            const isRoePos = roeVal != null && roeVal > 0
            const isRoeNeg = roeVal != null && roeVal < 0

            return (
              <div
                key={stock.t}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md',
                  hasStatus && 'opacity-65 hover:opacity-100',
                )}
              >
                <div>
                  {/* Top Row: Ticker & Badges */}
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={targetHref}
                      className="font-mono text-base font-bold text-primary hover:underline"
                      title={hasReport ? `Xem báo cáo phân tích mã ${stock.t}` : `Xem chi tiết mã ${stock.t}`}
                    >
                      {stock.t}
                    </Link>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {hasReport && (
                        <Link
                          href={`/bao-cao?ticker=${encodeURIComponent(tickerUpper)}`}
                          className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1 py-0.2 text-[9px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          title="Bấm để đọc báo cáo phân tích chuyên sâu"
                        >
                          <FileText className="size-2.5" />
                          <span>Báo cáo</span>
                        </Link>
                      )}
                      {stock.port && (
                        <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                          CẢNG
                        </span>
                      )}
                      {isDelisted && (
                        <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                          HỦY NY
                        </span>
                      )}
                      {isSuspended && (
                        <span className="rounded bg-purple-500/10 px-1 py-0.2 text-[9px] font-bold text-purple-600 dark:text-purple-400">
                          ĐÌNH CHỈ
                        </span>
                      )}
                      {isInactive && (
                        <span className="rounded bg-muted px-1 py-0.2 text-[9px] font-bold text-muted-foreground">
                          NGỪNG GD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Company Name */}
                  <Link
                    href={targetHref}
                    className="mt-1 block line-clamp-2 min-h-[32px] text-[11px] font-medium leading-snug text-foreground/90 hover:text-primary"
                  >
                    {stock.n}
                  </Link>

                  {/* Sector */}
                  <div className="mt-1 truncate text-[10px] text-muted-foreground">
                    {stock.s}
                  </div>
                </div>

                {/* 4 Financial Metrics Grid */}
                <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border/60 pt-2 text-center">
                  <div>
                    <div className="font-mono text-[11px] font-bold text-foreground">
                      {stock.px != null ? fmt(stock.px, stock.px < 10 ? 2 : 1) : '—'}
                    </div>
                    <div className="text-[8.5px] uppercase tracking-wider text-muted-foreground">
                      Giá
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[11px] font-medium text-foreground">
                      {stock.pe != null && stock.pe > 0 ? fmt(stock.pe, 1) : '—'}
                    </div>
                    <div className="text-[8.5px] uppercase tracking-wider text-muted-foreground">
                      P/E
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[11px] font-medium text-foreground">
                      {stock.pb != null && stock.pb > 0 ? fmt(stock.pb, 1) : '—'}
                    </div>
                    <div className="text-[8.5px] uppercase tracking-wider text-muted-foreground">
                      P/B
                    </div>
                  </div>

                  <div>
                    <div
                      className={cn(
                        'font-mono text-[11px] font-bold',
                        isRoePos && 'text-emerald-600 dark:text-emerald-400',
                        isRoeNeg && 'text-rose-600 dark:text-rose-400',
                        !isRoePos && !isRoeNeg && 'text-muted-foreground',
                      )}
                    >
                      {roeVal != null ? `${fmt(roeVal, 1)}%` : '—'}
                    </div>
                    <div className="text-[8.5px] uppercase tracking-wider text-muted-foreground">
                      ROE
                    </div>
                  </div>
                </div>

                {/* Footer Quick Links (Báo Cáo / BCTC) */}
                <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 text-[10px]">
                  <Link
                    href={`/bao-cao?ticker=${encodeURIComponent(tickerUpper)}`}
                    className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium"
                  >
                    <FileText className="size-2.5" />
                    <span>Báo cáo</span>
                  </Link>
                  <Link
                    href={`/stock/${stock.t}`}
                    className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <BarChart2 className="size-2.5" />
                    <span>BCTC</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load More Button */}
      {remainingCount > 0 && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-6 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span>Xem thêm {Math.min(remainingCount, PAGE_SIZE)} mã</span>
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
