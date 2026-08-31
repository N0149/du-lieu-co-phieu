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
    <div className="rounded-xl border border-white/8 bg-[#212631] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <RefreshCw className="size-4 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F0F3F6] tracking-tight flex items-center gap-2">
                <span>Nhật Ký Tàu Cập Cảng Hôm Nay (Dữ Liệu Thật)</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {filteredCalls.length} chuyến
                </span>
              </h3>
              <p className="text-xs text-[#9EACB9] mt-0.5">
                Cập nhật tự động từ CSDL Cảng vụ Hải Phòng &amp; Cổng thông tin Hoa tiêu Miền Nam
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-[#9EACB9]" />
            <input
              type="text"
              placeholder="Tìm tên tàu, bến cảng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1A1D26] py-2 pl-9 pr-3 text-xs text-[#F0F3F6] placeholder:text-[#64748B] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
            />
          </div>

          {/* Direction Filter */}
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#1A1D26] py-2 px-3 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all cursor-pointer"
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
            className="rounded-lg border border-white/10 bg-[#1A1D26] py-2 px-3 text-xs text-[#F0F3F6] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all cursor-pointer"
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
      <div className="overflow-x-auto rounded-lg border border-white/8 bg-[#1A1D26]/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#1A1D26] text-[#9EACB9] border-b border-white/8 uppercase text-[11px] tracking-wider font-semibold">
              <th
                className="py-3 px-3.5 cursor-pointer select-none hover:text-[#F0F3F6] transition-colors group"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                title={sortOrder === 'desc' ? 'Đang xếp: Mới nhất → Cũ nhất (Nhấn để đổi)' : 'Đang xếp: Cũ nhất → Mới nhất (Nhấn để đổi)'}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Thời gian</span>
                  <span className="text-emerald-400">
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
          <tbody className="divide-y divide-white/5 font-mono">
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#9EACB9] font-sans">
                  Không tìm thấy chuyến tàu nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredCalls.slice(0, 50).map((c, idx) => {
                const isIn = c.call_direction === 'in'
                const isOut = c.call_direction === 'out'

                return (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors font-sans group">
                    <td className="py-3 px-3.5 whitespace-nowrap text-[#9EACB9] font-mono text-xs">
                      {c.scheduled_time ? c.scheduled_time.slice(5, 16) : c.call_date}
                    </td>

                    <td className="py-3 px-3.5 font-bold text-[#F0F3F6] whitespace-nowrap group-hover:text-emerald-400 transition-colors">
                      <div className="flex items-center gap-2">
                        <Ship className="size-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[190px]">{c.vessel_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {isIn && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 text-[10px] font-medium border border-emerald-500/20">
                          <ArrowDownRight className="size-3" />
                          Vào cảng
                        </span>
                      )}
                      {isOut && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-400 px-2.5 py-0.5 text-[10px] font-medium border border-blue-500/20">
                          <ArrowUpRight className="size-3" />
                          Rời cảng
                        </span>
                      )}
                      {!isIn && !isOut && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-400 px-2.5 py-0.5 text-[10px] font-medium border border-amber-500/20">
                          Dời bến
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap font-bold text-emerald-400 font-mono">
                      {c.dwt && c.dwt > 0 ? c.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap text-xs text-[#9EACB9] font-mono">
                      {c.loa ? `${c.loa}m` : '—'} / {c.draft ? `${c.draft}m` : '—'}
                    </td>

                    <td className="py-3 px-3.5 font-medium text-[#F0F3F6] whitespace-nowrap max-w-[170px] truncate">
                      {c.berth_name || '—'}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {c.stock_ticker ? (
                        <Link
                          href={`/cang/${c.stock_ticker.toLowerCase()}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-xs"
                        >
                          <span>{c.stock_ticker}</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-[#64748B] text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-[#9EACB9]">
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
