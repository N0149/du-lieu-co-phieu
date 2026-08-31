'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ChevronDown,
  Inbox,
  FileText,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react'
import type { StockManifestItem } from '@/lib/longlivestock'
import { useReports } from '@/lib/use-reports'
import { cn } from '@/lib/utils'

interface StockCardGridProps {
  stocks: StockManifestItem[]
  searchQuery: string
  selectedSector: string
  viewMode?: 'grid' | 'table'
}

type SortKey = 't' | 'cap' | 'roe' | 'pe' | 'pb' | 'px' | 'w1' | 'dy'

const PAGE_SIZE = 60

function fmt(n: number | null | undefined, dec = 1): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function StockCardGrid({
  stocks,
  searchQuery,
  selectedSector,
  viewMode = 'grid',
}: StockCardGridProps) {
  const { byTicker } = useReports()
  const [sortKey, setSortKey] = useState<SortKey>('cap')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState<number>(1)

  const handleHeaderSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder(key === 't' || key === 'pe' || key === 'pb' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      if (sortKey === 't') {
        return sortOrder === 'asc' ? a.t.localeCompare(b.t) : b.t.localeCompare(a.t)
      }
      const valA = a[sortKey]
      const valB = b[sortKey]
      const isNullA = valA == null || isNaN(valA)
      const isNullB = valB == null || isNaN(valB)

      if (isNullA && isNullB) return a.t.localeCompare(b.t)
      if (isNullA) return 1
      if (isNullB) return -1

      return sortOrder === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number)
    })
  }, [stocks, sortKey, sortOrder])

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
          <span className="text-xs text-muted-foreground">Sắp xếp theo:</span>
          <select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey)
              setPage(1)
            }}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="cap">Vốn hóa ↓</option>
            <option value="roe">ROE ↓</option>
            <option value="pe">P/E ↑</option>
            <option value="pb">P/B ↑</option>
            <option value="px">Giá ↓</option>
            <option value="w1">Biến động 1 tuần ↓</option>
            <option value="dy">Tỷ suất cổ tức ↓</option>
            <option value="t">Mã A → Z</option>
          </select>
        </div>
      </div>

      {visibleStocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 size-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold">Không tìm thấy mã cổ phiếu nào phù hợp.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hãy thử thay đổi điều kiện bộ lọc hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW (Bảng số liệu chi tiết) ── */
        <div className="overflow-hidden rounded-xl border border-white/8 bg-[#212631] shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/8 bg-[#1a1d26] font-mono text-[11px] uppercase tracking-wider text-[#9EACB9]">
              <tr>
                <th
                  onClick={() => handleHeaderSort('t')}
                  className="px-3.5 py-3 cursor-pointer hover:text-[#F0F3F6] sticky left-0 bg-[#1a1d26]"
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span>Mã CK</span>
                    <ArrowUpDown className="size-3 text-emerald-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 min-w-[200px] text-[#F0F3F6]">Tên doanh nghiệp</th>
                <th className="px-3.5 py-3">Sàn</th>
                <th className="px-3.5 py-3 min-w-[140px]">Ngành</th>
                <th
                  onClick={() => handleHeaderSort('px')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Giá (k₫)</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('w1')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>±1 Tuần</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('cap')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Vốn hóa (tỷ)</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('pe')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>P/E</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('pb')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>P/B</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('roe')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ROE</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('dy')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-[#F0F3F6]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cổ tức</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-3.5 py-3 text-center">Báo cáo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visibleStocks.map((stock) => {
                const tickerUpper = stock.t.toUpperCase()
                const report = byTicker.get(tickerUpper)
                const hasReport = !!report
                const isDelisted = stock.st === 'delisted'
                const isSuspended = stock.st === 'suspended'
                const isRoePos = stock.roe != null && stock.roe > 0
                const isRoeNeg = stock.roe != null && stock.roe < 0
                const hasW1 = stock.w1 != null
                const isW1Pos = hasW1 && stock.w1! > 0
                const isW1Neg = hasW1 && stock.w1! < 0

                return (
                  <tr
                    key={stock.t}
                    className={cn(
                      'hover:bg-white/[0.03] transition-colors',
                      (isDelisted || isSuspended) && 'opacity-60',
                    )}
                  >
                    <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-400 sticky left-0 bg-[#212631]">
                      <Link href={`/stock/${stock.t}`} className="hover:underline flex items-center gap-1">
                        <span>{stock.t}</span>
                        {stock.port && (
                          <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[8.5px] font-bold text-amber-400">
                            CẢNG
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-foreground/90 font-medium">
                      <Link href={`/stock/${stock.t}`} className="hover:text-primary hover:underline line-clamp-1">
                        {stock.n}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {stock.e || '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground text-[11px]">
                      {stock.s2 || stock.s}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-foreground">
                      {stock.px != null ? fmt(stock.px, stock.px < 100 ? 1 : 0) : '—'}
                    </td>
                    <td
                      className={cn(
                        'px-3.5 py-2.5 text-right font-mono font-bold',
                        isW1Pos
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isW1Neg
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-muted-foreground',
                      )}
                    >
                      {hasW1 ? `${isW1Pos ? '+' : ''}${fmt(stock.w1, 1)}%` : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-foreground">
                      {stock.cap != null ? fmt(stock.cap, 0) : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-muted-foreground">
                      {stock.pe != null && stock.pe > 0 ? fmt(stock.pe, 1) : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-muted-foreground">
                      {stock.pb != null && stock.pb > 0 ? fmt(stock.pb, 2) : '—'}
                    </td>
                    <td
                      className={cn(
                        'px-3.5 py-2.5 text-right font-mono font-bold',
                        isRoePos
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isRoeNeg
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-muted-foreground',
                      )}
                    >
                      {stock.roe != null ? `${fmt(stock.roe, 1)}%` : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-foreground">
                      {stock.div != null
                        ? `${fmt(stock.div, 0)}${stock.dy != null ? ` (${fmt(stock.dy, 1)}%)` : ''}`
                        : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      {hasReport ? (
                        <Link
                          href={`/bao-cao?ticker=${encodeURIComponent(tickerUpper)}`}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          title="Xem báo cáo phân tích"
                        >
                          <FileText className="size-3" />
                          <span>Đọc báo cáo</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── GRID VIEW (Lưới thẻ hiện đại) ── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visibleStocks.map((stock) => {
            const tickerUpper = stock.t.toUpperCase()
            const report = byTicker.get(tickerUpper)
            const hasReport = !!report

            const targetHref = `/stock/${stock.t}`

            const isDelisted = stock.st === 'delisted'
            const isSuspended = stock.st === 'suspended'
            const isInactive = stock.st === 'inactive'
            const hasStatus = isDelisted || isSuspended || isInactive

            const roeVal = stock.roe
            const isRoePos = roeVal != null && roeVal > 0
            const isRoeNeg = roeVal != null && roeVal < 0
            const hasW1 = stock.w1 != null
            const isW1Pos = hasW1 && stock.w1! > 0
            const isW1Neg = hasW1 && stock.w1! < 0

            return (
              <div
                key={stock.t}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl border border-white/8 bg-[#212631] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl',
                  hasStatus && 'opacity-65 hover:opacity-100',
                )}
              >
                <div>
                  {/* Top Row: Ticker & Badges */}
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={targetHref}
                      className="font-mono text-base font-bold text-emerald-400 group-hover:underline"
                      title={`Xem chi tiết hồ sơ mã ${stock.t}`}
                    >
                      {stock.t}
                    </Link>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {hasReport && (
                        <Link
                          href={`/bao-cao?ticker=${encodeURIComponent(tickerUpper)}`}
                          className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9.5px] font-bold text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                          title="Bấm để đọc báo cáo phân tích chuyên sâu"
                        >
                          <FileText className="size-2.5" />
                          <span>Báo cáo</span>
                        </Link>
                      )}
                      {stock.port && (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                          CẢNG
                        </span>
                      )}
                      {isDelisted && (
                        <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-400">
                          HỦY NY
                        </span>
                      )}
                      {isSuspended && (
                        <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.2 text-[9px] font-bold text-purple-400">
                          ĐÌNH CHỈ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Company Name */}
                  <Link
                    href={targetHref}
                    className="mt-1.5 block line-clamp-2 min-h-[32px] text-xs font-semibold leading-snug text-[#F0F3F6] hover:text-emerald-400 transition-colors"
                  >
                    {stock.n}
                  </Link>

                  {/* Sector & Exchange */}
                  <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-[#9EACB9]">
                    <span className="truncate">{stock.s2 || stock.s}</span>
                    {stock.e && (
                      <span className="shrink-0 font-mono font-semibold text-[#9EACB9]">{stock.e}</span>
                    )}
                  </div>
                </div>

                {/* Financial Metrics Grid */}
                <div className="mt-3 space-y-2 border-t border-white/8 pt-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-sm font-bold text-[#F0F3F6]">
                      {stock.px != null ? `${fmt(stock.px, stock.px < 100 ? 1 : 0)} k₫` : '—'}
                    </span>
                    {hasW1 && (
                      <span
                        className={cn(
                          'font-mono text-[11px] font-semibold tabular-nums',
                          isW1Pos
                            ? 'text-emerald-400'
                            : isW1Neg
                              ? 'text-rose-400'
                              : 'text-[#9EACB9]',
                        )}
                      >
                        {isW1Pos ? '+' : ''}
                        {fmt(stock.w1, 1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-2 text-center text-[10px]">
                    <div>
                      <div className="text-[8.5px] uppercase tracking-wider text-[#9EACB9]">P/E</div>
                      <div className="font-mono font-bold text-[#F0F3F6]">
                        {stock.pe != null && stock.pe > 0 ? fmt(stock.pe, 1) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8.5px] uppercase tracking-wider text-[#9EACB9]">P/B</div>
                      <div className="font-mono font-bold text-[#F0F3F6]">
                        {stock.pb != null && stock.pb > 0 ? fmt(stock.pb, 1) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8.5px] uppercase tracking-wider text-[#9EACB9]">ROE</div>
                      <div
                        className={cn(
                          'font-mono font-bold',
                          isRoePos
                            ? 'text-emerald-400'
                            : isRoeNeg
                              ? 'text-rose-400'
                              : 'text-[#9EACB9]',
                        )}
                      >
                        {roeVal != null ? `${fmt(roeVal, 0)}%` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <Link
                  href={targetHref}
                  className="mt-2.5 flex items-center justify-between border-t border-white/8 pt-2 text-[10.5px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  <span>Hồ sơ & BCTC 16 năm</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-6 py-2.5 text-xs font-bold text-foreground shadow-2xs transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span>Xem thêm {Math.min(remainingCount, PAGE_SIZE)} mã tiếp theo (còn {remainingCount} mã)</span>
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
