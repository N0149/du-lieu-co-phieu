'use client'

import React, { useState, useMemo } from 'react'
import { LivePortCall, formatDWT } from '@/lib/maritime-types'
import { Ship, Search, ArrowDownRight, ArrowUpRight, RefreshCw, Filter, ExternalLink, ArrowDown, ArrowUp, Compass } from 'lucide-react'
import Link from 'next/link'

interface Props {
  calls: LivePortCall[]
}

export function LivePortCallsTable({ calls }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<string>('all')
  const [filterTicker, setFilterTicker] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const uniqueTickers = useMemo(() => {
    const set = new Set<string>()
    calls.forEach((c) => {
      if (c.stock_ticker) set.add(c.stock_ticker)
    })
    return Array.from(set).sort()
  }, [calls])

  const filteredCalls = useMemo(() => {
    return calls
      .filter((c) => {
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
      .sort((a, b) => {
        const timeA = a.scheduled_time || a.call_date || ''
        const timeB = b.scheduled_time || b.call_date || ''
        const cmp = timeB.localeCompare(timeA)
        if (cmp !== 0) {
          return sortOrder === 'desc' ? cmp : -cmp
        }
        return sortOrder === 'desc' ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0)
      })
  }, [calls, searchTerm, filterDirection, filterTicker, sortOrder])

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-4 sm:p-6 shadow-2xl shadow-black/40 space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/5">
              <RefreshCw className="size-4 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Nhật Ký Tàu Cập Cảng Hôm Nay (Dữ Liệu Thật)</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {filteredCalls.length} chuyến
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cập nhật tự động từ CSDL Cảng vụ Hải Phòng &amp; Cổng thông tin Hoa tiêu Miền Nam
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên tàu, bến cảng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition-all"
            />
          </div>

          {/* Direction Filter */}
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Mọi hướng (Vào / Ra)</option>
            <option value="in">🚢 Tàu Vào Cảng</option>
            <option value="out">⚓ Tàu Rời Cảng</option>
            <option value="shift">🔄 Dời Bến</option>
          </select>

          {/* Stock Ticker Filter */}
          <select
            value={filterTicker}
            onChange={(e) => setFilterTicker(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Tất cả mã niêm yết</option>
            <option value="mapped">Chỉ mã có gắn bến</option>
            {uniqueTickers.map((t) => (
              <option key={t} value={t}>
                Mã {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
              <th
                className="py-3 px-3.5 cursor-pointer select-none hover:text-slate-200 transition-colors group"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                title={sortOrder === 'desc' ? 'Đang xếp: Mới nhất → Cũ nhất (Nhấn để đổi)' : 'Đang xếp: Cũ nhất → Mới nhất (Nhấn để đổi)'}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Thời gian</span>
                  <span className="text-teal-400">
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="size-3" />
                    ) : (
                      <ArrowUp className="size-3" />
                    )}
                  </span>
                </div>
              </th>
              <th className="py-3 px-3.5 font-bold">Tên tàu</th>
              <th className="py-3 px-3.5 font-bold">Hướng</th>
              <th className="py-3 px-3.5 font-bold">Trọng tải (DWT)</th>
              <th className="py-3 px-3.5 font-bold">Kích thước (LOA/Mớn)</th>
              <th className="py-3 px-3.5 font-bold">Cầu bến cập</th>
              <th className="py-3 px-3.5 font-bold">Mã Cổ Phiếu</th>
              <th className="py-3 px-3.5 font-bold">Nguồn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500 font-sans">
                  Không tìm thấy chuyến tàu nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredCalls.slice(0, 50).map((c, idx) => {
                const isIn = c.call_direction === 'in'
                const isOut = c.call_direction === 'out'

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors font-sans group">
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {c.scheduled_time ? c.scheduled_time.slice(5, 16) : c.call_date}
                    </td>

                    <td className="py-3 px-3.5 font-bold text-slate-100 whitespace-nowrap group-hover:text-teal-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <Ship className="size-3.5 text-teal-400 shrink-0" />
                        <span className="truncate max-w-[190px]">{c.vessel_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {isIn && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                          <ArrowDownRight className="size-3" />
                          Vào cảng
                        </span>
                      )}
                      {isOut && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 text-sky-400 px-2 py-0.5 text-[10px] font-bold border border-sky-500/30">
                          <ArrowUpRight className="size-3" />
                          Rời cảng
                        </span>
                      )}
                      {!isIn && !isOut && (
                        <span className="inline-flex items-center rounded-md bg-amber-500/15 text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/30">
                          Dời bến
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap font-bold text-teal-300 font-mono">
                      {c.dwt && c.dwt > 0 ? c.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {c.loa ? `${c.loa}m` : '—'} / {c.draft ? `${c.draft}m` : '—'}
                    </td>

                    <td className="py-3 px-3.5 font-medium text-slate-200 whitespace-nowrap max-w-[170px] truncate">
                      {c.berth_name || '—'}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {c.stock_ticker ? (
                        <Link
                          href={`/cang/${c.stock_ticker.toLowerCase()}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 text-xs font-black text-teal-300 hover:bg-teal-500 hover:text-slate-950 transition-all shadow-xs"
                        >
                          <span>{c.stock_ticker}</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-400">
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
