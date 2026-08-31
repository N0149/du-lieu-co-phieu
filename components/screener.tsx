'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { fmtPrice, fmtNum, fmtPct } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useReports, reportHref } from '@/lib/use-reports'
import {
  buildReportStocks,
  upsideOf,
  marketPriceOf,
  type ReportStock,
} from '@/lib/report-stocks'

type SortKey =
  | 'ticker'
  | 'marketPrice'
  | 'targetPrice'
  | 'reportDate'
  | 'upside'
  | 'bonusWelfareRate'
type SortOrder = 'asc' | 'desc'

// Chuyển "YYYY-MM-DD" → "DD/MM/YYYY" (chuẩn VN), fallback trả nguyên chuỗi
function formatVnDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

// Chuyển "DD/MM/YYYY" (hoặc "YYYY-MM-DD") → timestamp (ms) để sort theo ngày chính xác.
// Dùng new Date(y, m-1, d) (tháng 0-based) để tránh lỗi parse múi giờ của Date.parse.
// Ngày báo cáo hiện do API trả dạng DD/MM/YYYY từ createdTime.
function reportDateToTimestamp(v: string | null): number {
  if (!v) return 0
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) // DD/MM/YYYY
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime()
  const m2 = v.match(/^(\d{4})-(\d{2})-(\d{2})$/) // YYYY-MM-DD
  if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3]).getTime()
  return 0
}

// Format tỷ lệ trích quỹ KTPL: số nguyên → "10%", số thập phân → "7,5%" (locale vi-VN)
function fmtRate(v: number): string {
  return `${Number.isInteger(v) ? fmtNum(v, 0) : fmtNum(v, 1)}%`
}

// Số mã hiển thị trên mỗi trang phân trang (bảng full-width, thoáng hơn)
const ITEMS_PER_PAGE = 20

