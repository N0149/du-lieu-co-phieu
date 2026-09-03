'use client'

import { useState, useMemo, useRef } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Building2,
  DollarSign,
  PieChart,
  Percent,
  Download,
  Maximize2,
  X,
  ChevronRight,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CtckFullData, MarginSummaryItem, BrokerageRow } from '@/lib/ctck-types'
import { CTCK_COLORS, filterPeriodsByRange } from '@/lib/ctck-types'

interface CtckStatisticsSectionProps {
  initialData?: CtckFullData | null
}

const RANGES = [
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: 'all', label: 'All' },
]

/** Hàm xuất SVG sang ảnh PNG */
function exportSvgToPng(svgElement: SVGSVGElement | null, fileName: string) {
  if (!svgElement) return

  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    const svgString = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = 620 * scale
      canvas.height = 230 * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#161a23'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `${fileName}.png`
      link.click()
      URL.revokeObjectURL(blobURL)
    }
    img.src = blobURL
  } catch (err) {
    console.error('Error exporting chart to PNG:', err)
  }
}

export function CtckStatisticsSection({ initialData }: CtckStatisticsSectionProps) {
  const [data] = useState<CtckFullData | null>(initialData || null)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL')

  // Mốc thời gian
  const [timeRange1, setTimeRange1] = useState<string>('all')
  const [timeRange2, setTimeRange2] = useState<string>('all')
  const [timeRange3, setTimeRange3] = useState<string>('all')
  const [timeRange4, setTimeRange4] = useState<string>('all')

  // Chế độ Quý / Năm
  const [periodType1, setPeriodType1] = useState<'quy' | 'nam'>('quy')
  const [periodType2, setPeriodType2] = useState<'quy' | 'nam'>('quy')
  const [periodType3, setPeriodType3] = useState<'quy' | 'nam'>('quy')
  const [periodType4, setPeriodType4] = useState<'quy' | 'nam'>('quy')

  // Tooltip states
  const [hoverIdx1, setHoverIdx1] = useState<number | null>(null)
  const [hoverIdx2, setHoverIdx2] = useState<number | null>(null)
  const [hoverIdx3, setHoverIdx3] = useState<number | null>(null)
  const [hoverIdx4, setHoverIdx4] = useState<number | null>(null)

  const svgRef1 = useRef<SVGSVGElement | null>(null)
  const svgRef2 = useRef<SVGSVGElement | null>(null)
  const svgRef3 = useRef<SVGSVGElement | null>(null)
  const svgRef4 = useRef<SVGSVGElement | null>(null)

  if (!data) return null

  const { overview, ctckSymbols, marketSummary, top10ByPeriod, companies, brokerageShare } = data

  // Dữ liệu lọc theo công ty
  const activeSeries = useMemo(() => {
    if (selectedSymbol === 'ALL') {
      return marketSummary
    }
    const comp = companies.find((c) => c.symbol === selectedSymbol)
    if (!comp) return marketSummary
    return comp.periods.map((p) => ({
      period: p.period,
      label: p.label,
      margin_debt_bn: p.margin_debt,
      vcsh_bn: p.vcsh,
      co_phieu_bn: p.co_phieu,
      trai_phieu_bn: p.trai_phieu,
      du_dia_bn: p.du_dia,
      margin_vcsh_pct: p.margin_vcsh_pct,
      ctck_reported: 1,
      qoq_growth: p.qoq_growth,
      yoy_growth: p.yoy_growth,
    }))
  }, [selectedSymbol, marketSummary, companies])

  const filtered1 = useMemo(() => filterPeriodsByRange(activeSeries, timeRange1), [activeSeries, timeRange1])
  const filtered2 = useMemo(() => filterPeriodsByRange(activeSeries, timeRange2), [activeSeries, timeRange2])
  const filtered3 = useMemo(() => filterPeriodsByRange(top10ByPeriod, timeRange3), [top10ByPeriod, timeRange3])
  const filtered4 = useMemo(() => filterPeriodsByRange(brokerageShare.rows, timeRange4), [brokerageShare.rows, timeRange4])

  const latestTop10 = top10ByPeriod[top10ByPeriod.length - 1]?.companies || []

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER & CHÚ THÍCH ── */}
      <div className="border-b border-white/8 pb-3">
        <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#F0F3F6]">
          Dư Nợ Margin
        </h2>
        <p className="mt-0.5 text-xs text-[#9EACB9]">
          Thống kê cho vay ký quỹ <strong className="text-[#F0F3F6]">41 CTCK niêm yết</strong> (HOSE, HNX, UPCoM) theo từng quý. Không bao gồm CTCK chưa niêm yết (Mirae Asset, ACB Securities, KIS Việt Nam, v.v.)
        </p>
      </div>

      {/* ── 5 THẺ TÓM TẮT ĐỈNH CAO (SUMMARY CARDS) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Cho vay margin */}
        <div className="rounded-xl border border-white/10 bg-[#161a23] p-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9EACB9]">Cho vay margin</span>
            <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-mono font-bold text-blue-400">
              {overview.latestPeriod}
            </span>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black font-mono text-[#F0F3F6]">
            {overview.marginDebtFormatted}
          </p>
          <span className="text-[10px] text-[#8B98A5] block">Dư nợ toàn thị trường</span>
        </div>

        {/* 2. Tổng VCSH ngành */}
        <div className="rounded-xl border border-white/10 bg-[#161a23] p-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9EACB9]">Tổng VCSH ngành</span>
            <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-mono font-bold text-blue-400">
              {overview.latestPeriod}
            </span>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black font-mono text-[#F0F3F6]">
            {overview.vcshFormatted}
          </p>
          <span className="text-[10px] text-[#8B98A5] block">Vốn chủ sở hữu 41 CTCK</span>
        </div>

        {/* 3. Margin / VCSH */}
        <div className="rounded-xl border border-white/10 bg-[#161a23] p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9EACB9]">Margin / VCSH</span>
          <p className="mt-1 text-lg sm:text-xl font-black font-mono text-amber-400">
            {overview.marginVcshPct}%
          </p>
          <span className="text-[10px] text-[#8B98A5] block">Tỷ lệ sử dụng vốn</span>
        </div>

        {/* 4. Dư địa margin */}
        <div className="rounded-xl border border-white/10 bg-[#161a23] p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9EACB9]">Dư địa margin</span>
          <p className="mt-1 text-lg sm:text-xl font-black font-mono text-emerald-400">
            {overview.duDiaFormatted}
          </p>
          <span className="text-[10px] text-[#8B98A5] block">Hạn mức cho vay còn lại</span>
        </div>

        {/* 5. Số CTCK báo cáo */}
        <div className="rounded-xl border border-white/10 bg-[#161a23] p-3 shadow-md col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9EACB9]">Số CTCK báo cáo</span>
            <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-mono font-bold text-[#9EACB9]">
              {overview.latestPeriod}
            </span>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black font-mono text-[#F0F3F6]">
            {overview.ctckReported}
          </p>
          <span className="text-[10px] text-[#8B98A5] block">Công ty đã nộp BCTC</span>
        </div>
      </div>

      {/* ── DROPDOWN CHỌN CTCK ── */}
      <div className="flex items-center gap-3">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="rounded-lg border border-white/15 bg-[#161a23] px-3 py-1.5 text-xs font-bold text-[#F0F3F6] shadow-sm focus:border-emerald-500 focus:outline-none cursor-pointer"
        >
          <option value="ALL">Toàn ngành (tổng hợp)</option>
          {ctckSymbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {selectedSymbol !== 'ALL' && (
          <button
            type="button"
            onClick={() => setSelectedSymbol('ALL')}
            className="text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            Quay lại toàn ngành
          </button>
        )}
      </div>

      {/* ── KHỐI 1: CHO VAY MARGIN — TOÀN NGÀNH (BỐ CỤC 50% - 50% CHUẨN RUATICHSAN) ── */}
      <section className="rounded-xl border border-white/8 bg-[#14171f] p-3.5 shadow-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-[#F0F3F6]">
            Cho vay margin — {selectedSymbol === 'ALL' ? 'Toàn ngành' : selectedSymbol}
          </h3>

          <div className="flex items-center gap-1.5">
            {/* 1Y, 3Y, 5Y, All */}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setTimeRange1(r.key)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer font-mono',
                    timeRange1 === r.key ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Quý / Năm */}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              <button
                type="button"
                onClick={() => setPeriodType1('quy')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType1 === 'quy' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Quý
              </button>
              <button
                type="button"
                onClick={() => setPeriodType1('nam')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType1 === 'nam' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Năm
              </button>
            </div>

            <button
              type="button"
              onClick={() => exportSvgToPng(svgRef1.current, `ChoVayMargin_${selectedSymbol}`)}
              className="flex size-6.5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white cursor-pointer"
              title="Tải ảnh PNG"
            >
              <Download className="size-3" />
            </button>
          </div>
        </div>

        {/* Layout 2 cột: Trái là Biểu đồ (~52%), Phải là Bảng (~48%) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Cột Trái: SVG Combo Chart gọn gàng cao ~220px */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="relative w-full select-none overflow-hidden rounded-lg border border-white/5 bg-[#161a23] p-2">
              <svg
                ref={svgRef1}
                viewBox="0 0 600 230"
                className="w-full h-auto max-h-[235px] cursor-crosshair block"
                onMouseMove={(e) => {
                  if (!svgRef1.current || !filtered1.length) return
                  const rect = svgRef1.current.getBoundingClientRect()
                  const mouseX = ((e.clientX - rect.left) / rect.width) * 600
                  const ratio = Math.max(0, Math.min(1, (mouseX - 45) / 510))
                  setHoverIdx1(Math.round(ratio * (filtered1.length - 1)))
                }}
                onMouseLeave={() => setHoverIdx1(null)}
              >
                {/* Watermark in chìm thương hiệu */}
                <text x="300" y="26" textAnchor="middle" fontSize="15" fill="rgba(255,255,255,0.18)" fontWeight="bold" letterSpacing="0.6">
                  Dulieudautu.com
                </text>
                <text x="300" y="40" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.12)" fontStyle="italic">
                  Nguồn: dulieudautu.com
                </text>

                {/* Đơn vị Y trái & phải */}
                <text x="40" y="16" textAnchor="end" fontSize="8.5" fill="#8B98A5" fontStyle="italic">
                  (tỷ)
                </text>
                <text x="560" y="16" textAnchor="start" fontSize="8.5" fill="#3b82f6" fontStyle="italic">
                  (%)
                </text>

                {/* Grid & Nhãn Y kép (320k -> 0k & 140% -> 0%) */}
                {[
                  { y: 25, valLeft: '320k', valRight: '140%' },
                  { y: 68, valLeft: '240k', valRight: '105%' },
                  { y: 111, valLeft: '160k', valRight: '70%' },
                  { y: 154, valLeft: '80k', valRight: '35%' },
                  { y: 197, valLeft: '0', valRight: '0%' },
                ].map((row, i) => (
                  <g key={i}>
                    <line x1="45" y1={row.y} x2="555" y2={row.y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                    <text x="40" y={row.y + 3} textAnchor="end" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {row.valLeft}
                    </text>
                    <text x="560" y={row.y + 3} textAnchor="start" fontSize="8.5" fill="#3b82f6" fontFamily="monospace">
                      {row.valRight}
                    </text>
                  </g>
                ))}

                {/* Cột Dư nợ Margin (Màu Đỏ) */}
                {filtered1.map((item, idx) => {
                  const maxDebt = 320000
                  const step = 510 / filtered1.length
                  const barW = Math.max(2.5, Math.min(11, step * 0.55))
                  const x = 45 + idx * step + step / 2 - barW / 2
                  const barH = (item.margin_debt_bn / maxDebt) * 172
                  const y = 197 - barH
                  return (
                    <rect
                      key={item.period}
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(1.5, barH)}
                      fill="#ef4444"
                      rx="1"
                      opacity={hoverIdx1 === idx ? 1 : 0.88}
                    />
                  )
                })}

                {/* Đường Tỷ lệ Margin/VCSH (%) - Màu Xanh Dương */}
                {(() => {
                  const maxPct = 140
                  const step = 510 / filtered1.length
                  const pts: string[] = []
                  filtered1.forEach((item, idx) => {
                    const x = 45 + idx * step + step / 2
                    const y = 197 - (item.margin_vcsh_pct / maxPct) * 172
                    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
                  })
                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pts.join(' ')}
                      />
                      {filtered1.map((item, idx) => {
                        const x = 45 + idx * step + step / 2
                        const y = 197 - (item.margin_vcsh_pct / maxPct) * 172
                        return (
                          <circle
                            key={item.period}
                            cx={x}
                            cy={y}
                            r={hoverIdx1 === idx ? 3.5 : 1.5}
                            fill="#3b82f6"
                            stroke="#161a23"
                            strokeWidth="1"
                          />
                        )
                      })}
                    </>
                  )
                })()}

                {/* Nhãn trục X */}
                {filtered1.map((item, idx) => {
                  const showTick = filtered1.length <= 8 || idx % Math.ceil(filtered1.length / 7) === 0 || idx === filtered1.length - 1
                  if (!showTick) return null
                  const step = 510 / filtered1.length
                  const x = 45 + idx * step + step / 2
                  return (
                    <text key={item.period} x={x} y="217" textAnchor="middle" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {item.period}
                    </text>
                  )
                })}
              </svg>

              {/* Legend bar */}
              <div className="mt-1.5 flex items-center justify-center gap-5 border-t border-white/8 pt-1 text-[10.5px] font-medium text-[#9EACB9]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-[#ef4444]" />
                  <span>Cho vay margin (tỷ)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-2.5 bg-[#3b82f6]" />
                  <span>Margin/VCSH (%)</span>
                </div>
              </div>

              {/* Tooltip Hover */}
              {hoverIdx1 !== null && filtered1[hoverIdx1] && (
                <div className="pointer-events-none absolute top-2 right-2 rounded-lg border border-white/15 bg-[#1c222e]/95 p-2 text-[11px] shadow-xl backdrop-blur-md">
                  <p className="font-bold text-[#F0F3F6]">{filtered1[hoverIdx1].label}</p>
                  <p className="text-rose-400 font-mono">
                    Dư nợ: <strong>{Math.round(filtered1[hoverIdx1].margin_debt_bn).toLocaleString('vi-VN')} tỷ</strong>
                  </p>
                  <p className="text-blue-400 font-mono">
                    Margin/VCSH: <strong>{filtered1[hoverIdx1].margin_vcsh_pct}%</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Bảng dữ liệu đúng 8 dòng chuẩn ruatichsan */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#9EACB9]">
              <span>
                Kỳ gần nhất: <strong className="text-[#F0F3F6] font-mono">{overview.latestPeriod}</strong>
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#161a23]">
              <div className="max-h-[235px] overflow-y-auto overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs min-w-[390px]">
                  <thead className="sticky top-0 z-10 bg-[#1d4ed8] text-[10.5px] font-bold text-white shadow-sm">
                    <tr>
                      <th className="py-1.5 px-2.5">Kỳ BCTC</th>
                      <th className="py-1.5 px-2 text-right">Cho vay margin (tỷ)</th>
                      <th className="py-1.5 px-2 text-right">VCSH (tỷ)</th>
                      <th className="py-1.5 px-2 text-right">Margin/VCSH</th>
                      <th className="py-1.5 px-2 text-right">±QoQ</th>
                      <th className="py-1.5 pr-2.5 text-right">±YoY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered1.slice().reverse().map((row) => (
                      <tr key={row.period} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-1 px-2.5 font-mono font-medium text-[#F0F3F6] text-[11px] whitespace-nowrap">{row.label}</td>
                        <td className="py-1 px-2 text-right font-mono text-[#F0F3F6] text-[11px] whitespace-nowrap">
                          {Math.round(row.margin_debt_bn).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-[#9EACB9] text-[11px] whitespace-nowrap">
                          {Math.round(row.vcsh_bn).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-amber-400 text-[11px] whitespace-nowrap">
                          {row.margin_vcsh_pct}%
                        </td>
                        <td className={cn('py-1 px-2 text-right font-mono text-[10.5px] whitespace-nowrap', (row.qoq_growth ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {(row.qoq_growth ?? 0) >= 0 ? '+' : ''}{row.qoq_growth}%
                        </td>
                        <td className={cn('py-1 pr-2.5 text-right font-mono text-[10.5px] whitespace-nowrap', (row.yoy_growth ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {(row.yoy_growth ?? 0) >= 0 ? '+' : ''}{row.yoy_growth}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KHỐI 2: DƯ ĐỊA MARGIN — TOÀN NGÀNH ── */}
      <section className="rounded-xl border border-white/8 bg-[#14171f] p-3.5 shadow-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-[#F0F3F6]">
            Dư địa margin — {selectedSymbol === 'ALL' ? 'Toàn ngành' : selectedSymbol}
          </h3>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setTimeRange2(r.key)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer font-mono',
                    timeRange2 === r.key ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              <button
                type="button"
                onClick={() => setPeriodType2('quy')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType2 === 'quy' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Quý
              </button>
              <button
                type="button"
                onClick={() => setPeriodType2('nam')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType2 === 'nam' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Năm
              </button>
            </div>

            <button
              type="button"
              onClick={() => exportSvgToPng(svgRef2.current, `DuDiaMargin_${selectedSymbol}`)}
              className="flex size-6.5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white cursor-pointer"
              title="Tải ảnh PNG"
            >
              <Download className="size-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Cột Trái: SVG Cột Cho vay vs Dư địa */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="relative w-full select-none overflow-hidden rounded-lg border border-white/5 bg-[#161a23] p-2">
              <svg
                ref={svgRef2}
                viewBox="0 0 600 230"
                className="w-full h-auto max-h-[235px] cursor-crosshair block"
                onMouseMove={(e) => {
                  if (!svgRef2.current || !filtered2.length) return
                  const rect = svgRef2.current.getBoundingClientRect()
                  const mouseX = ((e.clientX - rect.left) / rect.width) * 600
                  const ratio = Math.max(0, Math.min(1, (mouseX - 45) / 510))
                  setHoverIdx2(Math.round(ratio * (filtered2.length - 1)))
                }}
                onMouseLeave={() => setHoverIdx2(null)}
              >
                {/* Watermark in chìm thương hiệu */}
                <text x="300" y="26" textAnchor="middle" fontSize="15" fill="rgba(255,255,255,0.18)" fontWeight="bold" letterSpacing="0.6">
                  Dulieudautu.com
                </text>
                <text x="300" y="40" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.12)" fontStyle="italic">
                  Nguồn: dulieudautu.com
                </text>

                <text x="40" y="16" textAnchor="end" fontSize="8.5" fill="#8B98A5" fontStyle="italic">
                  (tỷ)
                </text>
                <text x="560" y="16" textAnchor="start" fontSize="8.5" fill="#f97316" fontStyle="italic">
                  (%)
                </text>

                {/* Trục Y kép: 800k -> 0k & 180% -> -60% */}
                {[
                  { y: 25, valLeft: '800k', valRight: '180%' },
                  { y: 68, valLeft: '600k', valRight: '120%' },
                  { y: 111, valLeft: '400k', valRight: '60%' },
                  { y: 154, valLeft: '200k', valRight: '0%' },
                  { y: 197, valLeft: '0', valRight: '-60%' },
                ].map((row, i) => (
                  <g key={i}>
                    <line x1="45" y1={row.y} x2="555" y2={row.y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                    <text x="40" y={row.y + 3} textAnchor="end" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {row.valLeft}
                    </text>
                    <text x="560" y={row.y + 3} textAnchor="start" fontSize="8.5" fill="#f97316" fontFamily="monospace">
                      {row.valRight}
                    </text>
                  </g>
                ))}

                {/* Cột Cho vay (Đỏ) và Dư địa (Xanh lá) */}
                {filtered2.map((item, idx) => {
                  const maxTotal = 800000
                  const step = 510 / filtered2.length
                  const barW = Math.max(2, Math.min(6.5, step * 0.38))
                  const xCenter = 45 + idx * step + step / 2

                  const h1 = (item.margin_debt_bn / maxTotal) * 172
                  const h2 = (item.du_dia_bn / maxTotal) * 172

                  return (
                    <g key={item.period}>
                      <rect x={xCenter - barW - 0.5} y={197 - h1} width={barW} height={Math.max(1, h1)} fill="#ef4444" rx="1" opacity={0.9} />
                      <rect x={xCenter + 0.5} y={197 - h2} width={barW} height={Math.max(1, h2)} fill="#10b981" rx="1" opacity={0.9} />
                    </g>
                  )
                })}

                {/* Đường Tăng trưởng YoY (Cam) */}
                {(() => {
                  const pts = filtered2.map((item, idx) => {
                    const step = 510 / filtered2.length
                    const x = 45 + idx * step + step / 2
                    const val = Math.max(-60, Math.min(180, item.yoy_growth || 0))
                    const y = 197 - ((val + 60) / 240) * 172
                    return `${x.toFixed(1)},${y.toFixed(1)}`
                  })
                  return <polyline fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" points={pts.join(' ')} />
                })()}

                {/* Nhãn trục X */}
                {filtered2.map((item, idx) => {
                  const showTick = filtered2.length <= 8 || idx % Math.ceil(filtered2.length / 7) === 0 || idx === filtered2.length - 1
                  if (!showTick) return null
                  const step = 510 / filtered2.length
                  const x = 45 + idx * step + step / 2
                  return (
                    <text key={item.period} x={x} y="217" textAnchor="middle" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {item.period}
                    </text>
                  )
                })}
              </svg>

              <div className="mt-1.5 flex items-center justify-center gap-5 border-t border-white/8 pt-1 text-[10.5px] font-medium text-[#9EACB9]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-[#ef4444]" />
                  <span>Cho vay margin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-[#10b981]" />
                  <span>Dư địa margin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-2.5 bg-[#f97316]" />
                  <span>Tăng trưởng YoY</span>
                </div>
              </div>

              {hoverIdx2 !== null && filtered2[hoverIdx2] && (
                <div className="pointer-events-none absolute top-2 right-2 rounded-lg border border-white/15 bg-[#1c222e]/95 p-2 text-[11px] shadow-xl backdrop-blur-md">
                  <p className="font-bold text-[#F0F3F6]">{filtered2[hoverIdx2].label}</p>
                  <p className="text-rose-400 font-mono">
                    Cho vay: <strong>{Math.round(filtered2[hoverIdx2].margin_debt_bn).toLocaleString('vi-VN')} tỷ</strong>
                  </p>
                  <p className="text-emerald-400 font-mono">
                    Dư địa: <strong>{Math.round(filtered2[hoverIdx2].du_dia_bn).toLocaleString('vi-VN')} tỷ</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Bảng bóc tách tài sản */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#9EACB9]">
              <span>
                Kỳ gần nhất: <strong className="text-[#F0F3F6] font-mono">{overview.latestPeriod}</strong>
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#161a23]">
              <div className="max-h-[235px] overflow-y-auto overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs min-w-[390px]">
                  <thead className="sticky top-0 z-10 bg-[#1d4ed8] text-[10.5px] font-bold text-white shadow-sm">
                    <tr>
                      <th className="py-1.5 px-2.5">Kỳ BCTC</th>
                      <th className="py-1.5 px-2 text-right">Cổ phiếu (tỷ)</th>
                      <th className="py-1.5 px-2 text-right">Trái phiếu (tỷ)</th>
                      <th className="py-1.5 px-2 text-right">Cho vay margin</th>
                      <th className="py-1.5 pr-2.5 text-right">Dư địa margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered2.slice().reverse().map((row) => (
                      <tr key={row.period} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-1 px-2.5 font-mono font-medium text-[#F0F3F6] text-[11px] whitespace-nowrap">{row.label}</td>
                        <td className="py-1 px-2 text-right font-mono text-[#F0F3F6] text-[11px] whitespace-nowrap">
                          {Math.round(row.co_phieu_bn).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-[#9EACB9] text-[11px] whitespace-nowrap">
                          {Math.round(row.trai_phieu_bn).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-rose-400 text-[11px] whitespace-nowrap">
                          {Math.round(row.margin_debt_bn).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 pr-2.5 text-right font-mono font-bold text-emerald-400 text-[11px] whitespace-nowrap">
                          {Math.round(row.du_dia_bn).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KHỐI 3: TOP 10 CTCK THEO DƯ NỢ MARGIN ── */}
      <section className="rounded-xl border border-white/8 bg-[#14171f] p-3.5 shadow-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-[#F0F3F6]">
            TOP 10 CTCK theo dư nợ margin
          </h3>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setTimeRange3(r.key)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer font-mono',
                    timeRange3 === r.key ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              <button
                type="button"
                onClick={() => setPeriodType3('quy')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType3 === 'quy' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Quý
              </button>
              <button
                type="button"
                onClick={() => setPeriodType3('nam')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType3 === 'nam' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Năm
              </button>
            </div>

            <button
              type="button"
              onClick={() => exportSvgToPng(svgRef3.current, 'Top10_Margin_CTCK')}
              className="flex size-6.5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white cursor-pointer"
              title="Tải ảnh PNG"
            >
              <Download className="size-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Cột Trái: Biểu đồ cột xếp chồng Top 10 */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="relative w-full select-none overflow-hidden rounded-lg border border-white/5 bg-[#161a23] p-2">
              <svg
                ref={svgRef3}
                viewBox="0 0 600 230"
                className="w-full h-auto max-h-[235px] cursor-crosshair block"
                onMouseMove={(e) => {
                  if (!svgRef3.current || !filtered3.length) return
                  const rect = svgRef3.current.getBoundingClientRect()
                  const mouseX = ((e.clientX - rect.left) / rect.width) * 600
                  const ratio = Math.max(0, Math.min(1, (mouseX - 45) / 510))
                  setHoverIdx3(Math.round(ratio * (filtered3.length - 1)))
                }}
                onMouseLeave={() => setHoverIdx3(null)}
              >
                {/* Watermark in chìm thương hiệu */}
                <text x="300" y="26" textAnchor="middle" fontSize="15" fill="rgba(255,255,255,0.18)" fontWeight="bold" letterSpacing="0.6">
                  Dulieudautu.com
                </text>
                <text x="300" y="40" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.12)" fontStyle="italic">
                  Nguồn: dulieudautu.com
                </text>

                <text x="40" y="16" textAnchor="end" fontSize="8.5" fill="#8B98A5" fontStyle="italic">
                  (tỷ)
                </text>

                {[
                  { y: 25, val: '320k' },
                  { y: 68, val: '240k' },
                  { y: 111, val: '160k' },
                  { y: 154, val: '80k' },
                  { y: 197, val: '0' },
                ].map((row, i) => (
                  <g key={i}>
                    <line x1="45" y1={row.y} x2="555" y2={row.y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                    <text x="40" y={row.y + 3} textAnchor="end" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {row.val}
                    </text>
                  </g>
                ))}

                {/* Stacked Bars */}
                {filtered3.map((item, idx) => {
                  const maxTotal = 320000
                  const step = 510 / filtered3.length
                  const barW = Math.max(2.5, Math.min(11, step * 0.55))
                  const x = 45 + idx * step + step / 2 - barW / 2

                  let currentY = 197
                  return (
                    <g key={item.period}>
                      {item.companies.map((comp) => {
                        const h = (comp.margin_debt_bn / maxTotal) * 172
                        currentY -= h
                        const color = CTCK_COLORS[comp.symbol] || '#64748b'
                        return (
                          <rect
                            key={comp.symbol}
                            x={x}
                            y={currentY}
                            width={barW}
                            height={Math.max(1, h)}
                            fill={color}
                            opacity={hoverIdx3 === idx ? 1 : 0.88}
                          />
                        )
                      })}
                    </g>
                  )
                })}

                {/* Nhãn trục X */}
                {filtered3.map((item, idx) => {
                  const showTick = filtered3.length <= 8 || idx % Math.ceil(filtered3.length / 7) === 0 || idx === filtered3.length - 1
                  if (!showTick) return null
                  const step = 510 / filtered3.length
                  const x = 45 + idx * step + step / 2
                  return (
                    <text key={item.period} x={x} y="217" textAnchor="middle" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {item.period}
                    </text>
                  )
                })}
              </svg>

              {/* Legend Top 10 */}
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5 border-t border-white/8 pt-1 text-[10px] font-medium text-[#9EACB9]">
                {['TCX', 'SSI', 'VPX', 'VCK', 'HCM', 'VCI', 'MBS', 'VIX', 'VND', 'SHS'].map((sym) => (
                  <div key={sym} className="flex items-center gap-1">
                    <span className="size-2 rounded-xs" style={{ backgroundColor: CTCK_COLORS[sym] || '#64748b' }} />
                    <span>{sym}</span>
                  </div>
                ))}
              </div>

              {hoverIdx3 !== null && filtered3[hoverIdx3] && (
                <div className="pointer-events-none absolute top-2 right-2 rounded-lg border border-white/15 bg-[#1c222e]/95 p-2 text-[11px] shadow-xl backdrop-blur-md min-w-[140px]">
                  <p className="font-bold text-[#F0F3F6] mb-1">{filtered3[hoverIdx3].period}</p>
                  <p className="text-emerald-400 font-mono mb-1">
                    Tổng: <strong>{Math.round(filtered3[hoverIdx3].total_bn).toLocaleString('vi-VN')} tỷ</strong>
                  </p>
                  <div className="space-y-0.5 text-[10px]">
                    {filtered3[hoverIdx3].companies.slice(0, 4).map((c) => (
                      <div key={c.symbol} className="flex items-center justify-between gap-2">
                        <span className="font-bold" style={{ color: CTCK_COLORS[c.symbol] || '#fff' }}>
                          {c.symbol}:
                        </span>
                        <span className="font-mono text-[#F0F3F6]">
                          {Math.round(c.margin_debt_bn).toLocaleString('vi-VN')} tỷ ({c.market_share_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Bảng Top 10 CTCK kỳ mới nhất */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#9EACB9]">
              <span>
                Kỳ gần nhất: <strong className="text-[#F0F3F6] font-mono">{overview.latestPeriod}</strong>
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#161a23]">
              <div className="max-h-[235px] overflow-y-auto overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs min-w-[320px]">
                  <thead className="sticky top-0 z-10 bg-[#1d4ed8] text-[10.5px] font-bold text-white shadow-sm">
                    <tr>
                      <th className="py-1.5 px-2.5 w-9 text-center">#</th>
                      <th className="py-1.5 px-2.5">CTCK</th>
                      <th className="py-1.5 px-2.5 text-right">Cho vay margin (tỷ)</th>
                      <th className="py-1.5 pr-3 text-right">Thị phần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {latestTop10.map((comp, idx) => (
                      <tr key={comp.symbol} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-1 px-2.5 text-center font-bold text-[#6b7280] font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-1 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: CTCK_COLORS[comp.symbol] || '#64748b' }}
                            />
                            <span className="font-bold text-[#F0F3F6] font-mono text-[11px]">{comp.symbol}</span>
                          </div>
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono font-semibold text-[#F0F3F6] text-[11px] whitespace-nowrap">
                          {Math.round(comp.margin_debt_bn).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-1 pr-3 text-right font-mono font-bold text-emerald-400 text-[11px] whitespace-nowrap">
                          {comp.market_share_pct.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KHỐI 4: THỊ PHẦN MÔI GIỚI TOP 10 CTCK SÀN HOSE ── */}
      <section className="rounded-xl border border-white/8 bg-[#14171f] p-3.5 shadow-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#F0F3F6]">
              Thị phần môi giới Top 10 CTCK sàn HoSE
            </h3>
            <p className="text-[10.5px] text-[#8B98A5]">
              Diễn biến qua 24 quý từ 2020 đến nay theo số liệu HoSE
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setTimeRange4(r.key)}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer font-mono',
                    timeRange4 === r.key ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161a23] p-0.5">
              <button
                type="button"
                onClick={() => setPeriodType4('quy')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType4 === 'quy' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Quý
              </button>
              <button
                type="button"
                onClick={() => setPeriodType4('nam')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer',
                  periodType4 === 'nam' ? 'bg-blue-600 text-white font-bold' : 'text-[#9EACB9] hover:text-white'
                )}
              >
                Năm
              </button>
            </div>

            <button
              type="button"
              onClick={() => exportSvgToPng(svgRef4.current, 'ThiPhanMoiGioi_HoSE')}
              className="flex size-6.5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/15 hover:text-white cursor-pointer"
              title="Tải ảnh PNG"
            >
              <Download className="size-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Cột Trái: Multi-line SVG Chart */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="relative w-full select-none overflow-hidden rounded-lg border border-white/5 bg-[#161a23] p-2">
              <svg
                ref={svgRef4}
                viewBox="0 0 600 230"
                className="w-full h-auto max-h-[235px] cursor-crosshair block"
                onMouseMove={(e) => {
                  if (!svgRef4.current || !filtered4.length) return
                  const rect = svgRef4.current.getBoundingClientRect()
                  const mouseX = ((e.clientX - rect.left) / rect.width) * 600
                  const ratio = Math.max(0, Math.min(1, (mouseX - 45) / 510))
                  setHoverIdx4(Math.round(ratio * (filtered4.length - 1)))
                }}
                onMouseLeave={() => setHoverIdx4(null)}
              >
                {/* Watermark in chìm thương hiệu */}
                <text x="300" y="26" textAnchor="middle" fontSize="15" fill="rgba(255,255,255,0.18)" fontWeight="bold" letterSpacing="0.6">
                  Dulieudautu.com
                </text>
                <text x="300" y="40" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.12)" fontStyle="italic">
                  Nguồn: dulieudautu.com
                </text>

                <text x="40" y="16" textAnchor="end" fontSize="8.5" fill="#8B98A5" fontStyle="italic">
                  (%)
                </text>

                {/* Trục Y: 25% -> 0% */}
                {[
                  { y: 25, val: '25%' },
                  { y: 68, val: '20%' },
                  { y: 111, val: '15%' },
                  { y: 154, val: '10%' },
                  { y: 197, val: '0%' },
                ].map((row, i) => (
                  <g key={i}>
                    <line x1="45" y1={row.y} x2="555" y2={row.y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                    <text x="40" y={row.y + 3} textAnchor="end" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {row.val}
                    </text>
                  </g>
                ))}

                {/* 10 Đường Line thị phần */}
                {brokerageShare.brokers.map((b) => {
                  const color = CTCK_COLORS[b.code] || '#94a3b8'
                  const pts: string[] = []
                  filtered4.forEach((row, idx) => {
                    const val = row[b.code]
                    if (val != null && !isNaN(val)) {
                      const step = 510 / filtered4.length
                      const x = 45 + idx * step + step / 2
                      const maxPct = 25
                      const y = 197 - (val / maxPct) * 172
                      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
                    }
                  })
                  if (pts.length < 2) return null
                  return (
                    <polyline
                      key={b.code}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pts.join(' ')}
                    />
                  )
                })}

                {/* Nhãn trục X */}
                {filtered4.map((item, idx) => {
                  const showTick = filtered4.length <= 8 || idx % Math.ceil(filtered4.length / 6) === 0 || idx === filtered4.length - 1
                  if (!showTick) return null
                  const step = 510 / filtered4.length
                  const x = 45 + idx * step + step / 2
                  return (
                    <text key={item.label} x={x} y="217" textAnchor="middle" fontSize="8.5" fill="#8B98A5" fontFamily="monospace">
                      {item.label}
                    </text>
                  )
                })}
              </svg>

              {/* Legend Top 10 Brokerage */}
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5 border-t border-white/8 pt-1 text-[10px] font-medium text-[#9EACB9]">
                {brokerageShare.brokers.slice(0, 8).map((b) => (
                  <div key={b.code} className="flex items-center gap-1">
                    <span className="size-2 rounded-xs" style={{ backgroundColor: CTCK_COLORS[b.code] || '#94a3b8' }} />
                    <span>{b.code}</span>
                  </div>
                ))}
              </div>

              {hoverIdx4 !== null && filtered4[hoverIdx4] && (
                <div className="pointer-events-none absolute top-2 right-2 rounded-lg border border-white/15 bg-[#1c222e]/95 p-2 text-[11px] shadow-xl backdrop-blur-md min-w-[130px]">
                  <p className="font-bold text-[#F0F3F6] mb-0.5">{filtered4[hoverIdx4].label}</p>
                  <div className="space-y-0.5 text-[10px]">
                    {brokerageShare.brokers.slice(0, 5).map((b) => {
                      const val = filtered4[hoverIdx4][b.code]
                      if (val == null) return null
                      return (
                        <div key={b.code} className="flex items-center justify-between gap-2">
                          <span className="font-bold" style={{ color: CTCK_COLORS[b.code] || '#fff' }}>
                            {b.code}:
                          </span>
                          <span className="font-mono text-[#F0F3F6]">{val}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cột Phải: Bảng thị phần môi giới kỳ mới nhất */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col min-w-0">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#9EACB9]">
              <span>
                Kỳ gần nhất: <strong className="text-[#F0F3F6] font-mono">{brokerageShare.latestPeriod}</strong>
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#161a23]">
              <div className="max-h-[235px] overflow-y-auto overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs min-w-[320px]">
                  <thead className="sticky top-0 z-10 bg-[#1d4ed8] text-[10.5px] font-bold text-white shadow-sm">
                    <tr>
                      <th className="py-1.5 px-2.5 w-9 text-center">#</th>
                      <th className="py-1.5 px-2.5">CTCK</th>
                      <th className="py-1.5 pr-3 text-right">Thị phần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {brokerageShare.latestShares.map((comp, idx) => (
                      <tr key={comp.code} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-1 px-2.5 text-center font-bold text-[#6b7280] font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-1 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: CTCK_COLORS[comp.code] || '#94a3b8' }}
                            />
                            <span className="font-bold text-[#F0F3F6] font-mono text-[11px]">{comp.code}</span>
                            <span className="text-[10.5px] text-[#8B98A5] truncate max-w-[130px]">({comp.name})</span>
                          </div>
                        </td>
                        <td className="py-1 pr-3 text-right font-mono font-bold text-emerald-400 text-[11px] whitespace-nowrap">
                          {comp.share.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
