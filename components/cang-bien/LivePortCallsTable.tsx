'use client'

import React, { useState, useMemo } from 'react'
import { LivePortCall, formatDWT } from '@/lib/maritime-types'
import { Ship, Search, ArrowDownRight, ArrowUpRight, RefreshCw, Filter, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Props {
  calls: LivePortCall[]
}

export function LivePortCallsTable({ calls }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<string>('all')
  const [filterTicker, setFilterTicker] = useState<string>('all')

  const uniqueTickers = useMemo(() => {
    const set = new Set<string>()
    calls.forEach((c) => {
      if (c.stock_ticker) set.add(c.stock_ticker)
    })
    return Array.from(set).sort()
  }, [calls])

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const matchSearch =
        !searchTerm ||
        c.vessel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.berth_name && c.berth_name.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchDir =
        filterDirection === 'all' ||
        (filterDirection === 'in' && c.call_direction === 'in') ||
        (filterDirection === 'out' && c.call_direction === 'out') ||
        (filterDirection === 'shift' && c.call_direction === 'shift')

      const matchTicker =
        filterTicker === 'all' ||
        (filterTicker === 'mapped' && c.stock_ticker) ||
        c.stock_ticker === filterTicker

      return matchSearch && matchDir && matchTicker
    })
  }, [calls, searchTerm, filterDirection, filterTicker])

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-6 shadow-xl space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RefreshCw className="size-4 animate-spin-slow" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Nhật Ký Tàu Cập Cảng Hôm Nay (Dữ Liệu Thật)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tổng hợp trực tiếp từ CSDL Cảng vụ Hải Phòng & Cổng thông tin Hoa tiêu Miền Nam
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm tên tàu, bến..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/80 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Direction Filter */}
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="rounded-xl border border-border bg-background/80 py-1.5 px-2.5 text-xs text-foreground focus:border-teal-500 focus:outline-none"
          >
            <option value="all">Tất cả hướng (Vào/Ra)</option>
            <option value="in">🚢 Tàu Vào Cảng</option>
            <option value="out">⚓ Tàu Rời Cảng</option>
            <option value="shift">🔄 Dời Bến</option>
          </select>

          {/* Stock Ticker Filter */}
          <select
            value={filterTicker}
            onChange={(e) => setFilterTicker(e.target.value)}
            className="rounded-xl border border-border bg-background/80 py-1.5 px-2.5 text-xs text-foreground focus:border-teal-500 focus:outline-none"
          >
            <option value="all">Mọi mã cổ phiếu</option>
            <option value="mapped">Chỉ mã niêm yết (Đã Map)</option>
            {uniqueTickers.map((t) => (
              <option key={t} value={t}>
                Mã {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground border-b border-border/80 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3 px-3">Thời gian</th>
              <th className="py-3 px-3">Tên tàu</th>
              <th className="py-3 px-3">Hướng</th>
              <th className="py-3 px-3">Trọng tải (DWT)</th>
              <th className="py-3 px-3">Kích thước (LOA/Mớn)</th>
              <th className="py-3 px-3">Cầu bến cập</th>
              <th className="py-3 px-3">Mã Cổ Phiếu</th>
              <th className="py-3 px-3">Nguồn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono">
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground font-sans">
                  Không tìm thấy chuyến tàu nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredCalls.slice(0, 50).map((c, idx) => {
                const isIn = c.call_direction === 'in'
                const isOut = c.call_direction === 'out'

                return (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors font-sans">
                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-[11px]">
                      {c.scheduled_time ? c.scheduled_time.slice(5, 16) : c.call_date}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Ship className="size-3.5 text-teal-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{c.vessel_name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isIn && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold border border-emerald-500/20">
                          <ArrowDownRight className="size-3" />
                          Vào
                        </span>
                      )}
                      {isOut && (
                        <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 text-sky-400 px-1.5 py-0.5 text-[10px] font-bold border border-sky-500/20">
                          <ArrowUpRight className="size-3" />
                          Ra
                        </span>
                      )}
                      {!isIn && !isOut && (
                        <span className="inline-flex items-center rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5 text-[10px] font-bold border border-amber-500/20">
                          Dời bến
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-teal-300">
                      {c.dwt && c.dwt > 0 ? c.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-muted-foreground">
                      {c.loa ? `${c.loa}m` : '—'} / {c.draft ? `${c.draft}m` : '—'}
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap max-w-[160px] truncate">
                      {c.berth_name || '—'}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {c.stock_ticker ? (
                        <Link
                          href={`/cang/${c.stock_ticker.toLowerCase()}`}
                          className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 text-[11px] font-bold text-teal-300 hover:bg-teal-500 hover:text-slate-950 transition-colors"
                        >
                          <span>{c.stock_ticker}</span>
                          <ExternalLink className="size-2.5" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-[10px] text-muted-foreground">
                      {c.source === 'cvhh_haiphong' ? 'Cảng vụ Hải Phòng' : 'Hoa tiêu Miền Nam'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
