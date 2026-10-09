"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Layers,
  Activity,
  X,
  Maximize2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RawFinancialStatementData } from "@/lib/financial-statements-db";
import {
  DetailedAssetChartCard,
  DetailedCapitalChartCard,
  DetailedCashFlowChartCard,
  RevenueChartCard,
  ProfitChartCard,
  CustomChartTooltip,
} from "@/components/stock/GeneralDetailedFinancialCharts";

export interface FinancialStatementsSideChartsProps {
  ticker: string;
  activeTab: "cdkt" | "kqkd" | "lctt";
  periodMode: "quarter" | "annual";
  statementData: RawFinancialStatementData | null;
  startIndex: number;
  endIndex: number;
  selectedRowChart: {
    title: string;
    allValues: (number | null)[];
  } | null;
  onClearSelectedRow: () => void;
  onExpandModal: (item: { title: string; allValues: (number | null)[] }) => void;
  onCloseSidePanel: () => void;
}

function fmtBillion(val: number | null | undefined): string {
  if (val == null || isNaN(Number(val))) return "—";
  const num = Number(val);
  if (num === 0) return "0";
  const abs = Math.abs(num);
  const dec = abs >= 100 ? 0 : 1;
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtPeriodLabel(isoDate: string, mode: "quarter" | "annual"): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length < 2) return isoDate;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  if (mode === "annual") return year;
  const q = Math.ceil(month / 3);
  return `Q${q}/${year.slice(2)}`;
}

// Tìm dòng theo danh sách từ khóa ưu tiên
function findRowValues(rows: any[][] | undefined, keywords: string[]): (number | null)[] | null {
  if (!rows || rows.length === 0) return null;
  for (const kw of keywords) {
    const target = kw.toLowerCase().trim();
    const row = rows.find((r) => r[0] && String(r[0]).toLowerCase().trim() === target);
    if (row) return row.slice(3) as (number | null)[];
  }
  for (const kw of keywords) {
    const target = kw.toLowerCase().trim();
    const row = rows.find((r) => r[0] && String(r[0]).toLowerCase().trim().includes(target));
    if (row) return row.slice(3) as (number | null)[];
  }
  return null;
}

