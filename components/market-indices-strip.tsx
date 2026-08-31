'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Layers, ChevronDown, RefreshCw, Check } from 'lucide-react'
import type { MarketIndicesData, MarketManifestData } from '@/lib/longlivestock'
import { cn } from '@/lib/utils'

interface MarketIndicesStripProps {
  indicesData: MarketIndicesData
  manifestData: MarketManifestData
  isSectorPanelOpen: boolean
  onToggleSectorPanel: () => void
  totalSectorsCount?: number
}

function fmtPrice(val: number | null | undefined, unit?: string): string {
  if (val == null || isNaN(val)) return '—'
  const dec = val % 1 === 0 ? 0 : 2
  return val.toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function MarketIndicesStrip({
  indicesData,
  manifestData,
  isSectorPanelOpen,
  onToggleSectorPanel,
  totalSectorsCount = 19,
}: MarketIndicesStripProps) {
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  const vnItems = useMemo(() => {
    return (indicesData.items || []).filter((it) => !it.unit)
  }, [indicesData])

  const commItems = useMemo(() => {
    return (indicesData.items || []).filter((it) => !!it.unit)
  }, [indicesData])

  const breadth = manifestData.breadth || { up: 0, down: 0, flat: 0 }

  const handleManualSync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const res = await fetch('/api/sync-market-data', { method: 'POST' })
      if (res.ok) {
        setSynced(true)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (e) {
      console.error('Lỗi khi đồng bộ:', e)
    } finally {
      setTimeout(() => {
        setSyncing(false)
      }, 1500)
    }
  }

  return (
    <div className="sticky top-14 z-30 border-b border-white/8 bg-[#14171f]/95 backdrop-blur">
      {/* Tầng 1: Ticker Bar (Indices + Commodities) */}
      <div className="overflow-x-auto border-b border-white/8 py-2 scrollbar-none">
        <div className="mx-auto flex max-w-[1600px] min-w-max items-center justify-between px-4 text-xs">
          {/* VN Indices */}
          <div className="flex items-center gap-4">
            {vnItems.map((it) => {
              const isUp = it.chg > 0
              const isDown = it.chg < 0
              return (
                <div key={it.id} className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="font-medium text-[#9EACB9]">{it.label}</span>
                  <span className="font-mono font-bold text-[#F0F3F6]">
                    {fmtPrice(it.price)}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[11px] font-semibold tabular-nums',
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-400'
                    )}
                  >
                    {isUp ? `+${it.chg.toFixed(2)}%` : `${it.chg.toFixed(2)}%`}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Commodities */}
          <div className="hidden items-center gap-4 lg:flex pl-4 border-l border-white/8">
            {commItems.map((it) => {
              const isUp = it.chg > 0
              const isDown = it.chg < 0
              return (
                <div key={it.id} className="flex items-baseline gap-1.5 whitespace-nowrap text-[11px]">
                  <span className="text-[#9EACB9]">{it.label}</span>
                  <span className="font-mono font-semibold text-[#F0F3F6]">
                    {fmtPrice(it.price)}
                  </span>
                  <span
                    className={cn(
                      'font-mono font-medium tabular-nums',
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-400'
                    )}
                  >
                    {isUp ? `+${it.chg.toFixed(2)}%` : `${it.chg.toFixed(2)}%`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tầng 2: Breadth & Action Strip */}
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs">
        {/* SEO Title */}
        <div className="hidden items-center gap-2 border-r border-border pr-4 md:flex">
          <span className="font-bold text-foreground">
            Dữ liệu 1.530 mã chứng khoán
          </span>
          <span className="text-muted-foreground">· Tự động cập nhật mỗi ngày</span>
        </div>

        {/* Market Breadth */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-3" />
            <span>{breadth.up} tăng</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-mono font-semibold text-muted-foreground">
            <span>—</span>
            <span>{breadth.flat} đứng giá</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 font-mono font-semibold text-rose-600 dark:text-rose-400">
            <TrendingDown className="size-3" />
            <span>{breadth.down} giảm</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            (phiên {manifestData.asof})
          </span>
        </div>

        {/* Action Buttons: Sector Browse + Manual Refresh */}
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
              synced
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground',
            )}
            title="Làm mới giá EOD & dữ liệu thị trường mới nhất"
          >
            {synced ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <RefreshCw className={cn('size-3.5', syncing && 'animate-spin text-primary')} />
            )}
            <span>{syncing ? 'Đang cập nhật...' : synced ? 'Đã làm mới ✓' : 'Làm mới giá'}</span>
          </button>

          {/* Sector Browse Button */}
          <button
            type="button"
            onClick={onToggleSectorPanel}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold transition-all',
              isSectorPanelOpen
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary/5',
            )}
            aria-expanded={isSectorPanelOpen}
          >
            <Layers className="size-3.5" />
            <span>Duyệt theo ngành</span>
            <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] dark:bg-white/10">
              {totalSectorsCount}
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-200',
                isSectorPanelOpen && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
