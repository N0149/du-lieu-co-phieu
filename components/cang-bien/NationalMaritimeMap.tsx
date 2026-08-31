'use client'

import React, { useState, useMemo } from 'react'
import { NationalMapData, PortAuthority, formatDWT, formatCalls } from '@/lib/maritime-types'
import { Anchor, Ship, Navigation, Eye, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  mapData: NationalMapData
  ports: PortAuthority[]
  selectedPortId?: string | null
  onSelectPort?: (id: string | null) => void
}

export function NationalMaritimeMap({ mapData, ports, selectedPortId, onSelectPort }: Props) {
  const [hoveredPort, setHoveredPort] = useState<PortAuthority | null>(null)

  const { viewBox, bounds, mainland, islands, bien_dong, hoangsa, truongsa } = mapData
  const [vx, vy, vw, vh] = viewBox
  const DEPTH = 24
  const totalHeight = vh + DEPTH

  // Coordinate projection functions
  const px = (lon: number) => ((lon - bounds.lon0) / (bounds.lon1 - bounds.lon0)) * vw
  const py = (lat: number) => ((bounds.lat1 - lat) / (bounds.lat1 - bounds.lat0)) * vh

  // Calculate pillar heights proportional to sqrt(DWT)
  const { minDwt, maxDwt } = useMemo(() => {
    const dwts = ports.map((p) => Math.sqrt(Math.max(p.dwt_30d, 1)))
    return {
      minDwt: Math.min(...dwts, 1),
      maxDwt: Math.max(...dwts, 100),
    }
  }, [ports])

  const getPillarHeight = (dwt: number) => {
    const v = (Math.sqrt(Math.max(dwt, 1)) - minDwt) / (maxDwt - minDwt || 1)
    return 16 + 120 * v
  }

  // Sorted ports for 3D render depth (top to bottom)
  const sortedPorts = useMemo(() => {
    return [...ports].sort((a, b) => py(b.lat) - py(a.lat))
  }, [ports])

  return (
    <div className="relative flex flex-col rounded-xl border border-white/8 bg-[#212631] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Anchor className="size-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#F0F3F6] tracking-tight">
              Bản Đồ 15 Cảng Vụ Hàng Hải Việt Nam
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#9EACB9]">
            Chiều cao cột tỉ lệ với sản lượng trọng tải tàu (DWT) 30 ngày qua
          </p>
        </div>

        {selectedPortId && (
          <button
            onClick={() => onSelectPort && onSelectPort(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <CheckCircle2 className="size-3.5" />
            <span>Đang lọc: {ports.find((p) => p.id === selectedPortId)?.name}</span>
            <span className="ml-1 opacity-70">✕ Bỏ lọc</span>
          </button>
        )}
      </div>

      {/* Main SVG Map & Sidebar Overlay */}
      <div className="relative mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left SVG Area */}
        <div className="lg:col-span-8 relative flex items-center justify-center min-h-[440px] sm:min-h-[580px] bg-[#1A1D26]/70 rounded-xl border border-white/8 p-2">
          <svg
            viewBox={`0 0 ${vw} ${totalHeight}`}
            className="w-full max-h-[600px] h-auto drop-shadow-2xl select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Mainland 3D gradient */}
              <linearGradient id="nmMainland" x1="0" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
              </linearGradient>

              {/* 3D Pillar Gradient */}
              <linearGradient id="nmPillarCol" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#5eead4" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="nmPillarActive" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Mainland 3D Layer Stack */}
            {[...Array(8)].map((_, idx) => {
              const tt = (idx + 1) / 8
              return (
                <path
                  key={`depth-${idx}`}
                  d={mainland}
                  transform={`translate(0, ${DEPTH * tt})`}
                  fill="#092336"
                  opacity={0.35}
                />
              )
            })}

            {/* Mainland Base */}
            <path
              d={mainland}
              fill="url(#nmMainland)"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeOpacity="0.7"
              className="transition-colors duration-300"
            />

            {/* Islands */}
            {islands.map((d, i) => (
              <path
                key={`isle-${i}`}
                d={d}
                fill="#0284c7"
                stroke="#38bdf8"
                strokeWidth="0.8"
                opacity="0.85"
              />
            ))}

            {/* Biển Đông Watermark Text */}
            <text
              x={bien_dong[0]}
              y={bien_dong[1]}
              textAnchor="middle"
              className="text-[13px] font-extrabold fill-sky-500/25 tracking-[0.35em] select-none uppercase"
            >
              BIỂN ĐÔNG VIỆT NAM
            </text>

            {/* Sovereign Island Markers: Hoàng Sa & Trường Sa */}
            {[
              { data: hoangsa, label: 'QUẦN ĐẢO HOÀNG SA' },
              { data: truongsa, label: 'QUẦN ĐẢO TRƯỜNG SA' },
            ].map(({ data, label }, sIdx) => {
              const [lx, ly] = data.label
              return (
                <g key={`sov-${sIdx}`} className="group cursor-default">
                  {data.dots.map(([dx, dy], dIdx) => (
                    <circle
                      key={`dot-${dIdx}`}
                      cx={dx}
                      cy={dy}
                      r="2.5"
                      fill="#ef4444"
                      className="animate-pulse"
                    />
                  ))}
                  {/* Flag pole */}
                  <line x1={lx} y1={ly} x2={lx} y2={ly - 18} stroke="#fde047" strokeWidth="1.2" />
                  {/* Red flag with gold star */}
                  <path d={`M${lx} ${ly - 18} l14 4.5 l-14 4.5 z`} fill="#dc2626" />
                  <path
                    d={`M${lx + 4.8} ${ly - 14.5} l1.2 2.6 l2.8 .1 l-2.2 1.7 l.85 2.6 l-2.3-1.6 l-2.3 1.6 l.85-2.6 l-2.2-1.7 l2.8-.1 z`}
                    fill="#facc15"
                  />
                  {/* Text label */}
                  <text
                    x={lx + 2}
                    y={ly + 13}
                    className="text-[9.5px] font-bold fill-amber-300 tracking-wider filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            {/* 3D Pillars for 15 Port Authorities */}
            {sortedPorts.map((p) => {
              const x = px(p.lon)
              const y = py(p.lat)
              const h = getPillarHeight(p.dwt_30d)
              const w = Math.max(7, Math.min(13, h * 0.09))
              const isSelected = selectedPortId === p.id
              const isHovered = hoveredPort?.id === p.id

              return (
                <g
                  key={`pillar-${p.id}`}
                  className="cursor-pointer transition-transform duration-200 hover:scale-105"
                  onClick={() => onSelectPort && onSelectPort(isSelected ? null : p.id)}
                  onMouseEnter={() => setHoveredPort(p)}
                  onMouseLeave={() => setHoveredPort(null)}
                >
                  {/* Base shadow */}
                  <ellipse
                    cx={x}
                    cy={y + 2}
                    rx={w * 1.5}
                    ry={w * 0.6}
                    fill="rgba(0,0,0,0.5)"
                  />

                  {/* Vertical 3D Cylinder Bar */}
                  <rect
                    x={x - w / 2}
                    y={y - h}
                    width={w}
                    height={h}
                    rx={w * 0.45}
                    fill={isSelected || isHovered ? 'url(#nmPillarActive)' : 'url(#nmPillarCol)'}
                    className="filter drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                  />

                  {/* Top Glowing Cap */}
                  <circle
                    cx={x}
                    cy={y - h}
                    r={w * 0.75}
                    fill={isSelected || isHovered ? '#fef08a' : '#ccfbf1'}
                    stroke={isSelected || isHovered ? '#d97706' : '#0f766e'}
                    strokeWidth="1"
                    className="animate-pulse"
                  />

                  {/* Port Name Label */}
                  <text
                    x={x + w / 2 + 5}
                    y={y - h + 4}
                    className={`text-[9px] font-semibold tracking-tight select-none transition-colors ${
                      isSelected || isHovered
                        ? 'fill-amber-300 font-bold text-[10px]'
                        : 'fill-slate-200'
                    }`}
                  >
                    {p.name.replace(/\s*\(.*\)/, '')}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredPort && (
            <div className="absolute top-4 left-4 z-20 rounded-xl border border-teal-500/40 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-[240px]">
              <div className="flex items-center gap-2 font-bold text-sm text-teal-300 border-b border-slate-800 pb-1.5 mb-2">
                <Navigation className="size-3.5 text-teal-400" />
                <span>Cảng vụ {hoveredPort.name}</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Khu vực:</span>
                  <span className="font-semibold text-slate-100">{hoveredPort.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lượt tàu 30d:</span>
                  <span className="font-semibold text-teal-400">
                    {formatCalls(hoveredPort.calls_30d)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DWT 30d:</span>
                  <span className="font-semibold text-sky-400">
                    {formatDWT(hoveredPort.dwt_30d)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Info & Quick Rank Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
              <span>Bảng Xếp Hạng DWT 30 Ngày</span>
              <span className="text-[10px] text-teal-400 font-normal">Top Cảng vụ</span>
            </h4>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {ports.map((p, idx) => {
                const isSelected = selectedPortId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPort && onSelectPort(isSelected ? null : p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500/10 text-teal-300 font-semibold'
                        : 'border-border/40 hover:border-slate-700 hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-400">{formatDWT(p.dwt_30d)}</div>
                      <div className="text-[10px] text-muted-foreground">{formatCalls(p.calls_30d)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