// Hàm thuần túy bóc tách số liệu Cân đối kế toán & Lưu chuyển tiền chuẩn WiData (Không phụ thuộc Node.js fs/sqlite)
function buildBalancePoints(
  ticker: string,
  periodMode: 'quarter' | 'annual',
  data: RawFinancialStatementData | null | undefined
) {
  if (!data || !data.fiscalDates || !data.cdkt) return [];
  const dates = data.fiscalDates;
  const cdkt = data.cdkt;
  const lctt = data.lctt || [];

  if (!Array.isArray(dates) || !Array.isArray(cdkt) || cdkt.length === 0) return [];

  const findRow = (arr: any[][], name: string) =>
    arr.find((r) => r[0] && String(r[0]).toLowerCase().trim() === name.toLowerCase().trim());

  // Tài sản
  const rTien = findRow(cdkt, 'Tiền và tương đương tiền');
  const rDTNH = findRow(cdkt, 'Đầu tư ngắn hạn');
  const rPT = findRow(cdkt, 'Các khoản phải thu');
  const rTK = findRow(cdkt, 'Hàng tồn kho, ròng') || findRow(cdkt, 'Hàng tồn kho');
  const rTSCD = findRow(cdkt, 'Tài sản cố định');
  const rDTDH = findRow(cdkt, 'Đầu tư dài hạn');
  const rTongTS = findRow(cdkt, 'TỔNG CỘNG TÀI SẢN');

  // Nguồn vốn
  const rVayNH = findRow(cdkt, 'Vay ngắn hạn');
  const rVayDH = findRow(cdkt, 'Vay dài hạn');
  const rPTNB = findRow(cdkt, 'Phải trả người bán');
  const rNMTT = findRow(cdkt, 'Người mua trả tiền trước');
  const rVCSH = findRow(cdkt, 'Vốn chủ sở hữu');
  const rTongNV = findRow(cdkt, 'Tổng cộng nguồn vốn');

  // Lưu chuyển tiền
  const rOCF =
    findRow(lctt, 'Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh') ||
    findRow(lctt, 'Lưu chuyển tiền thuần từ hoạt động kinh doanh') ||
    findRow(lctt, 'LƯU CHUYỂN TIỀN THUẦN TỪ HOẠT ĐỘNG KINH DOANH') ||
    findRow(lctt, 'Lưu chuyển tiền thuần từ các hoạt động sản xuất kinh doanh');
  const rICF =
    findRow(lctt, 'Lưu chuyển tiền thuần từ hoạt động đầu tư') ||
    findRow(lctt, 'LƯU CHUYỂN TIỀN THUẦN TỪ HOẠT ĐỘNG ĐẦU TƯ');
  const rCFF =
    findRow(lctt, 'Lưu chuyển tiền thuần từ hoạt động tài chính') ||
    findRow(lctt, 'LƯU CHUYỂN TIỀN THUẦN TỪ HOẠT ĐỘNG TÀI CHÍNH');
  const rNet =
    findRow(lctt, 'Lưu chuyển tiền thuần trong kỳ') ||
    findRow(lctt, 'LƯU CHUYỂN TIỀN THUẦN TRONG KỲ');

  const isQuarter = periodMode === 'quarter';
  const toBillion = (val: any) => Math.round((Number(val) || 0) / 1e8) / 10;

  return dates.map((d, i) => {
    const col = i + 3;
    const qMatch = d.match(/Q([1-4])/i);
    const qNum = isQuarter
      ? qMatch
        ? parseInt(qMatch[1], 10)
        : Math.ceil(parseInt(d.split('-')[1] || '1', 10) / 3)
      : null;

    // Tài sản
    const tien = toBillion(rTien ? rTien[col] : 0);
    const dtnh = toBillion(rDTNH ? rDTNH[col] : 0);
    const pt = toBillion(rPT ? rPT[col] : 0);
    const tk = toBillion(rTK ? rTK[col] : 0);
    const tscd = toBillion(rTSCD ? rTSCD[col] : 0);
    const dtdh = toBillion(rDTDH ? rDTDH[col] : 0);
    const tongTS = toBillion(rTongTS ? rTongTS[col] : 0);
    const tsKhac = Math.max(0, Math.round((tongTS - (tien + dtnh + pt + tk + tscd + dtdh)) * 10) / 10);

    // Nguồn vốn
    const vnh = toBillion(rVayNH ? rVayNH[col] : 0);
    const vdh = toBillion(rVayDH ? rVayDH[col] : 0);
    const ptnb = toBillion(rPTNB ? rPTNB[col] : 0);
    const nmtt = toBillion(rNMTT ? rNMTT[col] : 0);
    const vcsh = toBillion(rVCSH ? rVCSH[col] : 0);
    const tongNV = toBillion(rTongNV ? rTongNV[col] : 0);
    const nvKhac = Math.max(0, Math.round((tongNV - (vnh + vdh + ptnb + nmtt + vcsh)) * 10) / 10);

    // Lưu chuyển tiền
    const ocf = toBillion(rOCF ? rOCF[col] : 0);
    const icf = toBillion(rICF ? rICF[col] : 0);
    const cff = toBillion(rCFF ? rCFF[col] : 0);
    const netCash = toBillion(rNet ? rNet[col] : 0);

    return {
      date: d,
      displayDate: fmtPeriodLabel(d, periodMode),
      quarterNum: qNum,
      tien,
      dtnh,
      pt,
      tk,
      tscd,
      dtdh,
      tsKhac,
      tongTS,
      vcsh,
      nmtt,
      ptnb,
      vdh,
      vnh,
      nvKhac,
      tongNV,
      ocf,
      icf,
      cff,
      netCash,
    };
  });
}

