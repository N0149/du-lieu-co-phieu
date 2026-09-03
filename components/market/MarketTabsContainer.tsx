'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WorldMarketSection } from './WorldMarketSection'
import { ValuationChartsSection } from './ValuationChartsSection'
import { MarketReportsSection } from './MarketReportsSection'
import { CtckStatisticsSection } from './CtckStatisticsSection'
import { Activity, LineChart, FileText, BarChart3, Sparkles, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorldMarketData } from '@/lib/market-service'
import type { ValuationFilterResult } from '@/lib/pe-pb-service'
import type { MarketReportsResult } from '@/lib/reports-service'
import type { CtckFullData } from '@/lib/ctck-types'

interface MarketTabsContainerProps {
  initialWorldData?: WorldMarketData | null
  initialValuation?: ValuationFilterResult | null
  initialReports?: MarketReportsResult | null
  initialCtckData?: CtckFullData | null
}

export function MarketTabsContainer({
  initialWorldData,
  initialValuation,
  initialReports,
  initialCtckData,
}: MarketTabsContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'dinhgia' | 'reports' | 'ctck'>(() => {
    if (tabParam === 'reports') return 'reports'
    if (tabParam === 'ctck') return 'ctck'
    return 'dinhgia'
  })

  // Cập nhật tab khi query url thay đổi
  useEffect(() => {
    if (tabParam === 'reports') setActiveTab('reports')
    else if (tabParam === 'ctck') setActiveTab('ctck')
    else if (tabParam === 'dinhgia') setActiveTab('dinhgia')
  }, [tabParam])

  const handleTabChange = (tab: 'dinhgia' | 'reports' | 'ctck') => {
    setActiveTab(tab)
    const newParams = new URLSearchParams(searchParams.toString())
    if (tab === 'dinhgia') {
      newParams.delete('tab')
    } else {
      newParams.set('tab', tab)
    }
    const query = newParams.toString()
    router.replace(query ? `/thi-truong?${query}` : '/thi-truong', { scroll: false })
  }

  const reportsTotal = initialReports?.total || 1073

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Tab Selector */}
      <div className="-mx-4 -mt-6 border-b border-white/8 bg-[#14171f]/90 px-4 py-4 sm:-mx-6 sm:px-6 backdrop-blur-md sticky top-14 z-20">
        <div className="mx-auto max-w-[1720px] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Activity className="size-3.5" />
              <span>DỮ LIỆU THỊ TRƯỜNG TOÀN CẦU & VIỆT NAM</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl text-[#F0F3F6]">
              {activeTab === 'reports'
                ? 'Báo Cáo Phân Tích Thị Trường'
                : 'Tổng Quan Thị Trường & Định Giá'}
            </h1>
          </div>

          {/* 3 Main Feature Tabs */}
          <div className="flex items-center rounded-xl border border-white/10 bg-[#161a23] p-1 shadow-sm">
            {/* Tab 1: Định giá VNINDEX */}
            <button
              type="button"
              onClick={() => handleTabChange('dinhgia')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                activeTab === 'dinhgia'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-[#9EACB9] hover:text-[#F0F3F6]'
              )}
            >
              <LineChart className="size-3.5" />
              <span>Định giá VNINDEX</span>
            </button>

            {/* Tab 2: Báo cáo thị trường */}
            <button
              type="button"
              onClick={() => handleTabChange('reports')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer relative',
                activeTab === 'reports'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-[#9EACB9] hover:text-[#F0F3F6]'
              )}
            >
              <FileText className="size-3.5" />
              <span>Báo cáo thị trường</span>
              <span className="rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {reportsTotal > 999 ? '1k+' : reportsTotal}
              </span>
            </button>

            {/* Tab 3: Thống kê CTCK */}
            <button
              type="button"
              onClick={() => handleTabChange('ctck')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                activeTab === 'ctck'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-[#9EACB9] hover:text-[#F0F3F6]'
              )}
            >
              <BarChart3 className="size-3.5" />
              <span>Thống kê CTCK</span>
            </button>

            {/* Tab 4: Đánh giá Ngành ICB */}
            <Link
              href="/nganh"
              className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold text-[#9EACB9] hover:text-[#F0F3F6] hover:bg-white/5 transition-all cursor-pointer"
            >
              <Layers className="size-3.5 text-emerald-400" />
              <span>Đánh giá Ngành ICB</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Nội dung Tab */}
      <div className="mx-auto max-w-[1720px] pt-2">
        {/* TAB 1: ĐỊNH GIÁ & THỊ TRƯỜNG TOÀN CẦU */}
        {activeTab === 'dinhgia' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hàng 1: Biến động thị trường thế giới */}
            <section className="rounded-2xl border border-white/8 bg-[#14171f] p-4 shadow-lg sm:p-6">
              <WorldMarketSection initialData={initialWorldData} />
            </section>

            {/* Hàng 2: Định giá VN-Index P/E & P/B Lịch sử */}
            <section className="rounded-2xl border border-white/8 bg-[#14171f] p-4 shadow-lg sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-bold text-[#F0F3F6] tracking-tight flex items-center gap-2">
                  <LineChart className="size-4 text-emerald-400" />
                  Định Giá VN-INDEX Lịch Sử (P/E & P/B)
                </h2>
                <p className="text-xs text-[#9EACB9] mt-0.5">
                  Đo lường mức định giá thị trường chứng khoán Việt Nam qua các dải phân vị chuẩn (+1SD, +2SD, Trung vị, Trung bình, -1SD, -2SD)
                </p>
              </div>

              <ValuationChartsSection initialValuation={initialValuation} />
            </section>
          </div>
        )}

        {/* TAB 2: BÁO CÁO PHÂN TÍCH THỊ TRƯỜNG */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-200">
            <MarketReportsSection initialReports={initialReports} />
          </div>
        )}

        {/* TAB 3: THỐNG KÊ CTCK (DƯ NỢ MARGIN & THỊ PHẦN HOSE) */}
        {activeTab === 'ctck' && (
          <div className="animate-in fade-in duration-200">
            <CtckStatisticsSection initialData={initialCtckData} />
          </div>
        )}
      </div>
    </div>
  )
}
