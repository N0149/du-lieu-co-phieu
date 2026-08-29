'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import type { StockManifestItem } from '@/lib/longlivestock'
import { cn } from '@/lib/utils'

interface TopMoversPanelProps {
  stocks: StockManifestItem[]
  onSelectTicker?: (ticker: string) => void
}

function MiniSparkline({ spark, isUp }: { spark?: number[]; isUp: boolean }) {
  if (!spark || spark.length < 2) return null
  const valid = spark.filter((v) => v != null && !isNaN(v))
  if (valid.length < 2) return null

  const mn = Math.min(...valid)
  const mx = Math.max(...valid)
  const range = mx - mn || 1

  const points = valid
    .map((v, i) => {
      const x = (1 + (i / (valid.length - 1)) * 54).toFixed(1)
      const y = (1 + (1 - (v - mn) / range) * 16).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width="56" height="18" viewBox="0 0 56 18" fill="none" className="shrink-0">
      <polyline
        points={points}
        stroke={isUp ? '#10b981' : '#f43f5e'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TopMoversPanel({ stocks }: TopMoversPanelProps) {
  const { gainers, losers } = useMemo(() => {
    const liquid = stocks.filter((s) => !s.st && s.w1 != null && (s.cap || 0) >= 150)
    const sorted = [...liquid].sort((a, b) => (b.w1 || 0) - (a.w1 || 0))

    const topGainers = sorted.slice(0, 6)
    const topLosers = [...sorted].reverse().slice(0, 6)

    return { gainers: topGainers, losers: topLosers }
  }, [stocks])

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-xs">
      {/* Top Gainers */}
      <div>
        <div className="flex items-center gap-1.5 border-b border-border bg-emerald-500/5 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="size-3.5" />
          <span>▲ Tăng mạnh nhất (1 tuần)</span>
        </div>
        <div className="divide-y divide-border/60">
          {gainers.map((s) => (
            <Link
              key={s.t}
              href={`/stock/${s.t}`}
              className="flex items-center justify-between gap-2 px-4 py-2 text-xs transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono font-bold text-primary">{s.t}</span>
                <span className="truncate text-[11px] text-muted-foreground">{s.n}</span>
              </div>
              <div className="flex items-center gap-2">
                <MiniSparkline spark={s.spark} isUp={true} />
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  +{s.w1?.toFixed(1)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="border-t border-border">
        <div className="flex items-center gap-1.5 border-b border-border bg-rose-500/5 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">
          <TrendingDown className="size-3.5" />
          <span>▼ Giảm mạnh nhất (1 tuần)</span>
        </div>
        <div className="divide-y divide-border/60">
          {losers.map((s) => (
            <Link
              key={s.t}
              href={`/stock/${s.t}`}
              className="flex items-center justify-between gap-2 px-4 py-2 text-xs transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-mono font-bold text-primary">{s.t}</span>
                <span className="truncate text-[11px] text-muted-foreground">{s.n}</span>
              </div>
              <div className="flex items-center gap-2">
                <MiniSparkline spark={s.spark} isUp={false} />
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                  {s.w1?.toFixed(1)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
