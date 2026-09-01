"use client";

import { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  SlidersHorizontal,
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
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: Math.abs(num) < 10 && Math.abs(num) > 0 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

function calcGrowth(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function FinancialStatementsExplorer({
  ticker,
  initialData,
}: FinancialStatementsExplorerProps) {
  const [activeTab, setActiveTab] = useState<FinancialTab>("cdkt");
  const [periodMode, setPeriodMode] = useState<"quarter" | "annual">("quarter");
  const [periodCount, setPeriodCount] = useState<number>(12);
  const [showYoY, setShowYoY] = useState<boolean>(false);
  const [showQoQ, setShowQoQ] = useState<boolean>(false);
  const [unit, setUnit] = useState<"bil" | "mil">("bil"); // Tỷ đồng vs Triệu đồng
  const [loading, setLoading] = useState<boolean>(false);

  const [statementData, setStatementData] = useState<RawFinancialStatementData | null>(initialData || null);

  // Trạng thái thu gọn/mở rộng theo dòng
  const [collapsedRows, setCollapsedRows] = useState<Record<string, boolean>>({});

  const toggleRowCollapse = (rowKey: string) => {
    setCollapsedRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  // Tải dữ liệu BCTC khi đổi mã hoặc đổi kỳ (quarter / annual)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

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

  // Danh sách các mốc thời gian hiển thị (cột)
  const allFiscalDates = statementData?.fiscalDates || [];
  const selectedDates = useMemo(() => {
    if (periodCount === 0 || periodCount >= allFiscalDates.length) {
      return allFiscalDates;
    }
    return allFiscalDates.slice(-periodCount);
  }, [allFiscalDates, periodCount]);

  const startIndex = allFiscalDates.length - selectedDates.length;

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
      const vals = (row.slice(3) as (number | null)[]).slice(startIndex);
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
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
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
                <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                  {ticker}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Chuẩn mực kế toán VAS · Lịch sử 34 Quý / 16 Năm
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

        {/* TOOLBAR: Mode Quý/Năm, Số Kỳ, QoQ, YoY */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Cụm Quý / Năm & Số Kỳ */}
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
                <option value={4}>4 kỳ</option>
                <option value={8}>8 kỳ</option>
                <option value={12}>12 kỳ</option>
                <option value={16}>16 kỳ</option>
                <option value={20}>20 kỳ</option>
                <option value={0}>Tất cả ({allFiscalDates.length})</option>
              </select>
            </div>

            {/* Range Badge */}
            {rangeDisplay && (
              <span className="rounded-lg border border-border/80 bg-muted/60 px-2.5 py-1 font-mono text-[11px] font-bold text-foreground">
                {rangeDisplay}
              </span>
            )}
          </div>

          {/* Toggle Tăng trưởng QoQ & YoY */}
          <div className="flex items-center gap-2 text-xs font-medium">
            {periodMode === "quarter" && (
              <button
                type="button"
                onClick={() => setShowQoQ(!showQoQ)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-all cursor-pointer",
                  showQoQ
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold shadow-2xs"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="size-3" />
                <span>Tăng trưởng QoQ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowYoY(!showYoY)}
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2.5 py-1 transition-all cursor-pointer",
                showYoY
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="size-3" />
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

      {/* ── BẢNG BCTC CHÍNH (FULL TABLE VIEW) ── */}
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-3 pl-4 pr-3 min-w-[280px] max-w-[340px] sticky left-0 z-20 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between">
                      <span>Tiêu chí ({unitLabel})</span>
                    </div>
                  </th>
                  {selectedDates.map((dateStr) => (
                    <th key={dateStr} className="px-3 py-3 text-right whitespace-nowrap font-mono min-w-[105px]">
                      {formatPeriodLabel(dateStr, periodMode)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {currentRows.map((row, rIdx) => {
                  const name = String(row[0] || "");
                  const level = Number(row[1]) || 0;
                  const rowCode = String(row[2] || rIdx);
                  const allValues = (row.slice(3) as (number | null)[]);
                  const values = allValues.slice(startIndex);

                  const isMajor = level === 0;
                  const isSub = level === 1;

                  // Thụt lề theo cấp bậc (indentation)
                  const padLeftClass =
                    level === 0 ? "pl-4" :
                    level === 1 ? "pl-7" :
                    level === 2 ? "pl-10" : "pl-13";

                  return (
                    <tr
                      key={rowCode}
                      className={cn(
                        "group transition-colors",
                        isMajor
                          ? "bg-muted/30 font-bold text-foreground"
                          : isSub
                          ? "hover:bg-muted/20 text-foreground/90 font-semibold"
                          : "hover:bg-muted/10 text-muted-foreground font-normal"
                      )}
                    >
                      {/* Cột tiêu chí (Cố định Sticky Left) */}
                      <td
                        className={cn(
                          "py-2.5 pr-3 font-sans sticky left-0 z-10 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.03)] group-hover:bg-muted/30 transition-colors",
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
                              isMajor && "uppercase tracking-wide text-foreground text-[11.5px]",
                              !isMajor && "text-xs"
                            )}
                            title={name}
                          >
                            {name}
                          </span>
                        </div>
                      </td>

                      {/* Các cột số liệu theo kỳ */}
                      {values.map((val, cIdx) => {
                        const globalIdx = startIndex + cIdx;
                        const formatted = fmtValue(val, unitDivider);

                        // Tính QoQ (so với kỳ liền trước)
                        const prevQoQVal = globalIdx > 0 ? allValues[globalIdx - 1] : null;
                        const qoq = showQoQ ? calcGrowth(val, prevQoQVal) : null;

                        // Tính YoY (so với cùng kỳ năm trước: -4 quý nếu quarter, -1 nếu annual)
                        const yoyOffset = periodMode === "quarter" ? 4 : 1;
                        const prevYoYVal = globalIdx >= yoyOffset ? allValues[globalIdx - yoyOffset] : null;
                        const yoy = showYoY ? calcGrowth(val, prevYoYVal) : null;

                        return (
                          <td
                            key={cIdx}
                            className={cn(
                              "px-3 py-2.5 text-right whitespace-nowrap align-middle",
                              isMajor ? "font-bold text-foreground" : "text-foreground/90"
                            )}
                          >
                            <div className="flex flex-col items-end justify-center">
                              <span className={cn(val != null && val < 0 && "text-rose-500")}>
                                {formatted}
                              </span>

                              {/* Tăng trưởng QoQ % */}
                              {showQoQ && qoq != null && (
                                <span
                                  className={cn(
                                    "text-[9.5px] font-semibold font-sans leading-none mt-0.5",
                                    qoq > 0 ? "text-emerald-500" : qoq < 0 ? "text-rose-500" : "text-muted-foreground"
                                  )}
                                >
                                  {qoq > 0 ? "+" : ""}{qoq.toFixed(1)}% QoQ
                                </span>
                              )}

                              {/* Tăng trưởng YoY % */}
                              {showYoY && yoy != null && (
                                <span
                                  className={cn(
                                    "text-[9.5px] font-semibold font-sans leading-none mt-0.5",
                                    yoy > 0 ? "text-teal-400" : yoy < 0 ? "text-rose-400" : "text-muted-foreground"
                                  )}
                                >
                                  {yoy > 0 ? "+" : ""}{yoy.toFixed(1)}% YoY
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
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
