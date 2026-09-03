'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { FinancialChartPayload } from '@/lib/financial-charts-service'
import {
  Landmark,
  PieChart as PieIcon,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Coins,
  Percent,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BankingDetailedFinancialChartsProps {
  symbol: string
  quarterData: FinancialChartPayload | null
  annualData: FinancialChartPayload | null
}

const DONUT_COLORS = [
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#64748b', // Slate
]

function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtPeriod(dateStr: string, isQuarter: boolean): string {
  if (!dateStr) return ''
  if (!isQuarter) {
    // 2025-12-31 -> 2025
    return dateStr.slice(0, 4)
  }
  // 2026-06-30 -> Q2/26
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const y = parts[0].slice(2)
  const m = parseInt(parts[1], 10)
  const q = Math.ceil(m / 3)
  return `Q${q}/${y}`
}

export function BankingDetailedFinancialCharts({
  symbol,
  quarterData,
  annualData,
}: BankingDetailedFinancialChartsProps) {
  const [periodType, setPeriodType] = useState<'quarter' | 'annual'>('quarter')

  const currentData = periodType === 'quarter' ? quarterData : annualData

  // Chuẩn bị dữ liệu đa kỳ cho các biểu đồ
  const chartPoints = useMemo(() => {
    if (!currentData) return []
    const dates: string[] =
      periodType === 'quarter'
        ? currentData.newFiscalDateQuarter || []
        : currentData.newFiscalDateYear || []

    return dates.map((d, i) => {
      return {
        date: d,
        displayDate: fmtPeriod(d, periodType === 'quarter'),
        // 1. Tài sản (Tỷ đồng)
        tsChoVay: currentData.nhTsChoVayKhachHang?.[i] || 0,
        tsTienGuiTCTD: currentData.nhTsTienGuiChoVayTCTDkhac?.[i] || 0,
        tsCKDauTu: currentData.nhTsChungKhoanDauTu?.[i] || 0,
        tsCKKinhDoanh: currentData.nhTsChungKhoanKinhDoanh?.[i] || 0,
        tsKhac: currentData.nhTsKhac?.[i] || 0,
        tsLaiPhiTongTS: currentData.nhTsTiLeLaiPhiTongTaiSan?.[i] != null ? Number(currentData.nhTsTiLeLaiPhiTongTaiSan[i]) : null,
        // 2. Nguồn vốn (Tỷ đồng)
        nvTienGuiKH: currentData.nhNvTienGuiKhachHang?.[i] || 0,
        nvGiayToCoGia: currentData.nhNvPhatHanhGtoCoGia?.[i] || 0,
        nvTCTDKhac: currentData.nhNvGuiVayTCTDKhac?.[i] || 0,
        nvNoCPNHNN: currentData.nhNvNoChinhPhuVaNHNN?.[i] || 0,
        nvKhac: currentData.nhNvKhac?.[i] || 0,
        nvVCSH: currentData.nhNvVcsh?.[i] || 0,
        nvTaiSanVCSH: currentData.nhTsTiLeTaiSanVcsh?.[i] != null ? Number(currentData.nhTsTiLeTaiSanVcsh[i]) : null,
        // 3. TOI & LNST
        toiLaiThuan: currentData.nhToiThuNhapLaiThuan?.[i] || 0,
        toiDichVu: currentData.nhToiLaiThuanTuHDDV?.[i] || 0,
        toiKhac: currentData.nhToiThuNhapTuHDKhac?.[i] || 0,
        toiYoY: currentData.nhToiTangTruongYoy?.[i] != null ? Number(currentData.nhToiTangTruongYoy[i]) : null,
        lnst: currentData.lnst?.[i] || 0,
        lnstYoY: currentData.tangTruongLNSTYoY?.[i] != null ? Number(currentData.tangTruongLNSTYoY[i]) : null,
        // 4. Nợ xấu & Nợ 2-5
        noXauTiLe: currentData.noXauTiLe?.[i] != null ? Number(currentData.noXauTiLe[i]) : null,
        noXauBaoPhu: currentData.noXauTiLeBaoPhu?.[i] != null ? Number(currentData.noXauTiLeBaoPhu[i]) : null,
        noNhom25TiLe: currentData.nhTyLeNhomNo2345?.[i] != null ? Number(currentData.nhTyLeNhomNo2345[i]) : null,
        noNhom25DuPhong: currentData.nhDuPhongRuiRoTinDungNo2345?.[i] != null ? Number(currentData.nhDuPhongRuiRoTinDungNo2345[i]) : null,
        // 4 nhóm nợ
        noNhom2: currentData.nhnxnoNhom2?.[i] != null ? Number(currentData.nhnxnoNhom2[i]) : null,
        noNhom3: currentData.nhnxnoNhom3?.[i] != null ? Number(currentData.nhnxnoNhom3[i]) : null,
        noNhom4: currentData.nhnxnoNhom4?.[i] != null ? Number(currentData.nhnxnoNhom4[i]) : null,
        noNhom5: currentData.nhnxnoNhom5?.[i] != null ? Number(currentData.nhnxnoNhom5[i]) : null,
        // 5. Chỉ số sinh lợi
        nim: currentData.nhSlNIM?.[i] != null ? Number(currentData.nhSlNIM[i]) : null,
        cof: currentData.nhSlCOF?.[i] != null ? Number(currentData.nhSlCOF[i]) : null,
        yoae: currentData.nhSlYOAE?.[i] != null ? Number(currentData.nhSlYOAE[i]) : null,
        casa: currentData.nhnxCasa?.[i] != null ? Number(currentData.nhnxCasa[i]) : null,
      }
    })
  }, [currentData, periodType])

  // Lấy dữ liệu Top 10 cho vay theo ngành kỳ gần nhất
  const loanByIndustry = useMemo(() => {
    const list = currentData?.nhChoVayNganhTheoKy
    if (!list || !Array.isArray(list) || list.length === 0) return null
    return list[list.length - 1]
  }, [currentData])

  if (!currentData || chartPoints.length === 0) {
    return null
  }

  // Lấy kỳ gần nhất để tóm tắt KPI
  const latest = chartPoints[chartPoints.length - 1]

  return (
    <div className="w-full space-y-6">
      {/* ══════════════════════════════════════════════════════════ */}
      {/* HEADER: TIÊU ĐỀ & NÚT CHUYỂN ĐỔI QUÝ / NĂM                */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Landmark className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                9 Biểu Đồ Tài Chính Chuyên Biệt Ngân Hàng {symbol}
              </h2>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                {latest?.displayDate}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Chuỗi thời gian chuẩn hóa từ Báo cáo tài chính kiểm toán ({chartPoints.length} kỳ)
            </p>
          </div>
        </div>

        {/* Bộ chuyển đổi Theo Quý / Theo Năm */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setPeriodType('quarter')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
              periodType === 'quarter'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Calendar className="size-3.5" />
            <span>Theo Quý ({quarterData?.newFiscalDateQuarter?.length || 0} kỳ)</span>
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('annual')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
              periodType === 'annual'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Layers className="size-3.5" />
            <span>Theo Năm ({annualData?.newFiscalDateYear?.length || 0} năm)</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* LƯỚI 9 BIỂU ĐỒ TÀI CHÍNH CHUẨN RUATICHSAN                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* ── BIỂU ĐỒ 1: TOP 10 CHO VAY THEO NGÀNH (DONUT) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <PieIcon className="size-4 text-amber-500" />
              <span>Top 10 Cho Vay Theo Ngành</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {loanByIndustry?.fiscalPeriod ? fmtPeriod(loanByIndustry.fiscalPeriod, true) : 'Gần nhất'}
            </span>
          </div>

          {loanByIndustry ? (
            <div className="space-y-4">
              <div className="h-[210px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={loanByIndustry.top10 || loanByIndustry.items}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey={loanByIndustry.top10 ? 'value' : 'valueBillions'}
                      nameKey={loanByIndustry.top10 ? 'name' : 'label'}
                    >
                      {(loanByIndustry.top10 || loanByIndustry.items).map((_: any, idx: number) => (
                        <Cell key={`donut-${idx}`} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${fmtNum(val)} tỷ đồng`, 'Dư nợ']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-none">
                {(loanByIndustry.items || []).slice(0, 6).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-foreground shrink-0">
                      {item.pct ? `${item.pct.toFixed(1)}%` : `${fmtNum(item.valueBillions)} tỷ`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
              Chưa có dữ liệu phân loại cho vay theo ngành
            </div>
          )}
        </div>

        {/* ── BIỂU ĐỒ 2: NỢ XẤU & TỶ LỆ BAO PHỦ NỢ XẤU ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <AlertTriangle className="size-4 text-rose-500" />
              <span>Nợ Xấu: Tốt Hơn Trung Bình Ngành</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-rose-400">
              Nợ xấu: {latest?.noXauTiLe != null ? `${latest.noXauTiLe.toFixed(2)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, String(name || '')]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="right" dataKey="noXauBaoPhu" name="Bao phủ nợ xấu" fill="#3b82f6" opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="noXauTiLe" name="Tỷ lệ nợ xấu (3-5)" stroke="#10b981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 3: NỢ (NHÓM 2 ĐẾN 5) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <TrendingUp className="size-4 text-amber-500" />
              <span>Nợ (Nhóm 2 Đến 5): Trung Bình Ngành</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-400">
              Nhóm 2-5: {latest?.noNhom25TiLe != null ? `${latest.noNhom25TiLe.toFixed(2)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, String(name || '')]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="right" dataKey="noNhom25DuPhong" name="Dự phòng RR TD (2-5)" fill="#6366f1" opacity={0.7} />
                <Line yAxisId="left" type="monotone" dataKey="noNhom25TiLe" name="Tỷ lệ nợ 2-5" stroke="#10b981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 4: CƠ CẤU NỢ XẤU (4 NHÓM NỢ) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Layers className="size-4 text-violet-500" />
              <span>Cơ Cấu Nợ Xấu (Nhóm 2 Đến 5)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">4 nhóm nợ</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, String(name || '')]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Line type="monotone" dataKey="noNhom2" name="Nợ nhóm 2 (Cần chú ý)" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="noNhom3" name="Nợ nhóm 3 (Dưới chuẩn)" stroke="#06b6d4" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="noNhom4" name="Nợ nhóm 4 (Nghi ngờ)" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="noNhom5" name="Nợ nhóm 5 (Mất vốn)" stroke="#f43f5e" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 5: TÀI SẢN (TỶ ĐỒNG) & LÃI PHÍ PHẢI THU/TỔNG TS ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Coins className="size-4 text-sky-500" />
              <span>Cơ Cấu Tài Sản (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Phải thu: {latest?.tsLaiPhiTongTS != null ? `${latest.tsLaiPhiTongTS.toFixed(2)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') || String(name).includes('Lãi') ? `${Number(val).toFixed(2)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="tsChoVay" name="Cho vay KH" stackId="ts" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="tsCKDauTu" name="CK đầu tư" stackId="ts" fill="#f59e0b" />
                <Bar yAxisId="left" dataKey="tsTienGuiTCTD" name="Tiền gửi TCTD" stackId="ts" fill="#10b981" />
                <Bar yAxisId="left" dataKey="tsKhac" name="Khác" stackId="ts" fill="#64748b" />
                <Line yAxisId="right" type="monotone" dataKey="tsLaiPhiTongTS" name="Lãi, phí/Tổng TS (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 6: NGUỒN VỐN (TỶ ĐỒNG) & TÀI SẢN/VCSH ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Wallet className="size-4 text-emerald-500" />
              <span>Cơ Cấu Nguồn Vốn (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              TS/VCSH: {latest?.nvTaiSanVCSH != null ? `${latest.nvTaiSanVCSH.toFixed(2)}x` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="x" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('TS/VCSH') ? `${Number(val).toFixed(2)} lần` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="nvTienGuiKH" name="Tiền gửi KH" stackId="nv" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="nvGiayToCoGia" name="Giấy tờ có giá" stackId="nv" fill="#f59e0b" />
                <Bar yAxisId="left" dataKey="nvTCTDKhac" name="Vay TCTD" stackId="nv" fill="#06b6d4" />
                <Bar yAxisId="left" dataKey="nvVCSH" name="VCSH" stackId="nv" fill="#10b981" />
                <Line yAxisId="right" type="monotone" dataKey="nvTaiSanVCSH" name="TS/VCSH (lần)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 7: CƠ CẤU TOI (THU NHẬP HOẠT ĐỘNG) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <TrendingUp className="size-4 text-indigo-500" />
              <span>Cơ Cấu Thu Nhập Hoạt Động (TOI)</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-400">
              YoY: {latest?.toiYoY != null ? `${latest.toiYoY > 0 ? '+' : ''}${latest.toiYoY.toFixed(1)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') || String(name).includes('YoY') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="toiLaiThuan" name="Thu nhập lãi thuần" stackId="toi" fill="#8b5cf6" />
                <Bar yAxisId="left" dataKey="toiDichVu" name="Lãi từ dịch vụ" stackId="toi" fill="#f59e0b" />
                <Bar yAxisId="left" dataKey="toiKhac" name="Thu nhập khác" stackId="toi" fill="#06b6d4" />
                <Line yAxisId="right" type="monotone" dataKey="toiYoY" name="Tăng trưởng YoY (%)" stroke="#10b981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 8: LNST CỔ ĐÔNG CÔNG TY MẸ ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Coins className="size-4 text-emerald-500" />
              <span>LNST Cổ Đông Công Ty Mẹ</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-400">
              LNST: {fmtNum(latest?.lnst)} tỷ
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') || String(name).includes('YoY') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="lnst" name="LNST (Tỷ đồng)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="lnstYoY" name="Tăng trưởng YoY (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 9: CHỈ SỐ SINH LỢI (NIM, COF, YOAE, CASA) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Percent className="size-4 text-cyan-500" />
              <span>Chỉ Số Sinh Lợi: NIM, COF, YOAE, CASA</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-cyan-400">
              NIM: {latest?.nim != null ? `${latest.nim.toFixed(2)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, String(name || '')]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Line type="monotone" dataKey="nim" name="NIM (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cof" name="Chi phí vốn COF (%)" stroke="#f43f5e" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="yoae" name="Lợi suất YOAE (%)" stroke="#10b981" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="casa" name="Tỷ lệ CASA (%)" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
