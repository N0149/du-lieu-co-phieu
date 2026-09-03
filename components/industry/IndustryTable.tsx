'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react'
import { formatBillionVnd, type SectorL2Item } from '@/lib/industry-types'
import { cn } from '@/lib/utils'

interface IndustryTableProps {
  sectors: SectorL2Item[]
  quarterLabel?: string
}

type SortColumn = 'name' | 'symbolCount' | 'marketCap' | 'revenue' | 'lnst' | 'pe' | 'pb'
type SortDirection = 'asc' | 'desc'

export function IndustryTable({ sectors, quarterLabel = 'Gần Nhất' }: IndustryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortCol, setSortCol] = useState<SortColumn>('marketCap')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [expandedSectorCode, setExpandedSectorCode] = useState<string | null>(null)

  // Xử lý sắp xếp khi click tiêu đề cột
  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  // Toggle drill-down
  const toggleExpand = (code: string) => {
    setExpandedSectorCode((prev) => (prev === code ? null : code))
  }

  // Filter & Sort rows
  const filteredAndSortedSectors = useMemo(() => {
    let list = sectors.filter((s) => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase().trim()
      const matchName = s.name.toLowerCase().includes(q)
      const matchSymbol = s.allSymbols.some((sym) => sym.toLowerCase().includes(q))
      return matchName || matchSymbol
    })

    list.sort((a, b) => {
      let vA = a[sortCol]
      let vB = b[sortCol]

      if (vA == null) return 1
      if (vB == null) return -1

      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)
      }

      const numA = Number(vA)
      const numB = Number(vB)
      return sortDir === 'asc' ? numA - numB : numB - numA
    })

    return list
  }, [sectors, searchTerm, sortCol, sortDir])

  return (
    <div className="rounded-2xl border border-white/8 bg-[#161a23] p-4 shadow-sm sm:p-6">
      {/* Header & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-emerald-400" />
            <h2 className="text-base font-bold text-[#F0F3F6] sm:text-lg">
              Bảng dữ liệu chi tiết các ngành ICB (Cấp 2)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#8B98A5]">
            Bấm vào từng ngành để xem các phân nhóm con và toàn bộ danh sách cổ phiếu trực thuộc
          </p>
        </div>

        {/* Ô tìm kiếm nhanh ngành hoặc mã CP */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B98A5]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên ngành hoặc mã CP..."
            className="w-full rounded-xl border border-white/10 bg-[#12151c] py-2 pl-9 pr-3 text-xs text-[#F0F3F6] placeholder-[#64748B] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8B98A5] hover:text-[#F0F3F6]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#1a1f2c]/50 text-[#8B98A5]">
              <th className="py-3 pl-4 pr-2 font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>Ngành</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('symbolCount')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>Số CP</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('marketCap')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>Vốn hóa</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('revenue')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>Doanh thu {quarterLabel}</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('lnst')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>LNST {quarterLabel}</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('pe')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>P/E</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
              <th className="py-3 pl-3 pr-4 text-right font-semibold">
                <button
                  type="button"
                  onClick={() => handleSort('pb')}
                  className="ml-auto flex items-center gap-1 hover:text-[#F0F3F6]"
                >
                  <span>P/B</span>
                  <ArrowUpDown className="size-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedSectors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#8B98A5]">
                  Không tìm thấy ngành hoặc cổ phiếu nào phù hợp với từ khóa.
                </td>
              </tr>
            ) : (
              filteredAndSortedSectors.map((sector) => {
                const isExpanded = expandedSectorCode === sector.code
                return (
                  <React.Fragment key={sector.code}>
                    <tr
                      onClick={() => toggleExpand(sector.code)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-white/[0.04]',
                        isExpanded ? 'bg-emerald-500/[0.06]' : ''
                      )}
                    >
                      {/* Cột Tên ngành + icon toggle */}
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
                          <span className="font-semibold">{sector.name}</span>
                          <span className="text-[10px] text-[#64748B]">({sector.l1Name})</span>
                        </div>
                      </td>

                      {/* Số CP */}
                      <td className="px-3 py-3.5 text-right text-[#9EACB9]">
                        {sector.symbolCount}
                      </td>

                      {/* Vốn hóa & Tỷ trọng */}
                      <td className="px-3 py-3.5 text-right">
                        <div className="font-semibold text-emerald-400">
                          {formatBillionVnd(sector.marketCap)}
                        </div>
                        <div className="text-[10px] text-[#8B98A5]">
                          {sector.marketCapRatio.toFixed(1)}% thị trường
                        </div>
                      </td>

                      {/* Doanh thu & YoY */}
                      <td className="px-3 py-3.5 text-right">
                        <div className="font-medium text-[#F0F3F6]">
                          {formatBillionVnd(sector.revenue)}
                        </div>
                        {sector.revenueYoy != null && (
                          <div
                            className={cn(
                              'text-[10px]',
                              sector.revenueYoy > 0
                                ? 'text-emerald-400'
                                : sector.revenueYoy < 0
                                ? 'text-rose-400'
                                : 'text-[#8B98A5]'
                            )}
                          >
                            {sector.revenueYoy > 0 ? '+' : ''}
                            {sector.revenueYoy}% YoY
                          </div>
                        )}
                      </td>

                      {/* LNST & YoY */}
                      <td className="px-3 py-3.5 text-right">
                        <div
                          className={cn(
                            'font-medium',
                            sector.lnst > 0
                              ? 'text-emerald-400'
                              : sector.lnst < 0
                              ? 'text-rose-400'
                              : 'text-[#9EACB9]'
                          )}
                        >
                          {formatBillionVnd(sector.lnst)}
                        </div>
                        {sector.lnstYoy != null && (
                          <div
                            className={cn(
                              'text-[10px]',
                              sector.lnstYoy > 0
                                ? 'text-emerald-400'
                                : sector.lnstYoy < 0
                                ? 'text-rose-400'
                                : 'text-[#8B98A5]'
                            )}
                          >
                            {sector.lnstYoy > 0 ? '+' : ''}
                            {sector.lnstYoy}% YoY
                          </div>
                        )}
                      </td>

                      {/* P/E */}
                      <td className="px-3 py-3.5 text-right font-medium text-amber-400">
                        {sector.pe != null ? sector.pe.toFixed(2) : '—'}
                      </td>

                      {/* P/B */}
                      <td className="py-3.5 pl-3 pr-4 text-right font-medium text-purple-400">
                        {sector.pb != null ? sector.pb.toFixed(2) : '—'}
                      </td>
                    </tr>

                    {/* Vùng mở rộng Drill-Down */}
                    {isExpanded && (
                      <tr className="bg-[#12151c]/70">
                        <td colSpan={7} className="p-4 sm:px-6 sm:py-5">
                          <div className="space-y-4">
                            {/* Phân nhóm L4 nếu có */}
                            {sector.level4.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-[#8B98A5] uppercase tracking-wider">
                                  Các phân nhóm con ({sector.level4.length} nhóm)
                                </h4>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {sector.level4.map((sub) => (
                                    <span
                                      key={sub.code}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1a1f2c] px-2.5 py-1 text-xs text-[#F0F3F6]"
                                    >
                                      <span className="font-semibold">{sub.name_vi}</span>
                                      <span className="rounded bg-white/10 px-1 py-0.2 text-[10px] text-[#8B98A5]">
                                        {sub.symbols.length} mã
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Danh sách các mã cổ phiếu trong ngành */}
                            <div>
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#8B98A5] uppercase tracking-wider">
                                  Danh sách cổ phiếu trong ngành ({sector.allSymbols.length} mã)
                                </h4>
                                <span className="text-[11px] text-[#64748B]">
                                  Bấm vào mã để xem biểu đồ & BCTC chi tiết
                                </span>
                              </div>

                              <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-2">
                                {sector.allSymbols.map((sym) => (
                                  <Link
                                    key={sym}
                                    href={`/stock/${sym.toUpperCase()}`}
                                    className="group inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#161a23] px-2 py-1 text-xs font-semibold text-[#F0F3F6] transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                                  >
                                    <span>{sym}</span>
                                    <ExternalLink className="size-2.5 opacity-40 transition-opacity group-hover:opacity-100" />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
