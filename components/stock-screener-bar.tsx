'use client'

import { useState } from 'react'
import {
  Filter,
  RotateCcw,
  Copy,
  Check,
  LayoutGrid,
  Table as TableIcon,
  FileText,
  Ship,
  Sparkles,
} from 'lucide-react'
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
  exchange: string // '', 'HOSE', 'HNX', 'UPCOM'
  hasReportOnly: boolean
  portOnly: boolean
  viewMode: 'grid' | 'table'
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
    filterState.sector !== '' ||
    filterState.exchange !== '' ||
    filterState.hasReportOnly ||
    filterState.portOnly

  return (
    <div className="rounded-2xl border border-border bg-card p-4.5 shadow-xs space-y-3.5">
      {/* Title & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Filter className="size-3.5 text-primary" />
          <span>Bộ Lọc Số Liệu Cổ Phiếu</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
            {filteredStocks.length} mã
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick preset chips */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => onChangeFilter('hasReportOnly', !filterState.hasReportOnly)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                filterState.hasReportOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <FileText className="size-3" />
              <span>Có Báo Cáo</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeFilter('portOnly', !filterState.portOnly)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                filterState.portOnly
                  ? 'bg-amber-600 text-white'
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Ship className="size-3" />
              <span>Cảng biển</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => onChangeFilter('viewMode', 'grid')}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                filterState.viewMode === 'grid'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Chế độ Thẻ"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter('viewMode', 'table')}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                filterState.viewMode === 'table'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Chế độ Bảng"
            >
              <TableIcon className="size-3.5" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Inputs Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {/* Sàn */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Sàn giao dịch
          </label>
          <select
            value={filterState.exchange}
            onChange={(e) => onChangeFilter('exchange', e.target.value)}
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="">Tất cả sàn</option>
            <option value="HOSE">HOSE</option>
            <option value="HNX">HNX</option>
            <option value="UPCOM">UPCOM</option>
          </select>
        </div>

        {/* Ngành */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Nhóm ngành
          </label>
          <select
            value={filterState.sector}
            onChange={(e) => onChangeFilter('sector', e.target.value)}
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="">Tất cả ngành</option>
            {sectorOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* ROE */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            ROE ≥ (%)
          </label>
          <input
            type="number"
            placeholder="vd: 15"
            value={filterState.roeMin ?? ''}
            onChange={(e) =>
              onChangeFilter('roeMin', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* P/E */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            P/E ≤
          </label>
          <input
            type="number"
            placeholder="vd: 12"
            value={filterState.peMax ?? ''}
            onChange={(e) =>
              onChangeFilter('peMax', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* P/B */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            P/B ≤
          </label>
          <input
            type="number"
            placeholder="vd: 2"
            value={filterState.pbMax ?? ''}
            onChange={(e) =>
              onChangeFilter('pbMax', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* Vốn hoá */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Vốn hoá ≥ (tỷ)
          </label>
          <input
            type="number"
            placeholder="vd: 1000"
            value={filterState.capMin ?? ''}
            onChange={(e) =>
              onChangeFilter('capMin', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* Cổ tức */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Cổ tức ≥ (%)
          </label>
          <input
            type="number"
            placeholder="vd: 5"
            value={filterState.dyMin ?? ''}
            onChange={(e) =>
              onChangeFilter('dyMin', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>

        {/* ±1 tuần */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            ±1 tuần ≥ (%)
          </label>
          <input
            type="number"
            placeholder="vd: 2"
            value={filterState.w1Min ?? ''}
            onChange={(e) =>
              onChangeFilter('w1Min', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
        <p className="text-[11px] text-muted-foreground">
          Dữ liệu giá EOD cập nhật 16h00 hàng ngày · Dữ liệu BCTC chuẩn hóa 16 năm
        </p>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RotateCcw className="size-3" />
              <span>Xóa bộ lọc</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyTickers}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs',
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
