"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Download,
  FileText,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  TrendingUp,
  Target,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompanyReportItem {
  id: string;
  symbol: string;
  title: string;
  slug?: string;
  source: string;
  date: string;
  displayDate: string;
  recommendation: string | null;
  targetPrice: number | null;
  pageCount: number;
  description: string;
  downloadUrl: string;
  thumbnailUrl: string;
}

interface CompanyReportsTabProps {
  symbol: string;
  initialReports?: CompanyReportItem[];
}

function getRecommendationBadge(rec: string | null) {
  if (!rec) return null;
  const upper = rec.toUpperCase().trim();

  if (upper.includes("MUA") || upper.includes("BUY") || upper.includes("KHẢ QUAN") || upper.includes("OUTPERFORM")) {
    return {
      label: rec,
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }
  if (upper.includes("TĂNG TỶ TRỌNG") || upper.includes("ACCUMULATE")) {
    return {
      label: rec,
      className: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    };
  }
  if (upper.includes("NẮM GIỮ") || upper.includes("HOLD") || upper.includes("TRUNG LẬP") || upper.includes("NEUTRAL")) {
    return {
      label: rec,
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
  }
  if (upper.includes("BÁN") || upper.includes("SELL") || upper.includes("GIẢM TỶ TRỌNG") || upper.includes("UNDERPERFORM")) {
    return {
      label: rec,
      className: "bg-red-500/15 text-red-400 border-red-500/30",
    };
  }

  return {
    label: rec,
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
}

export function CompanyReportsTab({ symbol, initialReports }: CompanyReportsTabProps) {
  const [reports, setReports] = useState<CompanyReportItem[]>(initialReports || []);
  const [loading, setLoading] = useState(!initialReports);
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (initialReports && initialReports.length > 0) {
      setReports(initialReports);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/reports/company/${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.reports)) {
          setReports(data.reports);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi tải báo cáo phân tích mã:", err);
        setLoading(false);
      });
  }, [symbol, initialReports]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const r of reports) {
      if (r.source) set.add(r.source);
    }
    return Array.from(set).sort();
  }, [reports]);

  // Thống kê giá mục tiêu trung bình từ các CTCK
  const targetPriceStats = useMemo(() => {
    const validPrices = reports
      .map((r) => r.targetPrice)
      .filter((p): p is number => p != null && p > 0);

    if (validPrices.length === 0) return null;
    const avg = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
    const max = Math.max(...validPrices);
    const min = Math.min(...validPrices);
    return { avg, max, min, count: validPrices.length };
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (selectedSource !== "all" && item.source !== selectedSource) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const haystack = `${item.title} ${item.description} ${item.source} ${item.recommendation || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [reports, selectedSource, search]);

  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, page, pageSize]);

  return (
    <div className="flex flex-col gap-5">
      {/* Thẻ tóm tắt khuyến nghị & giá mục tiêu của các CTCK */}
      {targetPriceStats && targetPriceStats.count > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Target className="size-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Giá MT trung bình</span>
              <p className="text-base font-bold text-foreground font-mono">
                {targetPriceStats.avg.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Khoảng định giá</span>
              <p className="text-sm font-bold text-foreground font-mono">
                {targetPriceStats.min.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} -{" "}
                {targetPriceStats.max.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Building className="size-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Tổng báo cáo CTCK</span>
              <p className="text-base font-bold text-foreground font-mono">
                {reports.length} báo cáo <span className="text-xs text-muted-foreground font-normal">({availableSources.length} CTCK)</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Thanh công cụ tìm kiếm & lọc */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Tìm báo cáo phân tích ${symbol} theo từ khóa, CTCK, luận điểm...`}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Lọc theo nguồn CTCK */}
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
          >
            <option value="all">🏛️ Tất cả CTCK ({reports.length})</option>
            {availableSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Toggle View */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Xem dạng Bảng"
            >
              <LayoutList className="size-3.5" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Xem dạng Lưới Card"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Lưới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách báo cáo */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <div className="inline-block size-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Đang tải dữ liệu báo cáo phân tích...</p>
        </div>
      ) : paginatedReports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Không có báo cáo phân tích nào phù hợp</p>
          <p className="mt-1 text-xs">Mã cổ phiếu này hiện chưa có báo cáo phân tích hoặc bộ lọc không khớp.</p>
        </div>
      ) : viewMode === "table" ? (
        /* DẠNG BẢNG (TABLE VIEW - GIỐNG RUATICHSAN) */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 whitespace-nowrap w-[95px]">Ngày</th>
                  <th className="px-3 py-3.5 min-w-[220px] max-w-[300px]">Tiêu đề</th>
                  <th className="px-3 py-3.5 min-w-[300px]">Mô tả luận điểm</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap w-[80px]">Nguồn</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap w-[80px]">Số trang</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap w-[110px]">Khuyến nghị</th>
                  <th className="px-3 py-3.5 text-right whitespace-nowrap w-[110px]">Giá mục tiêu</th>
                  <th className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap w-[70px]">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedReports.map((report) => {
                  const recBadge = getRecommendationBadge(report.recommendation);

                  return (
                    <tr key={report.id} className="group transition-colors hover:bg-muted/30">
                      {/* Ngày */}
                      <td className="py-3.5 pl-4 pr-3 font-mono text-muted-foreground whitespace-nowrap align-top">
                        {report.displayDate}
                      </td>

                      {/* Tiêu đề & Thumbnail */}
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex gap-2.5 items-start">
                          {report.thumbnailUrl ? (
                            <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                              <img
                                src={report.thumbnailUrl}
                                alt={report.title}
                                className="size-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                              <FileText className="size-5" />
                            </div>
                          )}
                          <a
                            href={report.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-foreground leading-snug group-hover:text-emerald-400 transition-colors inline-block"
                          >
                            {report.title}
                          </a>
                        </div>
                      </td>

                      {/* Mô tả */}
                      <td className="px-3 py-3.5 align-top text-muted-foreground leading-relaxed">
                        <p className="line-clamp-3 text-[11px] sm:text-xs">
                          {report.description}
                        </p>
                      </td>

                      {/* Nguồn CTCK */}
                      <td className="px-3 py-3.5 text-center font-bold text-foreground/90 whitespace-nowrap align-top font-mono">
                        <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[11px]">
                          {report.source || "CTCK"}
                        </span>
                      </td>

                      {/* Số trang */}
                      <td className="px-3 py-3.5 text-center text-muted-foreground whitespace-nowrap align-top font-mono">
                        {report.pageCount ? `${report.pageCount} trang` : "—"}
                      </td>

                      {/* Khuyến nghị */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap align-top">
                        {recBadge ? (
                          <span
                            className={cn(
                              "inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
                              recBadge.className
                            )}
                          >
                            {recBadge.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Giá mục tiêu */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap align-top font-mono font-bold text-foreground">
                        {report.targetPrice != null && report.targetPrice > 0 ? (
                          <span>{report.targetPrice.toLocaleString("vi-VN")} đ</span>
                        ) : (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                      </td>

                      {/* Tải về */}
                      <td className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap align-top">
                        <a
                          href={report.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 shadow-sm"
                          title="Tải / Xem PDF"
                        >
                          <Download className="size-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DẠNG LƯỚI CARD */
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedReports.map((report) => {
            const recBadge = getRecommendationBadge(report.recommendation);

            return (
              <div
                key={report.id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
              >
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground font-mono">
                      {report.source}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {report.displayDate}
                    </span>
                  </div>

                  <div className="flex gap-3 mb-2.5">
                    {report.thumbnailUrl && (
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        <img
                          src={report.thumbnailUrl}
                          alt={report.title}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h3 className="text-sm font-bold text-foreground leading-snug group-hover:text-emerald-400 transition-colors">
                      {report.title}
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
                  <div>
                    {report.targetPrice != null && report.targetPrice > 0 ? (
                      <span className="font-mono font-bold text-foreground">
                        Giá MT: {report.targetPrice.toLocaleString("vi-VN")} đ
                      </span>
                    ) : recBadge ? (
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          recBadge.className
                        )}
                      >
                        {recBadge.label}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{report.pageCount} trang</span>
                    )}
                  </div>

                  <a
                    href={report.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    <Download className="size-3.5" />
                    Tải PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  page === p
                    ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
