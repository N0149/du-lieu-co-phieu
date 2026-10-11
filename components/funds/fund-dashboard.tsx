'use client'

import { useState, useMemo } from 'react'
import { FundSummaryCards } from '@/components/funds/fund-summary-cards'
import { FundFilters } from '@/components/funds/fund-filters'
import { FundTable } from '@/components/funds/fund-table'
import { FundDetailModal } from '@/components/funds/fund-detail-modal'
import {
  FUNDS_DATA,
  TOP_STOCK_HOLDINGS,
  TOP_INDUSTRY_HOLDINGS,
  FUND_ISSUERS,
  FundCategory,
  Fund,
  StockHoldingStats,
  IndustryHoldingStats,
} from '@/lib/funds-data'
import { type FundSnapshotData } from '@/lib/fund-service'
import { BarChart3, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react'

interface FundDashboardProps {
  initialData?: FundSnapshotData
}

export function FundDashboard({ initialData }: FundDashboardProps) {
  const [funds, setFunds] = useState<Fund[]>(initialData?.funds ?? FUNDS_DATA)
  const [topStocks, setTopStocks] = useState<StockHoldingStats[]>(initialData?.topStocks ?? TOP_STOCK_HOLDINGS)
  const [topIndustries, setTopIndustries] = useState<IndustryHoldingStats[]>(
    initialData?.topIndustries ?? TOP_INDUSTRY_HOLDINGS
  )
  const [issuers, setIssuers] = useState<string[]>(initialData?.issuers ?? FUND_ISSUERS)
  const [formattedDate, setFormattedDate] = useState<string>(
    initialData?.formattedDate ?? (funds[0]?.navDate || '09/10/2026')
  )

  const [selectedCategory, setSelectedCategory] = useState<FundCategory | 'all'>('all')
  const [selectedIssuer, setSelectedIssuer] = useState<string>('Tất cả tổ chức')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeFund, setActiveFund] = useState<Fund | null>(null)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)

  // Handle client-side live refresh
  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setRefreshSuccess(false)
    try {
      // Gọi API đồng bộ để lấy dữ liệu mới nhất từ Fmarket
      const res = await fetch('/api/sync-funds', { method: 'POST' })
      if (res.ok) {
        // Tải lại snapshot
        const getRes = await fetch('/api/funds')
        if (getRes.ok) {
          const json = await getRes.json()
          if (json.data) {
            const d = json.data as FundSnapshotData
            setFunds(d.funds)
            setTopStocks(d.topStocks)
            setTopIndustries(d.topIndustries)
            setIssuers(d.issuers)
            setFormattedDate(d.formattedDate)
            setRefreshSuccess(true)
            setTimeout(() => setRefreshSuccess(false), 4000)
          }
        }
      }
    } catch (err) {
      console.error('[FundDashboard] Refresh error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter list
  const filteredFunds = useMemo(() => {
    return funds.filter((fund) => {
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
        const matchHolding = fund.holdings.some(
          (h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)
        )
        if (!matchCode && !matchName && !matchIssuer && !matchHolding) {
          return false
        }
      }
      return true
    })
  }, [funds, selectedCategory, selectedIssuer, searchQuery])

  const top1Industry = topIndustries[0] || { industry: 'Ngân hàng', avgWeight: 27.58 }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
              <BarChart3 className="size-3.5" />
              Smart Money Tracker
            </span>
            <span className="text-xs text-[#8B949E]">
              {funds.length} Quỹ Mở • Dữ liệu cập nhật {formattedDate}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[#F0F3F6] sm:text-3xl">
            Quỹ Đầu Tư Mở
          </h1>
          <p className="mt-1 text-sm text-[#9EACB9]">
            Bóc tách khẩu vị đầu tư và danh mục nắm giữ của các định chế tài chính & quỹ mở hàng đầu tại Việt Nam.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Nút Làm mới dữ liệu */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#181C26] px-3.5 py-2 text-xs font-medium text-[#D0D7DE] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
            title="Đồng bộ dữ liệu NAV và danh mục mới nhất từ Fmarket"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-[#8B949E]'}`} />
            <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}</span>
          </button>

          {refreshSuccess && (
            <div className="flex items-center gap-1 text-xs text-emerald-400 animate-in fade-in duration-200">
              <CheckCircle2 className="size-3.5" />
              <span>Đã cập nhật mới nhất</span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#181C26] px-3.5 py-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-[#8B949E]">
                Tỷ trọng {top1Industry.industry}
              </div>
              <div className="font-mono text-sm font-bold text-emerald-400">
                {top1Industry.avgWeight.toFixed(2)}% Top 1
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Cổ Phiếu & Top 10 Ngành (Tính toán chuẩn xác từ danh mục thực tế của tất cả quỹ) */}
      <section>
        <FundSummaryCards topStocks={topStocks} topIndustries={topIndustries} />
      </section>

      {/* Bảng Xếp Hạng Quỹ Mở */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#F0F3F6]">
            Danh Sách & Hiệu Suất Sinh Lời Các Quỹ Mở
          </h2>
          <p className="text-xs text-[#9EACB9]">
            So sánh giá NAV, lợi nhuận YTD, 1 năm và 3 năm của {funds.length} quỹ mở trên thị trường. Click vào dòng để xem danh mục đầu tư chi tiết.
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
          issuers={issuers}
        />

        {/* Table */}
        <FundTable funds={filteredFunds} onSelectFund={setActiveFund} />
      </section>

      {/* Modal chi tiết khi click */}
      <FundDetailModal fund={activeFund} onClose={() => setActiveFund(null)} />
    </div>
  )
}
