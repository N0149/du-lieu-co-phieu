'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { SectorValuationItem, StockValuationDetail } from '@/lib/industry-types'
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IndustryValuationTableProps {
  valuationList: SectorValuationItem[]
}

type MultipleType = 'pe' | 'pb' | 'ps'
type TimeframeType = '1y' | '3y' | '5y' | '10y'

export function IndustryValuationTable({ valuationList }: IndustryValuationTableProps) {
  const [metric, setMetric] = useState<MultipleType>('pe')
  const [timeframe, setTimeframe] = useState<TimeframeType>('5y')
  const [sortCol, setSortCol] = useState<'name' | 'current' | 'histMedian' | 'diff'>('diff')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedSectorKey, setExpandedSectorKey] = useState<string | null>(null)

  const handleSort = (col: 'name' | 'current' | 'histMedian' | 'diff') => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const toggleExpand = (key: string) => {
    setExpandedSectorKey((prev) => (prev === key ? null : key))
  }

  const processedData = valuationList.map((item) => {
    const currVal = item.current?.[metric]?.median ?? null
    const histBand = item.history?.[timeframe]?.[metric]
    const histMedian = histBand?.median ?? null
    const histMin = histBand?.min ?? null
    const histMax = histBand?.max ?? null

    let diffPercent: number | null = null
    if (currVal != null && histMedian != null && histMedian > 0) {
      diffPercent = parseFloat((((currVal - histMedian) / histMedian) * 100).toFixed(1))
    }

    return {
      key: item.key,
      name: item.name_vi,
      stockCount: item.stock_count || item.stocks?.length || 0,
      current: currVal,
      histMedian,
      histMin,
      histMax,
      diff: diffPercent,
      stocks: item.stocks || [],
      stockDetails: item.stockDetails || [],
    }
  })

  processedData.sort((a, b) => {
    const vA = a[sortCol]
    const vB = b[sortCol]
    if (vA == null) return 1
    if (vB == null) return -1
    if (typeof vA === 'string' && typeof vB === 'string') {
      return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)
    }
    return sortDir === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number)
  })

  return (
    <div className="rounded-2xl border border-white/8 bg-[#161a23] p-4 shadow-sm sm:p-6">
      {/* Filters: Multiple & Timeframe */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#F0F3F6] sm:text-lg">
            Định giá P/E, P/B, P/S các ngành so với lịch sử
          </h2>
          <p className="mt-0.5 text-xs text-[#8B98A5]">
            Bấm vào mỗi ngành để xem danh sách chi tiết các cổ phiếu thuộc ngành đó
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chọn chỉ số */}
          <div className="flex rounded-lg border border-white/10 bg-[#12151c] p-0.5 text-xs">
            {(['pe', 'pb', 'ps'] as MultipleType[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  'rounded-md px-3 py-1 font-semibold uppercase transition-all cursor-pointer',
                  metric === m
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[#8B98A5] hover:text-[#F0F3F6]'
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Chọn khung thời gian */}
          <div className="flex rounded-lg border border-white/10 bg-[#12151c] p-0.5 text-xs">
            {(['1y', '3y', '5y', '10y'] as TimeframeType[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-semibold uppercase transition-all cursor-pointer',
                  timeframe === tf
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[#8B98A5] hover:text-[#F0F3F6]'
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng định giá */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[750px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#1a1f2c]/50 text-[#8B98A5]">
              <th className="py-3 pl-4 pr-2 font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-[#F0F3F6] cursor-pointer"
                >
                  <span>Ngành</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">Số CP</th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('current')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6] cursor-pointer"
                >
                  <span>{metric.toUpperCase()} Hiện tại (Trung vị)</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('histMedian')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6] cursor-pointer"
                >
                  <span>Trung vị {timeframe.toUpperCase()}</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                Vùng Min - Max ({timeframe.toUpperCase()})
              </th>
              <th className="py-3 pl-3 pr-4 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('diff')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6] cursor-pointer"
                >
                  <span>So với Trung vị</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {processedData.map((row) => {
              const diff = row.diff
              const isCheap = diff != null && diff <= -10
              const isExpensive = diff != null && diff >= 10
              const isExpanded = expandedSectorKey === row.key

              return (
                <React.Fragment key={row.key}>
                  <tr
                    onClick={() => toggleExpand(row.key)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-white/[0.04]',
                      isExpanded ? 'bg-emerald-500/[0.06]' : ''
                    )}
                  >
                    {/* Cột tên ngành + chevron toggle */}
                    <td className="py-3.5 pl-4 pr-2 font-medium text-[#F0F3F6]">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded transition-transform',
                            isExpanded ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#8B98A5]'
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </span>
                        <span className="font-semibold">{row.name}</span>
                      </div>
                    </td>

                    {/* Số CP */}
                    <td className="px-3 py-3.5 text-right text-[#8B98A5]">
                      {row.stockCount}
                    </td>

                    {/* Hiện tại */}
                    <td className="px-3 py-3.5 text-right font-bold text-emerald-400">
                      {row.current != null ? row.current.toFixed(2) : '—'}
                    </td>

                    {/* Trung vị lịch sử */}
                    <td className="px-3 py-3.5 text-right text-[#9EACB9]">
                      {row.histMedian != null ? row.histMedian.toFixed(2) : '—'}
                    </td>

                    {/* Vùng Min - Max */}
                    <td className="px-3 py-3.5 text-right text-[#8B98A5]">
                      {row.histMin != null && row.histMax != null
                        ? `${row.histMin.toFixed(2)} — ${row.histMax.toFixed(2)}`
                        : '—'}
                    </td>

                    {/* So với Trung vị */}
                    <td className="py-3.5 pl-3 pr-4 text-right font-semibold">
                      {diff == null ? (
                        <span className="text-[#8B98A5]">—</span>
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                            isCheap
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : isExpensive
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-white/5 text-[#9EACB9]'
                          )}
                        >
                          {isCheap ? (
                            <TrendingDown className="size-3" />
                          ) : isExpensive ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <Minus className="size-3" />
                          )}
                          <span>
                            {diff > 0 ? '+' : ''}
                            {diff}%
                          </span>
                          <span className="text-[10px] opacity-75">
                            ({isCheap ? 'Rẻ hơn' : isExpensive ? 'Đắt hơn' : 'Bình thường'})
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Vùng mở rộng hiển thị danh sách cổ phiếu trong ngành */}
                  {isExpanded && (
                    <tr className="bg-[#12151c]/75">
                      <td colSpan={6} className="p-4 sm:px-6 sm:py-5">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="size-4 text-emerald-400" />
                              <h4 className="text-xs font-bold text-[#F0F3F6] uppercase tracking-wider">
                                Danh sách cổ phiếu ngành {row.name} ({row.stocks.length} mã)
                              </h4>
                            </div>
                            <span className="text-[11px] text-[#8B98A5]">
                              Bấm vào mã để xem biểu đồ, lịch sử P/E, P/B và BCTC chi tiết
                            </span>
                          </div>

                          {/* Bảng chi tiết từng cổ phiếu trong ngành */}
                          {row.stockDetails.length > 0 ? (
                            <div className="overflow-x-auto max-h-80 overflow-y-auto pr-1">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b border-white/10 text-[#8B98A5] text-[11px]">
                                    <th className="py-2 pl-2 font-medium">Mã CP</th>
                                    <th className="px-3 py-2 font-medium">Tên công ty</th>
                                    <th className="px-3 py-2 text-right font-medium">Giá (k đ)</th>
                                    <th className="px-3 py-2 text-right font-medium">Vốn hóa (tỷ)</th>
                                    <th className="px-3 py-2 text-right font-medium">P/E</th>
                                    <th className="px-3 py-2 text-right font-medium">P/B</th>
                                    <th className="py-2 pr-2 text-right font-medium">ROE</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {row.stockDetails.map((stk) => (
                                    <tr
                                      key={stk.symbol}
                                      className="transition-colors hover:bg-white/[0.03]"
                                    >
                                      {/* Mã CP */}
                                      <td className="py-2 pl-2">
                                        <Link
                                          href={`/stock/${stk.symbol}`}
                                          className="group inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                        >
                                          <span>{stk.symbol}</span>
                                          <ExternalLink className="size-2.5 opacity-40 group-hover:opacity-100" />
                                        </Link>
                                      </td>

                                      {/* Tên công ty */}
                                      <td className="px-3 py-2 text-[#9EACB9] max-w-xs truncate" title={stk.name}>
                                        {stk.name}
                                      </td>

                                      {/* Giá */}
                                      <td className="px-3 py-2 text-right font-semibold text-[#F0F3F6]">
                                        {stk.price != null ? stk.price.toFixed(2) : '—'}
                                      </td>

                                      {/* Vốn hóa */}
                                      <td className="px-3 py-2 text-right font-medium text-emerald-400">
                                        {stk.marketCap != null
                                          ? Math.round(stk.marketCap).toLocaleString('vi-VN')
                                          : '—'}
                                      </td>

                                      {/* P/E */}
                                      <td className="px-3 py-2 text-right font-medium text-amber-400">
                                        {stk.pe != null ? stk.pe.toFixed(1) : '—'}
                                      </td>

                                      {/* P/B */}
                                      <td className="px-3 py-2 text-right font-medium text-purple-400">
                                        {stk.pb != null ? stk.pb.toFixed(2) : '—'}
                                      </td>

                                      {/* ROE */}
                                      <td className="py-2 pr-2 text-right font-medium text-[#F0F3F6]">
                                        {stk.roe != null ? `${stk.roe.toFixed(1)}%` : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            /* Fallback nếu chỉ có danh sách mã */
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {row.stocks.map((sym) => (
                                <Link
                                  key={sym}
                                  href={`/stock/${sym}`}
                                  className="group inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#161a23] px-2.5 py-1 text-xs font-semibold text-[#F0F3F6] hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
                                >
                                  <span>{sym}</span>
                                  <ExternalLink className="size-2.5 opacity-40 group-hover:opacity-100" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
