'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
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
import { Gift, ArrowRightLeft, History, Coins } from 'lucide-react'

interface FinancialCashFlowAndDividendsProps {
  symbol: string
  chartData: FinancialChartPayload | null
  dividendData: DividendHistoryPayload | null
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function FinancialCashFlowAndDividends({
  symbol,
  chartData,
  dividendData,
}: FinancialCashFlowAndDividendsProps) {
  // Dữ liệu dòng tiền & cổ tức theo kỳ (Quý / Năm)
  const cashFlowPoints = useMemo(() => {
    if (!chartData) return []
    const dates = chartData.newFiscalDateQuarter || chartData.newFiscalDateYear || []

    return dates.map((d, i) => {
      // Format Q1/24 hoặc 2024
      let displayDate = d
      if (d.includes('-')) {
        const parts = d.split('-')
        const y = parts[0].slice(2)
        const m = parseInt(parts[1], 10)
        const q = Math.ceil(m / 3)
        displayDate = `Q${q}/${y}`
      }

      return {
        date: d,
        displayDate,
        // Cổ tức (Tỷ đồng)
        coTucLNST: chartData.coTucLNST?.[i] || 0,
        coTucDaTra: chartData.coTucDaTra?.[i] || 0,
        // Lưu chuyển tiền tệ (Tỷ đồng)
        lctThuan: chartData.lctThuanTrongKy?.[i] || 0,
        lctKinhDoanh: chartData.lctThuanHDSXKD?.[i] || 0,
        lctDauTu: chartData.lctThuanHDDauTu?.[i] || 0,
        lctTaiChinh: chartData.lctThuanHDTC?.[i] || 0,
      }
    })
  }, [chartData])

  // Dữ liệu Lịch sử trả cổ tức (tiền mặt & cổ phiếu)
  const dividendPoints = useMemo(() => {
    if (!dividendData?.events || dividendData.events.length === 0) return []
    const sorted = [...dividendData.events]
      .filter((e) => (e.cashVnd && e.cashVnd > 0) || (e.stockPct && e.stockPct > 0))
      .sort((a, b) => (a.date > b.date ? 1 : -1))

    return sorted.map((e) => ({
      date: e.date,
      year: e.date.slice(0, 4),
      cashVnd: e.cashVnd || 0,
      stockPct: e.stockPct != null ? Math.round(e.stockPct * 100) : 0,
      note: e.texts?.[0] || '',
    }))
  }, [dividendData])

  if (!chartData && !dividendData) return null

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* ── BIỂU ĐỒ 1: CỔ TỨC (TỶ ĐỒNG) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Gift className="size-4 text-emerald-500" />
              <span>Cổ Tức (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">LNST vs Đã trả</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashFlowPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [`${fmtNum(val)} tỷ đồng`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar dataKey="coTucLNST" name="LNST cổ đông mẹ" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="coTucDaTra" name="Cổ tức đã trả" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 2: LỊCH SỬ TRẢ CỔ TỨC (TIỀN & CP) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <History className="size-4 text-amber-500" />
              <span>Lịch Sử Trả Cổ Tức</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">Tiền mặt & Cổ phiếu</span>
          </div>

          <div className="h-[280px] w-full">
            {dividendPoints.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={dividendPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} unit="đ" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                    formatter={(val: any, name: any = '') => [
                      String(name).includes('%') ? `${val}%` : `${fmtNum(val)} VNĐ`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                  <Bar yAxisId="left" dataKey="cashVnd" name="Tiền mặt (VNĐ/CP)" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="stockPct" name="Cổ tức cổ phiếu (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Doanh nghiệp chưa có lịch sử chi trả cổ tức
              </div>
            )}
          </div>
        </div>

        {/* ── BIỂU ĐỒ 3: LƯU CHUYỂN TIỀN TỆ (TỶ ĐỒNG) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <ArrowRightLeft className="size-4 text-cyan-500" />
              <span>Lưu Chuyển Tiền Tệ (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">OCF / ICF / CFF</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cashFlowPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [`${fmtNum(val)} tỷ đồng`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar dataKey="lctThuan" name="LCTT thuần trong kỳ" fill="#64748b" opacity={0.6} />
                <Line type="monotone" dataKey="lctKinhDoanh" name="LCTT Kinh doanh (OCF)" stroke="#10b981" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="lctDauTu" name="LCTT Đầu tư (ICF)" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="lctTaiChinh" name="LCTT Tài chính (CFF)" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
