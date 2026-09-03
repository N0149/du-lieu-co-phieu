"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Scale,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  BarChart3,
  Table as TableIcon,
  LineChart as LineChartIcon,
  Star,
  Search,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeerMetricItem } from "@/lib/peers-service";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export interface MetricDef {
  id: keyof PeerMetricItem;
  label: string;
  unit: string;
  format: (val: number | null | undefined) => string;
  higherIsBetter: boolean;
}

export const AVAILABLE_METRICS: MetricDef[] = [
  {
    id: "equity",
    label: "Vốn chủ sở hữu",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: true,
  },
  {
    id: "roe",
    label: "ROE cuối kỳ",
    unit: "%",
    format: (v) => (v != null ? `${v.toFixed(2)}%` : "—"),
    higherIsBetter: true,
  },
  {
    id: "roa",
    label: "ROA cuối kỳ",
    unit: "%",
    format: (v) => (v != null ? `${v.toFixed(2)}%` : "—"),
    higherIsBetter: true,
  },
  {
    id: "revenue",
    label: "Doanh thu thuần",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: true,
  },
  {
    id: "netProfit",
    label: "LNST",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: true,
  },
  {
    id: "grossMargin",
    label: "Biên LN gộp",
    unit: "%",
    format: (v) => (v != null ? `${v.toFixed(2)}%` : "—"),
    higherIsBetter: true,
  },
  {
    id: "netMargin",
    label: "Biên LN ròng",
    unit: "%",
    format: (v) => (v != null ? `${v.toFixed(2)}%` : "—"),
    higherIsBetter: true,
  },
  {
    id: "inventory",
    label: "Hàng tồn kho",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: true,
  },
  {
    id: "receivables",
    label: "Khoản phải thu",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: false,
  },
  {
    id: "assets",
    label: "Tổng tài sản",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: true,
  },
  {
    id: "marketCap",
    label: "Vốn hóa",
    unit: "tỷ",
    format: (v) => (v != null ? `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ` : "—"),
    higherIsBetter: true,
  },
  {
    id: "pe",
    label: "P/E",
    unit: "x",
    format: (v) => (v != null ? `${v.toFixed(1)}x` : "—"),
    higherIsBetter: false,
  },
  {
    id: "pb",
    label: "P/B",
    unit: "x",
    format: (v) => (v != null ? `${v.toFixed(2)}x` : "—"),
    higherIsBetter: false,
  },
];

const DEFAULT_METRIC_IDS: string[] = [
  "equity",
  "roe",
  "roa",
  "revenue",
  "netProfit",
  "grossMargin",
  "netMargin",
  "inventory",
  "receivables",
];

const RUATICHSAN_FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontVariantNumeric: "tabular-nums" as const,
};

function PeerBarTooltip({
  active,
  payload,
  metricDef,
  industryAvg,
}: {
  active?: boolean;
  payload?: any[];
  metricDef: MetricDef;
  industryAvg: number;
}) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const val = item.val as number | null;
  const diff = val != null ? val - industryAvg : 0;
  const isAbove = diff >= 0;

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs min-w-[200px]">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 font-bold">
        <span className="flex items-center gap-1 text-foreground">
          {item.ticker}
          {item.isCurrent && <Star className="size-3 fill-amber-400 text-amber-400" />}
        </span>
        <span className="text-[11px] font-normal text-muted-foreground truncate max-w-[130px]">
          {item.name}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{metricDef.label}:</span>
        <span className="font-bold text-foreground font-sans tabular-nums text-sm">
          {metricDef.format(val)}
        </span>
      </div>
      {val != null && (
        <div className="mt-1.5 flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 text-[11px]">
          <span className="text-muted-foreground">So với TB ngành:</span>
          <span
            className={cn(
              "font-bold font-sans tabular-nums",
              isAbove ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {isAbove ? "+" : ""}
            {diff.toFixed(2)}
            {metricDef.unit} ({isAbove ? "Vượt TB" : "Dưới TB"})
          </span>
        </div>
      )}
    </div>
  );
}

interface PeerTrendTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  metricDef: MetricDef;
  peerColorMap: Record<string, string>;
  growthDataMap: Map<string, { diff: number | null; pct: number | null; label: string }>;
}