export function Screener() {
  const { reports, loading } = useReports()

  // Mặc định sắp xếp theo ngày báo cáo mới nhất lên đầu (desc)
  const [sortKey, setSortKey] = useState<SortKey>('reportDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)

  // Nguồn dữ liệu: các mã ĐÃ CÓ bài viết trong kho báo cáo (ghép dữ liệu tài chính nếu có)
  const reportStocks = useMemo(() => buildReportStocks(reports), [reports])

  const filtered = useMemo(() => {
    const rows = reportStocks // Không còn sidebar bộ lọc — hiển thị toàn bộ mã đã có báo cáo

    const val = (s: ReportStock): number | string => {
      switch (sortKey) {
        case 'ticker':
          return s.ticker
        case 'marketPrice':
          return marketPriceOf(s) ?? -Infinity
        case 'targetPrice':
          return s.targetPrice ?? -Infinity
        case 'reportDate':
          return reportDateToTimestamp(s.reportDate) // DD/MM/YYYY (hoặc YYYY-MM-DD) → timestamp (ms)
        case 'upside':
          return upsideOf(s) ?? -Infinity
        case 'bonusWelfareRate':
          return s.bonusWelfareRate ?? -Infinity
      }
    }

    return [...rows].sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      let cmp = 0
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
      else cmp = (av as number) - (bv as number)
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [reportStocks, sortKey, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder(key === 'ticker' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  return (
    <section className="min-w-0">
      {/* ═══ DESKTOP (≥ md): Bảng 7 cột ═══ */}
      <div className="hidden overflow-hidden rounded-xl border border-white/8 bg-[#212631] shadow-[0_4px_20px_rgba(0,0,0,0.25)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-[#1a1d26] text-left">
                <Th onClick={() => toggleSort('ticker')} active={sortKey === 'ticker'} dir={sortOrder}>
                  Mã CK
                </Th>
                <th className="w-[140px] max-w-[150px] truncate px-4 py-3 text-left text-xs font-semibold text-[#9EACB9] uppercase tracking-wider">
                  Tên doanh nghiệp
                </th>
                <Th onClick={() => toggleSort('reportDate')} active={sortKey === 'reportDate'} dir={sortOrder}>
                  Ngày báo cáo
                </Th>
                <Th onClick={() => toggleSort('marketPrice')} active={sortKey === 'marketPrice'} dir={sortOrder} right>
                  Giá TT
                </Th>
                <Th onClick={() => toggleSort('targetPrice')} active={sortKey === 'targetPrice'} dir={sortOrder} right>
                  Giá MT
                </Th>
                <Th onClick={() => toggleSort('bonusWelfareRate')} active={sortKey === 'bonusWelfareRate'} dir={sortOrder} right>
                  Trích quỹ KTPL
                </Th>
                <Th onClick={() => toggleSort('upside')} active={sortKey === 'upside'} dir={sortOrder} right>
                  Upside
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageRows.map((s) => {
                const up = upsideOf(s)
                const href = `/stock/${encodeURIComponent(s.ticker)}`
                return (
                  <tr
                    key={s.ticker}
                    className="relative transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      {/* Link chính ở cột Mã CK; stretched-link (::after) phủ toàn dòng để cả dòng click được */}
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 after:absolute after:inset-0"
                        aria-label={`${s.ticker} — xem chi tiết tài chính & báo cáo phân tích`}
                      >
                        <span className="font-mono text-sm font-bold text-[#F0F3F6]">{s.ticker}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#9EACB9]">
                          {s.exchange}
                        </span>
                        {s.hasReport && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20"
                            title="Đã có báo cáo phân tích"
                          >
                            <FileText className="size-3" /> Báo cáo
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="w-[140px] max-w-[150px] truncate px-4 py-3 text-[#F0F3F6]">{s.name}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-[#9EACB9]">
                      {s.reportDate ? formatVnDate(s.reportDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-[#F0F3F6]">
                      {marketPriceOf(s) != null ? fmtPrice(marketPriceOf(s) as number) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-[#F0F3F6]">
                      {s.targetPrice != null ? fmtPrice(s.targetPrice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#9EACB9]">
                      {s.bonusWelfareRate != null ? fmtRate(s.bonusWelfareRate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {up != null ? (
                        <span
                          className={cn(
                            'inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums border',
                            up >= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                          )}
                        >
                          {fmtPct(up, 0)}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#9EACB9]">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
                      Đang tải dữ liệu báo cáo...
                    </span>
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#9EACB9]">
                    Chưa có dữ liệu báo cáo trong kho. Vui lòng quay lại sau.
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && reports.length > 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#9EACB9]">
                    Không có cổ phiếu nào hiển thị trên trang này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ MOBILE (< md): Card List ═══ */}
      <div className="space-y-2.5 md:hidden">
        {loading ? (
          // 3 Card Skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse space-y-3 rounded-xl border border-white/8 bg-[#212631] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 rounded bg-white/5" />
                  <div className="h-4 w-24 rounded bg-white/5" />
                </div>
                <div className="h-5 w-14 rounded bg-white/5" />
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-black/20 p-2.5">
                <div className="h-8 rounded bg-white/5" />
                <div className="h-8 rounded bg-white/5" />
                <div className="h-8 rounded bg-white/5" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-white/5" />
                <div className="h-3 w-20 rounded bg-white/5" />
              </div>
            </div>
          ))
        ) : pageRows.length === 0 ? (
          // Empty: căn giữa
          <div className="rounded-xl border border-dashed border-white/10 bg-[#212631] px-4 py-10 text-center text-sm text-[#9EACB9]">
            Không tìm thấy cổ phiếu phù hợp.
          </div>
        ) : (
          pageRows.map((s) => <CardStock key={s.ticker} stock={s} />)
        )}
      </div>

      {/* ═══ PHÂN TRANG (dùng chung mobile + desktop — cuối danh sách) ═══ */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/8 bg-[#212631] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.25)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#9EACB9]">
          Hiển thị{' '}
          <span className="font-mono font-medium text-[#F0F3F6]">
            {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
          </span>{' '}
          trên <span className="font-mono font-medium text-[#F0F3F6]">{filtered.length}</span> mã
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Trang trước"
            className="border-white/10 bg-[#1A1D26] text-[#F0F3F6] hover:bg-white/5"
          >
            <ChevronLeft className="size-4" />
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={safePage === i + 1 ? 'default' : 'outline'}
              size="icon-sm"
              onClick={() => setPage(i + 1)}
              className={cn(
                'font-mono text-xs',
                safePage === i + 1
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 font-bold'
                  : 'border-white/10 bg-[#1A1D26] text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
              )}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Trang sau"
            className="border-white/10 bg-[#1A1D26] text-[#F0F3F6] hover:bg-white/5"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Thẻ cổ phiếu dạng Card cho giao diện mobile (< md). Toàn thẻ là Link mở báo cáo. */
function CardStock({ stock }: { stock: ReportStock }) {
  const up = upsideOf(stock)
  const price = marketPriceOf(stock)

  return (
    <Link
      href={`/stock/${encodeURIComponent(stock.ticker)}`}
      className="block space-y-3 rounded-xl border border-white/8 bg-[#212631] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-colors hover:bg-white/[0.04]"
      aria-label={`${stock.ticker} — xem chi tiết tài chính & báo cáo phân tích`}
    >
      {/* Hàng 1 — Header: badge mã emerald + tên + badge upside */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
            {stock.ticker}
          </span>
          <span className="truncate text-sm font-semibold text-[#F0F3F6]">{stock.name}</span>
        </div>
        {up != null ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums border',
              up >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            )}
          >
            {fmtPct(up, 0)}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-[#64748B]">—</span>
        )}
      </div>

      {/* Hàng 2 — Grid chỉ số (Giá TT / Giá MT / KTPL) */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-black/20 p-2.5 text-xs">
        <div className="min-w-0">
          <p className="text-[#9EACB9] text-[11px]">Giá TT</p>
          <p className="truncate font-mono font-bold text-[#F0F3F6] tabular-nums">
            {price != null ? fmtPrice(price) : '—'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#9EACB9] text-[11px]">Giá MT</p>
          <p className="truncate font-mono font-bold text-[#F0F3F6] tabular-nums">
            {stock.targetPrice != null ? fmtPrice(stock.targetPrice) : '—'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[#9EACB9] text-[11px]">KTPL</p>
          <p className="truncate font-mono font-semibold text-[#9EACB9] tabular-nums">
            {stock.bonusWelfareRate != null ? fmtRate(stock.bonusWelfareRate) : '—'}
          </p>
        </div>
      </div>

      {/* Hàng 3 — Footer: ngày báo cáo + "Xem chi tiết →" */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[11px] text-[#9EACB9]">
          {stock.reportDate ? formatVnDate(stock.reportDate) : '—'}
        </span>
        <span className="text-xs font-semibold text-emerald-400">
          Xem chi tiết →
        </span>
      </div>
    </Link>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  right,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: SortOrder
  right?: boolean
}) {
  return (
    <th className="px-4 py-3">
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
          right && 'ml-auto flex-row-reverse',
          active ? 'text-emerald-400' : 'text-[#9EACB9] hover:text-[#F0F3F6]',
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3 text-emerald-400" />
          ) : (
            <ArrowDown className="size-3 text-emerald-400" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  )
}
