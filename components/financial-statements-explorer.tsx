"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import {
  FileSpreadsheet,
  Download,
  Activity,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StockFinancialYear } from "@/lib/longlivestock";
import type { RawFinancialStatementData } from "@/lib/financial-statements-db";

export type FinancialTab = "cdkt" | "kqkd" | "lctt";

interface FinancialStatementsExplorerProps {
  ticker: string;
  financials?: StockFinancialYear[];
  initialData?: RawFinancialStatementData | null;
  detailedSnapshot?: any;
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

  return `${q}.${year}`;
}

function fmtValue(val: number | null | undefined, unitDivider = 1_000_000_000): string {
  if (val == null || isNaN(Number(val))) return "—";
  const num = Number(val) / unitDivider;
  if (num === 0) return "0";
  const abs = Math.abs(num);
  const hasDec = abs < 100 ? Math.round(abs * 10) % 10 !== 0 : Math.round(abs * 10) % 10 !== 0 && abs < 1000;
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: hasDec ? 1 : 0,
    maximumFractionDigits: 1,
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

export function FinancialStatementsExplorer({
  ticker,
  initialData,
}: FinancialStatementsExplorerProps) {
  const [activeTab, setActiveTab] = useState<FinancialTab>("cdkt");
  const [periodMode, setPeriodMode] = useState<"quarter" | "annual">("quarter");
  const [periodCount, setPeriodCount] = useState<number>(12);
  const [dateOffset, setDateOffset] = useState<number>(0);
  const [showYoY, setShowYoY] = useState<boolean>(true); // Bật sẵn theo style ruatichsan
  const [showQoQ, setShowQoQ] = useState<boolean>(true); // Bật sẵn theo style ruatichsan
  const [unit, setUnit] = useState<"bil" | "mil">("bil"); // Tỷ đồng vs Triệu đồng
  const [loading, setLoading] = useState<boolean>(false);

  // Cột đang được rê chuột (hover) để tô sáng đồng loạt các quý cùng kỳ
  const [hoveredColIdx, setHoveredColIdx] = useState<number | null>(null);

  const [statementData, setStatementData] = useState<RawFinancialStatementData | null>(initialData || null);

  // Tải dữ liệu BCTC khi đổi mã hoặc đổi kỳ (quarter / annual)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setDateOffset(0);

    fetch(`/api/financials/${encodeURIComponent(ticker)}?period=${periodMode}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data && Array.isArray(data.fiscalDates)) {
            setStatementData(data);
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
  }, [ticker, periodMode]);

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
    const step = Math.min(4, count || 4);
    setDateOffset((prev) => Math.min(prev + step, maxOffset));
  };

  const handleNextPeriods = () => {
    const step = Math.min(4, count || 4);
    setDateOffset((prev) => Math.max(0, prev - step));
  };

  // Lấy các dòng dữ liệu của tab hiện tại (cdkt, kqkd, lctt)
  const currentRows = useMemo(() => {
    if (!statementData) return [];
    if (activeTab === "cdkt") return statementData.cdkt || [];
    if (activeTab === "kqkd") return statementData.kqkd || [];
    if (activeTab === "lctt") return statementData.lctt || [];
    return [];
  }, [statementData, activeTab]);

  const unitDivider = unit === "bil" ? 1_000_000_000 : 1_000_000;
  const unitLabel = unit === "bil" ? "Tỷ đồng" : "Triệu đồng";

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

  // Xác định khoảng thời gian hiển thị (VD: Q3.2023 - Q2.2026)
  const rangeDisplay = useMemo(() => {
    if (!selectedDates.length) return "";
    const first = formatPeriodLabel(selectedDates[0], periodMode);
    const last = formatPeriodLabel(selectedDates[selectedDates.length - 1], periodMode);
    return `${first} — ${last}`;
  }, [selectedDates, periodMode]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm" style={RUATICHSAN_FONT_STYLE}>
      {/* ── HEADER & BỘ ĐIỀU KHIỂN CHÍNH ── */}
      <div className="flex flex-col gap-3.5 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Title & Ticker Badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Báo Cáo Tài Chính Chi Tiết</h3>
                <span className="rounded bg-primary/15 px-2 py-0.5 font-semibold text-xs text-primary">
                  {ticker}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Chuẩn mực kế toán VAS · Lịch sử 34 Quý / 16 Năm · Rê chuột vào cột quý để so sánh cùng kỳ
              </p>
            </div>
          </div>

          {/* Công cụ bên phải: Đổi đơn vị & Xuất CSV */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUnit("bil")}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                  unit === "bil" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tỷ đồng
              </button>
              <button
                type="button"
                onClick={() => setUnit("mil")}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                  unit === "mil" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Triệu đồng
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || !currentRows.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-40 cursor-pointer shadow-2xs"
              title="Xuất file Excel CSV"
            >
              <Download className="size-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* TOOLBAR: Mode Quý/Năm, Số Kỳ, Điều hướng < >, Nút QoQ & YoY chuẩn ruatichsan */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Cụm Quý / Năm, Số Kỳ & Bộ Điều Hướng < > */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chế độ Theo Năm / Theo Quý */}
            <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPeriodMode("annual")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer",
                  periodMode === "annual" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Theo năm
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode("quarter")}
                className={cn(
                  "rounded-lg px-3 py-1.5 transition-colors cursor-pointer",
                  periodMode === "quarter" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Theo quý
              </button>
            </div>

            {/* Dropdown Số kỳ */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium">Số kỳ:</span>
              <select
                value={periodCount}
                onChange={(e) => setPeriodCount(Number(e.target.value))}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold text-foreground outline-none cursor-pointer hover:border-emerald-500/50"
              >
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={20}>20</option>
                <option value={0}>Tất cả ({allFiscalDates.length})</option>
              </select>
            </div>

            {/* Bộ điều hướng khoảng thời gian < [ Q3.2023 — Q2.2026 ] > */}
            {rangeDisplay && (
              <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={handlePrevPeriods}
                  disabled={!canGoBack}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Lùi về các kỳ trước trong quá khứ"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="px-2.5 font-bold text-[11px] text-foreground select-none">
                  {rangeDisplay}
                </span>
                <button
                  type="button"
                  onClick={handleNextPeriods}
                  disabled={!canGoForward}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Tiến tới các kỳ gần đây"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Nút Toggle Tăng trưởng QoQ & YoY phong cách Ruatichsan */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {periodMode === "quarter" && (
              <button
                type="button"
                onClick={() => setShowQoQ(!showQoQ)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition-all cursor-pointer shadow-2xs",
                  showQoQ
                    ? "border-purple-500 bg-purple-600 text-white font-bold shadow-sm ring-2 ring-purple-500/20"
                    : "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                )}
                title="Bật/Tắt dòng hiển thị tăng trưởng so với quý trước"
              >
                <Activity className="size-3.5" />
                <span>Tăng trưởng QoQ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowYoY(!showYoY)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition-all cursor-pointer shadow-2xs",
                showYoY
                  ? "border-sky-500 bg-sky-600 text-white font-bold shadow-sm ring-2 ring-sky-500/20"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
              )}
              title="Bật/Tắt dòng hiển thị tăng trưởng so với cùng kỳ năm trước"
            >
              <Activity className="size-3.5" />
              <span>Tăng trưởng YoY</span>
            </button>
          </div>
        </div>

        {/* 3 SUB-TABS: Cân Đối Kế Toán | Kết Quả Kinh Doanh | Lưu Chuyển Tiền Tệ */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("cdkt")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "cdkt"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Cân Đối Kế Toán
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kqkd")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "kqkd"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Kết Quả Kinh Doanh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lctt")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "lctt"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Lưu Chuyển Tiền Tệ
          </button>
        </div>
      </div>

      {/* ── BẢNG BCTC CHÍNH (TÔ SÁNG LIỀN MẠCH 100% QUA INLINE STYLES) ── */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">
          <div className="inline-block size-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Đang tải dữ liệu Báo Cáo Tài Chính ({periodMode === "quarter" ? "Quý" : "Năm"})...</p>
        </div>
      ) : currentRows.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center text-sm text-muted-foreground">
          <TableIcon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Không có dữ liệu Báo Cáo Tài Chính cho kỳ này</p>
          <p className="text-xs mt-1">Dữ liệu BCTC đang được cập nhật hoặc mã cổ phiếu chưa công bố.</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table
              onMouseLeave={() => setHoveredColIdx(null)}
              className="w-full text-left text-xs border-collapse"
              style={RUATICHSAN_FONT_STYLE}
            >
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-20">
                  <th className="py-3 pl-4 pr-3 min-w-[280px] max-w-[340px] sticky left-0 z-30 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between">
                      <span>Tiêu chí ({unitLabel})</span>
                    </div>
                  </th>
                  {selectedDates.map((dateStr, idx) => {
                    const isLatest = idx === selectedDates.length - 1 && currentOffset === 0;
                    const colQuarter = periodMode === "quarter" ? getQuarterFromIso(dateStr) : null;
                    const isDirectHover = hoveredColIdx === idx;
                    const isSameQuarterHover = hoveredQuarter != null && colQuarter === hoveredQuarter;

                    // Inline style trực tiếp đảm bảo 100% hiển thị màu không bị Tailwind nuốt
                    const thHighlightStyle: React.CSSProperties = {
                      ...RUATICHSAN_FONT_STYLE,
                      backgroundColor: isDirectHover
                        ? "rgba(14, 165, 233, 0.32)"
                        : isSameQuarterHover
                        ? "rgba(14, 165, 233, 0.18)"
                        : isLatest
                        ? "rgba(14, 165, 233, 0.07)"
                        : undefined,
                      borderBottom: isDirectHover
                        ? "2.5px solid rgb(56, 189, 248)"
                        : isSameQuarterHover
                        ? "2px solid rgba(56, 189, 248, 0.75)"
                        : isLatest
                        ? "2px solid rgba(56, 189, 248, 0.5)"
                        : undefined,
                      boxShadow: isDirectHover
                        ? "inset 1px 0 0 rgba(56, 189, 248, 0.35), inset -1px 0 0 rgba(56, 189, 248, 0.35)"
                        : isSameQuarterHover
                        ? "inset 1px 0 0 rgba(56, 189, 248, 0.2), inset -1px 0 0 rgba(56, 189, 248, 0.2)"
                        : undefined,
                    };

                    return (
                      <th
                        key={dateStr}
                        onMouseEnter={() => setHoveredColIdx(idx)}
                        style={thHighlightStyle}
                        className={cn(
                          "px-3 py-2.5 text-right whitespace-nowrap min-w-[105px] text-xs cursor-pointer transition-colors select-none",
                          (isDirectHover || isSameQuarterHover || isLatest) ? "text-sky-200 font-bold" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={`Xem so sánh cùng kỳ ${formatPeriodLabel(dateStr, periodMode)}`}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {isSameQuarterHover && (
                            <span className="size-1.5 rounded-full bg-sky-400 shrink-0 shadow-sm animate-pulse" />
                          )}
                          <span>{formatPeriodLabel(dateStr, periodMode)}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25">
                {currentRows.map((row, rIdx) => {
                  const name = String(row[0] || "");
                  const level = Number(row[1]) || 0;
                  const rowCode = String(row[2] || rIdx);
                  const allValues = (row.slice(3) as (number | null)[]);
                  const values = allValues.slice(startIndex, endIndex);

                  const isMajor = level === 0;
                  const isSub = level === 1;

                  // Thụt lề theo cấp bậc (indentation)
                  const padLeftClass =
                    level === 0 ? "pl-4" :
                    level === 1 ? "pl-7" :
                    level === 2 ? "pl-10" : "pl-13";

                  const subRowPadLeft =
                    level === 0 ? "pl-7" :
                    level === 1 ? "pl-10" :
                    level === 2 ? "pl-13" : "pl-16";

                  const isLatestColumn = (cIdx: number) => cIdx === values.length - 1 && currentOffset === 0;

                  return (
                    <Fragment key={rowCode}>
                      {/* 1. DÒNG CHÍNH: SỐ LIỆU TUYỆT ĐỐI */}
                      <tr
                        className={cn(
                          "group transition-colors",
                          isMajor
                            ? "bg-muted/20 font-bold text-foreground"
                            : isSub
                            ? "hover:bg-muted/10 text-foreground/90 font-medium"
                            : "hover:bg-muted/5 text-muted-foreground font-normal"
                        )}
                      >
                        {/* Cột tiêu chí (Cố định Sticky Left) */}
                        <td
                          className={cn(
                            "py-2 pr-3 sticky left-0 z-10 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.04)] group-hover:bg-muted/20 transition-colors",
                            padLeftClass
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {isMajor && (
                              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                            {!isMajor && isSub && (
                              <span className="size-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            )}
                            <span
                              className={cn(
                                "truncate",
                                isMajor && "uppercase tracking-wide text-foreground text-[11.5px] font-bold",
                                !isMajor && isSub && "text-[12px] font-medium text-slate-200",
                                !isMajor && !isSub && "text-[12px] text-slate-400"
                              )}
                              title={name}
                            >
                              {name}
                            </span>
                          </div>
                        </td>

                        {/* Các cột số liệu theo kỳ */}
                        {values.map((val, cIdx) => {
                          const formatted = fmtValue(val, unitDivider);
                          const isLatest = isLatestColumn(cIdx);
                          const colDate = selectedDates[cIdx];
                          const colQuarter = periodMode === "quarter" ? getQuarterFromIso(colDate) : null;
                          const isDirectHover = hoveredColIdx === cIdx;
                          const isSameQuarterHover = hoveredQuarter != null && colQuarter === hoveredQuarter;

                          // Inline style cho từng ô dữ liệu
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
                              style={cellStyle}
                              className="px-3 py-2 text-right whitespace-nowrap align-middle text-[12.5px] transition-colors"
                            >
                              {val == null ? (
                                <span className="text-muted-foreground/30">—</span>
                              ) : val === 0 ? (
                                <span className="text-muted-foreground/50 font-normal">0</span>
                              ) : val < 0 ? (
                                <span className="text-rose-400 font-medium">{formatted}</span>
                              ) : (
                                <span
                                  className={cn(
                                    isMajor ? "font-semibold text-slate-100" : "font-normal text-slate-200",
                                    (isDirectHover || isSameQuarterHover) && "text-sky-100 font-semibold"
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
                        <tr className="group text-xs transition-colors border-b border-border/15">
                          {/* Cột nhãn QoQ Sticky Left */}
                          <td
                            className={cn(
                              "py-1.5 pr-3 sticky left-0 z-10 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.04)]",
                              subRowPadLeft
                            )}
                          >
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-muted-foreground/35 tracking-wider">......</span>
                              <Activity className="size-3 text-purple-400 shrink-0" />
                              <span className="font-semibold text-purple-300">QoQ</span>
                            </div>
                          </td>

                          {/* Giá trị % QoQ từng kỳ */}
                          {values.map((val, cIdx) => {
                            const globalIdx = startIndex + cIdx;
                            const prevQoQVal = globalIdx > 0 ? allValues[globalIdx - 1] : null;
                            const qoq = calcGrowth(val, prevQoQVal);
                            const isLatest = isLatestColumn(cIdx);
                            const colDate = selectedDates[cIdx];
                            const colQuarter = getQuarterFromIso(colDate);
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
                                style={cellStyle}
                                className="px-3 py-1 text-right whitespace-nowrap align-middle text-[11.5px] transition-colors"
                              >
                                {qoq != null ? (
                                  <span
                                    className={cn(
                                      "font-medium",
                                      qoq > 0
                                        ? "text-emerald-400"
                                        : qoq < 0
                                        ? "text-rose-400"
                                        : "text-muted-foreground/60"
                                    )}
                                  >
                                    {qoq > 0 ? "+" : ""}
                                    {qoq.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* 3. DÒNG CON TĂNG TRƯỞNG YoY */}
                      {showYoY && (
                        <tr className="group text-xs transition-colors border-b border-border/15">
                          {/* Cột nhãn YoY Sticky Left */}
                          <td
                            className={cn(
                              "py-1.5 pr-3 sticky left-0 z-10 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.04)]",
                              subRowPadLeft
                            )}
                          >
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-muted-foreground/35 tracking-wider">......</span>
                              <Activity className="size-3 text-sky-400 shrink-0" />
                              <span className="font-semibold text-sky-300">YoY</span>
                            </div>
                          </td>

                          {/* Giá trị % YoY từng kỳ */}
                          {values.map((val, cIdx) => {
                            const globalIdx = startIndex + cIdx;
                            const yoyOffset = periodMode === "quarter" ? 4 : 1;
                            const prevYoYVal = globalIdx >= yoyOffset ? allValues[globalIdx - yoyOffset] : null;
                            const yoy = calcGrowth(val, prevYoYVal);
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
                                style={cellStyle}
                                className="px-3 py-1 text-right whitespace-nowrap align-middle text-[11.5px] transition-colors"
                              >
                                {yoy != null ? (
                                  <span
                                    className={cn(
                                      "font-medium",
                                      yoy > 0
                                        ? "text-emerald-400"
                                        : yoy < 0
                                        ? "text-rose-400"
                                        : "text-muted-foreground/60"
                                    )}
                                  >
                                    {yoy > 0 ? "+" : ""}
                                    {yoy.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
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
    </div>
  );
}
