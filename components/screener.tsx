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
type SortDir = 'asc' | 'desc'

// Chuyển "YYYY-MM-DD" → "DD/MM/YYYY" (chuẩn VN), fallback trả nguyên chuỗi
function formatVnDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

// Chuyển "DD/MM/YYYY" (hoặc "YYYY-MM-DD") → "YYYYMMDD" để sort theo ngày chính xác
// (ngày báo cáo hiện do API trả dạng DD/MM/YYYY từ createdTime)
function sortableDate(v: string | null): string {
  if (!v) return ''
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) // DD/MM/YYYY
  if (m) return `${m[3]}${m[2]}${m[1]}`
  return v.replace(/-/g, '') // YYYY-MM-DD → YYYYMMDD
}

// Format tỷ lệ trích quỹ KTPL: số nguyên → "10%", số thập phân → "7,5%" (locale vi-VN)
function fmtRate(v: number): string {
  return `${Number.isInteger(v) ? fmtNum(v, 0) : fmtNum(v, 1)}%`
}

// Số mã hiển thị trên mỗi trang phân trang (bảng full-width, thoáng hơn)
const PAGE_SIZE = 20

export function Screener() {
  const { reports } = useReports()

  const [sortKey, setSortKey] = useState<SortKey>('upside')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
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
          return sortableDate(s.reportDate) // DD/MM/YYYY (hoặc YYYY-MM-DD) → YYYYMMDD
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
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [reportStocks, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'ticker' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  return (
      <section className="min-w-0">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-left">
                  <Th onClick={() => toggleSort('ticker')} active={sortKey === 'ticker'} dir={sortDir}>
                    Mã CK
                  </Th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tên doanh nghiệp
                  </th>
                  <Th onClick={() => toggleSort('marketPrice')} active={sortKey === 'marketPrice'} dir={sortDir} right>
                    Giá TT
                  </Th>
                  <Th onClick={() => toggleSort('targetPrice')} active={sortKey === 'targetPrice'} dir={sortDir} right>
                    Giá MT
                  </Th>
                  <Th onClick={() => toggleSort('bonusWelfareRate')} active={sortKey === 'bonusWelfareRate'} dir={sortDir} right>
                    Trích quỹ KTPL
                  </Th>
                  <Th onClick={() => toggleSort('reportDate')} active={sortKey === 'reportDate'} dir={sortDir}>
                    Ngày báo cáo
                  </Th>
                  <Th onClick={() => toggleSort('upside')} active={sortKey === 'upside'} dir={sortDir} right>
                    Upside
                  </Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s, i) => {
                  const up = upsideOf(s)
                  const href = reportHref(s.ticker)
                  return (
                    <tr
                      key={s.ticker}
                      className={cn(
                        'relative border-b border-border/70 transition-colors hover:bg-accent/50',
                        i % 2 === 1 && 'bg-muted/40',
                      )}
                    >
                      <td className="px-3 py-2.5">
                        {/* Link chính ở cột Mã CK; stretched-link (::after) phủ toàn dòng để cả dòng click được */}
                        <Link
                          href={href}
                          className="inline-flex items-center gap-2 after:absolute after:inset-0"
                          aria-label={`${s.ticker} — mở báo cáo phân tích`}
                        >
                          <span className="font-mono text-sm font-bold text-foreground">{s.ticker}</span>
                          <span className="rounded bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">
                            {s.exchange}
                          </span>
                          {s.hasReport && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground"
                              title="Đã có báo cáo phân tích"
                            >
                              <FileText className="size-3" /> Báo cáo
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-2.5 text-foreground">{s.name}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {marketPriceOf(s) != null ? fmtPrice(marketPriceOf(s) as number) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {s.targetPrice != null ? fmtPrice(s.targetPrice) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {s.bonusWelfareRate != null ? fmtRate(s.bonusWelfareRate) : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-foreground">
                        {s.reportDate ? formatVnDate(s.reportDate) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {up != null ? (
                          <span
                            className={cn(
                              'inline-block rounded px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums',
                              up >= 100
                                ? 'bg-positive-muted text-positive'
                                : up >= 0
                                  ? 'text-positive'
                                  : 'text-negative',
                            )}
                          >
                            {fmtPct(up, 0)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                      Không có cổ phiếu nào thỏa mãn bộ lọc. Hãy nới lỏng tiêu chí.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Hiển thị{' '}
              <span className="font-mono text-foreground">
                {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{' '}
              trên <span className="font-mono text-foreground">{filtered.length}</span> mã
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={safePage === i + 1 ? 'default' : 'outline'}
                  size="icon-sm"
                  onClick={() => setPage(i + 1)}
                  className="font-mono"
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
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
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
  dir: SortDir
  right?: boolean
}) {
  return (
    <th className="px-3 py-2.5">
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors',
          right && 'ml-auto flex-row-reverse',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </button>
    </th>
  )
}

