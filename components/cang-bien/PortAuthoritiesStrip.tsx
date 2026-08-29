'use client'

import React, { useState, useMemo } from 'react'
import { PortAuthority, formatDWT, formatCalls } from '@/lib/maritime-types'
import { Anchor, ChevronDown, ChevronUp, Navigation, Filter, MapPin, Eye, EyeOff } from 'lucide-react'

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
    <div className="rounded-2xl border border-border/80 bg-card/60 shadow-lg overflow-hidden transition-all duration-300">
      {/* Collapsible Header Banner */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-muted/30 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Anchor className="size-4.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Thống Kê 15 Cảng Vụ Hàng Hải Toàn Quốc (Dữ Liệu Bổ Trợ)
              </h3>
              <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground font-semibold">
                15 Cảng Vụ
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOpen
                ? 'Bấm để thu gọn danh sách cảng vụ'
                : 'Bấm để mở rộng bảng theo dõi sản lượng DWT 30 ngày từng khu vực (Bắc, Trung, Nam)'}
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/30 transition-all shrink-0 ml-2"
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
        <div className="p-4 sm:p-6 border-t border-border/50 bg-background/40 space-y-4 animate-in fade-in zoom-in-98 duration-200">
          {/* Region Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <span className="text-xs text-muted-foreground font-medium">Lọc theo khu vực:</span>
            <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 rounded-xl border border-border text-xs font-semibold">
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    selectedRegion === r
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'Tất cả (15 Cảng vụ)' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Compact Port Authority Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {filteredPorts.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-card/90 to-background p-3.5 shadow-sm hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                      {p.region}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {p.short_code || p.short || ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground truncate" title={p.name}>
                    Cảng vụ {p.name}
                  </h4>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">Sản lượng DWT:</span>
                    <span className="font-extrabold text-teal-300">
                      {formatDWT(p.dwt_30d)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">Lượt tàu (30d):</span>
                    <span className="font-semibold text-slate-300">
                      {formatCalls(p.calls_30d)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
