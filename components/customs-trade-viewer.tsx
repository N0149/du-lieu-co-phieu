'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Loader2, Inbox } from 'lucide-react'
import { fmtInt } from '@/lib/format'
import { cn } from '@/lib/utils'

type TradeRow = {
  period_type: string
  period_date: string // YYYY-MM-DD
  trade_type: string
  status: string
  dim_kind: string
  name: string
  unit: string | null
  quantity: number | null
  value_usd: number | null
  quantity_acc: number | null
  value_acc: number | null
  code: string | null
  category: string | null
  dataset_category?: string
}

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

function fmtPeriod(r: TradeRow): string {
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

/** View giữ liệu thống kê XNK — fetch /api/customs-trade, lọc theo loại/kỳ/tìm kiếm. */
export function CustomsTradeViewer() {
  const [rows, setRows] = useState<TradeRow[] | null>(null)
  const [tradeType, setTradeType] = useState<'ALL' | 'EXPORT' | 'IMPORT'>('ALL')
  const [category, setCategory] = useState('ALL')
  const [period, setPeriod] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    fetch('/api/customs-trade')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rows?: TradeRow[] } | TradeRow[] | null) => {
        if (cancelled) return
        // Format mới: snapshot là object { generated_at, rows, trade_balance };
        // fallback cho format cũ (mảng trực tiếp).
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

  // Phân trang — reset về trang 1 khi đổi bộ lọc
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

  return (
    <div className="space-y-4">
      {/* ── Bộ lọc ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mặt hàng…"
            className="h-9 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select value={tradeType} onChange={(e) => setTradeType(e.target.value as typeof tradeType)} className={selectCls}>
          <option value="ALL">Tất cả loại</option>
          <option value="EXPORT">Xuất khẩu</option>
          <option value="IMPORT">Nhập khẩu</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          <option value="ALL">Tất cả phân loại</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls}>
          <option value="ALL">Tất cả kỳ</option>
          {periodOptions.map((p) => {
            const [ym, ty] = p.split('|')
            const [y, m] = ym.split('-')
            return (
              <option key={p} value={p}>
                {PERIOD_LABEL[ty] ?? ty} {m}/{y}
              </option>
            )
          })}
        </select>
      </div>

      {/* ── Tổng quan ──────────────────────────────────────────────────── */}
      {rows && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Dòng dữ liệu" value={fmtInt(totals.count)} />
          <SummaryCard label="Tổng Xuất khẩu (USD)" value={fmtInt(totals.xk)} tone="positive" />
          <SummaryCard label="Tổng Nhập khẩu (USD)" value={fmtInt(totals.nk)} tone="negative" />
        </div>
      )}

      {/* ── Bảng dữ liệu ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Th>Kỳ báo cáo</Th>
                <Th>Loại</Th>
                <Th>Mặt hàng</Th>
                <Th>ĐVT</Th>
                <Th right>Lượng</Th>
                <Th right>Trị giá (USD)</Th>
                <Th right>Lũy kế Lượng</Th>
                <Th right>Lũy kế Trị giá (USD)</Th>
              </tr>
            </thead>
            <tbody>
              {!rows && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                    <span className="mt-2 inline-block">Đang tải dữ liệu thống kê...</span>
                  </td>
                </tr>
              )}
              {rows && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    <Inbox className="mx-auto size-6" />
                    <span className="mt-2 inline-block">Không có dữ liệu khớp bộ lọc.</span>
                  </td>
                </tr>
              )}
              {rows &&
                visible.map((r, i) => (
                  <tr
                    key={`${r.period_date}-${r.trade_type}-${r.name}-${i}`}
                    className={cn(
                      'border-b border-border/70 transition-colors hover:bg-accent/50',
                      i % 2 === 1 && 'bg-muted/40',
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-foreground">
                      {fmtPeriod(r)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold',
                          r.trade_type === 'EXPORT'
                            ? 'bg-positive-muted text-positive'
                            : 'bg-secondary text-foreground',
                        )}
                      >
                        {r.trade_type === 'EXPORT' ? 'XK' : 'NK'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{r.name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.unit ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                      {fmtNum(r.quantity)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                      {fmtNum(r.value_usd)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                      {fmtNum(r.quantity_acc)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                      {fmtNum(r.value_acc)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Phân trang ─────────────────────────────────────────────────── */}
      {rows && filtered.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} trên {fmtInt(filtered.length)} dòng
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={cn(
                'rounded-md border border-border px-2.5 py-1 font-medium transition-colors hover:text-foreground',
                safePage === 1 && 'cursor-not-allowed opacity-40',
              )}
            >
              ← Trước
            </button>
            <span className="font-medium text-foreground">
              Trang {safePage}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage === pageCount}
              className={cn(
                'rounded-md border border-border px-2.5 py-1 font-medium transition-colors hover:text-foreground',
                safePage === pageCount && 'cursor-not-allowed opacity-40',
              )}
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode
  right?: boolean
}) {
  return (
    <th className={cn('px-3 py-2.5', right ? 'text-right' : 'text-left')}>{children}</th>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-2xl font-bold tabular-nums text-foreground',
          tone === 'positive' && 'text-positive',
          tone === 'negative' && 'text-negative',
        )}
      >
        {value}
      </p>
    </div>
  )
}
