'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import type { BankAnalysisData } from '@/lib/banking-types'
import { Landmark, ExternalLink } from 'lucide-react'

interface BankFinancialChartsProps {
  symbol: string
  data: BankAnalysisData
}

export function BankFinancialCharts({ symbol, data }: BankFinancialChartsProps) {
  const router = useRouter()

  if (!data.isBank || !data.spider) {
    return null
  }

  const { spider, loanTermChart, customerGroupChart } = data

  const handleNavigate = (targetSymbol: string) => {
    if (!targetSymbol) return
    router.push(`/stock/${targetSymbol.toUpperCase().trim()}`)
  }

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-[#161a23] p-4 shadow-sm sm:p-6">
      {/* Header tổng quan ngành ngân hàng */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Landmark className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#F0F3F6] sm:text-base">
                Phân Tích Chuyên Sâu & So Sánh Ngành Ngân Hàng
              </h3>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {spider.period}
              </span>
            </div>
            <p className="text-xs text-[#8B98A5]">
              Bấm vào từng cột ngân hàng trên biểu đồ để chuyển nhanh sang xem chi tiết mã đó
            </p>
          </div>
        </div>

        {/* Xếp hạng tổng thể & Điểm số */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-1.5 text-right">
            <div className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
              Xếp hạng toàn ngành
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-lg font-black text-amber-400">
                #{spider.overall_place}
              </span>
              <span className="text-xs font-semibold text-[#8B98A5]">
                / {spider.totalBanks} ngân hàng
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3.5 py-1.5 text-right">
            <div className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
              Điểm tổng hợp
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-lg font-black text-emerald-400">
                {spider.overall_points}
              </span>
              <span className="text-xs font-semibold text-[#8B98A5]">
                / {spider.max_points} đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 3 biểu đồ chuyên biệt */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 1. Biểu đồ Radar mạng nhện 11 chỉ tiêu */}
        <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#12151c]/80 p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F0F3F6]">
                So Sánh Trong Ngành Ngân Hàng
              </span>
              <span className="text-[11px] font-semibold text-emerald-400">
                {symbol} #{spider.overall_place}/{spider.totalBanks}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8B98A5]">
              Vùng phủ càng rộng thể hiện năng lực tổng thể càng vượt trội so với trung vị ngành
            </p>
          </div>

          <div className="my-2 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={spider.radarData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 9.5, fontWeight: 500 }}
                />
                <PolarRadiusAxis domain={[0, 100]} axisLine={false} tick={false} />
                <Radar
                  name={symbol}
                  dataKey="normalizedScore"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.35}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="rounded-xl border border-white/10 bg-[#1a1f2c] p-2.5 text-xs shadow-xl backdrop-blur-md">
                          <p className="font-bold text-[#F0F3F6]">{item.label}</p>
                          <div className="mt-1.5 space-y-0.5 text-[11px]">
                            <p className="text-emerald-400">
                              Giá trị {symbol}: <span className="font-bold">{item.formattedValue}</span>
                            </p>
                            <p className="text-amber-400">
                              Thứ hạng ngành: <span className="font-bold">#{item.totalBanks - item.rank + 1} / {item.totalBanks}</span>
                            </p>
                            {item.industryMedian != null && (
                              <p className="text-[#8B98A5]">
                                Trung vị ngành: {item.industryMedian}{item.unit}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-[#8B98A5]">
            <span>(Dữ liệu chuẩn hóa đến {spider.period})</span>
            <span className="text-emerald-400 font-semibold">11 chỉ tiêu cốt lõi</span>
          </div>
        </div>

        {/* 2. Biểu đồ Cơ cấu cho vay theo kỳ hạn */}
        {loanTermChart && (
          <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#12151c]/80 p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F0F3F6]">
                  {loanTermChart.title}
                </span>
                <span className="text-[11px] text-[#8B98A5]">100% Stacked</span>
              </div>
              <p className="mt-1 text-[11px] text-[#8B98A5]">
                Tỷ trọng vay ngắn hạn vs trung, dài hạn (bấm vào cột để xem)
              </p>
            </div>

            <div className="my-2 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={loanTermChart.items}
                  margin={{ top: 10, right: 0, left: -25, bottom: 20 }}
                  onClick={(state: any) => {
                    const sym = state?.activePayload?.[0]?.payload?.symbol || state?.activeLabel
                    if (sym) handleNavigate(sym)
                  }}
                  className="cursor-pointer"
                >
                  <XAxis
                    dataKey="symbol"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    tick={({ x, y, payload }) => {
                      const isCur = payload.value === symbol
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={10}
                          textAnchor="end"
                          fill={isCur ? '#f59e0b' : '#94a3b8'}
                          fontSize={isCur ? 10.5 : 8.5}
                          fontWeight={isCur ? 800 : 500}
                          transform={`rotate(-45, ${x}, ${y})`}
                          className="cursor-pointer hover:fill-amber-400 transition-colors select-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigate(payload.value)
                          }}
                        >
                          {payload.value}
                        </text>
                      )
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="rounded-xl border border-white/10 bg-[#1a1f2c] p-2.5 text-xs shadow-xl backdrop-blur-md">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
                              <span className="font-extrabold text-amber-400">{item.symbol}</span>
                              <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                                Xem mã <ExternalLink className="size-2.5" />
                              </span>
                            </div>
                            <p className="text-amber-300 mt-1.5">
                              Cho vay Ngắn hạn: <span className="font-bold">{item.primaryPct}%</span>
                            </p>
                            <p className="text-slate-300">
                              Cho vay Trung, Dài hạn: <span className="font-bold">{item.secondaryPct}%</span>
                            </p>
                            <p className="mt-1.5 border-t border-white/5 pt-1 text-[10px] text-[#8B98A5]">
                              👉 Bấm vào cột để chuyển đến trang {item.symbol}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="primaryPct"
                    stackId="term"
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry?.symbol) handleNavigate(entry.symbol)
                    }}
                  >
                    {loanTermChart.items.map((entry, index) => (
                      <Cell
                        key={`cell-nh-${index}`}
                        fill={entry.isCurrent ? '#f59e0b' : '#475569'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="secondaryPct"
                    stackId="term"
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry?.symbol) handleNavigate(entry.symbol)
                    }}
                  >
                    {loanTermChart.items.map((entry, index) => (
                      <Cell
                        key={`cell-dh-${index}`}
                        fill={entry.isCurrent ? '#fbbf24' : '#1e293b'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/5 pt-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-amber-500" />
                <span className="text-[#8B98A5]">{loanTermChart.primaryLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-slate-600" />
                <span className="text-[#8B98A5]">{loanTermChart.secondaryLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Biểu đồ Cơ cấu cho vay theo nhóm khách hàng */}
        {customerGroupChart && (
          <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#12151c]/80 p-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F0F3F6]">
                  {customerGroupChart.title}
                </span>
                <span className="text-[11px] text-[#8B98A5]">100% Stacked</span>
              </div>
              <p className="mt-1 text-[11px] text-[#8B98A5]">
                Tỷ lệ khách hàng cá nhân vs doanh nghiệp (bấm vào cột để xem)
              </p>
            </div>

            <div className="my-2 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={customerGroupChart.items}
                  margin={{ top: 10, right: 0, left: -25, bottom: 20 }}
                  onClick={(state: any) => {
                    const sym = state?.activePayload?.[0]?.payload?.symbol || state?.activeLabel
                    if (sym) handleNavigate(sym)
                  }}
                  className="cursor-pointer"
                >
                  <XAxis
                    dataKey="symbol"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    tick={({ x, y, payload }) => {
                      const isCur = payload.value === symbol
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={10}
                          textAnchor="end"
                          fill={isCur ? '#f59e0b' : '#94a3b8'}
                          fontSize={isCur ? 10.5 : 8.5}
                          fontWeight={isCur ? 800 : 500}
                          transform={`rotate(-45, ${x}, ${y})`}
                          className="cursor-pointer hover:fill-amber-400 transition-colors select-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigate(payload.value)
                          }}
                        >
                          {payload.value}
                        </text>
                      )
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="rounded-xl border border-white/10 bg-[#1a1f2c] p-2.5 text-xs shadow-xl backdrop-blur-md">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
                              <span className="font-extrabold text-amber-400">{item.symbol}</span>
                              <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                                Xem mã <ExternalLink className="size-2.5" />
                              </span>
                            </div>
                            <p className="text-amber-300 mt-1.5">
                              Khách hàng cá nhân: <span className="font-bold">{item.primaryPct}%</span>
                            </p>
                            <p className="text-slate-300">
                              Khách hàng tổ chức: <span className="font-bold">{item.secondaryPct}%</span>
                            </p>
                            <p className="mt-1.5 border-t border-white/5 pt-1 text-[10px] text-[#8B98A5]">
                              👉 Bấm vào cột để chuyển đến trang {item.symbol}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="primaryPct"
                    stackId="cust"
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry?.symbol) handleNavigate(entry.symbol)
                    }}
                  >
                    {customerGroupChart.items.map((entry, index) => (
                      <Cell
                        key={`cell-cn-${index}`}
                        fill={entry.isCurrent ? '#f59e0b' : '#475569'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="secondaryPct"
                    stackId="cust"
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry?.symbol) handleNavigate(entry.symbol)
                    }}
                  >
                    {customerGroupChart.items.map((entry, index) => (
                      <Cell
                        key={`cell-tc-${index}`}
                        fill={entry.isCurrent ? '#fbbf24' : '#1e293b'}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/5 pt-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-amber-500" />
                <span className="text-[#8B98A5]">{customerGroupChart.primaryLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-slate-600" />
                <span className="text-[#8B98A5]">{customerGroupChart.secondaryLabel}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
