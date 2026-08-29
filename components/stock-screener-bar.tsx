'use client'

import { useState } from 'react'
import { Filter, RotateCcw, Copy, Check } from 'lucide-react'
import type { StockManifestItem } from '@/lib/longlivestock'
import { cn } from '@/lib/utils'

export type ScreenerFilterState = {
  roeMin: number | null
  peMax: number | null
  pbMax: number | null
  capMin: number | null
  dyMin: number | null
  w1Min: number | null
  sector: string
}

interface StockScreenerBarProps {
  filterState: ScreenerFilterState
  onChangeFilter: (key: keyof ScreenerFilterState, value: any) => void
  onResetFilters: () => void
  sectorOptions: string[]
  filteredStocks: StockManifestItem[]
}

export function StockScreenerBar({
  filterState,
  onChangeFilter,
  onResetFilters,
  sectorOptions,
  filteredStocks,
}: StockScreenerBarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyTickers = () => {
    const list = filteredStocks.map((s) => s.t).join(', ')
    if (!list) return
    navigator.clipboard.writeText(list).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const hasActiveFilters =
    filterState.roeMin != null ||
    filterState.peMax != null ||
    filterState.pbMax != null ||
    filterState.capMin != null ||
    filterState.dyMin != null ||
    filterState.w1Min != null ||
    filterState.sector !== ''

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      {/* Title */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Filter className="size-3.5 text-primary" />
          <span>Bộ Lọc Số Liệu Cổ Phiếu</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {filteredStocks.length} mã thỏa điều kiện
        </span>
      </div>

      {/* Filter Inputs Row */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {/* ROE */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            ROE ≥ (%)
          </label>
          <input
            type="number"
            placeholder="vd: 15"
            value={filterState.roeMin ?? ''}
            onChange={(e) =>
              onChangeFilter('roeMin', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* P/E */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            P/E ≤
          </label>
          <input
            type="number"
            placeholder="vd: 12"
            value={filterState.peMax ?? ''}
            onChange={(e) =>
              onChangeFilter('peMax', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* P/B */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            P/B ≤
          </label>
          <input
            type="number"
            placeholder="vd: 2"
            value={filterState.pbMax ?? ''}
            onChange={(e) =>
              onChangeFilter('pbMax', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* Vốn hoá */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vốn hoá ≥ (tỷ)
          </label>
          <input
            type="number"
            placeholder="vd: 1000"
            value={filterState.capMin ?? ''}
            onChange={(e) =>
              onChangeFilter('capMin', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* Cổ tức */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cổ tức ≥ (%)
          </label>
          <input
            type="number"
            placeholder="vd: 5"
            value={filterState.dyMin ?? ''}
            onChange={(e) =>
              onChangeFilter('dyMin', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* ±1 tuần */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            ±1 tuần ≥ (%)
          </label>
          <input
            type="number"
            placeholder="vd: 2"
            value={filterState.w1Min ?? ''}
            onChange={(e) =>
              onChangeFilter('w1Min', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* Ngành */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ngành
          </label>
          <select
            value={filterState.sector}
            onChange={(e) => onChangeFilter('sector', e.target.value)}
            className="h-8.5 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="">Tất cả ngành</option>
            {sectorOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons & Disclaimer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
        <p className="text-[11px] text-muted-foreground">
          Công cụ lọc số liệu độc lập, không phải khuyến nghị đầu tư.
        </p>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              <span>Xóa lọc</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyTickers}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all',
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Đã copy danh sách mã ✓' : 'Copy danh sách mã'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
