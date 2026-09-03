'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
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
  Factory,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Building,
  RotateCcw,
  Boxes,
  ArrowRightLeft,
  DollarSign,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeneralDetailedFinancialChartsProps {
  symbol: string
  quarterData: FinancialChartPayload | null
  annualData: FinancialChartPayload | null
}

function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

function fmtPeriod(dateStr: string, isQuarter: boolean): string {
  if (!dateStr) return ''
  if (!isQuarter) {
    return dateStr.slice(0, 4)
  }
  const parts = dateStr.split('-')
  if (parts.length < 2) return dateStr
  const y = parts[0].slice(2)
  const m = parseInt(parts[1], 10)
  const q = Math.ceil(m / 3)
  return `Q${q}/${y}`
}

export function GeneralDetailedFinancialCharts({
  symbol,
  quarterData,
  annualData,
}: GeneralDetailedFinancialChartsProps) {
  const [periodType, setPeriodType] = useState<'quarter' | 'annual'>('quarter')

  const currentData = periodType === 'quarter' ? quarterData : annualData

  // Điểm dữ liệu cho 9 biểu đồ sản xuất / phi ngân hàng
  const chartPoints = useMemo(() => {
    if (!currentData) return []
    const dates: string[] =
      periodType === 'quarter'
        ? currentData.newFiscalDateQuarter || []
        : currentData.newFiscalDateYear || []

    return dates.map((d, i) => {
      const nguyenGia = currentData.tsNguyenGiaTscdHuuHinh?.[i] || 0
      const khauHao = Math.abs(currentData.tsKhauHaoTscdHuuHinhLuyKe?.[i] || 0)
      const pctKhauHao = nguyenGia > 0 ? (khauHao / nguyenGia) * 100 : null

      return {
        date: d,
        displayDate: fmtPeriod(d, periodType === 'quarter'),
        // 1. Tài sản
        tsTien: currentData.tsTienTuongDuongTienDTTCNH?.[i] || 0,
        tsPhaiThu: currentData.tsKhoanPhaiThu?.[i] || 0,
        tsTonKho: currentData.tsHangTonKho?.[i] || 0,
        tsCoDinh: currentData.tsTaiSanCoDinh?.[i] || 0,
        tsDoDang: currentData.tsTaiSanDoDangDaiHan?.[i] || 0,
        tsKhac: currentData.tsKhac?.[i] || 0,
        tiLePhaiThu: currentData.tiLePhaiThuTaiSan?.[i] != null ? Number(currentData.tiLePhaiThuTaiSan[i]) : null,
        // 2. Nguồn vốn
        nvVCSH: currentData.nvVonChuSoHuu?.[i] || 0,
        nvVayNganHan: currentData.nvVayNganHan?.[i] || 0,
        nvVayDaiHan: currentData.nvVayDaiHanTPCD?.[i] || 0,
        nvTraTruoc: currentData.nvMuaTraTienTruocDtChuaTH?.[i] || 0,
        nvKhac: currentData.nvKhac?.[i] || 0,
        tiLeNoVayRong: currentData.tiLeNovayRongVcsh?.[i] != null ? Number(currentData.tiLeNovayRongVcsh[i]) : null,
        // 3. TSCĐ & Khấu hao
        nguyenGia,
        khauHao,
        pctKhauHao: pctKhauHao != null ? parseFloat(pctKhauHao.toFixed(1)) : null,
        // 4. ROE & ROA
        roe: currentData.ROECuoiKy?.[i] != null ? Number(currentData.ROECuoiKy[i]) : null,
        roa: currentData.ROACuoiKy?.[i] != null ? Number(currentData.ROACuoiKy[i]) : null,
        // 5. Doanh thu thuần
        doanhThu: currentData.doanhSoThuan?.[i] || 0,
        tangTruongDT: currentData.tangTruongDoanhSoThuanYoY?.[i] != null ? Number(currentData.tangTruongDoanhSoThuanYoY[i]) : null,
        // 6. LNST
        lnst: currentData.lnst?.[i] || 0,
        tangTruongLNST: currentData.tangTruongLNSTYoY?.[i] != null ? Number(currentData.tangTruongLNSTYoY[i]) : null,
        // 7. Biên lợi nhuận
        bienGop: currentData.bienLoiNhuanGop?.[i] != null ? Number(currentData.bienLoiNhuanGop[i]) : null,
        bienRong: currentData.bienLoiNhuanRong?.[i] != null ? Number(currentData.bienLoiNhuanRong[i]) : null,
        // 8. Lưu chuyển tiền tệ
        lctThuan: currentData.lctThuanTrongKy?.[i] || 0,
        lctKinhDoanh: currentData.lctThuanHDSXKD?.[i] || 0,
        lctDauTu: currentData.lctThuanHDDauTu?.[i] || 0,
        lctTaiChinh: currentData.lctThuanHDTC?.[i] || 0,
        // 9. Vòng quay hàng tồn kho
        vongQuayTonKho: currentData.hangTonKhoVongQuay?.[i] != null ? Number(currentData.hangTonKhoVongQuay[i]) : null,
      }
    })
  }, [currentData, periodType])

  if (!currentData || chartPoints.length === 0) return null

  const latest = chartPoints[chartPoints.length - 1]

  return (
    <div className="w-full space-y-6">
      {/* ══════════════════════════════════════════════════════════ */}
      {/* HEADER: TIÊU ĐỀ & NÚT CHUYỂN ĐỔI QUÝ / NĂM                */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
            <Factory className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                9 Biểu Đồ Tài Chính Doanh Nghiệp {symbol}
              </h2>
              <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400">
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
      {/* LƯỚI 9 BIỂU ĐỒ DOANH NGHIỆP SẢN XUẤT / PHI TÀI CHÍNH       */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* ── BIỂU ĐỒ 1: TÀI SẢN & KHOẢN PHẢI THU/TS ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Briefcase className="size-4 text-sky-500" />
              <span>Cơ Cấu Tài Sản (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Phải thu/TS: {latest?.tiLePhaiThu != null ? `${latest.tiLePhaiThu.toFixed(1)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="tsTien" name="Tiền & ĐTTCNH" stackId="ts" fill="#10b981" />
                <Bar yAxisId="left" dataKey="tsPhaiThu" name="Khoản phải thu" stackId="ts" fill="#f59e0b" />
                <Bar yAxisId="left" dataKey="tsTonKho" name="Hàng tồn kho" stackId="ts" fill="#6366f1" />
                <Bar yAxisId="left" dataKey="tsCoDinh" name="TSCĐ" stackId="ts" fill="#06b6d4" />
                <Bar yAxisId="left" dataKey="tsKhac" name="Khác" stackId="ts" fill="#64748b" />
                <Line yAxisId="right" type="monotone" dataKey="tiLePhaiThu" name="Phải thu / TS (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 2: NGUỒN VỐN & NỢ VAY RÒNG/VCSH ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <DollarSign className="size-4 text-emerald-500" />
              <span>Cơ Cấu Nguồn Vốn (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Vay ròng/VCSH: {latest?.tiLeNoVayRong != null ? `${latest.tiLeNoVayRong.toFixed(0)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="nvVCSH" name="Vốn chủ sở hữu" stackId="nv" fill="#10b981" />
                <Bar yAxisId="left" dataKey="nvVayNganHan" name="Vay ngắn hạn" stackId="nv" fill="#f59e0b" />
                <Bar yAxisId="left" dataKey="nvVayDaiHan" name="Vay dài hạn" stackId="nv" fill="#ec4899" />
                <Bar yAxisId="left" dataKey="nvTraTruoc" name="Người mua trả trước" stackId="nv" fill="#06b6d4" />
                <Bar yAxisId="left" dataKey="nvKhac" name="Khác" stackId="nv" fill="#64748b" />
                <Line yAxisId="right" type="monotone" dataKey="tiLeNoVayRong" name="Nợ vay ròng/VCSH (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 3: TSCĐ HỮU HÌNH & KHẤU HAO LŨY KẾ ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Building className="size-4 text-indigo-500" />
              <span>TSCĐ Hữu Hình & Khấu Hao (Tỷ)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Đã KH: {latest?.pctKhauHao != null ? `${latest.pctKhauHao.toFixed(1)}%` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="nguyenGia" name="Nguyên giá TSCĐ" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="khauHao" name="Khấu hao lũy kế" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="pctKhauHao" name="% Đã khấu hao" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 4: ROE VÀ ROA ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Percent className="size-4 text-emerald-500" />
              <span>ROE & ROA Cuối Kỳ (%)</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-400">
              ROE: {latest?.roe != null ? `${latest.roe.toFixed(1)}%` : '—'}
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
                  formatter={(val: any, name: any = '') => [`${Number(val).toFixed(2)}%`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Line type="monotone" dataKey="roe" name="ROE cuối kỳ (%)" stroke="#10b981" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="roa" name="ROA cuối kỳ (%)" stroke="#3b82f6" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 5: DOANH THU THUẦN (TỶ ĐỒNG) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <TrendingUp className="size-4 text-cyan-500" />
              <span>Doanh Thu Thuần (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-cyan-400">
              DT: {fmtNum(latest?.doanhThu)} tỷ
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="doanhThu" name="Doanh thu thuần" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="tangTruongDT" name="Tăng trưởng YoY (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 6: LNST CỔ ĐÔNG MẸ (TỶ ĐỒNG) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <TrendingUp className="size-4 text-emerald-500" />
              <span>LNST Cổ Đông Công Ty Mẹ</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-400">
              LNST: {fmtNum(latest?.lnst)} tỷ
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('%') ? `${Number(val).toFixed(1)}%` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="lnst" name="LNST cổ đông mẹ" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="tangTruongLNST" name="Tăng trưởng YoY (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 7: BIÊN LỢI NHUẬN GỘP & BIÊN RÒNG ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Percent className="size-4 text-amber-500" />
              <span>Biên Lợi Nhuận Gộp & Ròng (%)</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-400">
              Biên gộp: {latest?.bienGop != null ? `${latest.bienGop.toFixed(1)}%` : '—'}
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
                  formatter={(val: any, name: any = '') => [`${Number(val).toFixed(2)}%`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Line type="monotone" dataKey="bienGop" name="Biên lợi nhuận gộp (%)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bienRong" name="Biên lợi nhuận ròng (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 8: LƯU CHUYỂN TIỀN TỆ (TỶ ĐỒNG) ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <ArrowRightLeft className="size-4 text-violet-500" />
              <span>Lưu Chuyển Tiền Tệ (Tỷ Đồng)</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">OCF / ICF / CFF</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [`${fmtNum(val)} tỷ đồng`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar dataKey="lctThuan" name="LCTT thuần" fill="#64748b" opacity={0.6} />
                <Line type="monotone" dataKey="lctKinhDoanh" name="LCTT Kinh doanh (OCF)" stroke="#10b981" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="lctDauTu" name="LCTT Đầu tư (ICF)" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="lctTaiChinh" name="LCTT Tài chính (CFF)" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── BIỂU ĐỒ 9: VÒNG QUAY HÀNG TỒN KHO ── */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Boxes className="size-4 text-purple-500" />
              <span>Vòng Quay Hàng Tồn Kho</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-purple-400">
              {latest?.vongQuayTonKho != null ? `${latest.vongQuayTonKho.toFixed(1)} lần` : '—'}
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} unit="lần" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  formatter={(val: any, name: any = '') => [
                    String(name).includes('lần') || String(name).includes('Vòng') ? `${Number(val).toFixed(2)} lần` : `${fmtNum(val)} tỷ`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                <Bar yAxisId="left" dataKey="tsTonKho" name="Hàng tồn kho (Tỷ)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="vongQuayTonKho" name="Vòng quay tồn kho (lần)" stroke="#10b981" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
