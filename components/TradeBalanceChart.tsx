'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtInt } from '@/lib/format'

/** Một điểm trong chuỗi Cán cân thương mại theo kỳ (khớp scripts/customs_etl/analysis.py). */
export type TradeBalancePoint = {
  period_type: 'KY_1' | 'KY_2' | 'THANG' | 'QUY'
  period_date: string // ISO YYYY-MM-DD (ngày đầu kỳ)
  label: string
  export: number // USD
  import: number // USD
  balance: number // USD
  export_fdi: number
  import_fdi: number
  balance_fdi: number
  export_domestic: number
  import_domestic: number
  balance_domestic: number
}

type Segment = 'ALL' | 'DOMESTIC' | 'FDI' | 'COMPARE'
type RangeKey = '15d' | 'month' | 'quarter' | 'year'

const SEGMENT_OPTIONS: { key: Segment; label: string }[] = [
  { key: 'ALL', label: 'Tổng thể' },
  { key: 'DOMESTIC', label: 'Trong nước' },
  { key: 'FDI', label: 'FDI' },
  { key: 'COMPARE', label: 'So sánh 3 khối' },
]

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '15d', label: 'Kỳ 15 ngày' },
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
]

const COLORS = {
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#3b82f6',
}

const KY_RANK: Record<string, number> = { KY_1: 0, KY_2: 1, THANG: 2, QUY: 3 }

type AggPoint = {
  key: string
  label: string
  fullLabel: string
  periodType: string
  export: number
  import: number
  balance: number
  exportFdi: number
  importFdi: number
  balanceFdi: number
  exportDomestic: number
  importDomestic: number
  balanceDomestic: number
  partial: boolean
  deltaExport?: number
  deltaImport?: number
}

function pct(cur: number, prev: number): number | undefined {
  if (!prev) return undefined
  return ((cur - prev) / Math.abs(prev)) * 100
}

function toAgg(p: TradeBalancePoint, label: string, fullLabel: string, prev?: AggPoint): AggPoint {
  return {
    key: `${p.period_date}|${p.period_type}`,
    label,
    fullLabel,
    periodType: p.period_type,
    export: p.export,
    import: p.import,
    balance: p.balance,
    exportFdi: p.export_fdi,
    importFdi: p.import_fdi,
    balanceFdi: p.balance_fdi,
    exportDomestic: p.export_domestic,
    importDomestic: p.import_domestic,
    balanceDomestic: p.balance_domestic,
    partial: false,
    deltaExport: prev ? pct(p.export, prev.export) : undefined,
    deltaImport: prev ? pct(p.import, prev.import) : undefined,
  }
}

function aggregate(data: TradeBalancePoint[], range: RangeKey): AggPoint[] {
  if (!data.length) return []
  const sorted = [...data].sort((a, b) => {
    const d = a.period_date.localeCompare(b.period_date)
    return d !== 0 ? d : (KY_RANK[a.period_type] ?? 9) - (KY_RANK[b.period_type] ?? 9)
  })

  if (range === '15d') {
    const ky = sorted.filter((p) => p.period_type === 'KY_1' || p.period_type === 'KY_2')
    const out: AggPoint[] = []
    for (let i = 0; i < ky.length; i++) {
      out.push(toAgg(ky[i], ky[i].label, ky[i].label, i > 0 ? out[i - 1] : undefined))
    }
    return out
  }

  const thang = sorted.filter((p) => p.period_type === 'THANG')
  const bucketOf = (p: TradeBalancePoint): string => {
    const month = Number(p.period_date.slice(5, 7))
    if (range === 'month') return p.period_date.slice(0, 7)
    if (range === 'quarter') return `${p.period_date.slice(0, 4)}-Q${Math.floor((month - 1) / 3) + 1}`
    return p.period_date.slice(0, 4)
  }
  const labelOf = (key: string): { short: string; full: string } => {
    if (range === 'month') {
      const [y, m] = key.split('-')
      return { short: `${m}/${y}`, full: `Tháng ${m}/${y}` }
    }
    if (range === 'quarter') {
      const [y, q] = key.split('-Q')
      return { short: `Q${q}/${y}`, full: `Quý ${q}/${y}` }
    }
    return { short: key, full: `Năm ${key}` }
  }

  const buckets = new Map<string, TradeBalancePoint[]>()
  for (const p of thang) {
    const k = bucketOf(p)
    const list = buckets.get(k) ?? []
    list.push(p)
    buckets.set(k, list)
  }

  const keys = [...buckets.keys()].sort()
  const out: AggPoint[] = []
  for (let i = 0; i < keys.length; i++) {
    const list = buckets.get(keys[i])!
    const sum = (f: (p: TradeBalancePoint) => number) => list.reduce((a, p) => a + (f(p) || 0), 0)
    const prev = out[i - 1]
    const export_ = sum((p) => p.export)
    const import_ = sum((p) => p.import)
    const { short, full } = labelOf(keys[i])
    out.push({
      key: keys[i],
      label: short,
      fullLabel: full,
      periodType: 'THANG',
      export: export_,
      import: import_,
      balance: sum((p) => p.balance),
      exportFdi: sum((p) => p.export_fdi),
      importFdi: sum((p) => p.import_fdi),
      balanceFdi: sum((p) => p.balance_fdi),
      exportDomestic: sum((p) => p.export_domestic),
      importDomestic: sum((p) => p.import_domestic),
      balanceDomestic: sum((p) => p.balance_domestic),
      partial: false,
      deltaExport: prev ? pct(export_, prev.export) : undefined,
      deltaImport: prev ? pct(import_, prev.import) : undefined,
    })
  }
  return out
}