export function FinancialStatementsSideCharts({
  ticker,
  activeTab,
  periodMode,
  statementData,
  startIndex,
  endIndex,
  selectedRowChart,
  onClearSelectedRow,
  onExpandModal,
  onCloseSidePanel,
}: FinancialStatementsSideChartsProps) {
  // Bộ chọn số kỳ hiển thị: 8 kỳ, 12 kỳ, 16 kỳ (mặc định), 'all' (tất cả), 'sync' (theo bảng)
  const [periodLimit, setPeriodLimit] = useState<number | 'all' | 'sync'>(16);

  // 1. DỮ LIỆU CÂN ĐỐI KẾ TOÁN & DÒNG TIỀN (Chuẩn 100% WiData)
  const allBalancePoints = useMemo(() => {
    if (!statementData) return [];
    return buildBalancePoints(ticker, periodMode, statementData);
  }, [ticker, periodMode, statementData]);

  const balancePoints = useMemo(() => {
    if (!allBalancePoints || allBalancePoints.length === 0) return [];
    if (periodLimit === 'sync') {
      return allBalancePoints.slice(startIndex, endIndex);
    }
    if (typeof periodLimit === 'number' && periodLimit > 0) {
      return allBalancePoints.slice(-periodLimit);
    }
    return allBalancePoints;
  }, [allBalancePoints, periodLimit, startIndex, endIndex]);

  // 2. DỮ LIỆU KẾT QUẢ KINH DOANH (Doanh thu & Lợi nhuận & Tăng trưởng YoY)
  const kqkdPoints = useMemo(() => {
    if (!statementData?.kqkd || !statementData?.fiscalDates) return [];
    const kqkd = statementData.kqkd;
    const dates = statementData.fiscalDates;
    const isQuarter = periodMode === 'quarter';

    const rDT = findRowValues(kqkd, [
      'Doanh thu thuần về bán hàng và cung cấp dịch vụ',
      'Doanh thu thuần',
      'Doanh thu bán hàng và cung cấp dịch vụ',
      'Tổng doanh thu hoạt động',
    ]);
    const rLNST = findRowValues(kqkd, [
      'Lợi nhuận của Cổ đông của Công ty mẹ',
      'Lợi nhuận sau thuế của công ty mẹ',
      'Lợi nhuận sau thuế thu nhập doanh nghiệp',
      'Lãi/(lỗ) thuần sau thuế',
      'Lợi nhuận sau thuế',
    ]);

    const all = dates.map((d, i) => {
      const col = i;
      const toBil = (val: any) => Math.round((Number(val) || 0) / 1e8) / 10;

      const doanhThu = toBil(rDT ? rDT[col] : 0);
      const lnst = toBil(rLNST ? rLNST[col] : 0);

      const prevStep = isQuarter ? 4 : 1;
      let tangTruongDT: number | null = null;
      let tangTruongLNST: number | null = null;

      if (i >= prevStep && rDT) {
        const prevDT = toBil(rDT[i - prevStep]);
        if (prevDT > 0) {
          tangTruongDT = parseFloat((((doanhThu - prevDT) / prevDT) * 100).toFixed(1));
        }
      }
      if (i >= prevStep && rLNST) {
        const prevLNST = toBil(rLNST[i - prevStep]);
        if (prevLNST !== 0) {
          tangTruongLNST = parseFloat((((lnst - prevLNST) / Math.abs(prevLNST)) * 100).toFixed(1));
        }
      }

      const qMatch = d.match(/Q([1-4])/i);
      const qNum = isQuarter
        ? qMatch
          ? parseInt(qMatch[1], 10)
          : Math.ceil(parseInt(d.split('-')[1] || '1', 10) / 3)
        : null;

      return {
        date: d,
        displayDate: fmtPeriodLabel(d, periodMode),
        quarterNum: qNum,
        doanhThu,
        tangTruongDT,
        lnst,
        tangTruongLNST,
      };
    });

    if (periodLimit === 'sync') {
      return all.slice(startIndex, endIndex);
    }
    if (typeof periodLimit === 'number' && periodLimit > 0) {
      return all.slice(-periodLimit);
    }
    return all;
  }, [statementData, periodMode, periodLimit, startIndex, endIndex]);

  // 3. DỮ LIỆU KHI CHỌN RIÊNG 1 DÒNG CHỈ TIÊU (selectedRowChart)
  const selectedRowData = useMemo(() => {
    if (!selectedRowChart || !statementData?.fiscalDates) return null;
    const allFiscalDates = statementData.fiscalDates;

    const all = allFiscalDates.map((d, i) => {
      const rawVal = selectedRowChart.allValues[i];
      const val = rawVal != null ? Math.round((Number(rawVal) || 0) / 1e8) / 10 : null;
      return {
        date: d,
        displayDate: fmtPeriodLabel(d, periodMode),
        val,
        rawVal,
      };
    });

    let points = all;
    if (periodLimit === 'sync') {
      points = all.slice(startIndex, endIndex);
    } else if (typeof periodLimit === 'number' && periodLimit > 0) {
      points = all.slice(-periodLimit);
    }

    const validVals = points.filter((p) => p.val != null).map((p) => p.val as number);
    const latest = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2] : null;
    const yoyPrev = points.length >= 5 ? points[points.length - 5] : null;

    const maxVal = validVals.length > 0 ? Math.max(...validVals) : 0;
    const minVal = validVals.length > 0 ? Math.min(...validVals) : 0;
    const avgVal =
      validVals.length > 0
        ? Math.round((validVals.reduce((a, b) => a + b, 0) / validVals.length) * 10) / 10
        : 0;

    return {
      points,
      latest,
      prev,
      yoyPrev,
      maxVal,
      minVal,
      avgVal,
    };
  }, [selectedRowChart, statementData, periodMode, periodLimit, startIndex, endIndex]);

  const isQuarter = periodMode === "quarter";
  const latestBalance = balancePoints[balancePoints.length - 1];
  const latestKqkd = kqkdPoints[kqkdPoints.length - 1];

  return (
    <div className="space-y-3 w-full animate-in fade-in duration-200">
      {/* ── THANH CÔNG CỤ ĐỒNG BỘ & BỘ CHỌN SỐ KỲ ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              {activeTab === 'cdkt' ? <Wallet className="size-4" /> : activeTab === 'kqkd' ? <TrendingUp className="size-4" /> : <Activity className="size-4" />}
            </span>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                <span>{selectedRowChart ? 'Chỉ tiêu đang chọn' : 'Biểu đồ đồng bộ BCTC'}</span>
                <span className="rounded bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.2 text-[10px] font-extrabold text-sky-400">
                  {selectedRowChart ? 'Chi tiết' : activeTab === 'cdkt' ? 'Cân Đối Kế Toán' : activeTab === 'kqkd' ? 'Kết Quả KD' : 'Lưu Chuyển Tiền'}
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground truncate max-w-[220px]">
                {selectedRowChart ? selectedRowChart.title : `Chuỗi ${periodMode === 'quarter' ? 'Quý' : 'Năm'} chuẩn WiData & ĐHĐCĐ`}
              </p>
            </div>
          </div>

          {/* Nút đóng cột biểu đồ */}
          <button
            type="button"
            onClick={onCloseSidePanel}
            className="sm:hidden flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Đóng bảng biểu đồ"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Bộ chọn số kỳ hiển thị (Cho phép xem nhiều quý hơn để nhìn tổng quan) */}
        <div className="flex items-center justify-between sm:justify-end gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-0.5 hidden md:inline">Xem:</span>
            {[
              { label: '8 kỳ', value: 8 },
              { label: '12 kỳ', value: 12 },
              { label: '16 kỳ', value: 16 },
              { label: 'Tất cả', value: 'all' as const },
              { label: 'Theo bảng', value: 'sync' as const },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setPeriodLimit(opt.value)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer",
                  periodLimit === opt.value
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={opt.value === 'sync' ? 'Đồng bộ chính xác số cột với bảng BCTC bên trái' : `Hiển thị ${opt.label} để nhìn tổng quan chu kỳ`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onCloseSidePanel}
            className="hidden sm:flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer ml-1"
            title="Đóng bảng biểu đồ"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── TRƯỜNG HỢP 1: NGƯỜI DÙNG BẤM CHỌN 1 DÒNG CHỈ TIÊU BẤT KỲ TRONG BẢNG BCTC ── */}
      {selectedRowChart && selectedRowData ? (
        <div className="rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Chi tiết chỉ tiêu đã chọn
              </span>
              <h4 className="text-sm font-black text-foreground truncate" title={selectedRowChart.title}>
                {selectedRowChart.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onExpandModal(selectedRowChart)}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-md border border-border/50 cursor-pointer"
                title="Phóng lớn biểu đồ toàn màn hình"
              >
                <Maximize2 className="size-3 text-sky-400" />
                <span className="hidden sm:inline">Phóng to</span>
              </button>
              <button
                type="button"
                onClick={onClearSelectedRow}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-md border border-rose-500/30 cursor-pointer"
                title="Quay lại biểu đồ tổng quan theo tab"
              >
                <RotateCcw className="size-3" />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>

          {/* Thống kê nhanh */}
          <div className="grid grid-cols-3 gap-2 py-1 text-center bg-muted/30 rounded-xl p-2 border border-border/50">
            <div>
              <span className="text-[10px] text-muted-foreground block">Gần nhất</span>
              <span className="font-mono text-xs font-bold text-foreground">
                {selectedRowData.latest?.val != null ? `${fmtBillion(selectedRowData.latest.val)} tỷ` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Cao nhất</span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {fmtBillion(selectedRowData.maxVal)} tỷ
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Trung bình</span>
              <span className="font-mono text-xs font-bold text-sky-400">
                {fmtBillion(selectedRowData.avgVal)} tỷ
              </span>
            </div>
          </div>

          {/* Biểu đồ diện tích + cột */}
          <div className="h-[230px] w-full pt-2">
            <ResponsiveContainer width="100%" height={230} minWidth={100} minHeight={230}>
              <ComposedChart data={selectedRowData.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="selectedRowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 9.5, fill: '#888' }} />
                <YAxis tick={{ fontSize: 9.5, fill: '#888' }} tickFormatter={(v) => `${Math.round(v)}`} />
                <Tooltip content={<CustomChartTooltip />} isAnimationActive={false} />
                <Area type="monotone" dataKey="val" name={selectedRowChart.title} stroke="#38bdf8" strokeWidth={2.2} fillOpacity={1} fill="url(#selectedRowGrad)" />
                <Bar dataKey="val" name="Giá trị (tỷ)" fill="#0284c7" opacity={0.4} radius={[2, 2, 0, 0]} maxBarSize={20} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* ── TRƯỜNG HỢP 2: SUB-TAB CÂN ĐỐI KẾ TOÁN (TÀI SẢN & NGUỒN VỐN CHUẨN 100% WIDATA) ── */}
      {activeTab === 'cdkt' && !selectedRowChart && (
        <div className="space-y-3.5">
          {/* 1. Biểu đồ TÀI SẢN */}
          <DetailedAssetChartCard
            balancePoints={balancePoints}
            isQuarter={isQuarter}
            latestPoint={latestBalance}
            cardHeight={215}
          />

          {/* 2. Biểu đồ NGUỒN VỐN */}
          <DetailedCapitalChartCard
            balancePoints={balancePoints}
            isQuarter={isQuarter}
            latestPoint={latestBalance}
            cardHeight={215}
          />
        </div>
      )}

      {/* ── TRƯỜNG HỢP 3: SUB-TAB KẾT QUẢ KINH DOANH (DOANH THU & LỢI NHUẬN CHUẨN WIDATA) ── */}
      {activeTab === 'kqkd' && !selectedRowChart && (
        <div className="space-y-3.5">
          {/* 1. Biểu đồ DOANH THU THUẦN & TĂNG TRƯỞNG YoY */}
          <RevenueChartCard
            data={kqkdPoints}
            isQuarter={isQuarter}
            latest={latestKqkd}
            cardHeight={215}
          />

          {/* 2. Biểu đồ LỢI NHUẬN SAU THUẾ & TĂNG TRƯỞNG YoY */}
          <ProfitChartCard
            data={kqkdPoints}
            isQuarter={isQuarter}
            latest={latestKqkd}
            cardHeight={215}
          />
        </div>
      )}

      {/* ── TRƯỜNG HỢP 4: SUB-TAB LƯU CHUYỂN TIỀN TỆ (DÒNG TIỀN CHUẨN WIDATA) ── */}
      {activeTab === 'lctt' && !selectedRowChart && (
        <div className="space-y-3.5">
          {/* Biểu đồ LƯU CHUYỂN TIỀN: OCF, ICF, CFF & TIỀN THUẦN */}
          <DetailedCashFlowChartCard
            balancePoints={balancePoints}
            isQuarter={isQuarter}
            latestPoint={latestBalance}
            cardHeight={240}
          />
        </div>
      )}
    </div>
  );
}
