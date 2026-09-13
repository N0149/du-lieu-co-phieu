'use client'

import React, { useState, useMemo } from 'react'
import { LivePortCall } from '@/lib/maritime-types'
import {
  Ship,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react'

interface Props {
  calls: LivePortCall[]
  ticker: string
}

const PAGE_SIZE = 10
const MAX_TOTAL_CALLS = 100

export function StockVesselCallsTable({ calls, ticker }: Props) {
  // Cap at 100 most recent calls
  const initialCalls = useMemo(() => calls.slice(0, MAX_TOTAL_CALLS), [calls])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<'all' | 'in' | 'out'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter calls based on search and direction
  const filteredCalls = useMemo(() => {
    return initialCalls.filter((c) => {
      const matchSearch =
        !searchTerm ||
        c.vessel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.berth_name && c.berth_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchDir =
        filterDirection === 'all' ||
        (filterDirection === 'in' && c.call_direction === 'in') ||
        (filterDirection === 'out' && c.call_direction === 'out')

      return matchSearch && matchDir
    })
  }, [initialCalls, searchTerm, filterDirection])

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE))

  // Safe current page
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  // Sliced calls for current page
  const paginatedCalls = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filteredCalls.slice(start, start + PAGE_SIZE)
  }, [filteredCalls, safeCurrentPage])

  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    setCurrentPage(1)
  }

  const handleDirectionChange = (dir: 'all' | 'in' | 'out') => {
    setFilterDirection(dir)
    setCurrentPage(1)
  }

  const handleReset = () => {
    setSearchTerm('')
    setFilterDirection('all')
    setCurrentPage(1)
  }

  // Calculate visible range numbers
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(safeCurrentPage * PAGE_SIZE, filteredCalls.length)

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (safeCurrentPage > 3) pages.push('...')
      
      const start = Math.max(2, safeCurrentPage - 1)
      const end = Math.min(totalPages - 1, safeCurrentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (safeCurrentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, safeCurrentPage])

  return (
    <div className="space-y-4">
      {/* Section Header & Search / Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
            <Ship className="size-4.5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-2">
              <span>Nhật Ký 100 Chuyến Tàu Gần Nhất Thuộc {ticker}</span>
              <span className="text-xs font-bold text-teal-300 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-mono">
                {initialCalls.length} chuyến
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Lịch trình chi tiết ngày giờ, trọng tải DWT và cầu bến tiếp nhận (Hiển thị 10 chuyến/trang)
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[210px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên tàu, bến cảng..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-[#1e2430] bg-[#161a22] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition-all"
            />
          </div>

          {/* Direction Filter */}
          <div className="inline-flex rounded-xl border border-[#1e2430] bg-[#161a22] p-1 text-xs">
            <button
              type="button"
              onClick={() => handleDirectionChange('all')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                filterDirection === 'all'
                  ? 'bg-teal-500/20 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('in')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                filterDirection === 'in'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vào cảng
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('out')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                filterDirection === 'out'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rời cảng
            </button>
          </div>

          {(searchTerm || filterDirection !== 'all') && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-xl border border-[#1e2430] bg-[#161a22] px-2.5 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="size-3" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {filteredCalls.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#1e2430] bg-[#161a22] shadow-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#12151c] text-slate-400 border-b border-[#1e2430] uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-3.5 font-bold">Ngày Giờ Điều Động</th>
                <th className="py-3 px-3.5 font-bold">Tên Tàu</th>
                <th className="py-3 px-3.5 font-bold">Hướng</th>
                <th className="py-3 px-3.5 font-bold">Trọng Tải (DWT)</th>
                <th className="py-3 px-3.5 font-bold">Kích Thước (LOA/Mớn)</th>
                <th className="py-3 px-3.5 font-bold">Cầu Bến Cập</th>
                <th className="py-3 px-3.5 font-bold">Nguồn Ghi Nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2430] font-mono">
              {paginatedCalls.map((c: any, idx: number) => {
                const isIn = c.call_direction === 'in'
                const isOut = c.call_direction === 'out'
                const timeDisplay = c.scheduled_time || c.call_date

                return (
                  <tr key={c.id || idx} className="hover:bg-[#1a1f2c] transition-colors font-sans group">
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-xs whitespace-nowrap font-medium">
                      {timeDisplay}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-100 whitespace-nowrap group-hover:text-teal-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <Ship className="size-3.5 text-teal-400 shrink-0" />
                        <span>{c.vessel_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {isIn ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                          <ArrowDownRight className="size-3" />
                          Vào cảng
                        </span>
                      ) : isOut ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 text-sky-400 px-2.5 py-0.5 text-[10px] font-bold border border-sky-500/30">
                          <ArrowUpRight className="size-3" />
                          Rời cảng
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-500/15 text-amber-400 px-2.5 py-0.5 text-[10px] font-bold border border-amber-500/30">
                          Dời bến
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-black text-teal-300 font-mono whitespace-nowrap">
                      {c.dwt ? c.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 text-xs whitespace-nowrap font-mono">
                      {c.loa ? `${c.loa}m` : '—'} / {c.draft ? `${c.draft}m` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-200 whitespace-nowrap font-medium">
                      {c.berth_name || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {c.source || 'Cảng vụ Hàng hải'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1e2430] bg-[#161a22] p-10 text-center space-y-3">
          <p className="text-sm text-slate-400">
            Không tìm thấy chuyến tàu nào phù hợp với bộ lọc tìm kiếm.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500/20 text-teal-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-teal-500/30 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredCalls.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
          {/* Info Text */}
          <div className="text-slate-400 font-mono text-[11px]">
            Hiển thị <span className="font-bold text-slate-200">{startIndex}</span>–
            <span className="font-bold text-slate-200">{endIndex}</span> trong số{' '}
            <span className="font-bold text-teal-300">{filteredCalls.length}</span> chuyến
            {initialCalls.length >= MAX_TOTAL_CALLS && (
              <span className="text-slate-500 ml-1.5">(Tối đa {MAX_TOTAL_CALLS} chuyến gần nhất)</span>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="size-8 flex items-center justify-center rounded-lg border border-[#1e2430] bg-[#161a22] text-slate-400 hover:text-slate-200 hover:bg-[#1a1f2c] disabled:opacity-40 disabled:pointer-events-none transition-all"
              title="Trang đầu"
            >
              <ChevronsLeft className="size-4" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="size-8 flex items-center justify-center rounded-lg border border-[#1e2430] bg-[#161a22] text-slate-400 hover:text-slate-200 hover:bg-[#1a1f2c] disabled:opacity-40 disabled:pointer-events-none transition-all"
              title="Trang trước"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Numbered Pages */}
            <div className="flex items-center gap-1 px-1 font-mono">
              {pageNumbers.map((page, idx) => {
                if (typeof page === 'string') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 select-none">
                      ...
                    </span>
                  )
                }

                const isActive = page === safeCurrentPage
                return (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`size-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-teal-500 text-slate-950 shadow-[0_0_12px_rgba(20,184,166,0.35)] border border-teal-400'
                        : 'border border-[#1e2430] bg-[#161a22] text-slate-300 hover:text-slate-100 hover:bg-[#1a1f2c]'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="size-8 flex items-center justify-center rounded-lg border border-[#1e2430] bg-[#161a22] text-slate-400 hover:text-slate-200 hover:bg-[#1a1f2c] disabled:opacity-40 disabled:pointer-events-none transition-all"
              title="Trang kế tiếp"
            >
              <ChevronRight className="size-4" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="size-8 flex items-center justify-center rounded-lg border border-[#1e2430] bg-[#161a22] text-slate-400 hover:text-slate-200 hover:bg-[#1a1f2c] disabled:opacity-40 disabled:pointer-events-none transition-all"
              title="Trang cuối"
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
