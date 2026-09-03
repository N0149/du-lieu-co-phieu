'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Layers, BarChart3, LineChart, FileText } from 'lucide-react'
import { IndustryOverviewCards } from './IndustryOverviewCards'
import { IndustryPieCharts } from './IndustryPieCharts'
import { IndustryTable } from './IndustryTable'
import { IndustryValuationTable } from './IndustryValuationTable'
import { IndustryExclusionBar } from './IndustryExclusionBar'
import {
  calculateFilteredIndustryData,
  type IndustryFullData,
} from '@/lib/industry-types'
import { cn } from '@/lib/utils'

interface IndustryContainerProps {
  data: IndustryFullData
}

export function IndustryContainer({ data }: IndustryContainerProps) {
  const [activeTab, setActiveTab] = useState<'co-cau' | 'dinh-gia'>('co-cau')
  const [excludedSymbols, setExcludedSymbols] = useState<string[]>([])

  // Tính toán lại dữ liệu thời gian thực khi có mã bị loại trừ
  const activeData = useMemo(() => {
    return calculateFilteredIndustryData(data, excludedSymbols)
  }, [data, excludedSymbols])

  const isExcluded = excludedSymbols.length > 0

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="-mx-4 -mt-6 border-b border-white/8 bg-[#14171f]/90 px-4 py-4 sm:-mx-6 sm:px-6 backdrop-blur-md sticky top-14 z-20">
        <div className="mx-auto max-w-[1720px] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Layers className="size-3.5" />
              <span>PHÂN TÍCH & BỨC TRANH TOÀN CẢNH NGÀNH (ICB)</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl text-[#F0F3F6]">
              {activeTab === 'co-cau'
                ? 'Cơ Cấu Vốn Hóa & Lợi Nhuận Theo Ngành'
                : 'Định Giá P/E, P/B & Biên An Toàn Toàn Ngành'}
            </h1>
            <p className="mt-0.5 text-xs text-[#8B98A5]">
              Dữ liệu chuẩn hóa 19 nhóm ngành ICB cấp 2, chuỗi kết quả kinh doanh và định giá lịch sử
            </p>
          </div>

          {/* Tab Selector & Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-white/10 bg-[#161a23] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('co-cau')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                  activeTab === 'co-cau'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]'
                )}
              >
                <BarChart3 className="size-3.5" />
                <span>Cơ cấu ngành ICB</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dinh-gia')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                  activeTab === 'dinh-gia'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-[#9EACB9] hover:text-[#F0F3F6]'
                )}
              >
                <LineChart className="size-3.5" />
                <span>Định giá theo ngành</span>
              </button>
            </div>

            {/* Quick Link to /bao-cao */}
            <Link
              href="/bao-cao"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161a23] px-3 py-2 text-xs font-medium text-[#9EACB9] hover:border-emerald-500/40 hover:text-[#F0F3F6] transition-all"
            >
              <FileText className="size-3.5 text-emerald-400" />
              <span>Báo cáo phân tích ngành</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Thanh lựa chọn loại trừ cổ phiếu (chỉ xuất hiện ở tab Cơ cấu ngành ICB) */}
      {activeTab === 'co-cau' && (
        <IndustryExclusionBar
          excludedSymbols={excludedSymbols}
          onChange={setExcludedSymbols}
          allStocks={data.allStocks}
        />
      )}

      {/* 1. Thanh chỉ số tổng quan thị trường (tự động cập nhật theo loại trừ) */}
      <IndustryOverviewCards
        summary={activeData.summary}
        isExcluded={isExcluded}
      />

      {/* 2. Nội dung Tab */}
      {activeTab === 'co-cau' ? (
        <div className="space-y-6">
          {/* Hai biểu đồ tròn (tự động cập nhật theo loại trừ) */}
          <IndustryPieCharts
            marketCapPie={activeData.marketCapPie}
            lnstPie={activeData.lnstPie}
            quarterLabel={activeData.summary.latestQuarter}
          />

          {/* Bảng dữ liệu 19 ngành L2 (tự động cập nhật theo loại trừ) */}
          <IndustryTable
            sectors={activeData.sectors}
            quarterLabel={activeData.summary.latestQuarter}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <IndustryValuationTable valuationList={data.valuationOverview} />
        </div>
      )}
    </div>
  )
}
