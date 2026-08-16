'use client'

import { useMemo } from 'react'
import { useReports } from '@/lib/use-reports'
import { buildReportStocks, upsideOf } from '@/lib/report-stocks'
import { fmtInt, fmtPct } from '@/lib/format'

/**
 * Dải KPI trên Trang Chủ — tự động đếm/tính từ danh sách mã ĐÃ CÓ báo cáo
 * trong kho (đồng bộ từ /api/reports). Upside & cổ tức trung bình chỉ tính
 * trên các mã có dữ liệu tài chính.
 */
export function HomeKpis() {
  const { reports } = useReports()

  const stats = useMemo(() => {
    const rows = buildReportStocks(reports)
    const total = rows.length
    const withData = rows.filter((r) => upsideOf(r) != null)
    const undervalued = rows.filter((r) => {
      const u = upsideOf(r)
      return u != null && u > 0
    }).length
    const avgUpside =
      withData.length > 0
        ? withData.reduce((acc, r) => acc + (upsideOf(r) as number), 0) / withData.length
        : 0
    const withDiv = rows.filter((r) => r.dividendYield != null)
    const avgDiv =
      withDiv.length > 0
        ? withDiv.reduce((acc, r) => acc + (r.dividendYield as number), 0) / withDiv.length
        : 0
    return { total, undervalued, avgUpside, avgDiv }
  }, [reports])

  return (
    <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
      <Kpi label="Cổ phiếu trong danh mục" value={fmtInt(stats.total)} unit="mã" />
      <Kpi label="Đang định giá thấp" value={fmtInt(stats.undervalued)} unit="mã" tone="positive" />
      <Kpi label="Upside trung bình" value={fmtPct(stats.avgUpside, 0)} tone="positive" />
      <Kpi label="Cổ tức trung bình" value={`${stats.avgDiv.toFixed(1)}%`} tone="positive" />
    </div>
  )
}

function Kpi({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string
  unit?: string
  tone?: 'positive'
}) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span
          className={`font-mono text-2xl font-bold tabular-nums ${
            tone === 'positive' ? 'text-positive' : 'text-foreground'
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}
