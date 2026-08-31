'use client'

import { useMemo } from 'react'
import { useReports } from '@/lib/use-reports'
import { buildReportStocks } from '@/lib/report-stocks'
import { fmtInt } from '@/lib/format'

/**
 * Dải KPI trên Trang Chủ — đếm số cổ phiếu ĐÃ CÓ báo cáo trong kho
 * (đồng bộ từ /api/reports).
 */
export function HomeKpis() {
  const { reports } = useReports()

  const total = useMemo(() => buildReportStocks(reports).length, [reports])

  return (
    <div className="mb-5 flex flex-col gap-1 rounded-xl border border-white/8 bg-[#212631] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-[#9EACB9]">Cổ phiếu trong danh mục</p>
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-bold tabular-nums text-[#F0F3F6]">
          {fmtInt(total)}
        </span>
        <span className="text-xs text-[#9EACB9]">mã</span>
      </p>
    </div>
  )
}
