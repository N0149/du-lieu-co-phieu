'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
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
type ChartType = 'bar' | 'line'
type RangeKey = '15d' | 'month' | 'quarter' | 'year'

const SEGMENT_OPTIONS: { key: Segment; label: string }[] = [
  { key: 'ALL', label: 'Tổng thể' },
  { key: 'DOMESTIC', label: 'Trong nước' },
  { key: 'FDI', label: 'FDI' },
  { key: 'COMPARE', label: 'So sánh' },
]

const CHART_OPTIONS: { key: ChartType; label: string }[] = [
  { key: 'bar', label: 'Dạng Cột' },
  { key: 'line', label: 'Dạng Đường' },
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
  sky: '#0ea5e9',
}

const KY_RANK: Record<string, number> = { KY_1: 0, KY_2: 1, THANG: 2, QUY: 3 }

type AggPoint = {
  key: string
  label: string // nhãn ngắn trên trục hoành
  fullLabel: string // nhãn đầy đủ trong tooltip
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

/**
 * Gộp chuỗi raw theo khung thời gian — TÁCH DỨT ĐIỂM 2 chu kỳ:
 *   - '15d'   : CHỈ các điểm Kỳ 1 / Kỳ 2 (không trộn "Tháng" vào trục).
 *   - 'month' : CHỈ các điểm THANG (cả tháng, không trộn kỳ 15 ngày).
 *   - 'quarter' / 'year' : gộp theo quý / năm từ các điểm THANG.
 */
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

  // Tháng / Quý / Năm → chỉ dùng kỳ THANG (số liệu cả tháng)
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

/** Tooltip chi tiết: các series đang hiển thị + % biến động so với kỳ liền trước. */
function ChartTooltip({
  active,
  payload,
  segment,
  chartType,
}: {
  active?: boolean
  payload?: { payload: AggPoint }[]
  segment: Segment
  chartType: ChartType
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload

  const series: { name: string; color: string; value: number }[] = []
  const isDom = segment === 'DOMESTIC'
  const isFdi = segment === 'FDI'
  if (segment === 'COMPARE') {
    series.push(
      { name: 'Cán cân tổng thể', color: COLORS.emerald, value: p.balance },
      { name: 'Cán cân FDI', color: COLORS.amber, value: p.balanceFdi },
      { name: 'Cán cân trong nước', color: COLORS.sky, value: p.balanceDomestic },
    )
  } else {
    series.push(
      { name: 'Xuất khẩu', color: COLORS.emerald, value: isDom ? p.exportDomestic : isFdi ? p.exportFdi : p.export },
      { name: 'Nhập khẩu', color: COLORS.rose, value: isDom ? p.importDomestic : isFdi ? p.importFdi : p.import },
      { name: 'Cán cân', color: COLORS.amber, value: isDom ? p.balanceDomestic : isFdi ? p.balanceFdi : p.balance },
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <span className="font-semibold text-foreground">{p.fullLabel ?? p.label}</span>
        {chartType === 'line' && segment !== 'COMPARE' && (
          <span className="text-muted-foreground">Trái: XK–NK · Phải: cán cân</span>
        )}
      </div>
      <div className="space-y-1">
        {series.map((s) => (
          <div key={s.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
            <span className={cn('font-medium tabular-nums', s.value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>
              {s.value < 0 ? '−' : '+'}
              {fmtUsd(Math.abs(s.value))}
            </span>
          </div>
        ))}
      </div>
      {(p.deltaExport != null || p.deltaImport != null) && (
        <div className="mt-2 border-t border-border pt-1.5">
          <div className="flex items-center justify-between gap-6 text-muted-foreground">
            <span>Xuất khẩu vs kỳ trước</span>
            <Delta value={p.deltaExport} />
          </div>
          <div className="flex items-center justify-between gap-6 text-muted-foreground">
            <span>Nhập khẩu vs kỳ trước</span>
            <Delta value={p.deltaImport} />
          </div>
        </div>
      )}
      {p.partial && (
        <div className="mt-1.5 text-[11px] italic text-muted-foreground">
          * Số liệu chưa đủ kỳ báo cáo.
        </div>
      )}
    </div>
  )
}

/** Lấy domain [min, max] cho trục cán cân (luôn chứa 0, có padding) từ dữ liệu. */
function balanceDomain(points: AggPoint[], isCompare: boolean): [number, number] {
  let min = 0
  let max = 0
  for (const p of points) {
    const vals = isCompare
      ? [p.balance, p.balanceFdi, p.balanceDomestic]
      : [p.balance]
    for (const v of vals) {
      if (v == null || Number.isNaN(v)) continue
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
  }
  const pad = (max - min) * 0.15 || 1
  return [min - pad, max + pad]
}

const controlCls =
  'inline-flex items-center rounded-lg border border-border bg-background px-3 h-8 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'

export function TradeBalanceChart({ data }: { data: TradeBalancePoint[] }) {
  const [segment, setSegment] = useState<Segment>('ALL')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [range, setRange] = useState<RangeKey>('15d')

  // Ở dạng cột, "So sánh" (nhiều series) không có ý nghĩa → hạ về Tổng thể.
  const effectiveSegment: Segment = chartType === 'bar' && segment === 'COMPARE' ? 'ALL' : segment
  const isCompare = effectiveSegment === 'COMPARE'

  const points = useMemo(() => aggregate(data, range), [data, range])

  const keys = {
    export: effectiveSegment === 'DOMESTIC' ? 'exportDomestic' : effectiveSegment === 'FDI' ? 'exportFdi' : 'export',
    import: effectiveSegment === 'DOMESTIC' ? 'importDomestic' : effectiveSegment === 'FDI' ? 'importFdi' : 'import',
    balance: effectiveSegment === 'DOMESTIC' ? 'balanceDomestic' : effectiveSegment === 'FDI' ? 'balanceFdi' : 'balance',
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      {/* ── Tiêu đề + điều khiển ───────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            Cán cân thương mại Xuất – Nhập khẩu
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Theo số liệu Tổng cục Hải quan · đơn vị trục: tỷ USD
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs khu vực */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {SEGMENT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSegment(opt.key)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  segment === opt.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  chartType === 'bar' && opt.key === 'COMPARE' && 'cursor-not-allowed opacity-40 hover:text-muted-foreground',
                )}
                disabled={chartType === 'bar' && opt.key === 'COMPARE'}
                title={chartType === 'bar' && opt.key === 'COMPARE' ? 'So sánh chỉ dùng ở Dạng Đường' : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Kiểu biểu đồ: Dạng Cột / Dạng Đường */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {CHART_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChartType(opt.key)}
                title={
                  opt.key === 'bar'
                    ? 'Cột đôi Xuất khẩu / Nhập khẩu + đường Cán cân'
                    : 'Đường Xuất khẩu / Nhập khẩu + vùng Cán cân âm dương'
                }
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  chartType === opt.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

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

      {/* ── Biểu đồ ────────────────────────────────────────────────────── */}
      {points.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Chưa có dữ liệu cán cân thương mại.
        </div>
      ) : chartType === 'bar' ? (
        <BarView points={points} keys={keys} tooltip={<ChartTooltip segment={effectiveSegment} chartType="bar" />} />
      ) : (
        <LineView points={points} keys={keys} isCompare={isCompare} tooltip={<ChartTooltip segment={effectiveSegment} chartType="line" />} />
      )}
    </section>
  )
}

/* ── Dạng Cột: cột đôi XK / NK (trục trái) + đường Cán cân (trục phải) ────── */
function BarView({
  points,
  keys,
  tooltip,
}: {
  points: AggPoint[]
  keys: { export: string; import: string; balance: string }
  tooltip: React.ReactElement
}) {
  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={6} />
          <YAxis yAxisId="left" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11 }} />
          <Tooltip content={tooltip} cursor={{ fill: 'currentColor', opacity: 0.06 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <ReferenceLine yAxisId="right" y={0} stroke="currentColor" strokeOpacity={0.45} />
          <Bar yAxisId="left" dataKey={keys.export} name="Xuất khẩu" fill={COLORS.emerald} radius={[3, 3, 0, 0]} barSize={26} />
          <Bar yAxisId="left" dataKey={keys.import} name="Nhập khẩu" fill={COLORS.rose} radius={[3, 3, 0, 0]} barSize={26} />
          <Line yAxisId="right" type="monotone" dataKey={keys.balance} name="Cán cân" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Dạng Đường: đường XK / NK (trục trái) + vùng Cán cân âm dương (trục phải) ── */
function LineView({
  points,
  keys,
  isCompare,
  tooltip,
}: {
  points: AggPoint[]
  keys: { export: string; import: string; balance: string }
  isCompare: boolean
  tooltip: React.ReactElement
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [plotH, setPlotH] = useState(280)
  const posFill = 'rgba(16, 185, 129, 0.28)'
  const negFill = 'rgba(244, 63, 94, 0.22)'

  // Đo chiều cao vùng vẽ = chiều cao container − marginTop (8px)
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => setPlotH(Math.max(60, el.clientHeight - 8))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const domain = useMemo(() => balanceDomain(points, isCompare), [points, isCompare])
  const [dmin, dmax] = domain
  // Vị trí pixel của trục 0 trong vùng vẽ (scale tuyến tính với domain tường minh)
  const zeroY = (plotH * (dmax - 0)) / (dmax - dmin)
  const posH = Math.max(0, Math.min(plotH, zeroY))
  const negH = Math.max(0, plotH - posH)

  return (
    <div ref={wrapperRef} className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <clipPath id="tb-bal-pos">
              <rect x={0} y={0} width="100%" height={posH} />
            </clipPath>
            <clipPath id="tb-bal-neg">
              <rect x={0} y={posH} width="100%" height={negH} />
            </clipPath>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={6} />
          <YAxis yAxisId="left" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={domain}
            padding={{ top: 0, bottom: 0 }}
            tickFormatter={fmtAxis}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={tooltip} cursor={{ stroke: 'currentColor', strokeDasharray: '3 3', opacity: 0.35 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <ReferenceLine yAxisId="right" y={0} stroke="currentColor" strokeOpacity={0.45} strokeDasharray="4 4" />

          {isCompare ? (
            <>
              {/* So sánh: 3 vùng cán cân của 3 khối (baseValue=0 → fill về đúng trục 0) */}
              <Area yAxisId="right" type="monotone" dataKey="balance" name="Tổng thể" stroke={COLORS.emerald} strokeWidth={2} fill="rgba(16,185,129,0.18)" baseValue={0} dot={false} />
              <Area yAxisId="right" type="monotone" dataKey="balanceFdi" name="FDI" stroke={COLORS.amber} strokeWidth={2} fill="rgba(245,158,11,0.16)" baseValue={0} dot={false} />
              <Area yAxisId="right" type="monotone" dataKey="balanceDomestic" name="Trong nước" stroke={COLORS.sky} strokeWidth={2} fill="rgba(14,165,233,0.16)" baseValue={0} dot={false} />
            </>
          ) : (
            <>
              {/* Vùng cán cân âm dương quanh trục 0 (baseValue=0 + clipPath cắt 2 nửa) */}
              <Area yAxisId="right" type="monotone" dataKey={keys.balance} stroke="none" fill={posFill} clipPath="url(#tb-bal-pos)" baseValue={0} dot={false} legendType="none" />
              <Area yAxisId="right" type="monotone" dataKey={keys.balance} stroke="none" fill={negFill} clipPath="url(#tb-bal-neg)" baseValue={0} dot={false} legendType="none" />
              <Line yAxisId="right" type="monotone" dataKey={keys.balance} name="Cán cân" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 2.5 }} />
              {/* Đường XK / NK trên trục trái */}
              <Line yAxisId="left" type="monotone" dataKey={keys.export} name="Xuất khẩu" stroke={COLORS.emerald} strokeWidth={2} dot={{ r: 2.5 }} />
              <Line yAxisId="left" type="monotone" dataKey={keys.import} name="Nhập khẩu" stroke={COLORS.rose} strokeWidth={2} dot={{ r: 2.5 }} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