function PeerTrendTooltip({
  active,
  payload,
  label,
  metricDef,
  peerColorMap,
  growthDataMap,
}: PeerTrendTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs min-w-[210px]">
      <div className="border-b border-border/50 pb-1.5 font-bold text-foreground text-center">
        {label}
      </div>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const ticker = entry.dataKey as string;
          const val = entry.value as number | null;
          const color = peerColorMap[ticker] || entry.color || "#6366f1";
          const growth = growthDataMap.get(`${label}_${ticker}`);

          return (
            <div key={ticker} className="flex items-center justify-between gap-3 text-xs">
              <span style={{ color }} className="font-bold">
                {ticker}:
              </span>
              <div className="flex items-baseline gap-1.5 font-sans tabular-nums">
                <span className="font-semibold text-foreground">
                  {val != null ? metricDef.format(val) : "—"}
                </span>
                {growth && growth.diff != null && growth.pct != null && (
                  <span
                    className={cn(
                      "text-[10.5px] font-bold",
                      growth.diff >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}
                  >
                    {growth.diff >= 0 ? "▲" : "▼"}{" "}
                    {metricDef.unit === "%"
                      ? `${Math.abs(growth.diff).toFixed(1)}%`
                      : Math.abs(growth.diff).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}{" "}
                    ({growth.pct >= 0 ? "+" : ""}
                    {growth.pct.toFixed(0)}% {growth.label})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PeerComparisonViewProps {
  currentTicker: string;
  sectorName?: string;
  initialPeers?: string[];
}

export function PeerComparisonView({
  currentTicker,
  sectorName = "Cùng nhóm ngành",
  initialPeers = [],
}: PeerComparisonViewProps) {
  const tickerUpper = currentTicker.toUpperCase().trim();

  // Danh sách các mã so sánh (Mặc định mã hiện tại + các mã cùng ngành)
  const defaultPeers = useMemo(() => {
    const list = [tickerUpper, ...initialPeers.map((s) => s.toUpperCase().trim())];
    return Array.from(new Set(list)).slice(0, 6);
  }, [tickerUpper, initialPeers]);

  const [peersList, setPeersList] = useState<string[]>(defaultPeers);
  const [activeMetricIds, setActiveMetricIds] = useState<string[]>(DEFAULT_METRIC_IDS);
  const [period, setPeriod] = useState<"quarter" | "annual">("quarter");
  const [viewMode, setViewMode] = useState<"table" | "bar" | "trend">("table");
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Dữ liệu từ API
  const [peerData, setPeerData] = useState<PeerMetricItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sắp xếp
  const [sortKey, setSortKey] = useState<string>("equity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Bộ chọn mã cổ phiếu & chỉ tiêu bổ sung
  const [addStockInput, setAddStockInput] = useState<string>("");
  const [selectedChartMetric, setSelectedChartMetric] = useState<string>("grossMargin");
  const [showPillsList, setShowPillsList] = useState<boolean>(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Trạng thái cho biểu đồ xu hướng theo thời gian (Trend View)
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<string>("equity");
  const [trendPeriodsCount, setTrendPeriodsCount] = useState<number>(8);
  const [showTrendPillsList, setShowTrendPillsList] = useState<boolean>(true);
  const [hiddenTrendLines, setHiddenTrendLines] = useState<Set<string>>(new Set());

  // Tải dữ liệu so sánh từ API
  useEffect(() => {
    let isMounted = true;
    if (peersList.length === 0) {
      setPeerData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/peers?symbols=${encodeURIComponent(peersList.join(","))}&period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data && Array.isArray(data.peers)) {
            setPeerData(data.peers);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải dữ liệu so sánh ngành:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [peersList, period]);

  // Thêm mã cổ phiếu
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addStockInput.toUpperCase().trim();
    if (!clean) return;
    if (!peersList.includes(clean)) {
      setPeersList((prev) => [...prev, clean]);
    }
    setAddStockInput("");
  };

  // Xóa mã cổ phiếu
  const handleRemoveStock = (sym: string) => {
    if (peersList.length <= 1) return;
    setPeersList((prev) => prev.filter((s) => s !== sym));
  };

  // Thêm / Xóa chỉ tiêu
  const handleToggleMetric = (mId: string) => {
    if (activeMetricIds.includes(mId)) {
      if (activeMetricIds.length <= 1) return; // Giữ lại ít nhất 1 chỉ tiêu
      setActiveMetricIds((prev) => prev.filter((id) => id !== mId));
    } else {
      setActiveMetricIds((prev) => [...prev, mId]);
    }
  };

  // Reset về mặc định
  const handleReset = () => {
    setPeersList(defaultPeers);
    setActiveMetricIds(DEFAULT_METRIC_IDS);
    setPeriod("quarter");
    setSortKey("equity");
    setSortOrder("desc");
  };

  // Sắp xếp dữ liệu
  const sortedPeers = useMemo(() => {
    const list = [...peerData];
    list.sort((a, b) => {
      if (sortKey === "ticker") {
        return sortOrder === "asc"
          ? a.ticker.localeCompare(b.ticker)
          : b.ticker.localeCompare(a.ticker);
      }
      const valA = (a as any)[sortKey];
      const valB = (b as any)[sortKey];

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [peerData, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  // Tìm giá trị lớn nhất (hoặc tốt nhất) của từng chỉ tiêu để tô xanh lá (Best Performer)
  const bestValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const mId of activeMetricIds) {
      const def = AVAILABLE_METRICS.find((m) => m.id === mId);
      if (!def) continue;

      let best = def.higherIsBetter ? -Infinity : Infinity;
      let hasValid = false;

      for (const p of peerData) {
        const val = (p as any)[mId];
        if (val != null && typeof val === "number") {
          hasValid = true;
          if (def.higherIsBetter) {
            if (val > best) best = val;
          } else {
            if (val < best) best = val;
          }
        }
      }

      if (hasValid && best !== -Infinity && best !== Infinity) {
        map[mId] = best;
      }
    }
    return map;
  }, [activeMetricIds, peerData]);

  // Xuất file CSV
  const handleExportCsv = () => {
    if (!sortedPeers.length) return;
    const activeDefs = AVAILABLE_METRICS.filter((m) => activeMetricIds.includes(m.id));
    const headers = ["STT", "Mã CP", "Tên Công Ty", ...activeDefs.map((m) => `${m.label} (${m.unit})`)];
    const rows = sortedPeers.map((p, idx) => {
      const vals = activeDefs.map((m) => {
        const v = (p as any)[m.id];
        return v != null ? String(v) : "";
      });
      return [idx + 1, p.ticker, `"${p.name.replace(/"/g, '""')}"`, ...vals];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SoSanhNganh_${tickerUpper}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Danh sách các chỉ tiêu đang được chọn
  const activeMetrics = useMemo(() => {
    return AVAILABLE_METRICS.filter((m) => activeMetricIds.includes(m.id));
  }, [activeMetricIds]);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm"
      style={RUATICHSAN_FONT_STYLE}
    >
      {/* ── HEADER CHÍNH ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Scale className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">So Sánh Doanh Nghiệp Cùng Ngành</h3>
              <span className="rounded bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-400">
                {sectorName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bóc tách đa chỉ tiêu tài chính & hiệu quả kinh doanh so với các đối thủ cùng ngành
            </p>
          </div>
        </div>

        {/* Nút công cụ bên phải */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              showFilters
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
            title="Ẩn/Hiện bộ lọc và tùy chọn chỉ tiêu"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>{showFilters ? "Ẩn bộ lọc" : "Bộ lọc & chỉ tiêu"}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Khôi phục danh sách mặc định ban đầu"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset so sánh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || !sortedPeers.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-40 cursor-pointer shadow-2xs"
            title="Xuất bảng ra file Excel CSV"
          >
            <Download className="size-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* ── 3 CHẾ ĐỘ HIỂN THỊ (BẢNG, CỘT, XU HƯỚNG) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer",
              viewMode === "table"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TableIcon className="size-3.5" />
            <span>Bảng</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("bar")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer",
              viewMode === "bar"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="size-3.5" />
            <span>Cột (kỳ mới nhất)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("trend")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer",
              viewMode === "trend"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LineChartIcon className="size-3.5" />
            <span>Xu hướng theo thời gian</span>
          </button>
        </div>

        {/* Chuyển đổi Theo Quý / Theo Năm */}
        <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setPeriod("quarter")}
            className={cn(
              "rounded-lg px-3 py-1.5 transition-colors cursor-pointer",
              period === "quarter"
                ? "bg-emerald-500/20 text-emerald-400 font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Theo quý
          </button>
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            className={cn(
              "rounded-lg px-3 py-1.5 transition-colors cursor-pointer",
              period === "annual"
                ? "bg-emerald-500/20 text-emerald-400 font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Theo năm
          </button>
        </div>
      </div>

      {/* ── BỘ LỌC & DANH SÁCH CHỈ TIÊU (COLLAPSIBLE PANEL) ── */}
      {showFilters && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs">
          {/* Hàng 1: Inputs thêm mã & thêm chỉ tiêu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Thêm mã cổ phiếu */}
            <form onSubmit={handleAddStock} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Thêm mã cổ phiếu vào so sánh:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={addStockInput}
                    onChange={(e) => setAddStockInput(e.target.value)}
                    placeholder="Gõ mã cổ phiếu (VD: HPG, VHM, MWG...)"
                    className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs font-bold uppercase text-foreground placeholder:text-muted-foreground/60 placeholder:normal-case outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <Plus className="size-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </form>

            {/* Thêm chỉ tiêu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Thêm chỉ tiêu so sánh:
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleToggleMetric(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground outline-none cursor-pointer hover:border-primary/50"
                defaultValue=""
              >
                <option value="" disabled>
                  + Chọn thêm chỉ tiêu tài chính để so sánh...
                </option>
                {AVAILABLE_METRICS.filter((m) => !activeMetricIds.includes(m.id)).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hàng 2: Badges chỉ tiêu đang xem */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Chỉ tiêu đang xem:</span>
            {activeMetrics.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11.5px] font-medium text-purple-300"
              >
                <span>
                  {m.label} ({m.unit})
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleMetric(m.id)}
                  className="rounded-full p-0.5 hover:bg-purple-500/30 cursor-pointer"
                  title={`Gỡ bỏ ${m.label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Hàng 3: Badges mã so sánh */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Mã so sánh:</span>
            {peersList.map((sym) => {
              const isCurrent = sym === tickerUpper;
              return (
                <span
                  key={sym}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11.5px] font-bold",
                    isCurrent
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-2xs"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                  )}
                >
                  {isCurrent && <Star className="size-3 fill-amber-400 text-amber-400" />}
                  <span>{sym}</span>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStock(sym)}
                      className="rounded-full p-0.5 hover:bg-sky-500/30 cursor-pointer"
                      title={`Gỡ bỏ mã ${sym}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── NỘI DUNG CHÍNH: 3 CHẾ ĐỘ ── */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-sm">
          <div className="inline-block size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Đang tải dữ liệu so sánh doanh nghiệp cùng ngành ({period === "quarter" ? "Quý" : "Năm"})...</p>
        </div>
      ) : sortedPeers.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center text-sm text-muted-foreground">
          <Scale className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Không tìm thấy dữ liệu so sánh</p>
          <p className="text-xs mt-1">Hãy thêm các mã cổ phiếu để bắt đầu so sánh đối thủ cùng ngành.</p>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHẾ ĐỘ 1: BẢNG SO SÁNH (SMART COMPARISON TABLE)         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {viewMode === "table" && (
            <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[11.5px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                      <th className="py-3 pl-3 pr-2 w-12 text-center">STT</th>
                      <th
                        onClick={() => handleSort("ticker")}
                        className="py-3 px-3 min-w-[100px] sticky left-0 z-20 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.04)] cursor-pointer hover:text-foreground transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Mã CP</span>
                          {sortKey === "ticker" && (
                            <span className="text-primary font-bold">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>

                      {activeMetrics.map((m) => {
                        const isSorted = sortKey === m.id;
                        return (
                          <th
                            key={m.id}
                            onClick={() => handleSort(m.id)}
                            className={cn(
                              "px-3 py-3 text-right whitespace-nowrap min-w-[120px] cursor-pointer transition-colors select-none",
                              isSorted ? "text-primary font-bold bg-primary/5" : "hover:text-foreground"
                            )}
                            title={`Bấm để sắp xếp theo ${m.label}`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>
                                {m.label} ({m.unit})
                              </span>
                              {isSorted && (
                                <span className="text-primary font-bold">
                                  {sortOrder === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {sortedPeers.map((p, idx) => {
                      const isCurrent = p.ticker === tickerUpper;

                      return (
                        <tr
                          key={p.ticker}
                          className={cn(
                            "group transition-colors",
                            isCurrent
                              ? "bg-primary/5 font-semibold"
                              : "hover:bg-muted/10 text-foreground"
                          )}
                        >
                          {/* STT */}
                          <td className="py-2.5 pl-3 pr-2 text-center text-muted-foreground font-medium">
                            {idx + 1}
                          </td>

                          {/* Mã cổ phiếu (Sticky left) */}
                          <td
                            className={cn(
                              "py-2.5 px-3 sticky left-0 z-10 bg-card border-r border-border/60 shadow-[2px_0_5px_rgba(0,0,0,0.04)] group-hover:bg-muted/20 transition-colors",
                              isCurrent && "bg-primary/[0.07]"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              {isCurrent && (
                                <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                              )}
                              <Link
                                href={`/stock/${p.ticker}`}
                                className={cn(
                                  "font-bold hover:underline",
                                  isCurrent ? "text-primary" : "text-foreground"
                                )}
                              >
                                {p.ticker}
                              </Link>
                              {p.periodLabel && (
                                <span className="text-[10px] text-muted-foreground/60">
                                  ({p.periodLabel})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Các cột số liệu chỉ tiêu */}
                          {activeMetrics.map((m) => {
                            const val = (p as any)[m.id];
                            const isBest = val != null && bestValues[m.id] === val && sortedPeers.length > 1;

                            return (
                              <td
                                key={m.id}
                                className={cn(
                                  "px-3 py-2.5 text-right whitespace-nowrap align-middle text-[12.5px] transition-colors",
                                  isBest && "text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.25)]"
                                )}
                              >
                                {val == null ? (
                                  <span className="text-muted-foreground/30">—</span>
                                ) : (
                                  <span>{m.format(val)}</span>
                                )}
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

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHẾ ĐỘ 2: BIỂU ĐỒ CỘT (KỲ MỚI NHẤT) CHUẨN RUATICHSAN     */}
          {/* ═══════════════════════════════════════════════════════ */}
          {viewMode === "bar" && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              {/* 1. HÀNG CHỌN CHỈ TIÊU BIỂU ĐỒ — CHẠM ĐỂ ĐỔI */}
              <div className="flex flex-col gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Chỉ tiêu biểu đồ — chạm để đổi</span>
                  <button
                    type="button"
                    onClick={() => setShowPillsList(!showPillsList)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <span>{showPillsList ? "Thu gọn danh sách" : "Mở rộng danh sách"}</span>
                    {showPillsList ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                </div>

                {showPillsList && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {activeMetrics.map((m) => {
                      const isSelected = selectedChartMetric === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedChartMetric(m.id)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                            isSelected
                              ? "border border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                              : "border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:border-border"
                          )}
                        >
                          {m.label} ({m.unit})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. KHUNG BIỂU ĐỒ CỘT THANH LỊCH (RECHARTS COMPACT) */}
              {(() => {
                const metricDef =
                  AVAILABLE_METRICS.find((m) => m.id === selectedChartMetric) || AVAILABLE_METRICS[0];

                // Dữ liệu cho Recharts BarChart
                const chartData = sortedPeers.map((p) => ({
                  ticker: p.ticker,
                  name: p.name,
                  val: (p as any)[metricDef.id] as number | null,
                  isCurrent: p.ticker === tickerUpper,
                }));

                const validVals = chartData
                  .map((p) => p.val)
                  .filter((v): v is number => v != null && !isNaN(v));

                if (validVals.length === 0) {
                  return (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      Chưa có đủ dữ liệu để vẽ biểu đồ cho chỉ tiêu này.
                    </div>
                  );
                }

                // Tính toán trung bình ngành (Industry Average)
                const industryAvg = validVals.reduce((sum, v) => sum + v, 0) / validVals.length;

                // Bảng màu pastel / vibrant tinh tế cho từng mã
                const BAR_PALETTE = [
                  "#6366f1", // Tím Indigo (FMC)
                  "#0ea5e9", // Xanh Da trời (HAG)
                  "#14b8a6", // Xanh Ngọc (VHC)
                  "#f59e0b", // Vàng Cam (PAN)
                  "#a855f7", // Tím Violet (DBC)
                  "#ec4899", // Hồng Phấn
                  "#3b82f6", // Xanh Biển
                  "#10b981", // Xanh Lá
                ];

                const minVal = Math.min(0, ...validVals);
                const maxVal = Math.max(...validVals, industryAvg) * 1.15;
                const chartHeight = Math.max(220, Math.min(320, chartData.length * 36 + 50));

                return (
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Header chỉ tiêu & Badge Trung bình ngành */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {metricDef.label} ({metricDef.unit})
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Trung bình ngành:</span>
                        <span className="font-bold text-[#ea580c] bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/25 font-sans tabular-nums">
                          {metricDef.format(industryAvg)}
                        </span>
                      </div>
                    </div>

                    {/* Vùng vẽ Recharts */}
                    <div className="w-full relative" style={{ height: chartHeight }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={chartData}
                          margin={{ top: 22, right: 35, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="hsl(var(--border) / 0.45)"
                          />
                          <XAxis
                            type="number"
                            domain={[minVal, maxVal]}
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fontSize: 10.5,
                              fill: "hsl(var(--muted-foreground) / 0.75)",
                              fontFamily: "inherit",
                            }}
                            tickFormatter={(v: number) =>
                              metricDef.unit === "%"
                                ? `${v.toFixed(1)}%`
                                : v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })
                            }
                          />
                          <YAxis
                            type="category"
                            dataKey="ticker"
                            tickLine={false}
                            axisLine={false}
                            width={65}
                            tick={({ x, y, payload }: any) => {
                              const isCurrent = payload.value === tickerUpper;
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  dy={4}
                                  textAnchor="end"
                                  fontSize={11.5}
                                  fontWeight={isCurrent ? 700 : 500}
                                  fill={isCurrent ? "#38bdf8" : "hsl(var(--muted-foreground))"}
                                  fontFamily="inherit"
                                >
                                  {payload.value}
                                  {isCurrent ? " ★" : ""}
                                </text>
                              );
                            }}
                          />
                          <RechartsTooltip
                            cursor={{ fill: "hsl(var(--muted) / 0.15)" }}
                            content={<PeerBarTooltip metricDef={metricDef} industryAvg={industryAvg} />}
                          />
                          <ReferenceLine
                            x={industryAvg}
                            stroke="#ea580c"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: `Trung bình ngành: ${metricDef.format(industryAvg)}`,
                              position: "top",
                              fill: "#ea580c",
                              fontSize: 11,
                              fontWeight: 700,
                              dy: -8,
                            }}
                          />
                          <Bar
                            dataKey="val"
                            barSize={14}
                            radius={[0, 4, 4, 0]}
                            animationDuration={450}
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${entry.ticker}`}
                                fill={BAR_PALETTE[index % BAR_PALETTE.length]}
                                fillOpacity={0.92}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Watermark mờ nhẹ nhàng ở góc dưới bên phải */}
                      <div className="absolute bottom-1 right-2 text-right pointer-events-none opacity-20 text-[10px] font-medium text-foreground">
                        <div>Dữ Liệu Đầu Tư</div>
                        <div className="text-[9px]">dulieudautu.com</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground/60 text-center sm:text-left pt-1">
                      💡 Rê chuột vào từng thanh để xem chi tiết chênh lệch tăng/giảm so với trung bình ngành.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHẾ ĐỘ 3: BIỂU ĐỒ XU HƯỚNG THEO THỜI GIAN CHUẨN RUATICHSAN */}
          {/* ═══════════════════════════════════════════════════════ */}
          {viewMode === "trend" && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              {/* 1. HÀNG CHỌN CHỈ TIÊU XU HƯỚNG — CHẠM ĐỂ ĐỔI */}
              <div className="flex flex-col gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Chỉ tiêu xu hướng — chạm để đổi</span>
                  <button
                    type="button"
                    onClick={() => setShowTrendPillsList(!showTrendPillsList)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <span>{showTrendPillsList ? "Thu gọn danh sách" : "Mở rộng danh sách"}</span>
                    {showTrendPillsList ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                </div>

                {showTrendPillsList && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {activeMetrics.map((m) => {
                      const isSelected = selectedTrendMetric === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedTrendMetric(m.id)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                            isSelected
                              ? "border border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                              : "border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:border-border"
                          )}
                        >
                          {m.label} ({m.unit})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. THANH ĐIỀU KHIỂN SỐ KỲ HIỂN THỊ */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">Số kỳ hiển thị:</span>
                  <select
                    value={trendPeriodsCount}
                    onChange={(e) => setTrendPeriodsCount(Number(e.target.value))}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-bold text-foreground outline-none cursor-pointer hover:border-primary/50"
                  >
                    <option value={4}>4 {period === "quarter" ? "quý" : "năm"} gần nhất</option>
                    <option value={8}>8 {period === "quarter" ? "quý" : "năm"} gần nhất</option>
                    <option value={12}>12 {period === "quarter" ? "quý" : "năm"} gần nhất</option>
                    <option value={16}>16 {period === "quarter" ? "quý" : "năm"} gần nhất</option>
                  </select>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Mặc định 8 kỳ gần nhất. Tooltip: chênh tuyệt đối + % YoY/QoQ.
                </div>
              </div>

              {/* 3. BIỂU ĐỒ ĐƯỜNG XU HƯỚNG ĐA DOANH NGHIỆP */}
              {(() => {
                const metricDef =
                  AVAILABLE_METRICS.find((m) => m.id === selectedTrendMetric) || AVAILABLE_METRICS[0];

                const BAR_PALETTE = [
                  "#6366f1", // Tím Indigo (FMC)
                  "#0ea5e9", // Xanh Da trời (HAG)
                  "#14b8a6", // Xanh Ngọc (VHC)
                  "#f59e0b", // Vàng Cam (PAN)
                  "#a855f7", // Tím Violet (DBC)
                  "#ec4899", // Hồng Phấn
                  "#3b82f6", // Xanh Biển
                  "#10b981", // Xanh Lá
                ];

                const peerColorMap: Record<string, string> = {};
                peersList.forEach((ticker, idx) => {
                  peerColorMap[ticker] = BAR_PALETTE[idx % BAR_PALETTE.length];
                });

                // Tập hợp tất cả các nhãn kỳ có trong lịch sử của các mã
                const allLabelsSet = new Set<string>();
                sortedPeers.forEach((p) => {
                  p.history?.forEach((h) => allLabelsSet.add(h.label));
                });

                // Lấy các nhãn theo thứ tự xuất hiện của mã có lịch sử dài nhất
                const longestHistory = sortedPeers.reduce((longest, current) => {
                  return (current.history?.length || 0) > (longest.history?.length || 0)
                    ? current
                    : longest;
                }, sortedPeers[0]);

                const baseLabels = (longestHistory?.history || []).map((h) => h.label);
                const displayLabels = baseLabels.slice(-trendPeriodsCount);

                if (displayLabels.length === 0) {
                  return (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      Chưa có đủ chuỗi dữ liệu lịch sử các kỳ để vẽ biểu đồ xu hướng.
                    </div>
                  );
                }

                // Xây dựng dataset cho Recharts LineChart
                const trendChartData = displayLabels.map((label) => {
                  const row: Record<string, any> = { label };
                  sortedPeers.forEach((p) => {
                    const hItem = p.history?.find((h) => h.label === label);
                    const val = hItem ? (hItem as any)[metricDef.id] : null;
                    row[p.ticker] = val != null && !isNaN(val) ? val : null;
                  });
                  return row;
                });

                // Xây dựng growthDataMap để Tooltip hiển thị tăng/giảm YoY hoặc QoQ
                const growthDataMap = new Map<
                  string,
                  { diff: number | null; pct: number | null; label: string }
                >();

                sortedPeers.forEach((p) => {
                  const hist = p.history || [];
                  hist.forEach((h, idx) => {
                    const currVal = (h as any)[metricDef.id] as number | null;
                    if (currVal == null) return;

                    // Ưu tiên so sánh cùng kỳ năm trước (4 quý trước đối với quý, hoặc 1 năm trước đối với năm)
                    const prevIdx = period === "quarter" ? idx - 4 : idx - 1;
                    const fallbackQoQIdx = idx - 1;

                    if (prevIdx >= 0 && hist[prevIdx]) {
                      const prevVal = (hist[prevIdx] as any)[metricDef.id] as number | null;
                      if (prevVal != null && prevVal !== 0) {
                        const diff = currVal - prevVal;
                        const pct = (diff / Math.abs(prevVal)) * 100;
                        growthDataMap.set(`${h.label}_${p.ticker}`, {
                          diff,
                          pct,
                          label: period === "quarter" ? "YoY" : "YoY",
                        });
                        return;
                      }
                    }

                    // Fallback so sánh QoQ nếu chưa đủ 4 quý
                    if (period === "quarter" && fallbackQoQIdx >= 0 && hist[fallbackQoQIdx]) {
                      const prevVal = (hist[fallbackQoQIdx] as any)[metricDef.id] as number | null;
                      if (prevVal != null && prevVal !== 0) {
                        const diff = currVal - prevVal;
                        const pct = (diff / Math.abs(prevVal)) * 100;
                        growthDataMap.set(`${h.label}_${p.ticker}`, {
                          diff,
                          pct,
                          label: "QoQ",
                        });
                      }
                    }
                  });
                });

                return (
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Header chỉ tiêu */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground">
                        {metricDef.label} ({metricDef.unit})
                      </h4>
                    </div>

                    {/* Khung Biểu đồ LineChart */}
                    <div className="w-full relative h-[310px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendChartData}
                          margin={{ top: 20, right: 35, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border) / 0.4)"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="hsl(var(--muted-foreground) / 0.6)"
                            tick={{
                              fontSize: 11,
                              fill: "hsl(var(--muted-foreground))",
                              fontFamily: "inherit",
                            }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground) / 0.6)"
                            tick={{
                              fontSize: 10.5,
                              fill: "hsl(var(--muted-foreground))",
                              fontFamily: "inherit",
                            }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) =>
                              metricDef.unit === "%"
                                ? `${v.toFixed(0)}%`
                                : v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })
                            }
                            domain={["auto", "auto"]}
                          />
                          <RechartsTooltip
                            content={
                              <PeerTrendTooltip
                                metricDef={metricDef}
                                peerColorMap={peerColorMap}
                                growthDataMap={growthDataMap}
                              />
                            }
                          />
                          {peersList.map((ticker) => {
                            const isCurrent = ticker === tickerUpper;
                            const color = peerColorMap[ticker] || "#6366f1";

                            return (
                              <Line
                                key={ticker}
                                type="monotone"
                                dataKey={ticker}
                                stroke={color}
                                strokeWidth={isCurrent ? 2.5 : 2}
                                dot={{ r: 3.5, fill: color, strokeWidth: 1 }}
                                activeDot={{ r: 6, strokeWidth: 2, fill: color }}
                                hide={hiddenTrendLines.has(ticker)}
                                connectNulls
                                animationDuration={500}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Watermark mờ nhẹ nhàng ở góc dưới bên phải */}
                      <div className="absolute bottom-6 right-4 text-right pointer-events-none opacity-20 text-[10px] font-medium text-foreground">
                        <div>Dữ Liệu Đầu Tư</div>
                        <div className="text-[9px]">dulieudautu.com</div>
                      </div>
                    </div>

                    {/* Chú thích Legend các mã cổ phiếu (Có thể bấm để ẩn/hiện) */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1 border-t border-border/40">
                      {peersList.map((ticker) => {
                        const color = peerColorMap[ticker];
                        const isHidden = hiddenTrendLines.has(ticker);
                        const isCurrent = ticker === tickerUpper;

                        return (
                          <button
                            key={ticker}
                            type="button"
                            onClick={() => {
                              setHiddenTrendLines((prev) => {
                                const next = new Set(prev);
                                if (next.has(ticker)) next.delete(ticker);
                                else next.add(ticker);
                                return next;
                              });
                            }}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer",
                              isHidden
                                ? "opacity-35 line-through hover:opacity-60"
                                : "hover:bg-muted/40"
                            )}
                            title={`Bấm để ${isHidden ? "hiện" : "ẩn"} đường ${ticker}`}
                          >
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span
                              className={cn(
                                "font-semibold",
                                isCurrent ? "text-primary font-bold" : "text-foreground"
                              )}
                            >
                              {ticker}
                              {isCurrent ? " ★" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Ghi chú chân biểu đồ */}
                    <div className="text-[11px] text-muted-foreground/60 text-center pt-1">
                      Chỉ hiển thị một chỉ tiêu mỗi lần (chọn ở trên). Thứ tự đường = thứ tự mã đã chọn. Chạm tên mã dưới biểu đồ để ẩn/hiện đường (gạch ngang = đang ẩn).
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
