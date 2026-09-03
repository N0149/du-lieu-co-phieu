'use client'

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, FileText, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BusinessPlanYearData, RawBusinessPlanPayload } from '@/lib/business-plan-db'

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
  const val = Number(n)
  if (val === 0) return '0'
  return val.toLocaleString('vi-VN', {
    minimumFractionDigits: Math.abs(val) < 10 && Math.abs(val) > 0 ? 1 : 0,
    maximumFractionDigits: 1,
  })
}

function fmtPercent(p: number | null | undefined): { text: string; isSuccess: boolean | null } {
  if (p == null || isNaN(Number(p))) return { text: '—', isSuccess: null }
  const val = Number(p)
  return {
    text: `${val.toFixed(2)}%`,
    isSuccess: val >= 100,
  }
}

export function BusinessPlanComparison({ ticker, plans = [] }: BusinessPlanComparisonProps) {
  const [selectedRange, setSelectedRange] = useState<'1' | '3' | '5' | '10'>('10')
  const [planData, setPlanData] = useState<BusinessPlanYearData[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch real authentic business plans from internal API
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetch(`/api/business-plan/${encodeURIComponent(ticker)}`)
      .then((res) => res.json())
      .then((data: RawBusinessPlanPayload) => {
        if (isMounted) {
          if (data && Array.isArray(data.data) && data.data.length > 0) {
            // Sort ascending by year
            const sorted = [...data.data].sort((a, b) => a.year - b.year)
            setPlanData(sorted)
          }
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Lỗi tải kế hoạch kinh doanh:', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [ticker])

  // Normalise data items
  const items = useMemo(() => {
    if (planData && planData.length > 0) {
      return planData.map((d) => {
        const fullYearQuarter = d.quarter?.find((q) => q.quarter === 0) || null
        return {
          year: d.year,
          targetRevenue: d.isa3 ?? null,
          actualRevenue: fullYearQuarter?.isa3_report ?? null,
          revenueAchievement: fullYearQuarter?.isa3_percent ?? (d.isa3 && fullYearQuarter?.isa3_report ? (fullYearQuarter.isa3_report / d.isa3) * 100 : null),

          targetPbt: d.isa16 ?? null,
          actualPbt: fullYearQuarter?.isa16_report ?? null,
          pbtAchievement: fullYearQuarter?.isa16_percent ?? (d.isa16 && fullYearQuarter?.isa16_report ? (fullYearQuarter.isa16_report / d.isa16) * 100 : null),

          targetPat: d.isa22 ?? null,
          actualPat: fullYearQuarter?.isa22_report ?? null,
          patAchievement: fullYearQuarter?.isa22_percent ?? (d.isa22 && fullYearQuarter?.isa22_report ? (fullYearQuarter.isa22_report / d.isa22) * 100 : null),
        }
      })
    }

    if (plans && plans.length > 0) {
      return [...plans].sort((a, b) => a.year - b.year)
    }

    return []
  }, [planData, plans])

  if (!loading && items.length === 0) return null

  const count =
    selectedRange === '1' ? 1 :
    selectedRange === '3' ? 3 :
    selectedRange === '5' ? 5 : 10

  const displayedItems = items.slice(-count)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Kế Hoạch Kinh Doanh
              </h3>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {ticker}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              So sánh chỉ tiêu ĐHĐCĐ giao vs Kết quả thực hiện thực tế qua các năm (Đơn vị: Tỷ VNĐ)
            </p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto rounded-xl border border-border bg-background p-0.5 text-xs font-semibold shadow-2xs">
          {(['1', '3', '5', '10'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-colors cursor-pointer',
                selectedRange === r
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r} năm
            </button>
          ))}
        </div>
      </div>

      {/* Table Matrix */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          <div className="inline-block size-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-1.5" />
          <p>Đang tải kế hoạch kinh doanh...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header Level 1: Years */}
              <tr className="border-b border-border/80 bg-muted/60 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4 sticky left-0 bg-card border-r border-border/60 z-10 min-w-[160px] font-sans font-bold text-foreground shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Chỉ tiêu (Tỷ đ)
                </th>
                {displayedItems.map((p) => (
                  <th
                    key={p.year}
                    colSpan={3}
                    className="py-3 px-2 text-center border-l border-border/60 bg-muted/30"
                  >
                    <span className="font-bold text-foreground text-xs">{p.year}</span>
                  </th>
                ))}
              </tr>

              {/* Header Level 2: Target / Actual / % Done */}
              <tr className="border-b border-border bg-muted/40 text-[10.5px] uppercase font-semibold text-muted-foreground">
                <th className="py-2 px-4 sticky left-0 bg-card border-r border-border/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]"></th>
                {displayedItems.map((p) => (
                  <th key={`sub-${p.year}`} colSpan={3} className="p-0 border-l border-border/60">
                    <div className="grid grid-cols-3 divide-x divide-border/40 text-right">
                      <span className="py-2 px-2 text-[10.5px] text-muted-foreground">Kế hoạch</span>
                      <span className="py-2 px-2 text-[10.5px] text-foreground font-medium">Thực hiện</span>
                      <span className="py-2 px-2 text-[10.5px] text-muted-foreground">Đạt được</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60 font-mono">
              {/* ── ROW 1: DOANH THU ── */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 font-sans font-bold text-foreground sticky left-0 bg-card border-r border-border/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Doanh thu
                </td>
                {displayedItems.map((p) => {
                  const ach = fmtPercent(p.revenueAchievement)
                  return (
                    <td key={`rev-${p.year}`} colSpan={3} className="p-0 border-l border-border/60">
                      <div className="grid grid-cols-3 divide-x divide-border/40 text-right items-center">
                        <span className="py-3 px-2 text-muted-foreground">
                          {fmt(p.targetRevenue)}
                        </span>
                        <span className="py-3 px-2 font-bold text-foreground">
                          {fmt(p.actualRevenue)}
                        </span>
                        <span
                          className={cn(
                            'py-3 px-2 font-bold',
                            ach.isSuccess === true && 'text-emerald-500',
                            ach.isSuccess === false && 'text-rose-500'
                          )}
                        >
                          {ach.text}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* ── ROW 2: LN TRƯỚC THUẾ ── */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 font-sans font-bold text-foreground sticky left-0 bg-card border-r border-border/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  LN trước thuế
                </td>
                {displayedItems.map((p) => {
                  const ach = fmtPercent(p.pbtAchievement)
                  return (
                    <td key={`pbt-${p.year}`} colSpan={3} className="p-0 border-l border-border/60">
                      <div className="grid grid-cols-3 divide-x divide-border/40 text-right items-center">
                        <span className="py-3 px-2 text-muted-foreground">
                          {fmt(p.targetPbt)}
                        </span>
                        <span className="py-3 px-2 font-bold text-foreground">
                          {fmt(p.actualPbt)}
                        </span>
                        <span
                          className={cn(
                            'py-3 px-2 font-bold',
                            ach.isSuccess === true && 'text-emerald-500',
                            ach.isSuccess === false && 'text-rose-500'
                          )}
                        >
                          {ach.text}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* ── ROW 3: LN SAU THUẾ ── */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 font-sans font-bold text-foreground sticky left-0 bg-card border-r border-border/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  LN sau thuế
                </td>
                {displayedItems.map((p) => {
                  const ach = fmtPercent(p.patAchievement)
                  return (
                    <td key={`pat-${p.year}`} colSpan={3} className="p-0 border-l border-border/60">
                      <div className="grid grid-cols-3 divide-x divide-border/40 text-right items-center">
                        <span className="py-3 px-2 text-muted-foreground">
                          {fmt(p.targetPat)}
                        </span>
                        <span className="py-3 px-2 font-bold text-foreground">
                          {fmt(p.actualPat)}
                        </span>
                        <span
                          className={cn(
                            'py-3 px-2 font-bold',
                            ach.isSuccess === true && 'text-emerald-500',
                            ach.isSuccess === false && 'text-rose-500'
                          )}
                        >
                          {ach.text}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
