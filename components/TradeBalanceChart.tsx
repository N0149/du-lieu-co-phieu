'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  BarChart2,
  Calendar,
} from 'lucide-react'
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
type TimeHorizon = '1y' | '2y' | '3y' | '5y' | 'all'

const SEGMENT_OPTIONS: { key: Segment; label: string }[] = [
  { key: 'ALL', label: 'Tổng thể' },
  { key: 'DOMESTIC', label: 'Trong nước' },
  { key: 'FDI', label: 'Khối FDI' },
  { key: 'COMPARE', label: 'So sánh 3 khối' },
]

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '15d', label: 'Kỳ 15 ngày' },
  { key: 'month', label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'year', label: 'Năm' },
]

const HORIZON_OPTIONS: { key: TimeHorizon; label: string }[] = [
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: 'all', label: 'Tất cả' },
]

const COLORS = {
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#38bdf8',
  indigo: '#6366f1',
  orange: '#fb923c',
}

const KY_RANK: Record<string, number> = { KY_1: 0, KY_2: 1, THANG: 2, QUY: 3 }

type AggPoint = {
  key: string
  label: string
  fullLabel: string
  periodType: string
  export: number
  import: number
  total: number
  balance: number
  exportFdi: number
  importFdi: number
  totalFdi: number
  balanceFdi: number
  exportDomestic: number
  importDomestic: number
  totalDomestic: number
  balanceDomestic: number
  partial: boolean
  deltaExport?: number
  deltaImport?: number
  deltaTotal?: number
}

function pct(cur: number, prev: number): number | undefined {
  if (!prev) return undefined
  return ((cur - prev) / Math.abs(prev)) * 100
}

