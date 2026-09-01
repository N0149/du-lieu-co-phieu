'use client'

import { Search, ChevronDown } from 'lucide-react'
import { FundCategory, FUND_CATEGORIES, FUND_ISSUERS } from '@/lib/funds-data'

interface FundFiltersProps {
  selectedCategory: FundCategory | 'all'
  onSelectCategory: (cat: FundCategory | 'all') => void
  selectedIssuer: string
  onSelectIssuer: (issuer: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function FundFilters({
  selectedCategory,
  onSelectCategory,
  selectedIssuer,
  onSelectIssuer,
  searchQuery,
  onSearchChange,
}: FundFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FUND_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(cat.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'border border-white/8 bg-[#181C26] text-[#9EACB9] hover:bg-white/5 hover:text-[#F0F3F6]'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Select Issuer & Search Box */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Dropdown Issuer */}
        <div className="relative">
          <select
            value={selectedIssuer}
            onChange={(e) => onSelectIssuer(e.target.value)}
            className="w-full sm:w-auto appearance-none rounded-lg border border-white/8 bg-[#181C26] px-3 py-1.5 pr-8 text-xs font-medium text-[#F0F3F6] focus:border-blue-500 focus:outline-none"
          >
            {FUND_ISSUERS.map((issuer) => (
              <option key={issuer} value={issuer} className="bg-[#181C26] text-white">
                {issuer === 'Tất cả tổ chức' ? 'Chọn tổ chức phát hành' : issuer}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9EACB9]" />
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã hoặc tên quỹ..."
            className="w-full sm:w-60 rounded-lg border border-white/8 bg-[#181C26] pl-8 pr-3 py-1.5 text-xs text-[#F0F3F6] placeholder-[#8B949E] focus:border-blue-500 focus:outline-none"
          />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8B949E]" />
        </div>
      </div>
    </div>
  )
}
