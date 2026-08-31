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
                      <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-300 group-hover:from-teal-200 group-hover:to-cyan-200">
                        {s.ticker}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <MapPin className="size-3 text-teal-400/80 shrink-0" />
                      <span>{s.region || intel.region || 'Việt Nam'}</span>
                    </span>
                  </div>

                  {isPurePlay ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-xs">
                      <CheckCircle className="size-3 text-emerald-400" />
                      Cảng thuần
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 shadow-xs">
                      <Layers className="size-3 text-amber-400" />
                      {s.category === 'fleet' ? 'Đội tàu' : 'Đa cảng'}
                    </span>
                  )}
                </div>

                {/* Company Name */}
                <h4 className="text-sm font-bold text-slate-100 line-clamp-1 mb-2.5 group-hover:text-teal-300 transition-colors">
                  {s.name}
                </h4>

                {/* Scope Note / Description */}
                {s.scope_note && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3.5 leading-relaxed bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
                    {s.scope_note}
                  </p>
                )}

                {/* Attached Berths Chips */}
                {berths.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-teal-400">
                        <Navigation className="size-3" />
                        Cầu bến ({berths.length}):
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {berths.slice(0, 3).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="rounded-lg bg-slate-800/90 px-2 py-0.5 text-[10px] font-medium text-slate-200 border border-slate-700/60 truncate max-w-[170px]"
                        >
                          {b}
                        </span>
                      ))}
                      {berths.length > 3 && (
                        <span className="rounded-lg bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700/40">
                          +{berths.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Button with Gradient Glow */}
              <div className="border-t border-slate-800/80 pt-3 mt-2 relative z-10">
                <Link
                  href={`/cang/${s.ticker.toLowerCase()}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-500 px-3.5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md shadow-teal-500/20 transition-all hover:brightness-110 hover:shadow-teal-500/30 group-hover:scale-[1.01]"
                >
                  <span>Phân Tích Sản Lượng &amp; DWT</span>
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
