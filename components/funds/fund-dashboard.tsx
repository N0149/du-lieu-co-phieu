'use client'

import { useState, useMemo } from 'react'
import { FundSummaryCards } from '@/components/funds/fund-summary-cards'
import { FundFilters } from '@/components/funds/fund-filters'
import { FundTable } from '@/components/funds/fund-table'
import { FundDetailModal } from '@/components/funds/fund-detail-modal'
import { FUNDS_DATA, FundCategory, Fund } from '@/lib/funds-data'
import { BarChart3, TrendingUp, ShieldAlert, Sparkles } from 'lucide-react'

export function FundDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<FundCategory | 'all'>('all')
  const [selectedIssuer, setSelectedIssuer] = useState<string>('Tất cả tổ chức')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeFund, setActiveFund] = useState<Fund | null>(null)

  // Filter list
  const filteredFunds = useMemo(() => {
    return FUNDS_DATA.filter((fund) => {
      // 1. Loại quỹ
      if (selectedCategory !== 'all' && fund.category !== selectedCategory) {
        return false
      }
      // 2. Tổ chức phát hành
      if (selectedIssuer !== 'Tất cả tổ chức' && fund.issuer !== selectedIssuer) {
        return false
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCode = fund.code.toLowerCase().includes(q)
        const matchName = fund.name.toLowerCase().includes(q)
        const matchIssuer = fund.issuer.toLowerCase().includes(q)
        const matchHolding = fund.holdings.some((h) =>
          h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)
        )
        if (!matchCode && !matchName && !matchIssuer && !matchHolding) {
          return false
        }
      }
      return true
    })
  }, [selectedCategory, selectedIssuer, searchQuery])

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-2 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
              <BarChart3 className="size-3.5" />
              Smart Money Tracker
            </span>
            <span className="text-xs text-[#8B949E]">
              68 Quỹ Mở • Dữ liệu cập nhật 28/08/2026
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[#F0F3F6] sm:text-3xl">
            Quỹ Đầu Tư Mở
          </h1>
          <p className="mt-1 text-sm text-[#9EACB9]">
            Bóc tách khẩu vị đầu tư và danh mục nắm giữ của các định chế tài chính & quỹ mở hàng đầu tại Việt Nam.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#181C26] px-3.5 py-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-[#8B949E]">Tỷ trọng Ngân Hàng</div>
              <div className="font-mono text-sm font-bold text-emerald-400">26.82% Top 1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Cổ Phiếu & Top 10 Ngành (Giống ruatichsan) */}
      <section>
        <FundSummaryCards />
      </section>

      {/* Bảng Xếp Hạng Quỹ Mở */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#F0F3F6]">
            Danh Sách & Hiệu Suất Sinh Lời Các Quỹ Mở
          </h2>
          <p className="text-xs text-[#9EACB9]">
            So sánh giá NAV, lợi nhuận YTD, 1 năm và 3 năm của các quỹ mở trên thị trường.
          </p>
        </div>

        {/* Filters */}
        <FundFilters
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedIssuer={selectedIssuer}
          onSelectIssuer={setSelectedIssuer}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Table */}
        <FundTable funds={filteredFunds} onSelectFund={setActiveFund} />
      </section>

      {/* Modal chi tiết khi click */}
      <FundDetailModal fund={activeFund} onClose={() => setActiveFund(null)} />
    </div>
  )
}
