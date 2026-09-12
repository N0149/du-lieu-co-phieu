'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { FinancialChartPayload } from '@/lib/financial-charts-service'
import type { DividendHistoryPayload } from '@/lib/dividend-history-service'
import { History, BarChart3, Table as TableIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinancialCashFlowAndDividendsProps {
  symbol: string
  chartData?: FinancialChartPayload | null
  dividendData: DividendHistoryPayload | null
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function normalizeStockPct(val: number | null | undefined): number {
  if (val == null || isNaN(val) || val <= 0) return 0
  return val <= 1 ? Math.round(val * 100) : Math.round(val)
}

export function FinancialCashFlowAndDividends({
  symbol,
  chartData,
  dividendData,
}: FinancialCashFlowAndDividendsProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // 1. Dữ liệu bảng chi tiết các đợt trả cổ tức (mới nhất trước)
  const dividendEvents = useMemo(() => {
    if (!dividendData?.events || dividendData.events.length === 0) return []
    return [...dividendData.events]
      .filter((e) => (e.cashVnd && e.cashVnd > 0) || (e.stockPct && e.stockPct > 0))
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .map((e) => {
        const hasCash = e.cashVnd != null && e.cashVnd > 0
        const stockPctNorm = normalizeStockPct(e.stockPct)
        const hasStock = stockPctNorm > 0

        let typeLabel = 'Tiền mặt'
        let typeBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        if (hasCash && hasStock) {
          typeLabel = 'Tiền mặt & Cổ phiếu'
          typeBadge = 'bg-sky-500/15 text-sky-400 border-sky-500/30'
        } else if (hasStock) {
          typeLabel = 'Cổ phiếu'
          typeBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        }

        let formattedDate = e.date
        if (e.date && e.date.includes('-')) {
          const [y, m, d] = e.date.split('-')
          formattedDate = `${d}/${m}/${y}`
        }

        return {
          date: e.date,
          formattedDate,
          year: e.date.slice(0, 4),
          cashVnd: e.cashVnd || 0,
          stockPct: stockPctNorm,
          typeLabel,
          typeBadge,
          note: e.texts?.[0] || 'Chi trả cổ tức',
        }
      })
  }, [dividendData])

  // 2. Dữ liệu biểu đồ tổng hợp theo năm (từ cũ đến mới)
  const chartPoints = useMemo(() => {
    if (!dividendData?.events || dividendData.events.length === 0) return []
    const sorted = [...dividendData.events]
      .filter((e) => (e.cashVnd && e.cashVnd > 0) || (e.stockPct && e.stockPct > 0))
      .sort((a, b) => (a.date > b.date ? 1 : -1))

    const yearMap = new Map<string, { year: string; cashVnd: number; stockPct: number }>()
    for (const e of sorted) {
      const y = e.date.slice(0, 4)
      const cur = yearMap.get(y) || { year: y, cashVnd: 0, stockPct: 0 }
      if (e.cashVnd) cur.cashVnd += e.cashVnd
      if (e.stockPct) cur.stockPct += normalizeStockPct(e.stockPct)
      yearMap.set(y, cur)
    }
    return Array.from(yearMap.values())
  }, [dividendData])

  if (!dividendData || dividendEvents.length === 0) {
    return null
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        {/* Header với Tabs & Thống kê tóm tắt */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <History className="size-4.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-foreground">
                  Lịch Sử Trả Cổ Tức
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  {symbol}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
                  <CheckCircle2 className="size-3 text-emerald-400" />
                  {dividendEvents.length} đợt chi trả
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Theo dõi biến động chi trả cổ tức Tiền mặt (VNĐ/CP) & Cổ phiếu (%) qua các năm
              </p>
            </div>
          </div>

          {/* Controls: Tab Chuyển đổi Biểu đồ / Bảng chi tiết */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'chart'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <BarChart3 className="size-3.5" />
                <span>Biểu đồ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <TableIcon className="size-3.5" />
                <span>Bảng chi tiết ({dividendEvents.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Nội dung View: Biểu đồ hoặc Bảng */}
        {viewMode === 'chart' ? (
          <div className="h-[300px] w-full pt-1">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10.5, fill: '#94a3b8' }} unit="đ" tickFormatter={(v) => fmtNum(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10.5, fill: '#94a3b8' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') ? `${val}%` : `${fmtNum(val)} VNĐ/CP`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="cashVnd"
                  name="Tiền mặt (VNĐ/CP)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="stockPct"
                  name="Cổ tức cổ phiếu (%)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-x-auto overflow-y-auto rounded-xl border border-border/70 scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-muted/90 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Ngày GDKHQ / Thực hiện</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Hình thức</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Tiền mặt (đ/cp)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Cổ tức CP (%)</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Nội dung chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {dividendEvents.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-foreground font-medium whitespace-nowrap">
                      {evt.formattedDate}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border', evt.typeBadge)}>
                        {evt.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {evt.cashVnd > 0 ? `${fmtNum(evt.cashVnd)} đ` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                      {evt.stockPct > 0 ? `${evt.stockPct}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-[11.5px] max-w-md truncate" title={evt.note}>
                      {evt.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
