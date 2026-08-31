'use client'

import React, { useState, useMemo } from 'react'
import { Ship, Search, Anchor, ExternalLink, MapPin, Navigation } from 'lucide-react'
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
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/95 p-4 sm:p-5 shadow-2xl shadow-black/40">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên con tàu (VD: CMA CGM, EVER GIVEN, NDV...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <select
            value={minDwt}
            onChange={(e) => setMinDwt(Number(e.target.value))}
            className="rounded-xl border border-slate-700 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 focus:border-teal-500 focus:outline-none font-bold cursor-pointer"
          >
            <option value={0}>Mọi cỡ tàu (DWT)</option>
            <option value={5000}>Tàu &gt; 5.000 DWT</option>
            <option value={20000}>Tàu &gt; 20.000 DWT</option>
            <option value={50000}>Siêu tàu &gt; 50.000 DWT</option>
          </select>
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
            Tìm thấy: <strong className="text-teal-400 font-black">{filtered.length}</strong> tàu
          </span>
        </div>
      </div>

      {/* Vessels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filtered.map((v, idx) => (
          <div
            key={idx}
            className="group rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 p-5 shadow-xl shadow-black/30 hover:border-teal-500/50 hover:shadow-2xl hover:shadow-teal-500/10 transition-all flex flex-col justify-between space-y-3.5"
          >
            <div>
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                    <Ship className="size-4" />
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-100 tracking-tight truncate max-w-[180px] group-hover:text-teal-300 transition-colors">
                    {v.name}
                  </h3>
                </div>
                {v.stockTicker && (
                  <Link
                    href={`/cang/${v.stockTicker.toLowerCase()}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[11px] font-black text-teal-300 hover:bg-teal-500 hover:text-slate-950 transition-all shadow-xs"
                  >
                    <span>Mã {v.stockTicker}</span>
                    <ExternalLink className="size-2.5" />
                  </Link>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/70 p-3 rounded-xl border border-slate-800/60 mb-3">
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block font-medium">Trọng tải DWT:</span>
                  <span className="font-black text-teal-300">
                    {v.dwt > 0 ? v.dwt.toLocaleString('vi-VN') + ' DWT' : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block font-medium">Tổng dung tích GT:</span>
                  <span className="font-bold text-slate-300">
                    {v.gt > 0 ? v.gt.toLocaleString('vi-VN') + ' GT' : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block font-medium">Chiều dài (LOA):</span>
                  <span className="font-bold text-slate-300">{v.loa > 0 ? `${v.loa}m` : '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block font-medium">Mớn nước (Draft):</span>
                  <span className="font-bold text-slate-300">{v.draft > 0 ? `${v.draft}m` : '—'}</span>
                </div>
              </div>

              {/* Last Berth Info */}
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Navigation className="size-3.5 text-teal-400 shrink-0" />
                <span className="truncate">
                  Bến gần nhất: <strong className="text-slate-200">{v.lastBerth}</strong>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{v.authority === 'haiphong' ? 'Cảng vụ Hải Phòng' : 'Hoa tiêu Miền Nam'}</span>
              <span className="font-mono text-slate-500">{v.lastDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
