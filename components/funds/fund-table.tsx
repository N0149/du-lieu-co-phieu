'use client'

import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react'
import { Fund } from '@/lib/funds-data'
import { fmtNum } from '@/lib/format'

type SortField = 'nav' | 'ytdReturn' | 'return1Y' | 'return3Y' | 'name'
type SortOrder = 'asc' | 'desc'

interface FundTableProps {
  funds: Fund[]
  onSelectFund: (fund: Fund) => void
}

export function FundTable({ funds, onSelectFund }: FundTableProps) {
  const [sortField, setSortField] = useState<SortField>('ytdReturn')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedFunds = [...funds].sort((a, b) => {
    let aVal = a[sortField] ?? 0
    let bVal = b[sortField] ?? 0

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string)
    }

    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="size-3 text-[#6E7681]" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="size-3 text-blue-400" />
    ) : (
      <ArrowDown className="size-3 text-blue-400" />
    )
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'equity':
        return <span className="text-[11px] text-emerald-400">Quỹ cổ phiếu</span>
      case 'bond':
        return <span className="text-[11px] text-amber-400">Quỹ trái phiếu</span>
      case 'balanced':
        return <span className="text-[11px] text-purple-400">Quỹ cân bằng</span>
      default:
        return null
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#181C26] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/6 bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[#9EACB9]">
              <th
                onClick={() => handleSort('name')}
                className="cursor-pointer py-3 pl-5 pr-3 transition-colors hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Tên Quỹ</span>
                  {getSortIcon('name')}
                </div>
              </th>

              <th className="py-3 px-3">Tổ chức phát hành</th>

              <th
                onClick={() => handleSort('nav')}
                className="cursor-pointer py-3 px-3 text-right transition-colors hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Giá gần nhất</span>
                  {getSortIcon('nav')}
                </div>
              </th>

              <th
                onClick={() => handleSort('ytdReturn')}
                className="cursor-pointer py-3 px-3 text-right transition-colors hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Lợi nhuận YTD</span>
                  {getSortIcon('ytdReturn')}
                </div>
              </th>

              <th
                onClick={() => handleSort('return1Y')}
                className="cursor-pointer py-3 px-3 text-right transition-colors hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Lợi nhuận 1 năm</span>
                  {getSortIcon('return1Y')}
                </div>
              </th>

              <th
                onClick={() => handleSort('return3Y')}
                className="cursor-pointer py-3 pl-3 pr-5 text-right transition-colors hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Lợi nhuận 3 năm</span>
                  {getSortIcon('return3Y')}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/6 text-[#D0D7DE]">
            {sortedFunds.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#8B949E]">
                  Không tìm thấy quỹ mở phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              sortedFunds.map((fund) => (
                <tr
                  key={fund.id}
                  onClick={() => onSelectFund(fund)}
                  className="group cursor-pointer transition-colors hover:bg-white/[0.04]"
                >
                  {/* Tên Quỹ */}
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 font-mono text-xs font-bold text-blue-400 border border-blue-500/20 group-hover:border-blue-400/50">
                        {fund.code.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#F0F3F6] group-hover:text-blue-400">
                            {fund.code}
                          </span>
                          <span className="text-[11px] text-[#8B949E]">-</span>
                          {getCategoryBadge(fund.category)}
                        </div>
                        <div className="text-[11px] text-[#8B949E] line-clamp-1">
                          {fund.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tổ chức phát hành */}
                  <td className="py-3 px-3 font-medium text-[#9EACB9]">
                    <span className="inline-block rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[#D0D7DE]">
                      {fund.issuer}
                    </span>
                  </td>

                  {/* NAV */}
                  <td className="py-3 px-3 text-right">
                    <div className="font-mono font-bold text-[#F0F3F6]">
                      {fmtNum(fund.nav, 0)} đ
                    </div>
                    <div className="text-[10px] text-[#8B949E]">
                      Theo NAV {fund.navDate}
                    </div>
                  </td>

                  {/* Lợi nhuận YTD */}
                  <td className="py-3 px-3 text-right font-mono font-semibold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded ${
                        fund.ytdReturn >= 0
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {fund.ytdReturn >= 0 ? `+${fund.ytdReturn.toFixed(2)}%` : `${fund.ytdReturn.toFixed(2)}%`}
                    </span>
                  </td>

                  {/* Lợi nhuận 1 năm */}
                  <td className="py-3 px-3 text-right font-mono font-semibold">
                    <span
                      className={
                        fund.return1Y >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {fund.return1Y >= 0 ? `+${fund.return1Y.toFixed(2)}%` : `${fund.return1Y.toFixed(2)}%`}
                    </span>
                  </td>

                  {/* Lợi nhuận 3 năm */}
                  <td className="py-3 pl-3 pr-5 text-right font-mono font-semibold">
                    <span
                      className={
                        fund.return3Y >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {fund.return3Y >= 0 ? `+${fund.return3Y.toFixed(2)}%` : `${fund.return3Y.toFixed(2)}%`}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/6 bg-white/[0.01] px-5 py-3 text-[11px] text-[#8B949E] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Info className="size-3.5" />
          <span>Click vào dòng từng quỹ để xem chi tiết danh mục Top Holdings và tỷ trọng nắm giữ.</span>
        </div>
        <div>
          Hiển thị <span className="font-semibold text-white">{sortedFunds.length}</span> quỹ mở
        </div>
      </div>
    </div>
  )
}
