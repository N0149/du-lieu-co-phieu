"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import {
  FileSpreadsheet,
  Download,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Table as TableIcon,
  Plus,
  Minus,
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { StockFinancialYear } from "@/lib/longlivestock";
import type { RawFinancialStatementData } from "@/lib/financial-statements-db";
import { WiDataFinancialRatiosDashboard } from "@/components/stock/WiDataFinancialRatiosDashboard";
import type { BctcReportData, BctcNoteItem } from "@/lib/bctc-service";
import { findMatchingNote, getNoteShortBadge } from "@/lib/bctc-note-matcher";
import { FinancialNoteModal } from "@/components/stock/financial-note-modal";

export type FinancialTab = "cdkt" | "kqkd" | "lctt" | "ratios";
export type FinancialUnit = "bil" | "mil" | "thou" | "one";

interface FinancialStatementsExplorerProps {
  ticker: string;
  financials?: StockFinancialYear[];
  initialData?: RawFinancialStatementData | null;
  initialAnnualData?: RawFinancialStatementData | null;
  detailedSnapshot?: any;
  bctcDataHopNhat?: BctcReportData | null;
  bctcDataCongTyMe?: BctcReportData | null;
  onSelectTab?: (tab: any) => void;
}

function getQuarterFromIso(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length < 2) return "";
  const month = parseInt(parts[1], 10);
  if (month >= 1 && month <= 3) return "Q1";
  if (month >= 4 && month <= 6) return "Q2";
  if (month >= 7 && month <= 9) return "Q3";
  return "Q4";
}

function formatPeriodLabel(isoDate: string, mode: "quarter" | "annual"): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length < 2) return isoDate;
  const year = parts[0];
  const month = parseInt(parts[1], 10);

  if (mode === "annual") {
    return `${year}`;
  }

  let q = "Q1";
  if (month >= 1 && month <= 3) q = "Q1";
  else if (month >= 4 && month <= 6) q = "Q2";
  else if (month >= 7 && month <= 9) q = "Q3";
  else q = "Q4";

  return `${q} ${year}`;
}

function fmtValue(val: number | null | undefined, unitDivider = 1_000_000_000): string {
  if (val == null || isNaN(Number(val))) return "—";
  const num = Number(val) / unitDivider;
  if (num === 0) return "0";
  const abs = Math.abs(num);
  const maxDec = unitDivider >= 1_000_000_000 ? 1 : 0;
  const hasDec = maxDec > 0 && Math.round(abs * 10) % 10 !== 0;
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: hasDec ? 1 : 0,
    maximumFractionDigits: maxDec,
  });
}

function calcGrowth(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// Font hệ thống chuẩn Ruatichsan / iOS / MacOS / Bloomberg
const RUATICHSAN_FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontVariantNumeric: "tabular-nums" as const,
};

export interface StatementTreeNode {
  idx: number;
  row: any[];
  name: string;
  displayName: string;
  level: number;
  parentId: number | null;
  hasChildren: boolean;
}

const CDKT_L0 = new Set([
  "TÀI SẢN NGẮN HẠN",
  "TÀI SẢN DÀI HẠN",
  "TỔNG CỘNG TÀI SẢN",
  "TỔNG TÀI SẢN",
  "NỢ PHẢI TRẢ",
  "VỐN CHỦ SỞ HỮU",
  "TỔNG CỘNG NGUỒN VỐN",
  "TỔNG NGUỒN VỐN",
  "TỔNG CỘNG NGUỒN VỐN (TRƯỚC 2015)",
  "A. TÀI SẢN CỦA CÔNG TY CHỨNG KHOÁN (CTCK) VÀ TÀI SẢN QUẢN LÝ THEO CAM KẾT",
  "B. TÀI SẢN VÀ CÁC KHOẢN PHẢI TRẢ VỀ TÀI SẢN QUẢN LÝ CAM KẾT VỚI KHÁCH HÀNG",
  "CÁC CHỈ TIÊU NGOÀI BÁO CÁO TÌNH HÌNH TÀI CHÍNH",
]);

const CDKT_L1 = new Set([
  "TIỀN VÀ TƯƠNG ĐƯƠNG TIỀN",
  "ĐẦU TƯ NGẮN HẠN",
  "CÁC KHOẢN PHẢI THU",
  "HÀNG TỒN KHO, RÒNG",
  "HÀNG TỒN KHO",
  "TÀI SẢN LƯU ĐỘNG KHÁC",
  "TÀI SẢN NGẮN HẠN KHÁC",
  "PHẢI THU DÀI HẠN",
  "CÁC KHOẢN PHẢI THU DÀI HẠN",
  "TÀI SẢN CỐ ĐỊNH",
  "GIÁ TRỊ RÒNG TÀI SẢN ĐẦU TƯ",
  "BẤT ĐỘNG SẢN ĐẦU TƯ",
  "TÀI SẢN DỞ DANG DÀI HẠN",
  "ĐẦU TƯ DÀI HẠN",
  "ĐẦU TƯ TÀI CHÍNH DÀI HẠN",
  "GÓP VỐN, ĐẦU TƯ DÀI HẠN",
  "TÀI SẢN DÀI HẠN KHÁC",
  "NỢ NGẮN HẠN",
  "NỢ DÀI HẠN",
  "VỐN VÀ CÁC QUỸ",
  "VỐN NGÂN SÁCH NHÀ NƯỚC VÀ QUỸ KHÁC",
  "LỢI ÍCH CỦA CỔ ĐÔNG THIỂU SỐ",
  "LỢI ÍCH CỔ ĐÔNG KHÔNG KIỂM SOÁT",
]);

