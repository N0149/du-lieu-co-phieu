'use client'

import React from 'react'
import Link from 'next/link'
import { MaritimeStock, StockIntelDetail, formatDWT, formatCalls } from '@/lib/maritime-types'
import { Ship, ArrowRight, CheckCircle, Layers, MapPin, TrendingUp, Sparkles, Navigation } from 'lucide-react'

interface Props {
  stocks: MaritimeStock[]
  stocksIntel: Record<string, StockIntelDetail>
}

export function MaritimeStockGrid({ stocks, stocksIntel }: Props) {
  return (
    <div className="space-y-5">
      {/* Header with Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 text-teal-400 border border-teal-500/30 shadow-md shadow-teal-500/5">
              <Ship className="size-4.5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
                <span>Mã Cổ Phiếu Cảng Biển &amp; Vận Tải Biển</span>
                <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                  {stocks.length} Doanh Nghiệp
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Theo dõi sản lượng DWT &amp; lượt tàu cập bến thực tế gắn liền với từng mã niêm yết
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Elevated Asset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {stocks.map((s) => {
          const intel = stocksIntel[s.ticker.toUpperCase()] || {}
          const berths = intel.berths || []
          const isPurePlay = Boolean(s.pure_play)

          return (
            <div
              key={s.ticker}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/70 to-slate-950/95 p-5 shadow-xl shadow-black/40 transition-all duration-300 hover:border-teal-500/60 hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1 overflow-hidden"
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute -right-12 -top-12 size-32 rounded-full bg-teal-500/5 blur-2xl group-hover:bg-teal-500/15 transition-all pointer-events-none" />
              <div>
                {/* Top Row: Ticker & Category Badge */}
                <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold tracking-tight text-[#F0F3F6] group-hover:text-emerald-400 transition-colors">
                        {s.ticker}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#9EACB9] flex items-center gap-1">
                      <MapPin className="size-3 text-emerald-400/80 shrink-0" />
                      <span>{s.region || intel.region || 'Việt Nam'}</span>
                    </span>
                  </div>

                  {isPurePlay ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <CheckCircle className="size-3 text-emerald-400" />
                      Cảng thuần
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      <Layers className="size-3 text-amber-400" />
                      {s.category === 'fleet' ? 'Đội tàu' : 'Đa cảng'}
                    </span>
                  )}
                </div>

                {/* Company Name */}
                <h4 className="text-sm font-bold text-[#F0F3F6] line-clamp-1 mb-2.5 group-hover:text-emerald-400 transition-colors">
                  {s.name}
                </h4>

                {/* Scope Note / Description */}
                {s.scope_note && (
                  <p className="text-[11px] text-[#9EACB9] line-clamp-2 mb-3.5 leading-relaxed bg-[#1A1D26] p-2.5 rounded-lg border border-white/5">
                    {s.scope_note}
                  </p>
                )}

                {/* Attached Berths Chips */}
                {berths.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[#9EACB9] mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Navigation className="size-3" />
                        Cầu bến ({berths.length}):
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {berths.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          className="inline-block rounded bg-white/5 border border-white/8 px-1.5 py-0.5 text-[10px] text-[#9EACB9] font-mono truncate max-w-[130px]"
                          title={b}
                        >
                          {b}
                        </span>
                      ))}
                      {berths.length > 3 && (
                        <span className="inline-block rounded bg-white/5 px-1 py-0.5 text-[10px] text-[#9EACB9]">
                          +{berths.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button Link */}
              <Link
                href={`/cang/${s.ticker.toLowerCase()}`}
                className="mt-2 inline-flex w-full items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-xs"
              >
                <span>Xem Dữ Liệu Tàu &amp; DWT</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
