'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Loader2, Inbox, LayoutGrid, ListFilter, Sparkles, Building2 } from 'lucide-react'
import { fmtInt } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CustomsCommodityMatrix, type CustomsTradeRow } from './customs-commodity-matrix'
import { TierAStocksViewer } from './tier-a-stocks-viewer'
import type { TradeBalancePoint } from './TradeBalanceChart'

const PERIOD_LABEL: Record<string, string> = {
  THANG: 'Tháng',
  KY_1: 'Kỳ 1',
  KY_2: 'Kỳ 2',
  QUY: 'Quý',
}

const CATEGORY_LABEL: Record<string, string> = {
  main: 'Tổng thể (mặt hàng)',
  fdi: 'Khối FDI',
  province: 'Theo Tỉnh/Thành',
  transport: 'Phương thức vận tải',
  matrix: 'Chi tiết (MH×TT)',
}

const PAGE_SIZE = 50

function fmtPeriod(r: CustomsTradeRow): string {
  const [y, m] = r.period_date.split('-')
  if (r.period_type === 'QUY') {
    const q = Math.floor((Number(m) - 1) / 3) + 1
    return `Quý ${q}/${y}`
  }
  return `${PERIOD_LABEL[r.period_type] ?? r.period_type} ${m}/${y}`
}

function fmtNum(v: number | null): string {
  return v == null ? '—' : fmtInt(v)
}