function buildStatementTree(rows: any[][], tab: FinancialTab): StatementTreeNode[] {
  if (!rows || rows.length === 0) return [];

  if (tab === "cdkt") {
    const hasInventoryNet = rows.some((r) => String(r[0] || "").includes("Hàng tồn kho, ròng"));

    let curL0: number | null = null;
    let curL1: number | null = null;
    let curL2: number | null = null;

    const items: StatementTreeNode[] = rows.map((r, idx) => {
      const rawName = String(r[0] || "");
      const isUnderscored = rawName.startsWith("_");
      const cleanName = rawName.replace(/^_+/, "").trim();
      const upperName = cleanName.toUpperCase();

      let level = 2;
      let parentId: number | null = null;

      // Level 0
      if (!isUnderscored && (CDKT_L0.has(upperName) || (upperName === cleanName && cleanName.length > 5 && !cleanName.includes("TSCĐ")))) {
        level = 0;
        curL0 = idx;
        curL1 = null;
        curL2 = null;
        parentId = null;
      }
      // Level 1
      else if (!isUnderscored && CDKT_L1.has(upperName)) {
        if (hasInventoryNet && upperName === "HÀNG TỒN KHO") {
          level = 2;
          parentId = curL1 != null ? curL1 : curL0;
        } else {
          level = 1;
          curL1 = idx;
          curL2 = null;
          parentId = curL0;
        }
      }
      // Level 3 (Nguyên giá / Khấu hao / Hao mòn của TSCĐ)
      else if (curL2 != null && (cleanName.startsWith("Nguyên giá") || cleanName.startsWith("Khấu hao") || cleanName.startsWith("Hao mòn"))) {
        level = 3;
        parentId = curL2;
      }
      // Level 2 có con (TSCĐ hữu hình, vô hình, thuê TC, BĐS đầu tư)
      else if (cleanName.includes("TSCĐ") || cleanName.includes("tài sản cố định") || cleanName.includes("tài sản đầu tư")) {
        level = 2;
        curL2 = idx;
        parentId = curL1 != null ? curL1 : curL0;
      }
      // Level 2 thông thường
      else {
        level = 2;
        curL2 = null;
        parentId = curL1 != null ? curL1 : curL0;
      }

      return {
        idx,
        row: r,
        name: rawName,
        displayName: cleanName,
        level,
        parentId,
        hasChildren: false,
      };
    });

    for (const item of items) {
      if (item.parentId != null && items[item.parentId]) {
        items[item.parentId].hasChildren = true;
      }
    }

    return items;
  }

  if (tab === "kqkd") {
    const PARENT_MAP: Record<string, string> = {
      "Các khoản giảm trừ doanh thu": "Doanh thu bán hàng và cung cấp dịch vụ",
      "Chi phí lãi vay": "Chi phí tài chính",
      "Thuế thu nhập doanh nghiệp - hiện thời": "Chi phí thuế thu nhập doanh nghiệp",
      "Thuế thu nhập doanh nghiệp - hoãn lại": "Chi phí thuế thu nhập doanh nghiệp",
      "Lợi ích của cổ đông thiểu số": "Lãi/(lỗ) thuần sau thuế",
      "Lợi nhuận của Cổ đông của Công ty mẹ": "Lãi/(lỗ) thuần sau thuế",
    };

    const nameToIdx = new Map<string, number>();
    rows.forEach((r, idx) => {
      nameToIdx.set(String(r[0] || "").replace(/^_+/, "").trim(), idx);
    });

    const items: StatementTreeNode[] = rows.map((r, idx) => {
      const cleanName = String(r[0] || "").replace(/^_+/, "").trim();
      const parentName = PARENT_MAP[cleanName];
      const parentId = parentName ? (nameToIdx.get(parentName) ?? null) : null;
      const level = parentId != null ? 1 : 0;
      return {
        idx,
        row: r,
        name: String(r[0] || ""),
        displayName: cleanName,
        level,
        parentId,
        hasChildren: false,
      };
    });

    items.forEach((item) => {
      if (item.parentId != null && items[item.parentId]) {
        items[item.parentId].hasChildren = true;
      }
    });

    return items;
  }

  if (tab === "lctt") {
    let curActivityParent: number | null = null;
    const items: StatementTreeNode[] = rows.map((r, idx) => {
      const cleanName = String(r[0] || "").replace(/^_+/, "").trim();
      const isActivity =
        cleanName.includes("sản xuất kinh doanh") ||
        cleanName.includes("hoạt động kinh doanh") ||
        cleanName.includes("hoạt động đầu tư") ||
        cleanName.includes("hoạt động tài chính");

      let level = 1;
      let parentId: number | null = null;

      if (isActivity) {
        level = 0;
        curActivityParent = idx;
        parentId = null;
      } else {
        level = 1;
        parentId = curActivityParent;
      }

      return {
        idx,
        row: r,
        name: String(r[0] || ""),
        displayName: cleanName,
        level,
        parentId,
        hasChildren: false,
      };
    });

    items.forEach((item) => {
      if (item.parentId != null && items[item.parentId]) {
        items[item.parentId].hasChildren = true;
      }
    });

    return items;
  }

  return rows.map((r, idx) => ({
    idx,
    row: r,
    name: String(r[0] || ""),
    displayName: String(r[0] || "").replace(/^_+/, "").trim(),
    level: 0,
    parentId: null,
    hasChildren: false,
  }));
}

// Biểu đồ xu hướng mini dạng cột (5-6 cột cyan) chuẩn FireAnt / Simplize
function MiniTrendSparkline({ values }: { values: (number | null)[] }) {
  const validNumbers = values.filter((v): v is number => v != null && !isNaN(v));
  if (!validNumbers.length || validNumbers.every((v) => v === 0)) {
    return <div className="w-[44px] h-[15px]" />;
  }

  const maxAbs = Math.max(...validNumbers.map((v) => Math.abs(v)), 1);

  return (
    <div className="inline-flex items-end justify-center gap-[2px] h-[15px] w-[44px] select-none">
      {values.map((v, i) => {
        if (v == null || isNaN(v) || v === 0) {
          return (
            <span
              key={i}
              className="w-[3px] h-[1.5px] rounded-xs bg-slate-700/60 shrink-0"
              title={v === 0 ? "0" : "—"}
            />
          );
        }

        const isNeg = v < 0;
        const ratio = Math.abs(v) / maxAbs;
        const heightPx = Math.max(3, Math.round(ratio * 15));

        return (
          <span
            key={i}
            style={{ height: `${heightPx}px` }}
            className={cn(
              "w-[3px] rounded-xs shrink-0 transition-all",
              isNeg ? "bg-rose-400" : "bg-teal-400"
            )}
            title={typeof v === "number" ? v.toLocaleString("vi-VN") : String(v)}
          />
        );
      })}
    </div>
  );
}

interface FinancialItemChartModalProps {
  ticker: string;
  title: string;
  allValues: (number | null)[];
  allFiscalDates: string[];
  initialUnit: FinancialUnit;
  periodMode: "quarter" | "annual";
  onClose: () => void;
}

