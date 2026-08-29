'use client'

import React from 'react'
import Link from 'next/link'
import { MaritimeStock, StockIntelDetail, formatDWT, formatCalls } from '@/lib/maritime-types'
import { Ship, ArrowRight, CheckCircle, Layers, MapPin, TrendingUp } from 'lucide-react'

interface Props {
  stocks: MaritimeStock[]
  stocksIntel: Record<string, StockIntelDetail>
}

export function MaritimeStockGrid({ stocks, stocksIntel }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Ship className="size-4" />
            </span>
            Mã Cổ Phiếu Cảng Biển & Vận Tải Biển
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Theo dõi sản lượng DWT tàu cập bến thực tế gắn liền với từng mã niêm yết
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stocks.map((s) => {
          const intel = stocksIntel[s.ticker.toUpperCase()] || {}
          const berths = intel.berths || []
          const isPurePlay = Boolean(s.pure_play)

          return (
            <div
              key={s.ticker}
              className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-background/90 p-4 sm:p-5 shadow-lg transition-all duration-300 hover:border-teal-500/50 hover:shadow-teal-500/5 hover:-translate-y-1"
            >
              {/* Top Row: Ticker & Category Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold tracking-tight text-teal-400 group-hover:text-teal-300">
                      {s.ticker}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {s.region || intel.region}
                    </span>
                  </div>

                  {isPurePlay ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-400">
                      <CheckCircle className="size-3" />
                      Cảng thuần
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      <Layers className="size-3" />
                      {s.category === 'fleet' ? 'Đội tàu' : 'Đa cảng'}
                    </span>
                  )}
                </div>

                {/* Company Name */}
                <h4 className="text-sm font-semibold text-foreground line-clamp-1 mb-3">
                  {s.name}
                </h4>

                {/* Scope Note / Description */}
                {s.scope_note && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                    {s.scope_note}
                  </p>
                )}

                {/* Attached Berths Pills */}
                {berths.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <MapPin className="size-3 text-teal-400" />
                      <span>Cầu bến quản lý ({berths.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {berths.slice(0, 3).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 border border-border/50 truncate max-w-[160px]"
                        >
                          {b}
                        </span>
                      ))}
                      {berths.length > 3 && (
                        <span className="rounded-md bg-muted/40 px-1 py-0.5 text-[10px] text-muted-foreground">
                          +{berths.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Button */}
              <div className="border-t border-border/50 pt-3 mt-2">
                <Link
                  href={`/cang/${s.ticker.toLowerCase()}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-bold text-teal-400 transition-colors hover:bg-teal-500 hover:text-slate-950 group-hover:border-teal-500"
                >
                  <span>Xem Phân Tích & Sản Lượng DWT</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