function toAgg(p: TradeBalancePoint, label: string, fullLabel: string, prev?: AggPoint): AggPoint {
  const exp = p.export
  const imp = p.import
  const tot = exp + imp
  const expFdi = p.export_fdi
  const impFdi = p.import_fdi
  const totFdi = expFdi + impFdi
  const expDom = p.export_domestic
  const impDom = p.import_domestic
  const totDom = expDom + impDom
  return {
    key: `${p.period_date}|${p.period_type}`,
    label,
    fullLabel,
    periodType: p.period_type,
    export: exp,
    import: imp,
    total: tot,
    balance: p.balance,
    exportFdi: expFdi,
    importFdi: impFdi,
    totalFdi: totFdi,
    balanceFdi: p.balance_fdi,
    exportDomestic: expDom,
    importDomestic: impDom,
    totalDomestic: totDom,
    balanceDomestic: p.balance_domestic,
    partial: false,
    deltaExport: prev ? pct(exp, prev.export) : undefined,
    deltaImport: prev ? pct(imp, prev.import) : undefined,
    deltaTotal: prev ? pct(tot, prev.total) : undefined,
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
      return { short: `${m}/${y.slice(2)}`, full: `Tháng ${m}/${y}` }
    }
    if (range === 'quarter') {
      const [y, q] = key.split('-Q')
      return { short: `Q${q}/${y.slice(2)}`, full: `Quý ${q}/${y}` }
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
    const total_ = export_ + import_
    const expFdi = sum((p) => p.export_fdi)
    const impFdi = sum((p) => p.import_fdi)
    const totFdi = expFdi + impFdi
    const expDom = sum((p) => p.export_domestic)
    const impDom = sum((p) => p.import_domestic)
    const totDom = expDom + impDom
    const { short, full } = labelOf(keys[i])
    out.push({
      key: keys[i],
      label: short,
      fullLabel: full,
      periodType: 'THANG',
      export: export_,
      import: import_,
      total: total_,
      balance: sum((p) => p.balance),
      exportFdi: expFdi,
      importFdi: impFdi,
      totalFdi: totFdi,
      balanceFdi: sum((p) => p.balance_fdi),
      exportDomestic: expDom,
      importDomestic: impDom,
      totalDomestic: totDom,
      balanceDomestic: sum((p) => p.balance_domestic),
      partial: false,
      deltaExport: prev ? pct(export_, prev.export) : undefined,
      deltaImport: prev ? pct(import_, prev.import) : undefined,
      deltaTotal: prev ? pct(total_, prev.total) : undefined,
    })
  }

  // Thêm các kỳ sơ bộ 15 ngày của tháng gần nhất nếu tháng đó chưa có số liệu THANG chính thức
  if (range === 'month') {
    const thangMonths = new Set(thang.map((p) => p.period_date.slice(0, 7)))
    const uncompletedKy = sorted.filter(
      (p) => (p.period_type === 'KY_1' || p.period_type === 'KY_2') && !thangMonths.has(p.period_date.slice(0, 7)),
    )
    for (const p of uncompletedKy) {
      const [y, m] = p.period_date.slice(0, 7).split('-')
      const kLabel = p.period_type === 'KY_1' ? 'K1' : 'K2'
      const exp = p.export
      const imp = p.import
      const tot = exp + imp
      const expFdi = p.export_fdi
      const impFdi = p.import_fdi
      const expDom = p.export_domestic
      const impDom = p.import_domestic
      out.push({
        key: `${p.period_date}|${p.period_type}`,
        label: `${m}/${y.slice(2)} (${kLabel})`,
        fullLabel: `Kỳ ${kLabel === 'K1' ? 1 : 2} Tháng ${m}/${y} (Sơ bộ)`,
        periodType: p.period_type,
        export: exp,
        import: imp,
        total: tot,
        balance: p.balance,
        exportFdi: expFdi,
        importFdi: impFdi,
        totalFdi: expFdi + impFdi,
        balanceFdi: p.balance_fdi,
        exportDomestic: expDom,
        importDomestic: impDom,
        totalDomestic: expDom + impDom,
        balanceDomestic: p.balance_domestic,
        partial: true,
        deltaExport: undefined,
        deltaImport: undefined,
        deltaTotal: undefined,
      })
    }
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

function fmtLeftAxis(v: number): string {
  if (v < -1e-6) return ''
  return `${(v / 1e9).toFixed(1)}`
}

function Delta({ value }: { value?: number }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium tabular-nums text-xs',
        up ? 'text-emerald-400' : 'text-rose-400',
      )}
    >
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

  const isDom = segment === 'DOMESTIC'
  const isFdi = segment === 'FDI'

  if (!is15d && segment === 'COMPARE') {
    const items = [
      { name: 'Cán cân Tổng thể', color: COLORS.emerald, value: p.balance },
      { name: 'Cán cân FDI', color: COLORS.amber, value: p.balanceFdi },
      { name: 'Cán cân Trong nước', color: COLORS.sky, value: p.balanceDomestic },
    ]

    return (
      <div className="rounded-xl border border-white/10 bg-[#1A1D26]/95 p-3.5 text-xs shadow-2xl backdrop-blur">
        <div className="mb-2 border-b border-white/10 pb-1.5 font-bold text-[#F0F3F6]">
          {p.fullLabel ?? p.label}
        </div>
        <div className="space-y-1.5">
          {items.map((it) => (
            <div key={it.name} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-[#9EACB9]">
                <span className="size-2 rounded-full" style={{ backgroundColor: it.color }} />
                {it.name}
              </span>
              <span className={cn('font-semibold tabular-nums', it.value < 0 ? 'text-rose-400' : 'text-emerald-400')}>
                {it.value < 0 ? '−' : '+'}
                {fmtUsd(Math.abs(it.value))}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const expVal = !is15d && isDom ? p.exportDomestic : !is15d && isFdi ? p.exportFdi : p.export
  const impVal = !is15d && isDom ? p.importDomestic : !is15d && isFdi ? p.importFdi : p.import
  const totVal = !is15d && isDom ? p.totalDomestic : !is15d && isFdi ? p.totalFdi : p.total
  const balVal = !is15d && isDom ? p.balanceDomestic : !is15d && isFdi ? p.balanceFdi : p.balance
  const isSurplus = balVal >= 0

  return (
    <div className="min-w-[250px] rounded-xl border border-white/12 bg-[#1A1D26]/95 p-3.5 text-xs shadow-2xl backdrop-blur">
      <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <span className="font-bold text-[#F0F3F6]">{p.fullLabel ?? p.label}</span>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider',
            isSurplus
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          )}
        >
          {isSurplus ? 'XUẤT SIÊU' : 'NHẬP SIÊU'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-[#9EACB9]">
            <span className="size-2 rounded-full bg-[#10b981]" />
            Xuất khẩu
          </span>
          <span className="font-semibold tabular-nums text-[#F0F3F6]">
            +{fmtUsd(expVal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-[#9EACB9]">
            <span className="size-2 rounded-full bg-[#f43f5e]" />
            Nhập khẩu
          </span>
          <span className="font-semibold tabular-nums text-[#F0F3F6]">
            +{fmtUsd(impVal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6 border-t border-white/8 pt-1.5">
          <span className="flex items-center gap-1.5 text-[#9EACB9]">
            <span className="size-2 rounded-full bg-[#6366f1]" />
            Tổng kim ngạch 2 chiều
          </span>
          <span className="font-bold tabular-nums text-[#F0F3F6]">
            {fmtUsd(totVal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6 border-t border-white/8 pt-1.5">
          <span className="flex items-center gap-1.5 font-medium text-[#F0F3F6]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: isSurplus ? COLORS.emerald : COLORS.rose }}
            />
            {isSurplus ? 'Thặng dư (Xuất siêu)' : 'Thâm hụt (Nhập siêu)'}
          </span>
          <span
            className={cn(
              'font-bold tabular-nums text-sm',
              isSurplus ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {isSurplus ? '+' : '−'}
            {fmtUsd(Math.abs(balVal))}
          </span>
        </div>
      </div>

      {(p.deltaExport != null || p.deltaImport != null || p.deltaTotal != null) && (
        <div className="mt-2.5 border-t border-white/8 pt-2 space-y-1 text-[#9EACB9]">
          {p.deltaExport != null && (
            <div className="flex items-center justify-between gap-6">
              <span>Xuất khẩu vs kỳ trước</span>
              <Delta value={p.deltaExport} />
            </div>
          )}
          {p.deltaImport != null && (
            <div className="flex items-center justify-between gap-6">
              <span>Nhập khẩu vs kỳ trước</span>
              <Delta value={p.deltaImport} />
            </div>
          )}
          {p.deltaTotal != null && (
            <div className="flex items-center justify-between gap-6">
              <span>Tổng kim ngạch vs kỳ trước</span>
              <Delta value={p.deltaTotal} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InteractiveLegendContent({
  visibleSeries,
  onToggle,
  isCompare,
}: {
  visibleSeries: { export: boolean; import: boolean; total: boolean; balance: boolean }
  onToggle: (key: 'export' | 'import' | 'total' | 'balance') => void
  isCompare: boolean
}) {
  if (isCompare) return null

  const items = [
    {
      key: 'export' as const,
      label: 'Xuất khẩu',
      color: '#10b981',
      activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs',
      dotClass: 'bg-[#10b981]',
    },
    {
      key: 'import' as const,
      label: 'Nhập khẩu',
      color: '#f43f5e',
      activeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs',
      dotClass: 'bg-[#f43f5e]',
    },
    {
      key: 'total' as const,
      label: 'Tổng kim ngạch 2 chiều',
      color: '#6366f1',
      activeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-xs',
      dotClass: 'bg-[#6366f1]',
    },
    {
      key: 'balance' as const,
      label: 'Cán cân (Xuất/Nhập siêu)',
      color: '#f59e0b',
      activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs',
      dotClass: 'bg-[#f59e0b]',
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
      <span className="text-[11px] text-[#9EACB9] font-medium hidden sm:inline">
        Bấm để ẩn/hiện cột:
      </span>
      {items.map((it) => {
        const active = visibleSeries[it.key]
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all cursor-pointer select-none',
              active
                ? `${it.activeClass} font-semibold`
                : 'bg-white/5 text-[#9EACB9]/40 border-white/5 line-through opacity-50 hover:opacity-80 hover:bg-white/10',
            )}
            title={`Bấm để ${active ? 'ẩn' : 'hiện'} cột ${it.label}`}
          >
            <span
              className={cn(
                'size-2 rounded-full transition-transform',
                active ? it.dotClass : 'bg-white/20 scale-75',
              )}
            />
            <span>{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const controlCls =
  'inline-flex items-center rounded-lg border border-white/10 bg-[#1A1D26] px-3 h-8 text-xs font-medium text-[#9EACB9] transition-colors hover:text-[#F0F3F6]'

export function TradeBalanceChart({ data }: { data: TradeBalancePoint[] }) {
  const [segment, setSegment] = useState<Segment>('ALL')
  const [range, setRange] = useState<RangeKey>('month')
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('2y')

  // Bật/tắt linh hoạt từng loại cột theo yêu cầu người dùng
  const [visibleSeries, setVisibleSeries] = useState<{
    export: boolean
    import: boolean
    total: boolean
    balance: boolean
  }>({
    export: true,
    import: true,
    total: true,
    balance: false,
  })

  const is15d = range === '15d'
  const effectiveSegment: Segment = is15d ? 'ALL' : segment
  const isCompare = !is15d && effectiveSegment === 'COMPARE'

  // Hàm chuyển đổi bật/tắt từng chuỗi dữ liệu (đảm bảo luôn giữ ít nhất 1 chuỗi bật)
  const toggleSeries = (key: 'export' | 'import' | 'total' | 'balance') => {
    setVisibleSeries((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount <= 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  // Toàn bộ điểm dữ liệu được tổng hợp theo chu kỳ
  const allPoints = useMemo(() => aggregate(data, range), [data, range])

  // Lọc theo khung thời gian (1Y, 2Y, 3Y, 5Y, Tất cả) để các cột không bị nén nghẹt
  const points = useMemo(() => {
    if (!allPoints.length || timeHorizon === 'all') return allPoints

    let count = allPoints.length
    if (range === '15d') {
      if (timeHorizon === '1y') count = 24
      else if (timeHorizon === '2y') count = 48
      else if (timeHorizon === '3y') count = 72
      else if (timeHorizon === '5y') count = 120
    } else if (range === 'month') {
      if (timeHorizon === '1y') count = 12
      else if (timeHorizon === '2y') count = 24
      else if (timeHorizon === '3y') count = 36
      else if (timeHorizon === '5y') count = 60
    } else if (range === 'quarter') {
      if (timeHorizon === '1y') count = 4
      else if (timeHorizon === '2y') count = 8
      else if (timeHorizon === '3y') count = 12
      else if (timeHorizon === '5y') count = 20
    } else if (range === 'year') {
      if (timeHorizon === '1y') count = 2
      else if (timeHorizon === '2y') count = 3
      else if (timeHorizon === '3y') count = 4
      else if (timeHorizon === '5y') count = 6
    }
    return allPoints.slice(-count)
  }, [allPoints, range, timeHorizon])

  // Số liệu của kỳ gần nhất cho 4 thẻ KPI tóm tắt
  const latestPoint = allPoints[allPoints.length - 1]
  const isDom = !is15d && effectiveSegment === 'DOMESTIC'
  const isFdi = !is15d && effectiveSegment === 'FDI'
  const latestExp = latestPoint ? (isDom ? latestPoint.exportDomestic : isFdi ? latestPoint.exportFdi : latestPoint.export) : 0
  const latestImp = latestPoint ? (isDom ? latestPoint.importDomestic : isFdi ? latestPoint.importFdi : latestPoint.import) : 0
  const latestBal = latestPoint ? (isDom ? latestPoint.balanceDomestic : isFdi ? latestPoint.balanceFdi : latestPoint.balance) : 0
  const latestTotal = latestExp + latestImp
  const isSurplus = latestBal >= 0

  const keys = {
    export: !is15d && effectiveSegment === 'DOMESTIC' ? 'exportDomestic' : !is15d && effectiveSegment === 'FDI' ? 'exportFdi' : 'export',
    import: !is15d && effectiveSegment === 'DOMESTIC' ? 'importDomestic' : !is15d && effectiveSegment === 'FDI' ? 'importFdi' : 'import',
    total: !is15d && effectiveSegment === 'DOMESTIC' ? 'totalDomestic' : !is15d && effectiveSegment === 'FDI' ? 'totalFdi' : 'total',
    balance: !is15d && effectiveSegment === 'DOMESTIC' ? 'balanceDomestic' : !is15d && effectiveSegment === 'FDI' ? 'balanceFdi' : 'balance',
  }

  // Xác định cấu hình trục tọa độ theo số lượng cột đang hiển thị
  const hasTurnover = visibleSeries.export || visibleSeries.import || visibleSeries.total
  const hasBalance = visibleSeries.balance
  const isDualAxis = hasTurnover && hasBalance

  // Tính toán giới hạn trục và vạch tick để đồng bộ mốc 0 chính xác giữa trục Kim ngạch (Trái) và Cán cân (Phải)
  const axisConfig = useMemo(() => {
    if (!points.length || !isDualAxis) return null

    // 1. Tìm giá trị lớn nhất của Kim ngạch đang hiển thị
    let maxTurnover = 0
    for (const p of points) {
      if (visibleSeries.export) maxTurnover = Math.max(maxTurnover, Number(p[keys.export as keyof AggPoint] ?? 0))
      if (visibleSeries.import) maxTurnover = Math.max(maxTurnover, Number(p[keys.import as keyof AggPoint] ?? 0))
      if (visibleSeries.total) maxTurnover = Math.max(maxTurnover, Number(p[keys.total as keyof AggPoint] ?? 0))
    }
    if (maxTurnover <= 0) maxTurnover = 1e9

    // 2. Tìm giá trị nhỏ nhất (nhập siêu) và lớn nhất (xuất siêu) của Cán cân đang hiển thị
    let minBal = 0
    let maxBal = 0
    for (const p of points) {
      const b = Number(p[keys.balance as keyof AggPoint] ?? 0)
      if (b < minBal) minBal = b
      if (b > maxBal) maxBal = b
    }

    // Trường hợp A: Cán cân hoàn toàn không âm (chỉ có xuất siêu) -> Mốc 0 ở đáy cho cả 2 trục
    if (minBal >= 0) {
      const stepCandidatesL = [1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 100, 125, 150, 200, 250, 300, 400, 500]
      const rawStepL = (maxTurnover * 1.08) / 5 / 1e9
      const stepL = (stepCandidatesL.find((s) => s >= rawStepL) ?? Math.ceil(rawStepL / 50) * 50) * 1e9

      const stepCandidatesR = [0.2, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]
      const rawStepR = (Math.max(maxBal, 1e8) * 1.15) / 5 / 1e9
      const stepR = (stepCandidatesR.find((s) => s >= rawStepR) ?? Math.ceil(rawStepR / 5) * 5) * 1e9

      const leftTicks = [0, 1, 2, 3, 4, 5].map((i) => i * stepL)
      const rightTicks = [0, 1, 2, 3, 4, 5].map((i) => i * stepR)

      return {
        leftDomain: [0, leftTicks[5]],
        rightDomain: [0, rightTicks[5]],
        leftTicks,
        rightTicks,
      }
    }

    // Trường hợp B: Có nhập siêu (minBal < 0) -> Đồng bộ mốc 0 ở độ cao 20% (1 khoảng dưới 0, 4 khoảng trên 0)
    const absMin = Math.abs(minBal)
    const rawStepR = Math.max(absMin * 1.15, (Math.max(maxBal, 1e8) * 1.15) / 4) / 1e9
    const stepCandidatesR = [0.2, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]
    const stepR = (stepCandidatesR.find((s) => s >= rawStepR) ?? Math.ceil(rawStepR / 5) * 5) * 1e9

    const rawStepL = (maxTurnover * 1.08) / 4 / 1e9
    const stepCandidatesL = [1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 100, 125, 150, 200, 250, 300, 400, 500]
    const stepL = (stepCandidatesL.find((s) => s >= rawStepL) ?? Math.ceil(rawStepL / 50) * 50) * 1e9

    const leftTicks = [-1, 0, 1, 2, 3, 4].map((i) => i * stepL)
    const rightTicks = [-1, 0, 1, 2, 3, 4].map((i) => i * stepR)

    return {
      leftDomain: [leftTicks[0], leftTicks[5]],
      rightDomain: [rightTicks[0], rightTicks[5]],
      leftTicks,
      rightTicks,
    }
  }, [points, isDualAxis, visibleSeries, keys])

  // Tự động căn chỉnh độ rộng cột tối ưu
  const activeCount =
    (visibleSeries.export ? 1 : 0) +
    (visibleSeries.import ? 1 : 0) +
    (visibleSeries.total ? 1 : 0) +
    (visibleSeries.balance ? 1 : 0)
  const barSize = activeCount === 1 ? 34 : activeCount === 2 ? 24 : activeCount === 3 ? 18 : 14

  return (
    <div className="rounded-xl border border-white/8 bg-[#212631] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-5">
      {/* ── TIÊU ĐỀ & ĐIỀU KHIỂN CHÍNH ───────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-white/8 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#F0F3F6] sm:text-lg tracking-tight">
              {is15d
                ? 'Thống kê Cán cân Xuất – Nhập siêu theo kỳ 15 ngày'
                : 'Cán cân Thương mại Xuất – Nhập khẩu Toàn quốc'}
            </h2>
            <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              Dữ liệu Hải quan
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#9EACB9]">
            {is15d
              ? 'Số liệu kỳ 15 ngày (Tổng kim ngạch 2 chiều & Thặng dư / Thâm hụt thương mại) · Đơn vị: tỷ USD'
              : 'Thống kê kim ngạch Xuất khẩu, Nhập khẩu & Cán cân thương mại · Đơn vị: tỷ USD'}
          </p>
        </div>

        {/* Cụm công cụ bên phải */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs Khối: Tổng thể / Trong nước / FDI / So sánh 3 khối */}
          {!is15d && (
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1D26] p-1 text-xs">
              {SEGMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSegment(opt.key)}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-medium transition-colors',
                    effectiveSegment === opt.key
                      ? 'bg-white/15 text-[#F0F3F6] shadow-xs font-semibold'
                      : 'text-[#9EACB9] hover:text-[#F0F3F6]',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Chọn chu kỳ: Kỳ 15 ngày, Tháng, Quý, Năm */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className={cn(controlCls, 'cursor-pointer')}
            aria-label="Chu kỳ thống kê"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 4 THẺ KPI TỔNG QUAN KỲ MỚI NHẤT ───────────────────────────────── */}
      {latestPoint && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Card 1: Xuất khẩu */}
          <div className="rounded-xl border border-white/8 bg-[#1A1D26]/70 p-3.5">
            <div className="flex items-center justify-between text-xs text-[#9EACB9]">
              <span className="font-medium">Xuất khẩu</span>
              <div className="rounded-md bg-[#10b981]/10 p-1 text-[#10b981]">
                <ArrowUpRight className="size-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-bold text-[#F0F3F6] sm:text-xl">
              {fmtUsd(latestExp)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#9EACB9]">
              <span>vs kỳ trước:</span>
              <Delta value={latestPoint.deltaExport} />
            </div>
          </div>

          {/* Card 2: Nhập khẩu */}
          <div className="rounded-xl border border-white/8 bg-[#1A1D26]/70 p-3.5">
            <div className="flex items-center justify-between text-xs text-[#9EACB9]">
              <span className="font-medium">Nhập khẩu</span>
              <div className="rounded-md bg-[#f43f5e]/10 p-1 text-[#f43f5e]">
                <ArrowDownLeft className="size-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-bold text-[#F0F3F6] sm:text-xl">
              {fmtUsd(latestImp)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#9EACB9]">
              <span>vs kỳ trước:</span>
              <Delta value={latestPoint.deltaImport} />
            </div>
          </div>

          {/* Card 3: Cán cân thương mại */}
          <div
            className={cn(
              'rounded-xl border p-3.5 transition-all',
              isSurplus
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-rose-500/30 bg-rose-500/10',
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F0F3F6]">Cán cân ({latestPoint.label})</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.2 text-[10px] font-bold tracking-wider',
                  isSurplus ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300',
                )}
              >
                {isSurplus ? 'XUẤT SIÊU' : 'NHẬP SIÊU'}
              </span>
            </div>
            <div
              className={cn(
                'mt-1 text-lg font-black tracking-tight sm:text-xl',
                isSurplus ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {isSurplus ? '+' : '−'}
              {fmtUsd(Math.abs(latestBal))}
            </div>
            <div className="mt-1 text-[11px] text-[#9EACB9]">
              {isSurplus ? 'Thặng dư thương mại' : 'Thâm hụt thương mại trong kỳ'}
            </div>
          </div>

          {/* Card 4: Tổng kim ngạch */}
          <div className="rounded-xl border border-white/8 bg-[#1A1D26]/70 p-3.5">
            <div className="flex items-center justify-between text-xs text-[#9EACB9]">
              <span className="font-medium">Tổng kim ngạch 2 chiều</span>
              <div className="rounded-md bg-[#6366f1]/10 p-1 text-[#6366f1]">
                <Scale className="size-3.5" />
              </div>
            </div>
            <div className="mt-1 text-lg font-bold text-[#F0F3F6] sm:text-xl">
              {fmtUsd(latestTotal)}
            </div>
            <div className="mt-1 text-[11px] text-[#9EACB9] truncate" title={latestPoint.fullLabel}>
              Kỳ: <span className="text-[#F0F3F6]">{latestPoint.fullLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── THANH ĐIỀU KHIỂN BIỂU ĐỒ (BẬT/TẮT NHANH & KHUNG THỜI GIAN) ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Nút bấm nhanh Preset & Tùy chọn Cột chồng */}
        {!isCompare ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#9EACB9] font-medium hidden sm:inline">Chế độ xem:</span>
            <div className="flex items-center rounded-lg border border-white/10 bg-[#1A1D26] p-0.5 text-xs">
              {/* Preset 1: Chỉ xem Tổng 2 chiều (theo ví dụ của người dùng) */}
              <button
                type="button"
                onClick={() =>
                  setVisibleSeries({ export: false, import: false, total: true, balance: false })
                }
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  !visibleSeries.export && !visibleSeries.import && visibleSeries.total && !visibleSeries.balance
                    ? 'bg-indigo-500/25 text-indigo-300 font-bold border border-indigo-500/40 shadow-xs'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]',
                )}
                title="Chỉ hiển thị cột Tổng kim ngạch 2 chiều để thấy rõ xu hướng tăng trưởng"
              >
                Chỉ Tổng 2 chiều
              </button>

              {/* Preset 2: Xuất vs Nhập */}
              <button
                type="button"
                onClick={() =>
                  setVisibleSeries({ export: true, import: true, total: false, balance: false })
                }
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  visibleSeries.export && visibleSeries.import && !visibleSeries.total && !visibleSeries.balance
                    ? 'bg-white/15 text-[#F0F3F6] font-bold shadow-xs'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]',
                )}
                title="Chỉ hiển thị Xuất khẩu và Nhập khẩu"
              >
                Xuất vs Nhập
              </button>

              {/* Preset 3: Chỉ Cán cân */}
              <button
                type="button"
                onClick={() =>
                  setVisibleSeries({ export: false, import: false, total: false, balance: true })
                }
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  !visibleSeries.export && !visibleSeries.import && !visibleSeries.total && visibleSeries.balance
                    ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]',
                )}
                title="Chỉ hiển thị cột Cán cân thương mại"
              >
                Chỉ Cán cân
              </button>

              {/* Preset 4: Xem tất cả */}
              <button
                type="button"
                onClick={() =>
                  setVisibleSeries({ export: true, import: true, total: true, balance: true })
                }
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  visibleSeries.export && visibleSeries.import && visibleSeries.total && visibleSeries.balance
                    ? 'bg-white/15 text-[#F0F3F6] font-bold shadow-xs'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]',
                )}
                title="Hiển thị cả 4 cột: Xuất, Nhập, Tổng 2 chiều và Cán cân"
              >
                Tất cả cột
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#9EACB9]">
            So sánh Cán cân thương mại: Tổng thể vs FDI vs Doanh nghiệp trong nước
          </div>
        )}

        {/* Bộ lọc Khung thời gian (1Y, 2Y, 3Y, 5Y, Tất cả) */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1D26] p-0.5 text-xs">
          <span className="px-2 text-[11px] text-[#9EACB9] font-medium hidden sm:inline-flex items-center gap-1">
            <Calendar className="size-3" />
            Thời gian:
          </span>
          {HORIZON_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTimeHorizon(opt.key)}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                timeHorizon === opt.key
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-[#9EACB9] hover:text-[#F0F3F6]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BIỂU ĐỒ CHÍNH (HOÀN TOÀN DẠNG CỘT - KHÔNG DÙNG ĐƯỜNG) ────────── */}
      {points.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-[#9EACB9]">
          Chưa có dữ liệu cán cân thương mại trong giai đoạn này.
        </div>
      ) : (
        <div className="h-80 w-full sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 12, right: 10, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.06} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#ffffff', opacity: 0.1 }}
                tick={{ fontSize: 11, fill: '#9EACB9' }}
                dy={6}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                domain={
                  axisConfig
                    ? axisConfig.leftDomain
                    : hasBalance && !hasTurnover
                      ? ['auto', 'auto']
                      : [0, 'auto']
                }
                ticks={axisConfig ? axisConfig.leftTicks : undefined}
                tickFormatter={axisConfig ? fmtLeftAxis : fmtAxis}
                tickLine={false}
                axisLine={false}
                width={46}
                tick={{ fontSize: 11, fill: '#9EACB9' }}
              />

              {/* Trục phụ bên phải (chỉ kích hoạt khi xem đồng thời cả Kim ngạch và Cán cân) */}
              {isDualAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={axisConfig ? axisConfig.rightDomain : undefined}
                  ticks={axisConfig ? axisConfig.rightTicks : undefined}
                  tickFormatter={fmtAxis}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tick={{ fontSize: 11, fill: '#9EACB9' }}
                />
              )}

              <Tooltip
                content={<ChartTooltip segment={effectiveSegment} is15d={is15d} />}
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
              />

              {/* Legend tương tác: Người dùng bấm vào từng nút để bật/tắt cột */}
              <Legend
                content={
                  <InteractiveLegendContent
                    visibleSeries={visibleSeries}
                    onToggle={toggleSeries}
                    isCompare={isCompare}
                  />
                }
              />

              {/* Vạch cân bằng 0 (áp dụng khi có hiển thị Cán cân hoặc chế độ So sánh 3 khối) */}
              {(isCompare || hasBalance) && (
                <ReferenceLine
                  yAxisId={isDualAxis ? 'right' : 'left'}
                  y={0}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: '0 (Cân bằng)',
                    fill: '#94a3b8',
                    fontSize: 10,
                    position: 'insideBottomRight',
                    offset: 4,
                  }}
                />
              )}

              {isCompare ? (
                /* Chế độ so sánh 3 khối */
                <>
                  <Bar
                    yAxisId="left"
                    dataKey="balance"
                    name="Cán cân Tổng thể"
                    fill={COLORS.emerald}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="balanceFdi"
                    name="Cán cân FDI"
                    fill={COLORS.amber}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="balanceDomestic"
                    name="Cán cân Trong nước"
                    fill={COLORS.sky}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </>
              ) : (
                /* Chế độ Cột linh hoạt: Bật/tắt theo lựa chọn của người dùng */
                <>
                  {/* Cột 1: Xuất khẩu */}
                  {visibleSeries.export && (
                    <Bar
                      yAxisId="left"
                      dataKey={keys.export}
                      name="Xuất khẩu"
                      fill={COLORS.emerald}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={barSize}
                    />
                  )}

                  {/* Cột 2: Nhập khẩu */}
                  {visibleSeries.import && (
                    <Bar
                      yAxisId="left"
                      dataKey={keys.import}
                      name="Nhập khẩu"
                      fill={COLORS.rose}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={barSize}
                    />
                  )}

                  {/* Cột 3: Tổng kim ngạch 2 chiều */}
                  {visibleSeries.total && (
                    <Bar
                      yAxisId="left"
                      dataKey={keys.total}
                      name="Tổng kim ngạch 2 chiều"
                      fill={COLORS.indigo}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={barSize}
                    />
                  )}

                  {/* Cột 4: Cán cân thương mại (Xanh khi xuất siêu, Đỏ khi nhập siêu) */}
                  {visibleSeries.balance && (
                    <Bar
                      yAxisId={isDualAxis ? 'right' : 'left'}
                      dataKey={keys.balance}
                      name={is15d ? 'Xuất / Nhập siêu (Cột)' : 'Cán cân (Cột)'}
                      radius={[3, 3, 3, 3]}
                      maxBarSize={barSize}
                    >
                      {points.map((entry, index) => {
                        const val = Number(entry[keys.balance as keyof AggPoint] ?? 0)
                        return (
                          <Cell
                            key={`cell-bal-${index}`}
                            fill={val >= 0 ? COLORS.emerald : COLORS.rose}
                            fillOpacity={0.88}
                          />
                        )
                      })}
                    </Bar>
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chú thích hướng dẫn đọc nhanh bên dưới biểu đồ */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3 text-[11px] text-[#9EACB9]">
        <div className="flex items-center gap-2 text-[#9EACB9]">
          <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
          <span>Mẹo: Bạn có thể bấm trực tiếp vào các nút ở thanh chú thích để bật hoặc tắt bất kỳ cột nào.</span>
        </div>
        <span>
          Đơn vị: tỷ USD · {isDualAxis ? 'Trục trái: Kim ngạch, Trục phải: Cán cân' : 'Trục tung tỷ USD'}
        </span>
      </div>
    </div>
  )
}



