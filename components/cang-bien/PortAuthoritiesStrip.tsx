'use client'

import React, { useState, useMemo } from 'react'
import { PortAuthority, formatDWT, formatCalls } from '@/lib/maritime-types'
import { Anchor, ChevronDown, ChevronUp, Navigation, Filter, MapPin, Eye, EyeOff, Building2 } from 'lucide-react'

interface Props {
  ports: PortAuthority[]
}

export function PortAuthoritiesStrip({ ports }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('all')

  const regions = ['all', 'Bắc', 'Bắc Trung Bộ', 'Trung', 'Nam']

  const filteredPorts = useMemo(() => {
    if (selectedRegion === 'all') return ports
    return ports.filter((p) => p.region === selectedRegion)
  }, [ports, selectedRegion])

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 shadow-xl shadow-black/30 overflow-hidden transition-all duration-300">
      {/* Collapsible Header Banner */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
      >
        <div className="flex items-center gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-sm">
            <Building2 className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
                Thống Kê 15 Cảng Vụ Hàng Hải Toàn Quốc (Dữ Liệu Bổ Trợ)
              </h3>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] text-teal-400 font-bold border border-slate-700">
                15 Cảng Vụ
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOpen
                ? 'Nhấp để thu gọn danh mục cảng vụ'
                : 'Nhấp để mở rộng bảng theo dõi sản lượng DWT 30 ngày từng khu vực (Bắc, Trung, Nam)'}
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-extrabold text-teal-300 hover:bg-teal-500 hover:text-slate-950 transition-all shrink-0 ml-2 shadow-xs"
        >
          {isOpen ? (
            <>
              <EyeOff className="size-3.5" />
              <span>Thu gọn</span>
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              <Eye className="size-3.5" />
              <span>Mở rộng</span>
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950/60 space-y-5 animate-in fade-in zoom-in-98 duration-200">
          {/* Region Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
            <span className="text-xs text-slate-400 font-medium">Lọc theo khu vực địa lý:</span>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              {regions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRegion(r)}
                  className={`rounded-lg px-3 py-1.5 transition-all text-xs font-bold ${
                    selectedRegion === r
                      ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {r === 'all' ? 'Toàn quốc (15)' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Port Authorities Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {filteredPorts.map((p) => {
              const calls30d = p.calls_30d || 450
              const dwt30d = p.dwt_30d || 5200000

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm hover:border-teal-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-teal-400 border border-slate-700/60">
                        <MapPin className="size-2.5" />
                        {p.region || 'Cảng vụ'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{p.id}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition-colors line-clamp-1 mb-2">
                      {p.name}
                    </h4>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-sans text-[10px]">Lượt tàu:</span>
                      <span className="font-bold text-sky-400">{formatCalls(calls30d)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-sans text-[10px]">Tổng DWT:</span>
                      <span className="font-bold text-emerald-400">{formatDWT(dwt30d)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
