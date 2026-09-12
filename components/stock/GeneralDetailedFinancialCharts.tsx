'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Area,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { FinancialChartPayload } from '@/lib/financial-charts-service'
import type { RawBusinessPlanPayload } from '@/lib/business-plan-db'
import type { ProfitStructurePayload } from '@/lib/profit-structure-service'
import type { CostBreakdownPayload } from '@/lib/cost-breakdown-service'
import type { DetailedBalanceSheetPayload } from '@/lib/balance-sheet-cashflow-service'
import type { CapexFinancialPayload } from '@/lib/capex-financial-service'
import type { DebtDupontPayload } from '@/lib/debt-dupont-service'
import {
  TrendingUp,
  Calendar,
  Layers,
  Briefcase,
  DollarSign,
  Target,
  Sparkles,
  PieChart,
  Eye,
  Lock,
  RotateCcw,
  Receipt,
  Percent,
  Wallet,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WiDataStandardRow } from './WiDataStandardRow'
import { MWGSegmentCharts } from './MWGSegmentCharts'

interface GeneralDetailedFinancialChartsProps {
  symbol: string
  quarterData: FinancialChartPayload | null
  annualData: FinancialChartPayload | null
  businessPlanData?: RawBusinessPlanPayload | null
  profitStructureQuarter?: ProfitStructurePayload | null
  profitStructureAnnual?: ProfitStructurePayload | null
  costBreakdownQuarter?: CostBreakdownPayload | null
  costBreakdownAnnual?: CostBreakdownPayload | null
  balanceSheetQuarter?: DetailedBalanceSheetPayload | null
  balanceSheetAnnual?: DetailedBalanceSheetPayload | null
  capexFinancialQuarter?: CapexFinancialPayload | null
  capexFinancialAnnual?: CapexFinancialPayload | null
  debtDupontQuarter?: DebtDupontPayload | null
  debtDupontAnnual?: DebtDupontPayload | null
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function fmtPeriod(dateStr: string, isQuarter: boolean): string {
  if (!dateStr) return ''
  if (!isQuarter) {
    return dateStr.slice(0, 4)
  }
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const y = parts[0].slice(2)
  const m = parseInt(parts[1], 10)
  const q = Math.ceil(m / 3)
  return `Q${q}/${y}`
}

function getQuarter(item: any): number | null {
  if (!item) return null
  if (typeof item.quarterNum === 'number') return item.quarterNum
  if (typeof item.quarter === 'number') return item.quarter
  if (typeof item.displayDate === 'string') {
    const m = item.displayDate.match(/Q([1-4])/i)
    if (m) return parseInt(m[1], 10)
  }
  if (typeof item.date === 'string') {
    const parts = item.date.split('-')
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10)
      if (!isNaN(m)) return Math.ceil(m / 3)
    }
  }
  return null
}

const customTooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.96)',
  borderColor: '#334155',
  borderRadius: '12px',
  fontSize: '11px',
  color: '#f8fafc',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(8px)',
  pointerEvents: 'none',
}

