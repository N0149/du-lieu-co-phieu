'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import type { ScreenerStockItem } from '@/lib/screener-data-service'
import { cn } from '@/lib/utils'
import {
  CRITERIA_MAP,
  type ActiveCondition,
  type ScreenerCriterion,
} from './screener-constants'

interface ScreenerResultsTableProps {
  stocks: ScreenerStockItem[]
  conditions?: ActiveCondition[]
}

const PAGE_SIZE = 25

// Định dạng giá trị hiển thị theo từng loại chỉ tiêu
function formatCriterionValue(
  val: number | null | undefined,
  criterion: ScreenerCriterion,
): string {
  if (val == null || isNaN(val)) return '—'

  if (criterion.id === 'pb') {
    return val.toFixed(2)
  }
  if (criterion.unit === '%') {
    const isGrowth =
      criterion.id.includes('Growth') ||
      criterion.id.includes('change') ||
      criterion.id.includes('upside')
    const prefix = isGrowth && val > 0 ? '+' : ''
    return `${prefix}${val.toFixed(1)}%`
  }
  if (criterion.unit === 'VND') {
    return Math.round(val).toLocaleString('vi-VN')
  }
  if (criterion.unit === 'Tỷ VND' || criterion.unit === 'Tỷ') {
    return val.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
  }
  if (criterion.unit === 'Lần') {
    return val.toFixed(1)
  }
  if (criterion.unit === 'Điểm') {
    return val.toFixed(1)
  }
  if (criterion.unit === 'Cổ phiếu') {
    return Math.round(val).toLocaleString('vi-VN')
  }
  return val.toFixed(1)
}

// Màu sắc nhấn mạnh cho dữ liệu
function getCriterionColor(
  val: number | null | undefined,
  criterion: ScreenerCriterion,
): string {
  if (val == null || isNaN(val)) return 'text-muted-foreground'

  if (
    criterion.id.includes('Growth') ||
    criterion.id.includes('change') ||
    criterion.id.includes('upside')
  ) {
    if (val > 0) return 'text-positive font-semibold'
    if (val < 0) return 'text-negative font-semibold'
    return 'text-muted-foreground'
  }

  if (criterion.id === 'score360') {
    if (val >= 8.0) return 'text-emerald-400 font-bold'
    if (val >= 6.5) return 'text-amber-400 font-bold'
    return 'text-foreground font-mono'
  }

  if (criterion.unit === '%') {
    if (val > 15) return 'text-emerald-400 font-semibold'
    if (val < 0) return 'text-negative font-semibold'
    return 'text-foreground font-mono'
  }

  return 'text-foreground font-mono'
}