// Cửa sổ phóng lớn biểu đồ chi tiết khi bấm vào biểu đồ mini
function FinancialItemChartModal({
  ticker,
  title,
  allValues,
  allFiscalDates,
  initialUnit,
  periodMode,
  onClose,
}: FinancialItemChartModalProps) {
  const [rangeCount, setRangeCount] = useState<number>(16);
  const [modalUnit, setModalUnit] = useState<FinancialUnit>(initialUnit);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const modalUnitDivider =
    modalUnit === "bil" ? 1_000_000_000 : modalUnit === "mil" ? 1_000_000 : modalUnit === "thou" ? 1_000 : 1;
  const modalUnitLabel =
    modalUnit === "bil" ? "Tỷ đồng" : modalUnit === "mil" ? "Triệu đồng" : modalUnit === "thou" ? "Nghìn đồng" : "Đồng";

  const totalAvailable = allFiscalDates.length;
  const count = rangeCount === 0 ? totalAvailable : Math.min(rangeCount, totalAvailable);
  const sliceStart = Math.max(0, totalAvailable - count);

  const slicedDates = useMemo(() => allFiscalDates.slice(sliceStart), [allFiscalDates, sliceStart]);
  const slicedValues = useMemo(() => allValues.slice(sliceStart), [allValues, sliceStart]);

  const chartData = useMemo(() => {
    return slicedDates.map((dateStr, idx) => {
      const globalIdx = sliceStart + idx;
      const rawVal = slicedValues[idx];
      const prevVal = globalIdx > 0 ? allValues[globalIdx - 1] : null;
      const yoyOffset = periodMode === "quarter" ? 4 : 1;
      const prevYoYVal = globalIdx >= yoyOffset ? allValues[globalIdx - yoyOffset] : null;

      const qoq = calcGrowth(rawVal, prevVal);
      const yoy = calcGrowth(rawVal, prevYoYVal);

      return {
        date: dateStr,
        period: formatPeriodLabel(dateStr, periodMode),
        rawVal,
        scaledVal: rawVal != null ? Number((rawVal / modalUnitDivider).toFixed(2)) : null,
        qoq,
        yoy,
      };
    });
  }, [slicedDates, slicedValues, sliceStart, allValues, periodMode, modalUnitDivider]);

  const stats = useMemo(() => {
    const validData = chartData.filter((d): d is typeof d & { rawVal: number } => d.rawVal != null && !isNaN(d.rawVal));
    if (!validData.length) return null;

    const latest = validData[validData.length - 1];
    let maxItem = validData[0];
    let minItem = validData[0];
    let sum = 0;

    for (const item of validData) {
      if (item.rawVal > maxItem.rawVal) maxItem = item;
      if (item.rawVal < minItem.rawVal) minItem = item;
      sum += item.rawVal;
    }

    const avgVal = sum / validData.length;

    return {
      latest,
      maxItem,
      minItem,
      avgVal,
    };
  }, [chartData]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-slate-700/80 bg-[#121722] p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col gap-4 text-foreground max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={RUATICHSAN_FONT_STYLE}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shrink-0">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-bold text-teal-300 font-mono">
                  {ticker}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Xu hướng biến động qua {chartData.length} kỳ ({periodMode === "quarter" ? "Quý" : "Năm"}) · Rê chuột vào từng cột để xem chi tiết
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ chọn đơn vị */}
            <div className="relative">
              <select
                value={modalUnit}
                onChange={(e) => setModalUnit(e.target.value as FinancialUnit)}
                className="h-7 appearance-none rounded-lg border border-slate-700 bg-[#1c2331] pl-2.5 pr-6 text-xs font-semibold text-slate-200 outline-none hover:border-slate-500 cursor-pointer"
              >
                <option value="bil">Tỷ đồng</option>
                <option value="mil">Triệu đồng</option>
                <option value="thou">Nghìn đồng</option>
                <option value="one">Đồng</option>
              </select>
              <ChevronsUpDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg border border-slate-700 bg-[#1c2331] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer transition-colors"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 4 Thẻ chỉ số tổng quan */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-slate-800 bg-[#171d2b] p-3">
              <span className="text-[11px] font-medium text-slate-400">Kỳ mới nhất ({stats.latest.period})</span>
              <p className="text-base sm:text-lg font-bold text-teal-300 font-mono mt-0.5">
                {fmtValue(stats.latest.rawVal, modalUnitDivider)}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[11px]">
                {stats.latest.yoy != null ? (
                  <span className={cn("font-semibold flex items-center gap-0.5", stats.latest.yoy > 0 ? "text-emerald-400" : stats.latest.yoy < 0 ? "text-rose-400" : "text-slate-400")}>
                    {stats.latest.yoy > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {stats.latest.yoy > 0 ? "+" : ""}{stats.latest.yoy.toFixed(1)}% YoY
                  </span>
                ) : (
                  <span className="text-slate-500">Chưa có số cùng kỳ</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#171d2b] p-3">
              <span className="text-[11px] font-medium text-slate-400">Đỉnh cao nhất ({stats.maxItem.period})</span>
              <p className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">
                {fmtValue(stats.maxItem.rawVal, modalUnitDivider)}
              </p>
              <span className="text-[11px] text-slate-400">{modalUnitLabel}</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#171d2b] p-3">
              <span className="text-[11px] font-medium text-slate-400">Đáy thấp nhất ({stats.minItem.period})</span>
              <p className="text-base sm:text-lg font-bold text-slate-300 font-mono mt-0.5">
                {fmtValue(stats.minItem.rawVal, modalUnitDivider)}
              </p>
              <span className="text-[11px] text-slate-400">{modalUnitLabel}</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#171d2b] p-3">
              <span className="text-[11px] font-medium text-slate-400">Trung bình {chartData.length} kỳ</span>
              <p className="text-base sm:text-lg font-bold text-slate-300 font-mono mt-0.5">
                {fmtValue(stats.avgVal, modalUnitDivider)}
              </p>
              <span className="text-[11px] text-slate-400">{modalUnitLabel}</span>
            </div>
          </div>
        )}

        {/* Toolbar chọn số kỳ hiển thị */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-300">Biểu đồ lịch sử ({modalUnitLabel})</span>
          <div className="flex items-center rounded-lg border border-slate-800 bg-[#171d2b] p-0.5 text-xs">
            {[8, 12, 16, 20, 0].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRangeCount(n)}
                className={cn(
                  "rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer text-[11px]",
                  rangeCount === n
                    ? "bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {n === 0 ? `Tất cả (${totalAvailable})` : `${n} kỳ`}
              </button>
            ))}
          </div>
        </div>

        {/* Khung Biểu đồ Recharts */}
        <div className="h-[320px] sm:h-[350px] w-full rounded-xl border border-slate-800/80 bg-[#0f141d] p-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                interval={chartData.length > 20 ? 1 : 0}
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: "#94a3b8" }}
                tickFormatter={(v) => fmtValue(v * modalUnitDivider, modalUnitDivider)}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <RechartsTooltip
                cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-700 bg-[#0f172a]/95 p-3 text-xs shadow-2xl backdrop-blur-md min-w-[200px]">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5 mb-2 font-bold">
                        <span className="text-sm font-extrabold text-teal-300">{d.period}</span>
                        <span className="text-[11px] text-slate-400 font-mono font-normal">Kỳ kết thúc {d.date}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6 py-0.5">
                        <span className="text-slate-400 font-medium">Giá trị:</span>
                        <span className="font-mono font-bold text-white text-[13.5px]">
                          {d.rawVal != null ? fmtValue(d.rawVal, modalUnitDivider) : "—"} {modalUnitLabel}
                        </span>
                      </div>
                      {d.qoq != null && (
                        <div className="flex items-center justify-between gap-6 py-0.5">
                          <span className="text-slate-400">Tăng QoQ:</span>
                          <span className={cn("font-mono font-bold", d.qoq > 0 ? "text-emerald-400" : d.qoq < 0 ? "text-rose-400" : "text-slate-400")}>
                            {d.qoq > 0 ? "+" : ""}{d.qoq.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {d.yoy != null && (
                        <div className="flex items-center justify-between gap-6 py-0.5">
                          <span className="text-slate-400">Tăng YoY:</span>
                          <span className={cn("font-mono font-bold", d.yoy > 0 ? "text-emerald-400" : d.yoy < 0 ? "text-rose-400" : "text-slate-400")}>
                            {d.yoy > 0 ? "+" : ""}{d.yoy.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="scaledVal" name={title} radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.rawVal != null && entry.rawVal < 0 ? "#f43f5e" : "#14b8a6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function FinancialStatementsExplorer({
  ticker,
  initialData,
  initialAnnualData,
  bctcDataHopNhat,
  bctcDataCongTyMe,
  onSelectTab,
}: FinancialStatementsExplorerProps) {
  const [activeTab, setActiveTab] = useState<FinancialTab>("cdkt");
  const [periodMode, setPeriodMode] = useState<"quarter" | "annual">("quarter");
  const [periodCount, setPeriodCount] = useState<number>(5);
  const [dateOffset, setDateOffset] = useState<number>(0);
  const [showYoY, setShowYoY] = useState<boolean>(false); // Mặc định tắt để bảng gọn gàng
  const [showQoQ, setShowQoQ] = useState<boolean>(false); // Mặc định tắt để bảng gọn gàng
  const [unit, setUnit] = useState<FinancialUnit>("mil"); // Mặc định 1.000.000 (Triệu đồng) khớp ảnh
  const [loading, setLoading] = useState<boolean>(false);
  const [chartModalItem, setChartModalItem] = useState<{
    title: string;
    allValues: (number | null)[];
  } | null>(null);

  // Modal hiển thị Thuyết minh BCTC khi người dùng click vào số liệu
  const [activeNoteModal, setActiveNoteModal] = useState<{
    isOpen: boolean;
    rowName: string;
    periodLabel: string;
    cellValueFormatted: string;
    noteHopNhat: BctcNoteItem | null;
    noteCongTyMe: BctcNoteItem | null;
    initialType: "HopNhat" | "CongTyMe";
  } | null>(null);

  const openNoteModal = (
    rowName: string,
    periodLabel: string,
    cellValueFormatted: string,
    noteHopNhat: BctcNoteItem | null,
    noteCongTyMe: BctcNoteItem | null
  ) => {
    setActiveNoteModal({
      isOpen: true,
      rowName,
      periodLabel,
      cellValueFormatted,
      noteHopNhat,
      noteCongTyMe,
      initialType: noteHopNhat ? "HopNhat" : "CongTyMe",
    });
  };

  // Cột đang được rê chuột (hover) để tô sáng đồng loạt các quý cùng kỳ
  const [hoveredColIdx, setHoveredColIdx] = useState<number | null>(null);

  const [quarterData, setQuarterData] = useState<RawFinancialStatementData | null>(initialData || null);
  const [annualData, setAnnualData] = useState<RawFinancialStatementData | null>(initialAnnualData || null);

  // Đồng bộ khi prop SSR thay đổi
  useEffect(() => {
    if (initialData && Array.isArray(initialData.fiscalDates) && initialData.fiscalDates.length > 0) {
      setQuarterData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (initialAnnualData && Array.isArray(initialAnnualData.fiscalDates) && initialAnnualData.fiscalDates.length > 0) {
      setAnnualData(initialAnnualData);
    }
  }, [initialAnnualData]);

  const statementData = periodMode === "quarter" ? quarterData : annualData;

  // Tải dữ liệu BCTC khi đổi mã hoặc đổi kỳ (quarter / annual) nếu chưa có trong cache
  useEffect(() => {
    const currentCached = periodMode === "quarter" ? quarterData : annualData;
    if (currentCached && Array.isArray(currentCached.fiscalDates) && currentCached.fiscalDates.length > 0) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setDateOffset(0);

    fetch(`/api/financials/${encodeURIComponent(ticker)}?period=${periodMode}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data && Array.isArray(data.fiscalDates) && data.fiscalDates.length > 0) {
            if (periodMode === "quarter") {
              setQuarterData(data);
            } else {
              setAnnualData(data);
            }
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải BCTC:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ticker, periodMode, quarterData, annualData]);

  // Reset offset khi đổi số kỳ
  useEffect(() => {
    setDateOffset(0);
  }, [periodCount]);

  // Danh sách toàn bộ các mốc thời gian từ API
  const allFiscalDates = statementData?.fiscalDates || [];

  // Tính toán khung cửa sổ thời gian (Pagination window)
  const count = periodCount === 0 ? allFiscalDates.length : periodCount;
  const maxOffset = Math.max(0, allFiscalDates.length - count);
  const currentOffset = Math.min(dateOffset, maxOffset);

  const endIndex = allFiscalDates.length - currentOffset;
  const startIndex = Math.max(0, endIndex - count);

  const selectedDates = useMemo(() => {
    return allFiscalDates.slice(startIndex, endIndex);
  }, [allFiscalDates, startIndex, endIndex]);

  // Xác định quý đang được hover (ví dụ "Q2" để tô sáng toàn bộ Q2.2024, Q2.2025, Q2.2026)
  const hoveredQuarter = useMemo(() => {
    if (periodMode !== "quarter" || hoveredColIdx == null || !selectedDates[hoveredColIdx]) {
      return null;
    }
    return getQuarterFromIso(selectedDates[hoveredColIdx]);
  }, [periodMode, hoveredColIdx, selectedDates]);

  const canGoBack = startIndex > 0;
  const canGoForward = currentOffset > 0;

  const handlePrevPeriods = () => {
    setDateOffset((prev) => Math.min(prev + 1, maxOffset));
  };

  const handleNextPeriods = () => {
    setDateOffset((prev) => Math.max(0, prev - 1));
  };

  // Lấy các dòng dữ liệu của tab hiện tại (cdkt, kqkd, lctt)
  const currentRows = useMemo(() => {
    if (!statementData) return [];
    if (activeTab === "cdkt") return statementData.cdkt || [];
    if (activeTab === "kqkd") return statementData.kqkd || [];
    if (activeTab === "lctt") return statementData.lctt || [];
    return [];
  }, [statementData, activeTab]);

  const [collapsedSet, setCollapsedSet] = useState<Set<number>>(new Set());

  // Cây phân cấp các chỉ tiêu BCTC
  const treeNodes = useMemo(() => {
    return buildStatementTree(currentRows, activeTab);
  }, [currentRows, activeTab]);

  // Reset trạng thái thu gọn khi chuyển tab (cdkt, kqkd, lctt)
  useEffect(() => {
    setCollapsedSet(new Set());
  }, [activeTab]);

  const toggleCollapse = (idx: number) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedSet(new Set());
  };

  const collapseAll = () => {
    const next = new Set<number>();
    treeNodes.forEach((node) => {
      if (node.hasChildren) {
        next.add(node.idx);
      }
    });
    setCollapsedSet(next);
  };

  const unitDivider =
    unit === "bil" ? 1_000_000_000 : unit === "mil" ? 1_000_000 : unit === "thou" ? 1_000 : 1;
  const unitLabel =
    unit === "bil" ? "1.000.000.000" : unit === "mil" ? "1.000.000" : unit === "thou" ? "1.000" : "1";

  // Xuất file CSV
  const handleExportCsv = () => {
    if (!selectedDates.length || !currentRows.length) return;

    const headers = ["Chỉ tiêu", ...selectedDates.map((d) => formatPeriodLabel(d, periodMode))];
    const rows = currentRows.map((row) => {
      const name = row[0];
      const vals = (row.slice(3) as (number | null)[]).slice(startIndex, endIndex);
      const formattedVals = vals.map((v) => (v != null ? (v / unitDivider).toFixed(2) : ""));
      return [`"${name.replace(/"/g, '""')}"`, ...formattedVals];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${ticker}_BCTC_${activeTab.toUpperCase()}_${periodMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-[#12161f] p-2.5 sm:p-3 shadow-sm" style={RUATICHSAN_FONT_STYLE}>
      {/* ── THANH ĐIỀU HƯỚNG TAB & CÔNG CỤ (TỐI GIẢN 1 DÒNG DUY NHẤT) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        {/* 4 SUB-TABS: Cân Đối Kế Toán | Kết Quả Kinh Doanh | Lưu Chuyển Tiền Tệ | Chỉ Số Tài Chính */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("cdkt")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "cdkt"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-slate-800/80 bg-[#1b222d] text-slate-400 hover:text-slate-200"
            )}
          >
            Cân Đối Kế Toán
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kqkd")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "kqkd"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-slate-800/80 bg-[#1b222d] text-slate-400 hover:text-slate-200"
            )}
          >
            Kết Quả Kinh Doanh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lctt")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "lctt"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-slate-800/80 bg-[#1b222d] text-slate-400 hover:text-slate-200"
            )}
          >
            Lưu Chuyển Tiền Tệ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ratios")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "ratios"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-slate-800/80 bg-[#1b222d] text-slate-400 hover:text-slate-200"
            )}
          >
            <span>Chỉ Số Tài Chính</span>
            <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Đầy Đủ
            </span>
          </button>

          {/* Gợi ý tính năng xem Thuyết minh khi bấm số liệu */}
          {(bctcDataHopNhat?.hasReport || bctcDataCongTyMe?.hasReport) && (
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium ml-2 shadow-2xs">
              <FileSpreadsheet className="size-3.5" />
              <span>Có Thuyết minh: Bấm vào số liệu để xem chi tiết</span>
            </div>
          )}
        </div>

        {/* Các công cụ phụ bên phải: Mở hết/Gọn hết, Số kỳ, QoQ/YoY, Xuất Excel */}
        {activeTab !== "ratios" && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={expandAll}
                className="rounded px-2 py-1 text-[11px] font-semibold bg-[#1b222d] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 cursor-pointer transition-colors"
                title="Mở rộng tất cả các danh mục"
              >
                + Mở hết
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded px-2 py-1 text-[11px] font-semibold bg-[#1b222d] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 cursor-pointer transition-colors"
                title="Thu gọn tất cả các danh mục"
              >
                - Gọn hết
              </button>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[11.5px]">Số kỳ:</span>
              <select
                value={periodCount}
                onChange={(e) => setPeriodCount(Number(e.target.value))}
                className="h-6.5 rounded border border-slate-700 bg-[#1b222d] px-1.5 text-xs font-semibold text-slate-200 outline-none hover:border-slate-500 cursor-pointer"
              >
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={0}>Tất cả ({allFiscalDates.length})</option>
              </select>
            </div>

            {periodMode === "quarter" && (
              <button
                type="button"
                onClick={() => setShowQoQ(!showQoQ)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold border transition-all cursor-pointer",
                  showQoQ
                    ? "border-purple-500 bg-purple-600 text-white"
                    : "border-slate-700 bg-[#1b222d] text-slate-400 hover:text-purple-300 hover:border-purple-500/40"
                )}
                title="Bật/Tắt dòng % tăng trưởng QoQ"
              >
                QoQ
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowYoY(!showYoY)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-semibold border transition-all cursor-pointer",
                showYoY
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-slate-700 bg-[#1b222d] text-slate-400 hover:text-sky-300 hover:border-sky-500/40"
              )}
              title="Bật/Tắt dòng % tăng trưởng YoY"
            >
              YoY
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || !currentRows.length}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold text-slate-300 bg-[#1b222d] border border-slate-700 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-slate-700/60 disabled:opacity-40 cursor-pointer transition-colors"
              title="Xuất file Excel CSV"
            >
              <Download className="size-3" />
              <span>Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* ── BẢNG BCTC CHÍNH HOẶC DASHBOARD CHỈ SỐ TÀI CHÍNH ── */}
      {activeTab === "ratios" ? (
        <WiDataFinancialRatiosDashboard ticker={ticker} />
      ) : loading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">
          <div className="inline-block size-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Đang tải dữ liệu Báo Cáo Tài Chính ({periodMode === "quarter" ? "Quý" : "Năm"})...</p>
        </div>
      ) : currentRows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#141922] p-12 text-center text-sm text-muted-foreground">
          <TableIcon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Không có dữ liệu Báo Cáo Tài Chính cho kỳ này</p>
          <p className="text-xs mt-1">Dữ liệu BCTC đang được cập nhật hoặc mã cổ phiếu chưa công bố.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetch(`/api/financials/${encodeURIComponent(ticker)}?period=${periodMode}`)
                .then((res) => res.json())
                .then((data) => {
                  if (data && Array.isArray(data.fiscalDates) && data.fiscalDates.length > 0) {
                    if (periodMode === "quarter") setQuarterData(data);
                    else setAnnualData(data);
                  }
                  setLoading(false);
                })
                .catch(() => setLoading(false));
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          >
            Tải lại dữ liệu
          </button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#141922] shadow-sm">
          <div className="overflow-x-auto">
            <table
              onMouseLeave={() => setHoveredColIdx(null)}
              className="w-full text-left border-collapse select-none"
              style={RUATICHSAN_FONT_STYLE}
            >
              <thead>
                <tr className="sticky top-0 z-20 bg-[#161c24] text-slate-300 border-b border-slate-700/70">
                  {/* Cột 1: Controls (◀, ▶, Theo quý, 1.000.000) */}
                  <th className="py-2 px-3 sticky left-0 z-30 bg-[#161c24] border-r border-slate-700/60 min-w-[280px] sm:min-w-[340px]">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={handlePrevPeriods}
                          disabled={!canGoBack}
                          className="size-6.5 rounded flex items-center justify-center bg-[#252f3f] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title={periodMode === "quarter" ? "Lùi về 1 quý trước" : "Lùi về 1 năm trước"}
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextPeriods}
                          disabled={!canGoForward}
                          className="size-6.5 rounded flex items-center justify-center bg-[#252f3f] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title={periodMode === "quarter" ? "Tiến tới 1 quý sau" : "Tiến tới 1 năm sau"}
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>

                      <div className="relative">
                        <select
                          value={periodMode}
                          onChange={(e) => setPeriodMode(e.target.value as "quarter" | "annual")}
                          className="h-6.5 appearance-none rounded border border-slate-700 bg-[#252f3f] pl-2.5 pr-6 text-xs font-semibold text-slate-200 outline-none hover:border-slate-500 cursor-pointer"
                        >
                          <option value="quarter">Theo quý</option>
                          <option value="annual">Theo năm</option>
                        </select>
                        <ChevronsUpDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative">
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value as FinancialUnit)}
                          className="h-6.5 appearance-none rounded border border-slate-700 bg-[#252f3f] pl-2.5 pr-6 text-xs font-semibold text-slate-200 outline-none hover:border-slate-500 cursor-pointer"
                        >
                          <option value="bil">1.000.000.000</option>
                          <option value="mil">1.000.000</option>
                          <option value="thou">1.000</option>
                          <option value="one">1</option>
                        </select>
                        <ChevronsUpDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </th>

                  {/* Cột 2: Header cho Sparkline */}
                  <th
                    className="w-[48px] min-w-[48px] max-w-[48px] py-2 px-1 text-center bg-[#161c24] border-b border-slate-700/70 font-normal"
                    title="Biểu đồ xu hướng (Bấm vào cột để phóng to biểu đồ chi tiết)"
                  >
                    {/* Empty matching screenshot */}
                  </th>

                  {/* Cột 3..N: Các quý */}
                  {selectedDates.map((dateStr, idx) => {
                    const isLatest = idx === selectedDates.length - 1 && currentOffset === 0;
                    const colQuarter = periodMode === "quarter" ? getQuarterFromIso(dateStr) : null;
                    const isDirectHover = hoveredColIdx === idx;
                    const isSameQuarterHover = hoveredQuarter != null && colQuarter === hoveredQuarter;

                    const thHighlightStyle: React.CSSProperties = {
                      ...RUATICHSAN_FONT_STYLE,
                      backgroundColor: isDirectHover
                        ? "rgba(14, 165, 233, 0.32)"
                        : isSameQuarterHover
                        ? "rgba(14, 165, 233, 0.18)"
                        : isLatest
                        ? "rgba(14, 165, 233, 0.08)"
                        : undefined,
                      borderBottom: isDirectHover
                        ? "2.5px solid rgb(56, 189, 248)"
                        : isSameQuarterHover
                        ? "2px solid rgba(56, 189, 248, 0.75)"
                        : isLatest
                        ? "2px solid rgba(56, 189, 248, 0.5)"
                        : undefined,
                    };

                    return (
                      <th
                        key={dateStr}
                        onMouseEnter={() => setHoveredColIdx(idx)}
                        style={thHighlightStyle}
                        className={cn(
                          "w-[92px] sm:w-[100px] min-w-[85px] max-w-[110px] px-2.5 sm:px-3 py-2 text-right whitespace-nowrap text-xs sm:text-[13px] font-bold cursor-pointer transition-colors select-none tracking-tight",
                          (isDirectHover || isSameQuarterHover || isLatest)
                            ? "text-sky-200 font-bold"
                            : "text-slate-200 hover:text-white"
                        )}
                        title={`Xem so sánh cùng kỳ ${formatPeriodLabel(dateStr, periodMode)}`}
                      >
                        {formatPeriodLabel(dateStr, periodMode)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {treeNodes.map((node) => {
                  const rIdx = node.idx;
                  const row = node.row;

                  // Ẩn nếu tổ tiên bị thu gọn
                  let isHidden = false;
                  let curParent = node.parentId;
                  while (curParent != null) {
                    if (collapsedSet.has(curParent)) {
                      isHidden = true;
                      break;
                    }
                    curParent = treeNodes[curParent]?.parentId ?? null;
                  }
                  if (isHidden) return null;

                  const isCollapsed = collapsedSet.has(node.idx);
                  const rowCode = String(row[2] || rIdx);
                  const allValues = (row.slice(3) as (number | null)[]);
                  const values = allValues.slice(startIndex, endIndex);

                  const isMajor = node.level === 0;
                  const isSub = node.level === 1;

                  // Background theo cấp bậc khớp ảnh tham khảo:
                  // Level 0: dark header (#161c24)
                  // Level 1: slate navy header (#252f3f)
                  // Level 2+: #1b222d
                  const rowBgClass = isMajor
                    ? "bg-[#161c24] hover:bg-[#1f2633]"
                    : isSub
                    ? "bg-[#252f3f] hover:bg-[#2d384c]"
                    : "bg-[#1b222d] hover:bg-[#222938]";

                  const stickyBgClass = isMajor
                    ? "bg-[#161c24] group-hover:bg-[#1f2633]"
                    : isSub
                    ? "bg-[#252f3f] group-hover:bg-[#2d384c]"
                    : "bg-[#1b222d] group-hover:bg-[#222938]";

                  // Thụt lề theo cấp bậc (indentation)
                  const padLeftClass =
                    node.level === 0
                      ? "pl-2.5 sm:pl-3"
                      : node.level === 1
                      ? "pl-5 sm:pl-6"
                      : node.level === 2
                      ? "pl-8 sm:pl-9"
                      : "pl-11 sm:pl-12";

                  const subRowPadLeft =
                    node.level === 0
                      ? "pl-7 sm:pl-8"
                      : node.level === 1
                      ? "pl-10 sm:pl-11"
                      : node.level === 2
                      ? "pl-13 sm:pl-14"
                      : "pl-16 sm:pl-17";

                  const isLatestColumn = (cIdx: number) => cIdx === values.length - 1 && currentOffset === 0;

                  // Ánh xạ Thuyết minh tương ứng cho chỉ tiêu này (Hợp nhất hoặc Công ty mẹ)
                  const noteHopNhat = findMatchingNote(node.displayName || node.name, activeTab, bctcDataHopNhat?.notes);
                  const noteCongTyMe = findMatchingNote(node.displayName || node.name, activeTab, bctcDataCongTyMe?.notes);
                  const matchedNote = noteHopNhat || noteCongTyMe;
                  const isClickableNote = Boolean(matchedNote);

                  return (
                    <Fragment key={rowCode}>
                      {/* 1. DÒNG CHÍNH */}
                      <tr className={cn("group transition-colors", rowBgClass)}>
                        {/* Cột tiêu chí (Sticky Left) */}
                        <td
                          className={cn(
                            "py-2 sm:py-2.5 pr-2 sticky left-0 z-10 border-r border-slate-700/60 shadow-[2px_0_5px_rgba(0,0,0,0.12)] transition-colors min-w-[280px] sm:min-w-[340px]",
                            stickyBgClass,
                            padLeftClass
                          )}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Nút Toggle [+] / [-] */}
                            {node.hasChildren ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCollapse(node.idx);
                                }}
                                className="size-4.5 rounded flex items-center justify-center font-bold text-slate-300 hover:text-white hover:bg-slate-700/60 cursor-pointer shrink-0 select-none transition-colors"
                                title={isCollapsed ? "Mở rộng danh mục này" : "Thu gọn danh mục này"}
                              >
                                <span
                                  className={cn(
                                    "text-[13px] font-bold leading-none select-none",
                                    isCollapsed ? "text-emerald-400" : "text-slate-400"
                                  )}
                                >
                                  {isCollapsed ? "+" : "−"}
                                </span>
                              </button>
                            ) : (
                              <span className="size-4.5 shrink-0 inline-block" />
                            )}

                            <span
                              onClick={() => node.hasChildren && toggleCollapse(node.idx)}
                              className={cn(
                                "truncate",
                                node.hasChildren && "cursor-pointer select-none",
                                isMajor && "uppercase tracking-wide text-xs sm:text-[13px] font-black text-slate-100",
                                !isMajor && isSub && "text-[12.5px] sm:text-[13px] font-bold text-white",
                                !isMajor && !isSub && node.level === 2 && "text-[12px] sm:text-[12.5px] font-semibold text-slate-200",
                                !isMajor && !isSub && node.level > 2 && "text-[11.5px] sm:text-[12px] text-slate-300"
                              )}
                              title={node.displayName}
                            >
                              {node.displayName}
                            </span>

                            {/* Badge Thuyết minh BCTC nếu có */}
                            {matchedNote && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const latestPeriod = selectedDates.length > 0
                                    ? formatPeriodLabel(selectedDates[selectedDates.length - 1], periodMode)
                                    : "";
                                  const latestVal = values.length > 0 ? fmtValue(values[values.length - 1], unitDivider) : "—";
                                  openNoteModal(
                                    node.displayName,
                                    latestPeriod,
                                    latestVal,
                                    noteHopNhat,
                                    noteCongTyMe
                                  );
                                }}
                                className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-300 transition-colors shrink-0 cursor-pointer shadow-2xs"
                                title={`Xem Thuyết minh BCTC: ${matchedNote.rawTitle || matchedNote.title}`}
                              >
                                <span>{getNoteShortBadge(matchedNote)}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Cột Biểu đồ xu hướng Sparkline */}
                        {(() => {
                          const hasAnyData = allValues.some((v) => v != null && v !== 0);
                          return (
                            <td
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasAnyData) {
                                  setChartModalItem({
                                    title: node.displayName,
                                    allValues,
                                  });
                                }
                              }}
                              className={cn(
                                "w-[48px] min-w-[48px] max-w-[48px] px-1 py-2 sm:py-2.5 text-center align-middle transition-colors select-none",
                                hasAnyData && "cursor-pointer hover:bg-teal-500/20 group/spark"
                              )}
                              title={
                                hasAnyData
                                  ? `Bấm để phóng to biểu đồ chi tiết: ${node.displayName}`
                                  : undefined
                              }
                            >
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center transition-transform duration-150",
                                  hasAnyData && "group-hover/spark:scale-125"
                                )}
                              >
                                <MiniTrendSparkline values={values} />
                              </div>
                            </td>
                          );
                        })()}

                        {/* Các cột số liệu theo kỳ */}
                        {values.map((val, cIdx) => {
                          const formatted = fmtValue(val, unitDivider);
                          const isLatest = isLatestColumn(cIdx);
                          const colDate = selectedDates[cIdx];
                          const colQuarter = periodMode === "quarter" ? getQuarterFromIso(colDate) : null;
                          const isDirectHover = hoveredColIdx === cIdx;
                          const isSameQuarterHover = hoveredQuarter != null && colQuarter === hoveredQuarter;

                          const cellStyle: React.CSSProperties = {
                            backgroundColor: isDirectHover
                              ? "rgba(14, 165, 233, 0.28)"
                              : isSameQuarterHover
                              ? "rgba(14, 165, 233, 0.15)"
                              : isLatest
                              ? "rgba(14, 165, 233, 0.04)"
                              : undefined,
                            boxShadow: isDirectHover
                              ? "inset 1px 0 0 rgba(56, 189, 248, 0.35), inset -1px 0 0 rgba(56, 189, 248, 0.35)"
                              : isSameQuarterHover
                              ? "inset 1px 0 0 rgba(56, 189, 248, 0.18), inset -1px 0 0 rgba(56, 189, 248, 0.18)"
                              : undefined,
                          };

                          return (
                            <td
                              key={cIdx}
                              onMouseEnter={() => setHoveredColIdx(cIdx)}
                              onClick={() => {
                                if (isClickableNote) {
                                  const periodLbl = formatPeriodLabel(colDate, periodMode);
                                  openNoteModal(
                                    node.displayName,
                                    periodLbl,
                                    formatted,
                                    noteHopNhat,
                                    noteCongTyMe
                                  );
                                }
                              }}
                              style={cellStyle}
                              title={
                                isClickableNote
                                  ? `Bấm để xem Thuyết minh (${formatPeriodLabel(colDate, periodMode)}): ${matchedNote?.rawTitle || matchedNote?.title}`
                                  : undefined
                              }
                              className={cn(
                                "w-[92px] sm:w-[100px] min-w-[85px] max-w-[110px] px-2.5 sm:px-3 py-2 sm:py-2.5 text-right whitespace-nowrap align-middle font-mono tabular-nums tracking-tight transition-colors text-[13px] sm:text-[13.5px]",
                                isClickableNote && "cursor-pointer hover:bg-emerald-500/20 active:bg-emerald-500/30 select-none group/num"
                              )}
                            >
                              {val == null ? (
                                <span className="text-slate-600 font-sans">—</span>
                              ) : val === 0 ? (
                                <span className="text-slate-500 font-normal">0</span>
                              ) : val < 0 ? (
                                <span
                                  className={cn(
                                    "text-rose-400 font-semibold",
                                    isMajor && "font-bold text-[14px]",
                                    isClickableNote && "group-hover/num:underline underline-offset-2"
                                  )}
                                >
                                  {formatted}
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    isMajor || isSub ? "font-bold text-white" : "font-semibold text-slate-100",
                                    (isDirectHover || isSameQuarterHover) && "text-sky-200 font-bold",
                                    isClickableNote && "group-hover/num:underline underline-offset-2"
                                  )}
                                >
                                  {formatted}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* 2. DÒNG CON TĂNG TRƯỞNG QoQ */}
                      {showQoQ && periodMode === "quarter" && (
                        <tr className="group transition-colors border-b border-slate-800/80 bg-purple-950/20 hover:bg-purple-950/30">
                          <td
                            className={cn(
                              "py-1.5 pr-2 sticky left-0 z-10 bg-[#1e1b2e] border-r border-slate-700/60 shadow-[2px_0_5px_rgba(0,0,0,0.12)]",
                              subRowPadLeft
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-600 tracking-wider text-xs">......</span>
                              <Activity className="size-3 text-purple-400 shrink-0" />
                              <span className="font-bold text-purple-300 text-[11px] sm:text-xs">QoQ</span>
                            </div>
                          </td>
                          <td className="w-[48px] min-w-[48px] max-w-[48px] px-1 py-1.5 text-center align-middle" />
                          {values.map((val, cIdx) => {
                            const globalIdx = startIndex + cIdx;
                            const prevQoQVal = globalIdx > 0 ? allValues[globalIdx - 1] : null;
                            const qoq = calcGrowth(val, prevQoQVal);
                            return (
                              <td
                                key={cIdx}
                                className="w-[92px] sm:w-[100px] min-w-[85px] max-w-[110px] px-2.5 sm:px-3 py-1.5 text-right whitespace-nowrap align-middle font-mono tabular-nums tracking-tight text-xs transition-colors"
                              >
                                {qoq != null ? (
                                  <span className={cn("font-semibold", qoq > 0 ? "text-emerald-400" : qoq < 0 ? "text-rose-400" : "text-slate-500")}>
                                    {qoq > 0 ? "+" : ""}
                                    {qoq.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-sans">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* 3. DÒNG CON TĂNG TRƯỞNG YoY */}
                      {showYoY && (
                        <tr className="group transition-colors border-b border-slate-800/80 bg-sky-950/20 hover:bg-sky-950/30">
                          <td
                            className={cn(
                              "py-1.5 pr-2 sticky left-0 z-10 bg-[#172230] border-r border-slate-700/60 shadow-[2px_0_5px_rgba(0,0,0,0.12)]",
                              subRowPadLeft
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-600 tracking-wider text-xs">......</span>
                              <Activity className="size-3 text-sky-400 shrink-0" />
                              <span className="font-bold text-sky-300 text-[11px] sm:text-xs">YoY</span>
                            </div>
                          </td>
                          <td className="w-[48px] min-w-[48px] max-w-[48px] px-1 py-1.5 text-center align-middle" />
                          {values.map((val, cIdx) => {
                            const globalIdx = startIndex + cIdx;
                            const yoyOffset = periodMode === "quarter" ? 4 : 1;
                            const prevYoYVal = globalIdx >= yoyOffset ? allValues[globalIdx - yoyOffset] : null;
                            const yoy = calcGrowth(val, prevYoYVal);
                            return (
                              <td
                                key={cIdx}
                                className="w-[92px] sm:w-[100px] min-w-[85px] max-w-[110px] px-2.5 sm:px-3 py-1.5 text-right whitespace-nowrap align-middle font-mono tabular-nums tracking-tight text-xs transition-colors"
                              >
                                {yoy != null ? (
                                  <span className={cn("font-semibold", yoy > 0 ? "text-emerald-400" : yoy < 0 ? "text-rose-400" : "text-slate-500")}>
                                    {yoy > 0 ? "+" : ""}
                                    {yoy.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-sans">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {chartModalItem && (
        <FinancialItemChartModal
          ticker={ticker}
          title={chartModalItem.title}
          allValues={chartModalItem.allValues}
          allFiscalDates={allFiscalDates}
          initialUnit={unit}
          periodMode={periodMode}
          onClose={() => setChartModalItem(null)}
        />
      )}

      {activeNoteModal && (
        <FinancialNoteModal
          isOpen={activeNoteModal.isOpen}
          onClose={() => setActiveNoteModal(null)}
          ticker={ticker}
          rowName={activeNoteModal.rowName}
          periodLabel={activeNoteModal.periodLabel}
          cellValueFormatted={activeNoteModal.cellValueFormatted}
          noteHopNhat={activeNoteModal.noteHopNhat}
          noteCongTyMe={activeNoteModal.noteCongTyMe}
          initialReportType={activeNoteModal.initialType}
          hasHopNhat={Boolean(bctcDataHopNhat?.hasReport)}
          hasCongTyMe={Boolean(bctcDataCongTyMe?.hasReport)}
          onNavigateToFullReport={(type, secNum) => {
            if (onSelectTab) {
              onSelectTab("bctc");
            }
          }}
        />
      )}
    </div>
  );
}
