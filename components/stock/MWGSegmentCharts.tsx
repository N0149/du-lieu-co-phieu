'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Maximize2, Settings } from 'lucide-react'
import type { CompanySegmentData } from '@/lib/company-segment-service'

interface MWGSegmentChartsProps {
  symbol: string
}

function fmtBillion(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN') + ' Tỷ'
}

/* ════════════════════════════════════════════════════════════════
   BIỂU ĐỒ 1: DOANH THU THEO MẢNG (CHUẨN WIDATA)
   ════════════════════════════════════════════════════════════════ */
function BrandRevenueCard({ data }: { data: CompanySegmentData }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-4 shadow-sm transition-all hover:border-[#2d3d5a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          DOANH THU THEO MẢNG
        </span>
        <div className="flex items-center gap-2 text-slate-400">
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Phóng to">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Cài đặt">
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[240px] w-full relative">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data.byBrand} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" opacity={0.4} />
            <XAxis dataKey="year" tick={{ fontSize: 9.5, fill: '#64748b' }} />
            <YAxis
              tick={{ fontSize: 9.5, fill: '#64748b' }}
              tickFormatter={(val) => `${Math.round(val / 1000)}K`}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="rounded-lg border border-[#2d3d5a] bg-[#0c1017] p-2.5 shadow-xl text-[11px] font-mono space-y-1.5 text-slate-200 min-w-[210px]">
                    <div className="text-slate-400 border-b border-slate-800 pb-1 flex justify-between font-bold">
                      <span>Năm {label}</span>
                      <span className="text-indigo-400">Tổng: {fmtBillion(d.total)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-amber-500">
                        <span>● Thế giới di động:</span>
                        <span className="font-bold">{fmtBillion(d.tgdd)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>● Điện máy xanh:</span>
                        <span className="font-bold">{fmtBillion(d.dmx)}</span>
                      </div>
                      <div className="flex justify-between text-purple-400">
                        <span>● Bách hóa xanh:</span>
                        <span className="font-bold">{fmtBillion(d.bhx)}</span>
                      </div>
                      <div className="flex justify-between text-teal-400">
                        <span>● Khác (An Khang, Era...):</span>
                        <span className="font-bold">{fmtBillion(d.khac)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            {/* Stacked Bars theo thứ tự màu WiData */}
            <Bar dataKey="bhx" name="Bách hóa xanh" stackId="brand" fill="#581c87" isAnimationActive={false} />
            <Bar dataKey="khac" name="Khác" stackId="brand" fill="#0f766e" isAnimationActive={false} />
            <Bar dataKey="dmx" name="Điện máy xanh" stackId="brand" fill="#475569" isAnimationActive={false} />
            <Bar dataKey="tgdd" name="Thế giới di động" stackId="brand" fill="#9a3412" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            {/* Đường Line Tổng Doanh Thu */}
            <Line type="monotone" dataKey="total" name="Doanh thu" stroke="#6366f1" strokeWidth={1.8} dot={{ r: 3, fill: '#6366f1' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="pt-2 border-t border-[#1b2334] space-y-1 text-[10.5px] text-slate-400">
        <div className="text-[10px] text-slate-500 italic">* Theo chuẩn công bố 2015</div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#9a3412]" />
            <span className="text-slate-300">Thế giới di động</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#475569]" />
            <span className="text-slate-300">Điện máy xanh</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#0f766e]" />
            <span className="text-slate-300">Khác</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#581c87]" />
            <span className="text-slate-300">Bách hóa xanh</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   BIỂU ĐỒ 2: DOANH THU THUẦN THEO LĨNH VỰC (CHUẨN WIDATA)
   ════════════════════════════════════════════════════════════════ */
function SectorRevenueCard({ data }: { data: CompanySegmentData }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-4 shadow-sm transition-all hover:border-[#2d3d5a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          DOANH THU THUẦN THEO LĨNH VỰC
        </span>
        <div className="flex items-center gap-2 text-slate-400">
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Phóng to">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Cài đặt">
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[240px] w-full relative">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data.bySectorRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" opacity={0.4} />
            <XAxis dataKey="year" tick={{ fontSize: 9.5, fill: '#64748b' }} />
            <YAxis
              tick={{ fontSize: 9.5, fill: '#64748b' }}
              tickFormatter={(val) => `${Math.round(val / 1000)}K`}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="rounded-lg border border-[#2d3d5a] bg-[#0c1017] p-2.5 shadow-xl text-[11px] font-mono space-y-1.5 text-slate-200 min-w-[210px]">
                    <div className="text-slate-400 border-b border-slate-800 pb-1 flex justify-between font-bold">
                      <span>Năm {label}</span>
                      <span className="text-indigo-400">Tổng DTT: {fmtBillion(d.total)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-purple-400">
                        <span>● ĐT, máy tính, thiết bị ĐT:</span>
                        <span className="font-bold">{fmtBillion(d.thietBi)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>● Thực phẩm & FMCG:</span>
                        <span className="font-bold">{fmtBillion(d.fmcg)}</span>
                      </div>
                      <div className="flex justify-between text-teal-400">
                        <span>● Lĩnh vực khác:</span>
                        <span className="font-bold">{fmtBillion(d.khac)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            {/* Stacked Bars theo thứ tự WiData */}
            <Bar dataKey="fmcg" name="Thực phẩm và hàng tiêu dùng nhanh" stackId="sectorRev" fill="#94a3b8" isAnimationActive={false} />
            <Bar dataKey="thietBi" name="Điện thoại, máy tính và thiết bị điện tử" stackId="sectorRev" fill="#8b5cf6" isAnimationActive={false} />
            <Bar dataKey="khac" name="Khác" stackId="sectorRev" fill="#0d9488" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            {/* Line Doanh Thu Thuần */}
            <Line type="monotone" dataKey="total" name="Doanh thu thuần" stroke="#38bdf8" strokeWidth={1.8} dot={{ r: 3, fill: '#38bdf8' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="pt-2 border-t border-[#1b2334] space-y-1 text-[10.5px] text-slate-400">
        <div className="text-[10px] text-slate-500 italic">* Theo chuẩn công bố 2015</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#0d9488]" />
            <span className="text-slate-300">Khác</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#8b5cf6]" />
            <span className="text-slate-300">ĐT, máy tính & TB điện tử</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#94a3b8]" />
            <span className="text-slate-300">Thực phẩm & FMCG</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#38bdf8] rounded" />
            <span className="text-slate-300">Doanh thu thuần</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   BIỂU ĐỒ 3: LỢI NHUẬN GỘP THEO LĨNH VỰC (CHUẨN WIDATA)
   ════════════════════════════════════════════════════════════════ */
function SectorGrossProfitCard({ data }: { data: CompanySegmentData }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#1f293d] bg-[#0c1017] p-3 sm:p-4 shadow-sm transition-all hover:border-[#2d3d5a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2334] pb-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          LỢI NHUẬN GỘP THEO LĨNH VỰC
        </span>
        <div className="flex items-center gap-2 text-slate-400">
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Phóng to">
            <Maximize2 className="size-3.5" />
          </button>
          <button type="button" className="hover:text-slate-200 cursor-pointer p-0.5" title="Cài đặt">
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[240px] w-full relative">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data.bySectorGrossProfit} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" opacity={0.4} />
            <XAxis dataKey="year" tick={{ fontSize: 9.5, fill: '#64748b' }} />
            <YAxis
              tick={{ fontSize: 9.5, fill: '#64748b' }}
              tickFormatter={(val) => `${Math.round(val / 1000)}K`}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="rounded-lg border border-[#2d3d5a] bg-[#0c1017] p-2.5 shadow-xl text-[11px] font-mono space-y-1.5 text-slate-200 min-w-[210px]">
                    <div className="text-slate-400 border-b border-slate-800 pb-1 flex justify-between font-bold">
                      <span>Năm {label}</span>
                      <span className="text-emerald-400">Tổng LNG: {fmtBillion(d.total)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-purple-400">
                        <span>● ĐT, máy tính, thiết bị ĐT:</span>
                        <span className="font-bold">{fmtBillion(d.thietBi)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>● Thực phẩm & FMCG:</span>
                        <span className="font-bold">{fmtBillion(d.fmcg)}</span>
                      </div>
                      <div className="flex justify-between text-teal-400">
                        <span>● Lĩnh vực khác:</span>
                        <span className="font-bold">{fmtBillion(d.khac)}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
            {/* Stacked Bars theo thứ tự WiData */}
            <Bar dataKey="fmcg" name="Thực phẩm và hàng tiêu dùng nhanh" stackId="sectorGp" fill="#94a3b8" isAnimationActive={false} />
            <Bar dataKey="thietBi" name="Điện thoại, máy tính và thiết bị điện tử" stackId="sectorGp" fill="#8b5cf6" isAnimationActive={false} />
            <Bar dataKey="khac" name="Khác" stackId="sectorGp" fill="#0d9488" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            {/* Line Lợi Nhuận Gộp */}
            <Line type="monotone" dataKey="total" name="Lợi nhuận gộp" stroke="#38bdf8" strokeWidth={1.8} dot={{ r: 3, fill: '#38bdf8' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="pt-2 border-t border-[#1b2334] space-y-1 text-[10.5px] text-slate-400">
        <div className="text-[10px] text-slate-500 italic">* Theo chuẩn công bố 2015</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#8b5cf6]" />
            <span className="text-slate-300">ĐT, máy tính & TB điện tử</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#0d9488]" />
            <span className="text-slate-300">Khác</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-xs bg-[#94a3b8]" />
            <span className="text-slate-300">Thực phẩm & FMCG</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#38bdf8] rounded" />
            <span className="text-slate-300">Lợi nhuận gộp</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   MASTER: HÀNG 3 BIỂU ĐỒ BÓC TÁCH MẢNG & LĨNH VỰC (WIDATA)
   ════════════════════════════════════════════════════════════════ */
export function MWGSegmentCharts({ symbol }: MWGSegmentChartsProps) {
  const [data, setData] = useState<CompanySegmentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/stock/${encodeURIComponent(symbol)}/segments`)
      .then((res) => {
        if (!res.ok) throw new Error('Không có dữ liệu segment')
        return res.json()
      })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [symbol])

  if (loading || !data) return null

  return (
    <div className="space-y-3 pt-3 pb-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="size-2 rounded-full bg-purple-400" />
          <span>Bóc Tách Doanh Thu & Lợi Nhuận Gộp Theo Mảng / Lĩnh Vực (Chuyên Sâu)</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">Chuẩn công bố VAS 28</span>
      </div>

      {/* Grid 3 Cột thẳng hàng chuẩn WiData */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        <BrandRevenueCard data={data} />
        <SectorRevenueCard data={data} />
        <SectorGrossProfitCard data={data} />
      </div>
    </div>
  )
}