function fmtUsd(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)} tỷ USD`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)} triệu USD`
  return fmtInt(v)
}

function fmtAxis(v: number): string {
  return `${(v / 1e9).toFixed(1)}`
}

function Delta({ value }: { value?: number }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-0.5', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
      <Icon className="size-3" />
      {up ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  )
}

function ChartTooltip({
  active,
  payload,
  segment,
  is15d,
}: {
  active?: boolean
  payload?: { payload: AggPoint }[]
  segment: Segment
  is15d: boolean
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload

  const series: { name: string; color: string; value: number }[] = []
  const isDom = segment === 'DOMESTIC'
  const isFdi = segment === 'FDI'

  if (!is15d && segment === 'COMPARE') {
    series.push(
      { name: 'Cán cân tổng thể', color: COLORS.emerald, value: p.balance },
      { name: 'Cán cân FDI', color: COLORS.amber, value: p.balanceFdi },
      { name: 'Cán cân trong nước', color: COLORS.sky, value: p.balanceDomestic },
    )
  } else {
    const expVal = !is15d && isDom ? p.exportDomestic : !is15d && isFdi ? p.exportFdi : p.export
    const impVal = !is15d && isDom ? p.importDomestic : !is15d && isFdi ? p.importFdi : p.import
    const balVal = !is15d && isDom ? p.balanceDomestic : !is15d && isFdi ? p.balanceFdi : p.balance

    series.push(
      { name: 'Xuất khẩu', color: COLORS.emerald, value: expVal },
      { name: 'Nhập khẩu', color: COLORS.rose, value: impVal },
      {
        name: balVal >= 0 ? 'Xuất siêu' : 'Nhập siêu',
        color: COLORS.amber,
        value: balVal,
      },
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#212631]/95 px-3.5 py-3 text-xs shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <span className="font-bold text-[#F0F3F6]">{p.fullLabel ?? p.label}</span>
      </div>
      <div className="space-y-1.5">
        {series.map((s) => (
          <div key={s.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-[#9EACB9]">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
            <span className={cn('font-medium tabular-nums', s.value < 0 ? 'text-rose-400' : 'text-[#F0F3F6]')}>
              {s.value < 0 ? '−' : '+'}
              {fmtUsd(Math.abs(s.value))}
            </span>
          </div>
        ))}
      </div>
      {(p.deltaExport != null || p.deltaImport != null) && (
        <div className="mt-2 border-t border-white/8 pt-1.5">
          <div className="flex items-center justify-between gap-6 text-[#9EACB9]">
            <span>Xuất khẩu vs kỳ trước</span>
            <Delta value={p.deltaExport} />
          </div>
          <div className="flex items-center justify-between gap-6 text-[#9EACB9]">
            <span>Nhập khẩu vs kỳ trước</span>
            <Delta value={p.deltaImport} />
          </div>
        </div>
      )}
    </div>
  )
}

const controlCls =
  'inline-flex items-center rounded-lg border border-white/10 bg-[#1A1D26] px-3 h-8 text-xs font-medium text-[#9EACB9] transition-colors hover:text-[#F0F3F6]'

export function TradeBalanceChart({ data }: { data: TradeBalancePoint[] }) {
  const [segment, setSegment] = useState<Segment>('ALL')
  const [range, setRange] = useState<RangeKey>('15d')

  // Ở kỳ 15 ngày, chỉ có số liệu tổng thể (không chia FDI / Trong nước)
  const is15d = range === '15d'
  const effectiveSegment: Segment = is15d ? 'ALL' : segment
  const isCompare = !is15d && effectiveSegment === 'COMPARE'

  const points = useMemo(() => aggregate(data, range), [data, range])

  const keys = {
    export: !is15d && effectiveSegment === 'DOMESTIC' ? 'exportDomestic' : !is15d && effectiveSegment === 'FDI' ? 'exportFdi' : 'export',
    import: !is15d && effectiveSegment === 'DOMESTIC' ? 'importDomestic' : !is15d && effectiveSegment === 'FDI' ? 'importFdi' : 'import',
    balance: !is15d && effectiveSegment === 'DOMESTIC' ? 'balanceDomestic' : !is15d && effectiveSegment === 'FDI' ? 'balanceFdi' : 'balance',
  }

  return (
    <div className="rounded-xl border border-white/8 bg-[#212631] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-4">
      {/* ── Tiêu đề + điều khiển ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-white/8 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#F0F3F6] sm:text-lg tracking-tight">
            {is15d
              ? 'Thống kê Xuất – Nhập siêu theo kỳ 15 ngày'
              : 'Cán cân thương mại Xuất – Nhập khẩu'}
          </h2>
          <p className="mt-0.5 text-xs text-[#9EACB9]">
            {is15d
              ? 'Số liệu thống kê Hải quan theo kỳ 15 ngày (Xuất khẩu, Nhập khẩu & Cán cân Xuất/Nhập siêu) · đơn vị: tỷ USD'
              : 'Theo số liệu Tổng cục Hải quan · đơn vị trục: tỷ USD'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs khu vực (Chỉ hiển thị khi không phải kỳ 15 ngày) */}
          {!is15d && (
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1D26] p-1 text-xs">
              {SEGMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSegment(opt.key)}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-medium transition-colors',
                    effectiveSegment === opt.key ? 'bg-white/15 text-[#F0F3F6] shadow-xs font-semibold' : 'text-[#9EACB9] hover:text-[#F0F3F6]',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Khung thời gian */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className={cn(controlCls, 'cursor-pointer')}
            aria-label="Khung thời gian"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Biểu đồ dạng Cột sạch sẽ ──────────────────────────────────── */}
      {points.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Chưa có dữ liệu cán cân thương mại.
        </div>
      ) : (
        <div className="h-64 w-full sm:h-76">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={6} />
              <YAxis yAxisId="left" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip segment={effectiveSegment} is15d={is15d} />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <ReferenceLine yAxisId="right" y={0} stroke="currentColor" strokeOpacity={0.35} />

              {isCompare ? (
                <>
                  <Bar yAxisId="right" dataKey="balance" name="Cán cân Tổng thể" fill={COLORS.emerald} radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar yAxisId="right" dataKey="balanceFdi" name="Cán cân FDI" fill={COLORS.amber} radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar yAxisId="right" dataKey="balanceDomestic" name="Cán cân Trong nước" fill={COLORS.sky} radius={[3, 3, 0, 0]} maxBarSize={30} />
                </>
              ) : (
                <>
                  <Bar yAxisId="left" dataKey={keys.export} name="Xuất khẩu" fill={COLORS.emerald} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar yAxisId="left" dataKey={keys.import} name="Nhập khẩu" fill={COLORS.rose} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={keys.balance}
                    name={is15d ? 'Xuất / Nhập siêu' : 'Cán cân'}
                    stroke={COLORS.amber}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
