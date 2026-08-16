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
    <div className="mb-5 flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">Cổ phiếu trong danh mục</p>
      <p className="flex items-baseline gap-1">
        <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
          {fmtInt(total)}
        </span>
        <span className="text-xs text-muted-foreground">mã</span>
      </p>
    </div>
  )
}
