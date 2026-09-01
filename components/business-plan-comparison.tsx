'use client'

import { useState } from 'react'
import { CheckCircle2, TrendingUp, AlertCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BusinessPlanYear {
  year: number
  targetRevenue: number | null
  actualRevenue: number | null
  revenueAchievement: number | null
  targetPbt: number | null
  actualPbt: number | null
  pbtAchievement: number | null
  targetPat: number | null
  actualPat: number | null
  patAchievement: number | null
}

interface BusinessPlanComparisonProps {
  ticker: string
  plans?: BusinessPlanYear[]
}

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

export function BusinessPlanComparison({ ticker, plans = [] }: BusinessPlanComparisonProps) {
  const [selectedRange, setSelectedRange] = useState<'3' | '5' | '10'>('5')

  if (!plans || plans.length === 0) return null

  const displayCount = selectedRange === '3' ? 3 : selectedRange === '5' ? 5 : 10
  const displayedPlans = [...plans].slice(-displayCount)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground sm:text-base">
              Kế Hoạch Kinh Doanh & Tỷ Lệ Hoàn Thành
            </h3>
            <p className="text-xs text-muted-foreground">
              So sánh chỉ tiêu ĐHĐCĐ giao vs Kết quả thực hiện thực tế qua các năm
            </p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-lg border border-border bg-background p-0.5 text-xs font-semibold">
          {(['3', '5', '10'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRange(r)}
              className={cn(
                'rounded-md px-3 py-1 transition-colors',
                selectedRange === r
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r} năm
            </button>
          ))}
        </div>
      </div>

      {/* Table Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            {/* Header Level 1: Years */}
            <tr className="border-b border-border/80 bg-muted/50 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 px-4 sticky left-0 bg-muted/90 backdrop-blur-xs min-w-[150px]">
                Chỉ tiêu (Tỷ đ)
              </th>
              {displayedPlans.map((p) => (
                <th key={p.year} colSpan={3} className="py-2.5 px-2 text-center border-l border-border/50">
                  <span className="font-bold text-foreground">Năm {p.year}</span>
                </th>
              ))}
            </tr>
            {/* Header Level 2: Target / Actual / % Done */}
            <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-semibold text-muted-foreground">
              <th className="py-2 px-4 sticky left-0 bg-muted/80 backdrop-blur-xs"></th>
              {displayedPlans.map((p) => (
                <div key={`sub-${p.year}`} className="contents">
                  <th className="py-1.5 px-2 text-right border-l border-border/40 min-w-[70px]">Kế hoạch</th>
                  <th className="py-1.5 px-2 text-right min-w-[70px]">Thực hiện</th>
                  <th className="py-1.5 px-2 text-right min-w-[75px]">Đạt được</th>
                </div>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60 text-[#D0D7DE]">
            {/* 1. Doanh thu */}
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="py-2.5 px-4 font-semibold text-foreground sticky left-0 bg-card">
                Doanh thu
              </td>
              {displayedPlans.map((p) => {
                const ach = p.revenueAchievement
                const isOver = ach != null && ach >= 100
                return (
                  <div key={`rev-${p.year}`} className="contents font-mono">
                    <td className="py-2.5 px-2 text-right text-muted-foreground border-l border-border/40">
                      {fmt(p.targetRevenue)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-foreground font-medium">
                      {fmt(p.actualRevenue)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold">
                      {ach != null ? (
                        <span className={cn('px-1.5 py-0.5 rounded text-[11px]', isOver ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                          {ach.toFixed(2)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </div>
                )
              })}
            </tr>

            {/* 2. Lợi nhuận trước thuế */}
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="py-2.5 px-4 font-semibold text-foreground sticky left-0 bg-card">
                LN trước thuế
              </td>
              {displayedPlans.map((p) => {
                const ach = p.pbtAchievement
                const isOver = ach != null && ach >= 100
                return (
                  <div key={`pbt-${p.year}`} className="contents font-mono">
                    <td className="py-2.5 px-2 text-right text-muted-foreground border-l border-border/40">
                      {fmt(p.targetPbt)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-foreground font-medium">
                      {fmt(p.actualPbt)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold">
                      {ach != null ? (
                        <span className={cn('px-1.5 py-0.5 rounded text-[11px]', isOver ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                          {ach.toFixed(2)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </div>
                )
              })}
            </tr>

            {/* 3. Lợi nhuận sau thuế */}
            <tr className="hover:bg-muted/20 transition-colors bg-muted/[0.08]">
              <td className="py-2.5 px-4 font-bold text-foreground sticky left-0 bg-card">
                LN sau thuế
              </td>
              {displayedPlans.map((p) => {
                const ach = p.patAchievement
                const isOver = ach != null && ach >= 100
                return (
                  <div key={`pat-${p.year}`} className="contents font-mono">
                    <td className="py-2.5 px-2 text-right text-muted-foreground border-l border-border/40">
                      {fmt(p.targetPat)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-foreground font-bold">
                      {fmt(p.actualPat)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold">
                      {ach != null ? (
                        <span className={cn('px-1.5 py-0.5 rounded text-[11px]', isOver ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-500')}>
                          {ach.toFixed(2)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </div>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-border/50 bg-muted/20 px-5 py-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Tỷ lệ hoàn thành xanh lá: Vượt chỉ tiêu ĐHĐCĐ giao (≥ 100%)
        </span>
        <span>Đơn vị: Tỷ VNĐ</span>
      </div>
    </div>
  )
}