export function ScreenerResultsTable({
  stocks,
  conditions,
}: ScreenerResultsTableProps) {
  const [sortCriterionId, setSortCriterionId] = useState<string>('ticker')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [copied, setCopied] = useState(false)

  // Lấy danh sách các tiêu chí lọc đang được chọn ở khung trên
  const activeCriteria = useMemo(() => {
    if (!conditions || conditions.length === 0) {
      // Khi chưa có điều kiện lọc nào, mặc định hiển thị 4 tiêu chí cốt lõi
      const defaultIds = ['marketCap', 'pe', 'pb', 'roe']
      return defaultIds
        .map((id) => CRITERIA_MAP.get(id))
        .filter((c): c is ScreenerCriterion => !!c)
    }

    const seen = new Set<string>()
    const result: ScreenerCriterion[] = []
    for (const cond of conditions) {
      if (!seen.has(cond.criterionId)) {
        seen.add(cond.criterionId)
        const meta = CRITERIA_MAP.get(cond.criterionId)
        if (meta) result.push(meta)
      }
    }
    return result
  }, [conditions])

  // Sắp xếp dữ liệu theo Mã CK hoặc theo từng tiêu chí lọc
  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      if (sortCriterionId === 'ticker') {
        return sortOrder === 'asc'
          ? a.ticker.localeCompare(b.ticker)
          : b.ticker.localeCompare(a.ticker)
      }

      const meta = CRITERIA_MAP.get(sortCriterionId)
      const av = meta ? meta.getter(a) : (a as any)[sortCriterionId]
      const bv = meta ? meta.getter(b) : (b as any)[sortCriterionId]

      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1

      return sortOrder === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number)
    })
  }, [stocks, sortCriterionId, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedStocks.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = sortedStocks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const handleSort = (criterionId: string) => {
    if (sortCriterionId === criterionId) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCriterionId(criterionId)
      // Mặc định tăng dần cho P/E, P/B; giảm dần cho các chỉ số sinh lời & quy mô
      const defaultAsc = ['pe', 'pb', 'debtToEquity', 'ticker'].includes(
        criterionId,
      )
      setSortOrder(defaultAsc ? 'asc' : 'desc')
    }
    setCurrentPage(1)
  }

  // Sao chép danh sách mã cổ phiếu
  const handleCopyTickers = () => {
    const text = sortedStocks.map((s) => s.ticker).join(', ')
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Xuất file CSV đồng bộ đúng các cột tiêu chí đang lọc
  const handleExportCsv = () => {
    if (sortedStocks.length === 0) return
    const headers = [
      'Mã CK',
      ...activeCriteria.map(
        (c) => `"${c.label}${c.unit ? ` (${c.unit})` : ''}"`,
      ),
    ]

    const rows = sortedStocks.map((s) => [
      s.ticker,
      ...activeCriteria.map((c) => {
        const val = c.getter(s)
        return val != null ? val : ''
      }),
    ])

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bo_loc_co_phieu_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const renderSortIcon = (criterionId: string) => {
    if (sortCriterionId !== criterionId) {
      return (
        <ArrowUpDown className="size-3 text-muted-foreground/40 ml-1.5 inline" />
      )
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="size-3 text-primary ml-1.5 inline" />
    ) : (
      <ArrowDown className="size-3 text-primary ml-1.5 inline" />
    )
  }

  const hasCustomConditions = conditions && conditions.length > 0

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-[#161a23] shadow-md text-foreground overflow-hidden">
      {/* Thanh tiêu đề kết quả & Nút hành động */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#121620] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Kết quả lọc:{' '}
            <span className="text-primary font-bold">
              {sortedStocks.length.toLocaleString('vi-VN')}
            </span>{' '}
            mã
          </span>
          <span className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <SlidersHorizontal className="size-3.5 text-primary" />
            <span>
              {hasCustomConditions
                ? `Hiển thị ${activeCriteria.length} tiêu chí đang lọc`
                : 'Mặc định (4 chỉ số chính)'}
            </span>
          </div>
        </div>

        {/* Nút Xuất CSV & Sao chép mã */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyTickers}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#1f2430] px-3 font-medium text-foreground transition-colors hover:bg-white/10"
          >
            {copied ? (
              <Check className="size-3.5 text-positive" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground" />
            )}
            <span>{copied ? 'Đã sao chép' : 'Sao chép mã'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#1f2430] px-3 font-medium text-foreground transition-colors hover:bg-white/10"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Bảng Dữ Liệu Rút Gọn Tinh Gọn: Chỉ Mã CK và Các Tiêu Chí Lọc */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#1a1f2c] text-muted-foreground font-semibold">
              {/* Cột Mã CK (Cố định bên trái) */}
              <th
                onClick={() => handleSort('ticker')}
                className="sticky left-0 z-20 bg-[#1a1f2c] cursor-pointer px-4 py-3 hover:text-foreground whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.3)] w-[120px]"
              >
                Mã CK {renderSortIcon('ticker')}
              </th>

              {/* Các cột tiêu chí lọc đã chọn */}
              {activeCriteria.map((c) => (
                <th
                  key={c.id}
                  onClick={() => handleSort(c.id)}
                  className="cursor-pointer px-4 py-3 text-right hover:text-foreground whitespace-nowrap"
                >
                  <span>{c.label}</span>
                  {renderSortIcon(c.id)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={activeCriteria.length + 1}
                  className="p-8 text-center text-muted-foreground"
                >
                  Không có mã cổ phiếu nào thỏa mãn các điều kiện lọc.
                </td>
              </tr>
            ) : (
              pageRows.map((s) => {
                const stockHref = `/stock/${encodeURIComponent(s.ticker)}`
                return (
                  <tr
                    key={s.ticker}
                    className="group transition-colors hover:bg-white/[0.03]"
                  >
                    {/* Mã CK */}
                    <td className="sticky left-0 z-10 bg-[#161a23] group-hover:bg-[#1d222e] px-4 py-2.5 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                      <Link
                        href={stockHref}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <span className="text-sm font-extrabold">{s.ticker}</span>
                        {s.isVN30 && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                            VN30
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Dữ liệu từng tiêu chí lọc */}
                    {activeCriteria.map((c) => {
                      const val = c.getter(s)
                      return (
                        <td
                          key={c.id}
                          className={cn(
                            'px-4 py-2.5 text-right whitespace-nowrap',
                            getCriterionColor(val, c),
                          )}
                        >
                          {formatCriterionValue(val, c)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang (Pagination) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#121620] px-4 py-2.5 text-xs text-muted-foreground">
        <div>
          Hiển thị {(safePage - 1) * PAGE_SIZE + 1} -{' '}
          {Math.min(safePage * PAGE_SIZE, sortedStocks.length)} trên tổng số{' '}
          <span className="font-bold text-foreground">
            {sortedStocks.length.toLocaleString('vi-VN')}
          </span>{' '}
          mã
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#1c212c] transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          <span className="px-2 font-mono text-xs text-foreground">
            {safePage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#1c212c] transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