// Tooltip hiển thị chi tiết số liệu (Pure Component, 0 delay)
const CustomChartTooltip = React.memo(function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const qNum = getQuarter(payload[0]?.payload)

  return (
    <div style={customTooltipStyle} className="p-3 shadow-2xl border border-slate-700/80 rounded-xl min-w-[190px]">
      <div className="font-mono font-bold text-xs text-sky-400 border-b border-slate-700/60 pb-1.5 mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {qNum && (
          <span className="text-[10px] text-amber-300 font-extrabold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
            Quý {qNum}
          </span>
        )}
      </div>
      <div className="space-y-1 text-[11px]">
        {payload.map((item: any, idx: number) => {
          if (item.value == null) return null
          const isPct = String(item.name).includes('%') || String(item.name).includes('YoY')
          const isRatio = String(item.name).includes('lần') || String(item.name).includes('Vòng')
          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || item.fill || '#38bdf8' }}
                />
                <span className="truncate max-w-[140px]">{item.name}:</span>
              </span>
              <span className="font-mono font-bold text-white shrink-0">
                {isPct
                  ? `${Number(item.value).toFixed(1)}%`
                  : isRatio
                  ? `${Number(item.value).toFixed(2)} lần`
                  : `${fmtNum(item.value)} tỷ`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// Helper render XAxis tick với hiệu ứng sáng cùng kỳ
function createQuarterTickRenderer(activeQuarter: number | null) {
  return function QuarterTick(props: any) {
    const { x, y, payload } = props
    const val = payload?.value
    const qMatch = val && typeof val === 'string' ? val.match(/Q([1-4])/i) : null
    const q = qMatch ? parseInt(qMatch[1], 10) : null
    const isHighlighted = activeQuarter != null && q === activeQuarter
    const isDimmed = activeQuarter != null && q !== activeQuarter

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={10}
          textAnchor="middle"
          fill={isHighlighted ? '#fbbf24' : isDimmed ? '#475569' : '#94a3b8'}
          fontWeight={isHighlighted ? 700 : 400}
          fontSize={isHighlighted ? 11 : 9.5}
        >
          {val}
        </text>
      </g>
    )
  }
}

// ══════════════════════════════════════════════════════════════════
// CÁC COMPONENT BIỂU ĐỒ ĐỘC LẬP (TỰ QUẢN LÝ HOVER RIÊNG BIỆT)
// ══════════════════════════════════════════════════════════════════

// ── 1. Biểu đồ Doanh Thu Thuần ──
const RevenueChartCard = React.memo(function RevenueChartCard({
  data,
  isQuarter,
  globalQuarter,
  latest,
}: {
  data: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latest: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && data[e.activeTooltipIndex]) {
      q = getQuarter(data[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, data])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-sky-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <TrendingUp className="size-4 text-sky-400" />
          <span>Doanh Thu Thuần (Tỷ Đồng)</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
          {fmtNum(latest?.doanhThu)} tỷ {latest?.tangTruongDT != null ? `(${latest.tangTruongDT > 0 ? '+' : ''}${latest.tangTruongDT.toFixed(1)}%)` : ''}
        </span>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onMouseMove={handleMouseMove}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
            <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
            <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
            <Bar yAxisId="left" dataKey="doanhThu" name="Doanh thu thuần" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => {
                const q = getQuarter(entry)
                const isMatch = activeQuarter == null || q === activeQuarter
                return (
                  <Cell
                    key={`dt-cell-${index}`}
                    fill="#38bdf8"
                    fillOpacity={isMatch ? 1 : 0.15}
                    stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                    strokeWidth={activeQuarter != null && isMatch ? 2 : 0}
                    className="cursor-pointer"
                    style={{ transition: 'fill-opacity 40ms ease-out' }}
                  />
                )
              })}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="tangTruongDT"
              name="Tăng trưởng YoY (%)"
              stroke="#f97316"
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                if (!cx || !cy) return null
                const q = getQuarter(payload)
                const isMatch = activeQuarter != null && q === activeQuarter
                if (!isMatch) return null
                return (
                  <circle
                    key={`dt-dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#f97316"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

// ── 2. Biểu đồ LNST Công Ty Mẹ ──
const ProfitChartCard = React.memo(function ProfitChartCard({
  data,
  isQuarter,
  globalQuarter,
  latest,
}: {
  data: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latest: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && data[e.activeTooltipIndex]) {
      q = getQuarter(data[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, data])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-emerald-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <TrendingUp className="size-4 text-emerald-400" />
          <span>Lợi Nhuận Sau Thuế Công Ty Mẹ</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          {fmtNum(latest?.lnst)} tỷ {latest?.tangTruongLNST != null ? `(${latest.tangTruongLNST > 0 ? '+' : ''}${latest.tangTruongLNST.toFixed(1)}%)` : ''}
        </span>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onMouseMove={handleMouseMove}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
            <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
            <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
            <Bar yAxisId="left" dataKey="lnst" name="LNST cổ đông mẹ" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => {
                const q = getQuarter(entry)
                const isMatch = activeQuarter == null || q === activeQuarter
                return (
                  <Cell
                    key={`lnst-cell-${index}`}
                    fill="#2dd4bf"
                    fillOpacity={isMatch ? 1 : 0.15}
                    stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                    strokeWidth={activeQuarter != null && isMatch ? 2 : 0}
                    className="cursor-pointer"
                    style={{ transition: 'fill-opacity 40ms ease-out' }}
                  />
                )
              })}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="tangTruongLNST"
              name="Tăng trưởng YoY (%)"
              stroke="#eab308"
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                if (!cx || !cy) return null
                const q = getQuarter(payload)
                const isMatch = activeQuarter != null && q === activeQuarter
                if (!isMatch) return null
                return (
                  <circle
                    key={`lnst-dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#eab308"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})

// ── 3. Biểu đồ Kế Hoạch & Thực Hiện (Theo Năm) ──
const PlanChartCard = React.memo(function PlanChartCard({
  planChartPoints,
  latestPlan,
}: {
  planChartPoints: any[]
  latestPlan: any
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-amber-500/40">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Target className="size-4 text-amber-400" />
          <span>KQKD Kế Hoạch & Thực Hiện (Năm)</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
          {latestPlan?.pctDatLNST != null ? `Đạt ${latestPlan.pctDatLNST.toFixed(0)}% KH` : 'Dự phóng'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {planChartPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={planChartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
              <Bar yAxisId="left" dataKey="keHoachDT" name="DT Kế hoạch" fill="#6366f1" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="thucHienDT" name="DT Thực hiện" fill="#0ea5e9" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="keHoachLNST" name="LNST Kế hoạch" fill="#f59e0b" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="thucHienLNST" name="LNST Thực hiện" fill="#10b981" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="pctDatLNST" name="% Đạt LNST" stroke="#fbbf24" strokeWidth={2.2} dot={{ r: 3.5, fill: '#fbbf24' }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật số liệu kế hoạch kinh doanh
          </div>
        )}
      </div>
    </div>
  )
})

// ── 4. Biểu đồ Cơ Cấu Lợi Nhuận Trước Thuế ──
const ProfitStructureChartCard = React.memo(function ProfitStructureChartCard({
  profitPoints,
  isQuarter,
  globalQuarter,
  latestProfit,
}: {
  profitPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestProfit: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && profitPoints[e.activeTooltipIndex]) {
      q = getQuarter(profitPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, profitPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-indigo-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <PieChart className="size-4 text-indigo-400" />
          <span>Cơ Cấu Lợi Nhuận Trước Thuế</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
          LNTT: {latestProfit?.lntt != null ? `${fmtNum(latestProfit.lntt)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {profitPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={profitPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9.5px', paddingTop: '4px' }} />
              <Bar yAxisId="left" dataKey="lnKDChinh" name="Lợi nhuận thuần từ HĐKD chính" stackId="pbt" isAnimationActive={false}>
                {profitPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <Cell
                      key={`pbt-kd-${index}`}
                      fill="#4f46e5"
                      fillOpacity={isMatch ? 1 : 0.15}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0}
                      className="cursor-pointer"
                      style={{ transition: 'fill-opacity 40ms ease-out' }}
                    />
                  )
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="lnLDLK" name="Lãi lỗ từ công ty LDLK" stackId="pbt" isAnimationActive={false}>
                {profitPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <Cell
                      key={`pbt-ldlk-${index}`}
                      fill="#14b8a6"
                      fillOpacity={isMatch ? 1 : 0.15}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0}
                      className="cursor-pointer"
                      style={{ transition: 'fill-opacity 40ms ease-out' }}
                    />
                  )
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="lnTaiChinh" name="Lợi nhuận tài chính" stackId="pbt" isAnimationActive={false}>
                {profitPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <Cell
                      key={`pbt-tc-${index}`}
                      fill="#facc15"
                      fillOpacity={isMatch ? 1 : 0.15}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0}
                      className="cursor-pointer"
                      style={{ transition: 'fill-opacity 40ms ease-out' }}
                    />
                  )
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="lnKhac" name="Lợi nhuận khác (*)" stackId="pbt" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {profitPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <Cell
                      key={`pbt-khac-${index}`}
                      fill="#d946ef"
                      fillOpacity={isMatch ? 1 : 0.15}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0}
                      className="cursor-pointer"
                      style={{ transition: 'fill-opacity 40ms ease-out' }}
                    />
                  )
                })}
              </Bar>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="lntt"
                name="Lợi nhuận trước thuế (LNTT)"
                stroke="#f97316"
                strokeWidth={2.2}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy) return null
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter != null && q === activeQuarter
                  return (
                    <circle
                      key={`pbt-dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={isMatch ? 5.5 : 2.5}
                      fill="#f97316"
                      stroke={isMatch ? '#ffffff' : 'none'}
                      strokeWidth={isMatch ? 2 : 0}
                      opacity={activeQuarter == null || isMatch ? 1 : 0.15}
                    />
                  )
                }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật chi tiết cơ cấu lợi nhuận
          </div>
        )}
      </div>
    </div>
  )
})

// ── 5. Biểu đồ TÀI SẢN (Bóc Tách Chi Tiết Chuẩn 100% WiData) ──
const DetailedAssetChartCard = React.memo(function DetailedAssetChartCard({
  balancePoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  balancePoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && balancePoints[e.activeTooltipIndex]) {
      q = getQuarter(balancePoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, balancePoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-sky-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Wallet className="size-4 text-sky-400" />
          <span>TÀI SẢN (Tỷ Đồng)</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
          Tổng TS: {latestPoint?.tongTS != null ? `${fmtNum(latestPoint.tongTS)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {balancePoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={balancePoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />
              {/* Stacked Bars chuẩn 100% hình ảnh WiData: TS khác -> ĐTTC dài hạn -> TSCĐ -> Tồn kho -> Phải thu -> ĐTTC ngắn hạn -> Tiền */}
              <Bar yAxisId="left" dataKey="tsKhac" name="Tài sản khác" stackId="ts" fill="#64748b" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-k-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="dtdh" name="Đầu tư tài chính dài hạn" stackId="ts" fill="#334155" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-dtdh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="tscd" name="Tài sản cố định" stackId="ts" fill="#f43f5e" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-cd-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="tk" name="Hàng tồn kho" stackId="ts" fill="#f59e0b" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-tk-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="pt" name="Các khoản phải thu" stackId="ts" fill="#c084fc" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-pt-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="dtnh" name="Đầu tư tài chính ngắn hạn" stackId="ts" fill="#2dd4bf" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-dtnh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="tien" name="Tiền và tương đương tiền" stackId="ts" fill="#38bdf8" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`ts-tien-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật số liệu bảng cân đối tài sản
          </div>
        )}
      </div>
    </div>
  )
})

// ── 6. Biểu đồ NGUỒN VỐN (Bóc Tách Chi Tiết Chuẩn 100% WiData) ──
const DetailedCapitalChartCard = React.memo(function DetailedCapitalChartCard({
  balancePoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  balancePoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && balancePoints[e.activeTooltipIndex]) {
      q = getQuarter(balancePoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, balancePoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-emerald-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <DollarSign className="size-4 text-emerald-400" />
          <span>NGUỒN VỐN (Tỷ Đồng)</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          Tổng NV: {latestPoint?.tongNV != null ? `${fmtNum(latestPoint.tongNV)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {balancePoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={balancePoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />
              {/* Stacked Bars chuẩn 100% WiData: VCSH -> Người mua trả trước -> Phải trả người bán -> Nguồn vốn khác -> Vay dài hạn -> Vay ngắn hạn */}
              <Bar yAxisId="left" dataKey="vcsh" name="Vốn chủ sở hữu" stackId="nv" fill="#3b82f6" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`nv-vcsh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="nmtt" name="Người mua trả trước" stackId="nv" fill="#f97316" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`nv-nmtt-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="ptnb" name="Phải trả người bán" stackId="nv" fill="#a855f7" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`nv-ptnb-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="nvKhac" name="Nguồn vốn khác" stackId="nv" fill="#64748b" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`nv-k-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="vdh" name="Vay và thuê tài chính dài hạn" stackId="nv" fill="#facc15" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`nv-vdh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="vnh" name="Vay và thuê tài chính ngắn hạn" stackId="nv" fill="#f43f5e" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`nv-vnh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật số liệu bảng cân đối nguồn vốn
          </div>
        )}
      </div>
    </div>
  )
})

// ── 7. Biểu đồ LƯU CHUYỂN TIỀN (Chuẩn 100% WiData) ──
const DetailedCashFlowChartCard = React.memo(function DetailedCashFlowChartCard({
  balancePoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  balancePoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && balancePoints[e.activeTooltipIndex]) {
      q = getQuarter(balancePoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, balancePoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-amber-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Activity className="size-4 text-amber-400" />
          <span>LƯU CHUYỂN TIỀN (Tỷ Đồng)</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
          LCTT Thuần: {latestPoint?.netCash != null ? `${fmtNum(latestPoint.netCash)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {balancePoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={balancePoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />
              {/* Stacked Bars với stackId="cf": Recharts tự động xếp các giá trị dương lên trên 0, giá trị âm xuống dưới 0 chuẩn 100% WiData */}
              <Bar yAxisId="left" dataKey="cff" name="LCTT từ hoạt động tài chính" stackId="cf" fill="#facc15" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cf-cff-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="icf" name="LCTT từ hoạt động đầu tư" stackId="cf" fill="#14b8a6" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cf-icf-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="ocf" name="LCTT từ hoạt động kinh doanh" stackId="cf" fill="#6366f1" isAnimationActive={false}>
                {balancePoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cf-ocf-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              {/* Line Lưu chuyển tiền thuần trong kỳ (Đường đỏ hồng uốn lượn) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="netCash"
                name="Lưu chuyển tiền thuần trong kỳ"
                stroke="#f43f5e"
                strokeWidth={2.2}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy) return null
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter != null && q === activeQuarter
                  return (
                    <circle
                      key={`cf-net-dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={isMatch ? 5.5 : 2.5}
                      fill="#f43f5e"
                      stroke={isMatch ? '#ffffff' : 'none'}
                      strokeWidth={isMatch ? 2 : 0}
                      opacity={activeQuarter == null || isMatch ? 1 : 0.2}
                    />
                  )
                }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật số liệu báo cáo lưu chuyển tiền tệ
          </div>
        )}
      </div>
    </div>
  )
})

// ── 7B. Biểu đồ CAPEX VÀ KHẤU HAO (Chuẩn 100% WiData) ──
const DetailedCapexDepreciationCard = React.memo(function DetailedCapexDepreciationCard({
  capexPoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  capexPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && capexPoints[e.activeTooltipIndex]) {
      q = getQuarter(capexPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, capexPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-amber-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <TrendingUp className="size-4 text-amber-400" />
          <span>CAPEX VÀ KHẤU HAO</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded">
            Capex: {latestPoint?.capex != null ? `${fmtNum(latestPoint.capex)} tỷ` : '—'}
          </span>
          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            KH: {latestPoint?.khauHaoAbs != null ? `${fmtNum(latestPoint.khauHaoAbs)} tỷ` : '—'}
          </span>
        </div>
      </div>

      <div className="h-[280px] w-full">
        {capexPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={capexPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />
              
              {/* Cột Chi mua sắm xây dựng TSCĐ (Dương) */}
              <Bar yAxisId="left" dataKey="capex" name="Tiền chi mua sắm xây dựng TSCĐ" fill="#0d9488" isAnimationActive={false}>
                {capexPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <Cell
                      key={`capex-bar-${index}`}
                      fillOpacity={isMatch ? 1 : 0.15}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0}
                      style={{ transition: 'fill-opacity 40ms ease-out' }}
                    />
                  )
                })}
              </Bar>

              {/* Cột Khấu hao tài sản cố định (Âm dưới 0 như chuẩn WiData) */}
              <Bar yAxisId="left" dataKey="khauHao" name="Khấu hao tài sản cố định" fill="#eab308" isAnimationActive={false}>
                {capexPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <Cell
                      key={`kh-bar-${index}`}
                      fillOpacity={isMatch ? 1 : 0.15}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0}
                      style={{ transition: 'fill-opacity 40ms ease-out' }}
                    />
                  )
                })}
              </Bar>

              {/* Đường Line Area CAPEX màu cam/nâu bao đỉnh */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="capex"
                name="CAPEX"
                stroke="#f97316"
                strokeWidth={2}
                fill="rgba(249, 115, 22, 0.15)"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Chưa có dữ liệu Capex & Khấu hao
          </div>
        )}
      </div>
    </div>
  )
})

// ── 7C. Biểu đồ DỰ PHÒNG (Chuẩn 100% WiData) ──
const DetailedProvisionCard = React.memo(function DetailedProvisionCard({
  provisionPoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  provisionPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && provisionPoints[e.activeTooltipIndex]) {
      q = getQuarter(provisionPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, provisionPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-purple-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Briefcase className="size-4 text-purple-400" />
          <span>DỰ PHÒNG</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
          Tổng DP: {latestPoint?.tongDuPhong != null ? `${fmtNum(latestPoint.tongDuPhong)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {provisionPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={provisionPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />

              {/* Dự phòng phải thu dài hạn */}
              <Bar yAxisId="left" dataKey="dpPhaiThuDH" name="Dự phòng phải thu dài hạn" stackId="dp" fill="#dc2626" isAnimationActive={false}>
                {provisionPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`dp-ptdh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Dự phòng tổn thất đầu tư vào đơn vị khác */}
              <Bar yAxisId="left" dataKey="dpDauTuTC" name="Dự phòng tổn thất đầu tư vào đơn vị khác" stackId="dp" fill="#ec4899" isAnimationActive={false}>
                {provisionPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`dp-dttc-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Dự phòng hàng tồn kho */}
              <Bar yAxisId="left" dataKey="dpHangTonKho" name="Dự phòng hàng tồn kho" stackId="dp" fill="#eab308" isAnimationActive={false}>
                {provisionPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`dp-htk-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Dự phòng phải thu ngắn hạn khó đòi */}
              <Bar yAxisId="left" dataKey="dpPhaiThuNH" name="Dự phòng phải thu ngắn hạn khó đòi" stackId="dp" fill="#6366f1" isAnimationActive={false}>
                {provisionPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`dp-ptnh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Chưa có dữ liệu Dự phòng
          </div>
        )}
      </div>
    </div>
  )
})

// ── 7D. Biểu đồ DOANH THU & CHI PHÍ TÀI CHÍNH (Chuẩn 100% WiData) ──
const DetailedFinancialRevenueExpenseCard = React.memo(function DetailedFinancialRevenueExpenseCard({
  financialPoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  financialPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && financialPoints[e.activeTooltipIndex]) {
      q = getQuarter(financialPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, financialPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-sky-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <DollarSign className="size-4 text-sky-400" />
          <span>DOANH THU & CHI PHÍ TÀI CHÍNH</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className="text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
            DT: {latestPoint?.dtTaiChinh != null ? `${fmtNum(latestPoint.dtTaiChinh)} tỷ` : '—'}
          </span>
          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            CP: {latestPoint?.tongCPTaiChinh != null ? `${fmtNum(latestPoint.tongCPTaiChinh)} tỷ` : '—'}
          </span>
        </div>
      </div>

      <div className="h-[280px] w-full">
        {financialPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={financialPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />

              {/* Chi phí tài chính khác */}
              <Bar yAxisId="left" dataKey="cpTaiChinhKhac" name="Chi phí tài chính khác" stackId="cptc" fill="#8b5cf6" isAnimationActive={false}>
                {financialPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cptc-k-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Chi phí lãi vay */}
              <Bar yAxisId="left" dataKey="cpLaiVay" name="Chi phí lãi vay" stackId="cptc" fill="#eab308" isAnimationActive={false}>
                {financialPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cptc-lv-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Đường Doanh thu tài chính Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dtTaiChinh"
                name="Doanh thu tài chính"
                stroke="#38bdf8"
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return (
                    <circle
                      key={`dttc-dot-${props.index}`}
                      cx={cx}
                      cy={cy}
                      r={activeQuarter != null && isMatch ? 4.5 : 2.5}
                      fill={isMatch ? '#38bdf8' : '#334155'}
                      stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'}
                      strokeWidth={1.5}
                      style={{ transition: 'all 40ms ease-out' }}
                    />
                  )
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Chưa có dữ liệu Doanh thu & Chi phí tài chính
          </div>
        )}
      </div>
    </div>
  )
})

// ── 7E. Biểu đồ VAY VÀ NỢ THUÊ TÀI CHÍNH (Chuẩn 100% WiData) ──
const DetailedDebtStructureCard = React.memo(function DetailedDebtStructureCard({
  debtPoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  debtPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && debtPoints[e.activeTooltipIndex]) {
      q = getQuarter(debtPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, debtPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-rose-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Layers className="size-4 text-rose-400" />
          <span>VAY VÀ NỢ THUÊ TÀI CHÍNH</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
          Tổng nợ vay: {latestPoint?.tongNoVay != null ? `${fmtNum(latestPoint.tongNoVay)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {debtPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={debtPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />

              {/* Vay ngắn hạn */}
              <Bar yAxisId="left" dataKey="vayNganHan" name="Vay và thuê TC ngắn hạn" stackId="debt" fill="#f43f5e" isAnimationActive={false}>
                {debtPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`debt-vnh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Vay dài hạn */}
              <Bar yAxisId="left" dataKey="vayDaiHan" name="Vay và thuê TC dài hạn" stackId="debt" fill="#f97316" isAnimationActive={false}>
                {debtPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`debt-vdh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Thuê tài chính */}
              <Bar yAxisId="left" dataKey="thueTaiChinh" name="Thuê tài chính" stackId="debt" fill="#10b981" isAnimationActive={false}>
                {debtPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`debt-ttc-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Trái phiếu phát hành */}
              <Bar yAxisId="left" dataKey="traiPhieu" name="Trái phiếu phát hành" stackId="debt" fill="#eab308" isAnimationActive={false}>
                {debtPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`debt-tp-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Nợ dài hạn khác */}
              <Bar yAxisId="left" dataKey="noDHKhac" name="Nợ dài hạn khác" stackId="debt" fill="#8b5cf6" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {debtPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`debt-k-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Chưa có dữ liệu Vay & Nợ thuê tài chính
          </div>
        )}
      </div>
    </div>
  )
})

// ── 7F. Biểu đồ MÔ HÌNH DUPONT (Chuẩn 100% WiData) ──
const DetailedDupontCard = React.memo(function DetailedDupontCard({
  dupontPoints,
  isQuarter,
  globalQuarter,
  latestPoint,
}: {
  dupontPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestPoint: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && dupontPoints[e.activeTooltipIndex]) {
      q = getQuarter(dupontPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, dupontPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-teal-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Activity className="size-4 text-teal-400" />
          <span>MÔ HÌNH DUPONT (PHÂN TÍCH ROE)</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded">
            ROE: {latestPoint?.roe != null ? `${latestPoint.roe}%` : '—'}
          </span>
          <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
            Đòn bẩy: {latestPoint?.equityMultiplier != null ? `${latestPoint.equityMultiplier}x` : '—'}
          </span>
        </div>
      </div>

      <div className="h-[280px] w-full">
        {dupontPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={dupontPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              {/* Trục trái: Tỷ lệ % (ROE và Biên lãi ròng) */}
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}%`} />
              {/* Trục phải: Hệ số lần/vòng (Đòn bẩy tài chính và Vòng quay tài sản) */}
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Number(v).toFixed(1)}x`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} />

              {/* Cột ROE (%) */}
              <Bar yAxisId="left" dataKey="roe" name="ROE (%)" fill="#14b8a6" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {dupontPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`dupont-roe-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>

              {/* Line: Đòn bẩy tài chính (Tổng tài sản / Vốn chủ sở hữu) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="equityMultiplier"
                name="Tổng tài sản/Vốn chủ sở hữu (Đòn bẩy)"
                stroke="#f43f5e"
                strokeWidth={2.2}
                isAnimationActive={false}
                dot={{ r: 3, fill: '#f43f5e' }}
              />

              {/* Line: Vòng quay tài sản */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="assetTurnover"
                name="Vòng quay tài sản (lần)"
                stroke="#eab308"
                strokeWidth={2}
                strokeDasharray="4 2"
                isAnimationActive={false}
                dot={{ r: 2.5, fill: '#eab308' }}
              />

              {/* Line: Biên lợi nhuận ròng (%) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="netMargin"
                name="Biên lãi ròng (%)"
                stroke="#6366f1"
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ r: 2.5, fill: '#6366f1' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Chưa có dữ liệu Mô hình DuPont
          </div>
        )}
      </div>
    </div>
  )
})

// ── 8. Biểu đồ BÓC TÁCH CHI PHÍ KINH DOANH (Chuẩn 100% WiData) ──
const CostBreakdownChartCard = React.memo(function CostBreakdownChartCard({
  costPoints,
  isQuarter,
  globalQuarter,
  latestCost,
}: {
  costPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestCost: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && costPoints[e.activeTooltipIndex]) {
      q = getQuarter(costPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, costPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-rose-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Receipt className="size-4 text-rose-400" />
          <span>Bóc Tách Chi Phí Kinh Doanh</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
          Tổng CP: {latestCost?.tongChiPhi != null ? `${fmtNum(latestCost.tongChiPhi)} tỷ` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {costPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={costPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '9.5px', paddingTop: '4px' }} />
              <Bar yAxisId="left" dataKey="giaVon" name="Chi phí giá vốn" stackId="cost" fill="#f87171" isAnimationActive={false}>
                {costPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cost-gv-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="cpBanHang" name="Chi phí bán hàng" stackId="cost" fill="#2dd4bf" isAnimationActive={false}>
                {costPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cost-bh-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="cpQuanLy" name="Chi phí quản lý" stackId="cost" fill="#818cf8" isAnimationActive={false}>
                {costPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cost-ql-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Bar yAxisId="left" dataKey="cpLaiVay" name="Chi phí lãi vay" stackId="cost" fill="#facc15" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {costPoints.map((entry, index) => {
                  const q = getQuarter(entry)
                  const isMatch = activeQuarter == null || q === activeQuarter
                  return <Cell key={`cost-lv-${index}`} fillOpacity={isMatch ? 1 : 0.15} stroke={activeQuarter != null && isMatch ? '#ffffff' : 'none'} strokeWidth={activeQuarter != null && isMatch ? 1.5 : 0} style={{ transition: 'fill-opacity 40ms ease-out' }} />
                })}
              </Bar>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="doanhThuThuan"
                name="Doanh thu thuần"
                stroke="#e2e8f0"
                strokeWidth={2.2}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy) return null
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter != null && q === activeQuarter
                  return (
                    <circle
                      key={`cost-dt-dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={isMatch ? 5.5 : 2.5}
                      fill="#e2e8f0"
                      stroke={isMatch ? '#ffffff' : 'none'}
                      strokeWidth={isMatch ? 2 : 0}
                      opacity={activeQuarter == null || isMatch ? 1 : 0.2}
                    />
                  )
                }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật chi tiết bóc tách chi phí
          </div>
        )}
      </div>
    </div>
  )
})

// ── 9. Biểu đồ TỶ TRỌNG CHI PHÍ (% Trên Doanh Thu - Chuẩn 100% WiData) ──
const CostRatioChartCard = React.memo(function CostRatioChartCard({
  costPoints,
  isQuarter,
  globalQuarter,
  latestCost,
}: {
  costPoints: any[]
  isQuarter: boolean
  globalQuarter: number | null
  latestCost: any
}) {
  const [localHoverQuarter, setLocalHoverQuarter] = useState<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const activeQuarter = globalQuarter ?? localHoverQuarter

  const handleMouseMove = useCallback((e: any) => {
    if (!isQuarter || globalQuarter != null) return
    let q: number | null = null
    if (e?.activePayload && e.activePayload.length > 0) {
      q = getQuarter(e.activePayload[0]?.payload)
    }
    if (!q && e?.activeLabel && typeof e.activeLabel === 'string') {
      const m = e.activeLabel.match(/Q([1-4])/i)
      if (m) q = parseInt(m[1], 10)
    }
    if (!q && typeof e?.activeTooltipIndex === 'number' && costPoints[e.activeTooltipIndex]) {
      q = getQuarter(costPoints[e.activeTooltipIndex])
    }
    if (q && q >= 1 && q <= 4 && lastRef.current !== q) {
      lastRef.current = q
      setLocalHoverQuarter(q)
    }
  }, [isQuarter, globalQuarter, costPoints])

  const handleMouseLeave = useCallback(() => {
    lastRef.current = null
    setLocalHoverQuarter(null)
  }, [])

  const tickRenderer = useMemo(() => isQuarter ? createQuarterTickRenderer(activeQuarter) : undefined, [isQuarter, activeQuarter])

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-emerald-500/40"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
          <Percent className="size-4 text-emerald-400" />
          <span>Tỷ Trọng Chi Phí</span>
          {activeQuarter && isQuarter && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              Q{activeQuarter} cùng kỳ
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          % Giá vốn: {latestCost?.pctGiaVon != null ? `${latestCost.pctGiaVon.toFixed(1)}%` : '—'}
        </span>
      </div>

      <div className="h-[280px] w-full">
        {costPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={costPoints}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={handleMouseMove}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="displayDate" tick={tickRenderer || { fontSize: 10, fill: '#888' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} unit="%" domain={[0, 'auto']} />
              <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} animationDuration={0} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ fontSize: '9.5px', paddingTop: '4px' }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="pctGiaVon"
                name="% Chi phí giá vốn"
                stroke="#f87171"
                fill="#f87171"
                fillOpacity={0.22}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pctBanHang"
                name="% Chi phí bán hàng"
                stroke="#2dd4bf"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy) return null
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter != null && q === activeQuarter
                  if (!isMatch) return null
                  return <circle cx={cx} cy={cy} r={4.5} fill="#2dd4bf" stroke="#ffffff" strokeWidth={1.5} />
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pctQuanLy"
                name="% Chi phí quản lý"
                stroke="#818cf8"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy) return null
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter != null && q === activeQuarter
                  if (!isMatch) return null
                  return <circle cx={cx} cy={cy} r={4.5} fill="#818cf8" stroke="#ffffff" strokeWidth={1.5} />
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pctLaiVay"
                name="% Chi phí lãi vay"
                stroke="#facc15"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy) return null
                  const q = getQuarter(payload)
                  const isMatch = activeQuarter != null && q === activeQuarter
                  if (!isMatch) return null
                  return <circle cx={cx} cy={cy} r={4.5} fill="#facc15" stroke="#ffffff" strokeWidth={1.5} />
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Đang cập nhật tỷ trọng chi phí
          </div>
        )}
      </div>
    </div>
  )
})

// ══════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ══════════════════════════════════════════════════════════════════
export function GeneralDetailedFinancialCharts({
  symbol,
  quarterData,
  annualData,
  businessPlanData = null,
  profitStructureQuarter = null,
  profitStructureAnnual = null,
  costBreakdownQuarter = null,
  costBreakdownAnnual = null,
  balanceSheetQuarter = null,
  balanceSheetAnnual = null,
  capexFinancialQuarter = null,
  capexFinancialAnnual = null,
  debtDupontQuarter = null,
  debtDupontAnnual = null,
}: GeneralDetailedFinancialChartsProps) {
  const [periodType, setPeriodType] = useState<'quarter' | 'annual'>('quarter')
  const [globalLockedQuarter, setGlobalLockedQuarter] = useState<number | null>(null)

  const currentData = periodType === 'quarter' ? quarterData : annualData

  // 1. Dữ liệu chuỗi thời gian cho các biểu đồ tài chính cơ bản
  const chartPoints = useMemo(() => {
    if (!currentData) return []
    const dates: string[] =
      periodType === 'quarter'
        ? currentData.newFiscalDateQuarter || []
        : currentData.newFiscalDateYear || []

    return dates.map((d, i) => {
      const nguyenGia = currentData.tsNguyenGiaTscdHuuHinh?.[i] || 0
      const khauHao = Math.abs(currentData.tsKhauHaoTscdHuuHinhLuyKe?.[i] || 0)
      const pctKhauHao = nguyenGia > 0 ? (khauHao / nguyenGia) * 100 : null
      const qNum = periodType === 'quarter' ? Math.ceil(parseInt(d.split('-')[1], 10) / 3) : null

      return {
        date: d,
        displayDate: fmtPeriod(d, periodType === 'quarter'),
        quarterNum: qNum,
        doanhThu: currentData.doanhSoThuan?.[i] || 0,
        tangTruongDT: currentData.tangTruongDoanhSoThuanYoY?.[i] != null ? Number(currentData.tangTruongDoanhSoThuanYoY[i]) : null,
        lnst: currentData.lnst?.[i] || 0,
        tangTruongLNST: currentData.tangTruongLNSTYoY?.[i] != null ? Number(currentData.tangTruongLNSTYoY[i]) : null,
        bienGop: currentData.bienLoiNhuanGop?.[i] != null ? Number(currentData.bienLoiNhuanGop[i]) : null,
        bienRong: currentData.bienLoiNhuanRong?.[i] != null ? Number(currentData.bienLoiNhuanRong[i]) : null,
        roe: currentData.ROECuoiKy?.[i] != null ? Number(currentData.ROECuoiKy[i]) : null,
        roa: currentData.ROACuoiKy?.[i] != null ? Number(currentData.ROACuoiKy[i]) : null,
        nguyenGia,
        khauHao,
        pctKhauHao: pctKhauHao != null ? parseFloat(pctKhauHao.toFixed(1)) : null,
        vongQuayTonKho: currentData.hangTonKhoVongQuay?.[i] != null ? Number(currentData.hangTonKhoVongQuay[i]) : null,
      }
    })
  }, [currentData, periodType])

  const displayPoints = useMemo(() => {
    if (periodType === 'quarter') {
      return chartPoints.slice(-20)
    }
    return chartPoints
  }, [chartPoints, periodType])

  // 2. Dữ liệu Kế hoạch & Dự phóng KQKD
  const planChartPoints = useMemo(() => {
    if (businessPlanData?.data && Array.isArray(businessPlanData.data) && businessPlanData.data.length > 0) {
      const sorted = [...businessPlanData.data].sort((a, b) => a.year - b.year).slice(-5)
      return sorted.map((p) => {
        const fullYear = p.quarter?.find((q: any) => q.quarter === 0)
        return {
          year: `${p.year}`,
          keHoachDT: p.isa3 != null ? Number(p.isa3) : null,
          thucHienDT: fullYear?.isa3_report != null ? Number(fullYear.isa3_report) : null,
          keHoachLNST: p.isa22 != null ? Number(p.isa22) : null,
          thucHienLNST: fullYear?.isa22_report != null ? Number(fullYear.isa22_report) : null,
          pctDatLNST: fullYear?.isa22_percent != null ? Number(fullYear.isa22_percent) : null,
        }
      })
    }

    if (annualData?.newFiscalDateYear && annualData.newFiscalDateYear.length > 0) {
      const years = annualData.newFiscalDateYear.slice(-5)
      return years.map((d) => {
        const idx = annualData.newFiscalDateYear!.indexOf(d)
        return {
          year: d.slice(0, 4),
          keHoachDT: null,
          thucHienDT: annualData.doanhSoThuan?.[idx] || 0,
          keHoachLNST: null,
          thucHienLNST: annualData.lnst?.[idx] || 0,
          pctDatLNST: null,
        }
      })
    }

    return []
  }, [businessPlanData, annualData])

  // 3. Dữ liệu CƠ CẤU LỢI NHUẬN TRƯỚC THUẾ
  const currentProfitStructure =
    periodType === 'quarter' ? profitStructureQuarter : profitStructureAnnual

  const profitPoints = useMemo(() => {
    if (!currentProfitStructure?.points || currentProfitStructure.points.length === 0) {
      return []
    }
    const pointsWithQ = currentProfitStructure.points.map((p) => ({
      ...p,
      quarterNum: periodType === 'quarter' ? Math.ceil(parseInt(p.date.split('-')[1], 10) / 3) : null,
    }))
    if (periodType === 'quarter') {
      return pointsWithQ.slice(-20)
    }
    return pointsWithQ
  }, [currentProfitStructure, periodType])

  // 4. Dữ liệu BẢNG CÂN ĐỐI (TÀI SẢN, NGUỒN VỐN & LƯU CHUYỂN TIỀN - Chuẩn 100% WiData)
  const currentBalanceSheet =
    periodType === 'quarter' ? balanceSheetQuarter : balanceSheetAnnual

  const balancePoints = useMemo(() => {
    if (!currentBalanceSheet?.points || currentBalanceSheet.points.length === 0) {
      return []
    }
    const pointsWithQ = currentBalanceSheet.points.map((p) => ({
      ...p,
      quarterNum: periodType === 'quarter' ? Math.ceil(parseInt(p.date.split('-')[1], 10) / 3) : null,
    }))
    if (periodType === 'quarter') {
      return pointsWithQ.slice(-20)
    }
    return pointsWithQ
  }, [currentBalanceSheet, periodType])

  // 5. Dữ liệu BÓC TÁCH CHI PHÍ & TỶ TRỌNG CHI PHÍ
  const currentCostBreakdown =
    periodType === 'quarter' ? costBreakdownQuarter : costBreakdownAnnual

  const costPoints = useMemo(() => {
    if (!currentCostBreakdown?.points || currentCostBreakdown.points.length === 0) {
      return []
    }
    const pointsWithQ = currentCostBreakdown.points.map((p) => ({
      ...p,
      quarterNum: periodType === 'quarter' ? Math.ceil(parseInt(p.date.split('-')[1], 10) / 3) : null,
    }))
    if (periodType === 'quarter') {
      return pointsWithQ.slice(-20)
    }
    return pointsWithQ
  }, [currentCostBreakdown, periodType])

  // 6. Dữ liệu CAPEX & KHẤU HAO, DỰ PHÒNG, DOANH THU & CP TÀI CHÍNH (Chuẩn WiData)
  const currentCapexFinancial =
    periodType === 'quarter' ? capexFinancialQuarter : capexFinancialAnnual

  const capexFinancialPoints = useMemo(() => {
    if (!currentCapexFinancial?.points || currentCapexFinancial.points.length === 0) {
      return []
    }
    const pointsWithQ = currentCapexFinancial.points.map((p) => ({
      ...p,
      quarterNum: periodType === 'quarter' ? Math.ceil(parseInt(p.date.split('-')[1], 10) / 3) : null,
    }))
    if (periodType === 'quarter') {
      return pointsWithQ.slice(-20)
    }
    return pointsWithQ
  }, [currentCapexFinancial, periodType])

  // 7. Dữ liệu VAY & NỢ THUÊ TÀI CHÍNH & MÔ HÌNH DUPONT (Chuẩn WiData)
  const currentDebtDupont =
    periodType === 'quarter' ? debtDupontQuarter : debtDupontAnnual

  const debtDupontPoints = useMemo(() => {
    if (!currentDebtDupont?.points || currentDebtDupont.points.length === 0) {
      return []
    }
    const pointsWithQ = currentDebtDupont.points.map((p) => ({
      ...p,
      quarterNum: periodType === 'quarter' ? Math.ceil(parseInt(p.date.split('-')[1], 10) / 3) : null,
    }))
    if (periodType === 'quarter') {
      return pointsWithQ.slice(-20)
    }
    return pointsWithQ
  }, [currentDebtDupont, periodType])

  if (!currentData || chartPoints.length === 0) return null

  const latest = chartPoints[chartPoints.length - 1]
  const latestPlan = planChartPoints[planChartPoints.length - 1]
  const latestProfit = profitPoints[profitPoints.length - 1]
  const latestBalance = balancePoints[balancePoints.length - 1]
  const latestCost = costPoints[costPoints.length - 1]
  const latestCapex = capexFinancialPoints[capexFinancialPoints.length - 1]
  const latestDebtDupont = debtDupontPoints[debtDupontPoints.length - 1]
  const isQuarter = periodType === 'quarter'

  return (
    <div className="w-full space-y-6">
      {/* ══════════════════════════════════════════════════════════ */}
      {/* HEADER: THANH CÔNG CỤ THEO PHONG CÁCH WIDATA               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                  Biểu Đồ Tài Chính Doanh Nghiệp {symbol}
                </h2>
                <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400">
                  {latest?.displayDate}
                </span>

                {/* Huy hiệu khi ghim toàn cục */}
                {globalLockedQuarter && isQuarter && (
                  <div className="flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 animate-in fade-in zoom-in-95 duration-150">
                    <Lock className="size-3 text-amber-400" />
                    <span>Đang lọc tất cả bảng: Quý {globalLockedQuarter}</span>
                    <button
                      type="button"
                      onClick={() => setGlobalLockedQuarter(null)}
                      className="ml-1 cursor-pointer text-[10px] text-amber-300 hover:text-white"
                      title="Bỏ lọc toàn bộ"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Chuỗi dữ liệu BCTC kiểm toán ({displayPoints.length} kỳ) · Rê chuột vào bảng nào thì riêng bảng đó sáng cùng kỳ siêu nhạy (0 delay)
              </p>
            </div>
          </div>

          {/* Bộ chuyển đổi Theo Quý / Theo Năm */}
          <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setPeriodType('quarter')
                setGlobalLockedQuarter(null)
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                isQuarter
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="size-3.5" />
              <span>Theo Quý ({quarterData?.newFiscalDateQuarter?.length || 0} kỳ)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodType('annual')
                setGlobalLockedQuarter(null)
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                !isQuarter
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="size-3.5" />
              <span>Theo Năm ({annualData?.newFiscalDateYear?.length || 0} năm)</span>
            </button>
          </div>
        </div>

        {/* Thanh nút bấm nhanh Soi Cùng Kỳ Toàn Bộ (Khi muốn áp dụng cho mọi bảng) */}
        {isQuarter && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mr-1">
              <Eye className="size-3.5 text-sky-400" />
              Lọc cùng kỳ toàn bộ bảng:
            </span>
            {[
              { label: 'Mặc định (tự do theo bảng)', q: null },
              { label: 'Quý 1 tất cả bảng', q: 1 },
              { label: 'Quý 2 tất cả bảng', q: 2 },
              { label: 'Quý 3 tất cả bảng', q: 3 },
              { label: 'Quý 4 tất cả bảng', q: 4 },
            ].map((btn) => {
              const isSelected = globalLockedQuarter === btn.q
              return (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setGlobalLockedQuarter((prev) => (prev === btn.q ? null : btn.q))}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1',
                    isSelected && globalLockedQuarter !== null
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                      : isSelected && globalLockedQuarter === null
                      ? 'bg-muted text-foreground border-border/80'
                      : 'bg-card/80 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  {isSelected && globalLockedQuarter !== null && <Lock className="size-2.5" />}
                  <span>{btn.label}</span>
                </button>
              )
            })}
            {globalLockedQuarter !== null && (
              <button
                type="button"
                onClick={() => setGlobalLockedQuarter(null)}
                className="px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                title="Bỏ lọc toàn bộ"
              >
                <RotateCcw className="size-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI 1: HIỆU QUẢ KINH DOANH CỐT LÕI (4 BIỂU ĐỒ)            */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* ── BIỂU ĐỒ 1: DOANH THU THUẦN & TĂNG TRƯỞNG YoY ── */}
        <RevenueChartCard
          data={displayPoints}
          isQuarter={isQuarter}
          globalQuarter={globalLockedQuarter}
          latest={latest}
        />

        {/* ── BIỂU ĐỒ 2: LỢI NHUẬN SAU THUẾ CÔNG TY MẸ & TĂNG TRƯỞNG YoY ── */}
        <ProfitChartCard
          data={displayPoints}
          isQuarter={isQuarter}
          globalQuarter={globalLockedQuarter}
          latest={latest}
        />

        {/* ── BIỂU ĐỒ 3: KẾT QUẢ KINH DOANH DỰ PHÓNG & KẾ HOẠCH NĂM ── */}
        <PlanChartCard
          planChartPoints={planChartPoints}
          latestPlan={latestPlan}
        />

        {/* ── BIỂU ĐỒ 4: CƠ CẤU LỢI NHUẬN TRƯỚC THUẾ (CHUẨN 100% WIDATA) ── */}
        <ProfitStructureChartCard
          profitPoints={profitPoints}
          isQuarter={isQuarter}
          globalQuarter={globalLockedQuarter}
          latestProfit={latestProfit}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI 2: CÂN ĐỐI KẾ TOÁN & DÒNG TIỀN (CHUẨN 100% WIDATA)    */}
      {/* [ TÀI SẢN ] [ NGUỒN VỐN ] [ LƯU CHUYỂN TIỀN ]              */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Wallet className="size-4 text-sky-400" />
          <span>Cân Đối Kế Toán & Dòng Tiền Hoạt Động (Chuẩn Hóa)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* ── BIỂU ĐỒ 5: TÀI SẢN ── */}
          <DetailedAssetChartCard
            balancePoints={balancePoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestBalance}
          />

          {/* ── BIỂU ĐỒ 6: NGUỒN VỐN ── */}
          <DetailedCapitalChartCard
            balancePoints={balancePoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestBalance}
          />

          {/* ── BIỂU ĐỒ 7: LƯU CHUYỂN TIỀN ── */}
          <DetailedCashFlowChartCard
            balancePoints={balancePoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestBalance}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI 3: CAPEX & KHẤU HAO, DỰ PHÒNG, TÀI CHÍNH (CHUẨN WIDATA) */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="size-4 text-amber-400" />
          <span>Đầu Tư TSCĐ, Dự Phòng & Hoạt Động Tài Chính (Chi Tiết)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Biểu đồ: CAPEX VÀ KHẤU HAO */}
          <DetailedCapexDepreciationCard
            capexPoints={capexFinancialPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestCapex}
          />

          {/* Biểu đồ: DỰ PHÒNG */}
          <DetailedProvisionCard
            provisionPoints={capexFinancialPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestCapex}
          />

          {/* Biểu đồ: DOANH THU & CHI PHÍ TÀI CHÍNH */}
          <DetailedFinancialRevenueExpenseCard
            financialPoints={capexFinancialPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestCapex}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI: CƠ CẤU NỢ VAY & MÔ HÌNH DUPONT (CHUẨN WIDATA)        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Activity className="size-4 text-teal-400" />
          <span>Cơ Cấu Nợ Vay & Phân Tích Lợi Nhuận DuPont (Chuyên Sâu)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Biểu đồ: VAY VÀ NỢ THUÊ TÀI CHÍNH */}
          <DetailedDebtStructureCard
            debtPoints={debtDupontPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestDebtDupont}
          />

          {/* Biểu đồ: MÔ HÌNH DUPONT */}
          <DetailedDupontCard
            dupontPoints={debtDupontPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestPoint={latestDebtDupont}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI: BỘ 3 BIỂU ĐỒ THỊ TRƯỜNG & ĐỊNH GIÁ (CHUẨN WIDATA)   */}
      {/* [ ĐỊNH GIÁ ] [ GIÁ KHUYẾN NGHỊ ] [ GIAO DỊCH NỘI BỘ ]     */}
      {/* ══════════════════════════════════════════════════════════ */}
      <WiDataStandardRow symbol={symbol} />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI: BỘ 3 BIỂU ĐỒ BÓC TÁCH DOANH THU & LỢI NHUẬN MẢNG    */}
      {/* (DOANH THU THEO MẢNG / DOANH THU THUẦN / LỢI NHUẬN GỘP)   */}
      {/* ══════════════════════════════════════════════════════════ */}
      <MWGSegmentCharts symbol={symbol} />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* KHỐI 4: BÓC TÁCH & TỶ TRỌNG CHI PHÍ (CHUẨN WIDATA)         */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Receipt className="size-4 text-rose-400" />
          <span>Bóc Tách & Tỷ Trọng Chi Phí Hoạt Động (Phân Tích Sâu)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Biểu đồ 8: Bóc Tách Chi Phí Kinh Doanh */}
          <CostBreakdownChartCard
            costPoints={costPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestCost={latestCost}
          />

          {/* Biểu đồ 9: Tỷ Trọng Chi Phí */}
          <CostRatioChartCard
            costPoints={costPoints}
            isQuarter={isQuarter}
            globalQuarter={globalLockedQuarter}
            latestCost={latestCost}
          />
        </div>
      </div>
    </div>
  )
}
