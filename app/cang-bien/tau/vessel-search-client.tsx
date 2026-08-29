'use client'

import React, { useState, useMemo } from 'react'
import { Ship, Search, Anchor, ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'

interface VesselItem {
  name: string
  dwt: number
  gt: number
  loa: number
  draft: number
  lastBerth: string
  stockTicker: string | null
  authority: string
  lastDate: string
  callsCount: number
}

interface Props {
  initialVessels: VesselItem[]
}

export function VesselSearchClient({ initialVessels }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [minDwt, setMinDwt] = useState<number>(0)

  const filtered = useMemo(() => {
    return initialVessels.filter((v) => {
      const matchSearch =
        !searchTerm ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.lastBerth.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.stockTicker && v.stockTicker.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchDwt = minDwt === 0 || v.dwt >= minDwt
      return matchSearch && matchDwt
    })
  }, [initialVessels, searchTerm, minDwt])

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between rounded-2xl border border-border/80 bg-card/70 p-4 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm tên con tàu (VD: EVER MAX, SITC, HAIAN...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/80 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <select
            value={minDwt}
            onChange={(e) => setMinDwt(Number(e.target.value))}
            className="rounded-xl border border-border bg-background/80 py-2 px-3 text-xs text-foreground focus:border-teal-500 focus:outline-none"
          >
            <option value={0}>Mọi cỡ tàu (DWT)</option>
            <option value={5000}>Tàu &gt; 5.000 DWT</option>
            <option value={20000}>Tàu &gt; 20.000 DWT</option>
            <option value={50000}>Siêu tàu &gt; 50.000 DWT</option>
          </select>
          <span className="text-xs text-muted-foreground font-medium">
            Tìm thấy: <strong className="text-teal-400">{filtered.length}</strong> tàu
          </span>
        </div>
      </div>

      {/* Vessels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-background/90 p-4 shadow-md hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
                    <Ship className="size-4" />
                  </span>
                  <h3 className="font-bold text-sm text-foreground tracking-tight truncate max-w-[180px]">
                    {v.name}
                  </h3>
                </div>
                {v.stockTicker && (
                  <Link
                    href={`/cang/${v.stockTicker.toLowerCase()}`}
                    className="inline-flex items-center gap-1 rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold text-teal-300 hover:bg-teal-500 hover:text-slate-950 transition-colors"
                  >
                    <span>Mã {v.stockTicker}</span>
                    <ExternalLink className="size-2.5" />
                  </Link>
                )}
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Trọng tải DWT:</span>
                  <div className="font-extrabold text-teal-400">
                    {v.dwt > 0 ? v.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-2 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Kích thước (LOA/Mớn):</span>
                  <div className="font-semibold text-slate-200">
                    {v.loa ? `${v.loa}m` : '—'} / {v.draft ? `${v.draft}m` : '—'}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="size-3 text-teal-400 shrink-0" />
                  <span>Bến gần nhất: <strong className="text-slate-200">{v.lastBerth}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/30 flex justify-between items-center">
              <span>Ghi nhận ngày: {v.lastDate}</span>
              <span className="text-teal-400 font-semibold">{v.callsCount} lượt ghi nhận</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