/** View giữ liệu thống kê XNK — fetch /api/customs-trade, hỗ trợ Ma trận so sánh, 57 mã Tier A & Danh sách chi tiết. */
export function CustomsTradeViewer({
  tradeBalanceData = [],
  defaultViewMode = 'matrix',
  initialTicker = null,
}: {
  tradeBalanceData?: TradeBalancePoint[]
  defaultViewMode?: 'matrix' | 'tier_a' | 'list'
  initialTicker?: string | null
}) {
  const [rows, setRows] = useState<CustomsTradeRow[] | null>(null)
  const [viewMode, setViewMode] = useState<'matrix' | 'tier_a' | 'list'>(defaultViewMode)
  const [selectedCommodityFilter, setSelectedCommodityFilter] = useState<string | null>(null)

  // State cho chế độ Flat List
  const [tradeType, setTradeType] = useState<'ALL' | 'EXPORT' | 'IMPORT'>('ALL')
  const [category, setCategory] = useState('ALL')
  const [period, setPeriod] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    fetch('/api/customs-trade')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rows?: CustomsTradeRow[] } | CustomsTradeRow[] | null) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.rows ?? []
        setRows(list)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const periodOptions = useMemo(() => {
    if (!rows) return [] as string[]
    const keys = Array.from(new Set(rows.map((r) => `${r.period_date.slice(0, 7)}|${r.period_type}`)))
    return keys.sort()
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (tradeType !== 'ALL' && r.trade_type !== tradeType) return false
      if (category !== 'ALL' && (r.dataset_category ?? 'main') !== category) return false
      if (period !== 'ALL' && `${r.period_date.slice(0, 7)}|${r.period_type}` !== period) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, tradeType, category, period, search])

  useEffect(() => {
    setPage(1)
  }, [rows, tradeType, category, period, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  const totals = useMemo(() => {
    let xk = 0
    let nk = 0
    for (const r of filtered) {
      if (!r.value_usd) continue
      if (r.trade_type === 'EXPORT') xk += r.value_usd
      else nk += r.value_usd
    }
    return { xk, nk, count: filtered.length }
  }, [filtered])

  const selectCls =
    'h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40'

  const handleSelectCommodityFromTierA = (commodityName: string) => {
    setSelectedCommodityFilter(commodityName)
    setViewMode('matrix')
  }

  if (!rows) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin text-primary" />
        <span>Đang tải dữ liệu thống kê xuất nhập khẩu…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── CHUYỂN ĐỔI CHẾ ĐỘ XEM (VIEW MODE SWITCHER) ──────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'matrix'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="size-3.5" />
            <span>Ma trận XNK (TCHQ)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('tier_a')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'tier_a'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Building2 className="size-3.5" />
            <span>57 Mã Niêm Yết Theo Ngành XNK (Tier A)</span>
            <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary dark:bg-white/20 dark:text-white">
              57+
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListFilter className="size-3.5" />
            <span>Bảng dữ liệu chi tiết (Flat List)</span>
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Nguồn số liệu: Tổng cục Hải quan Việt Nam · Đối chiếu 2 đường độc lập
        </span>
      </div>

      {/* ── CHẾ ĐỘ 1: MA TRẬN THEO THÁNG & BIỂU ĐỒ SO SÁNH (MẶC ĐỊNH) ────────── */}
      {viewMode === 'matrix' && (
        <CustomsCommodityMatrix
          rows={rows}
          tradeBalanceData={tradeBalanceData}
          initialSearch={selectedCommodityFilter ?? undefined}
          onSwitchToTierA={() => setViewMode('tier_a')}
        />
      )}

      {/* ── CHẾ ĐỘ 2: 57 MÃ NIÊM YẾT THEO NGÀNH XNK (TIER A) ─────────────────── */}
      {viewMode === 'tier_a' && (
        <TierAStocksViewer
          onSelectCommodity={handleSelectCommodityFromTierA}
          initialTicker={initialTicker}
        />
      )}

      {/* ── CHẾ ĐỘ 3: BẢNG DỮ LIỆU CHI TIẾT (FLAT LIST) ───────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Bộ lọc */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:gap-3">
            <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mặt hàng…"
                className="h-9 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value as typeof tradeType)}
              className={selectCls}
            >
              <option value="ALL">Tất cả loại</option>
              <option value="EXPORT">Xuất khẩu</option>
              <option value="IMPORT">Nhập khẩu</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectCls}
            >
              <option value="ALL">Tất cả phân loại</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={selectCls}
            >
              <option value="ALL">Tất cả kỳ</option>
              {periodOptions.map((p) => {
                const [ym, pt] = p.split('|')
                const [y, m] = ym.split('-')
                const lbl = `${PERIOD_LABEL[pt] ?? pt} ${m}/${y}`
                return (
                  <option key={p} value={p}>
                    {lbl}
                  </option>
                )
              })}
            </select>
          </div>

          {/* KPI tóm tắt */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-xs text-muted-foreground">Tổng XK (bộ lọc)</div>
              <div className="mt-1 font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400">
                ${fmtNum(totals.xk)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-xs text-muted-foreground">Tổng NK (bộ lọc)</div>
              <div className="mt-1 font-mono text-base font-semibold text-blue-600 dark:text-blue-400">
                ${fmtNum(totals.nk)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-xs text-muted-foreground">Số dòng dữ liệu</div>
              <div className="mt-1 font-mono text-base font-semibold text-foreground">
                {fmtInt(totals.count)} dòng
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu Flat List */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Kỳ báo cáo</th>
                    <th className="px-3 py-2.5">Loại</th>
                    <th className="px-3 py-2.5">Tên chỉ tiêu / Mặt hàng</th>
                    <th className="px-3 py-2.5 text-center">ĐVT</th>
                    <th className="px-3 py-2.5 text-right">Lượng kỳ</th>
                    <th className="px-3 py-2.5 text-right">Trị giá kỳ (USD)</th>
                    <th className="px-3 py-2.5 text-right">Trị giá LK (USD)</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        <Inbox className="mx-auto mb-2 size-6 text-muted-foreground/60" />
                        Không có dữ liệu phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    visible.map((r, i) => {
                      const isXk = r.trade_type === 'EXPORT'
                      return (
                        <tr
                          key={`${r.period_date}-${r.period_type}-${r.trade_type}-${r.name}-${i}`}
                          className="hover:bg-muted/40"
                        >
                          <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">
                            {fmtPeriod(r)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                isXk
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                              )}
                            >
                              {isXk ? 'Xuất khẩu' : 'Nhập khẩu'}
                            </span>
                          </td>
                          <td className="max-w-[260px] truncate px-3 py-2 font-medium text-foreground">
                            {r.name}
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {r.unit ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-foreground">
                            {fmtNum(r.quantity)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-foreground">
                            {fmtNum(r.value_usd)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {fmtNum(r.value_acc)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px]',
                                r.status === 'CHINH_THUC'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                              )}
                            >
                              {r.status === 'CHINH_THUC' ? 'Chính thức' : 'Sơ bộ'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Trang {safePage} / {pageCount} ({fmtInt(filtered.length)} dòng)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-border px-2 py-1 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="rounded border border-border px-2 py-1 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
