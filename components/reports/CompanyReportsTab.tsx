"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  RotateCcw,
  ExternalLink,
  Building2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompanyReportItem {
  id: string;
  symbol: string;
  title: string;
  slug: string;
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

const REC_COLORS: Record<string, string> = {
  MUA: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "MUA MẠNH": "bg-emerald-600/20 text-emerald-300 border-emerald-500/40 font-bold",
  "KHẢ QUAN": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "TĂNG TỶ TRỌNG": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "TÍCH LŨY": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "TÍCH CỰC": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "NẮM GIỮ": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "TRUNG LẬP": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "THEO DÕI": "bg-slate-500/15 text-slate-300 border-slate-500/30",
  BÁN: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "GIẢM TỶ TRỌNG": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "KÉM KHẢ QUAN": "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function CompanyReportsTab({
  initialTicker = "",
  symbol = "",
}: {
  initialTicker?: string;
  symbol?: string;
}) {
  const defaultTicker = symbol || initialTicker;
  const [reports, setReports] = useState<CompanyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(defaultTicker);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedRec, setSelectedRec] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableRecs, setAvailableRecs] = useState<string[]>([]);

  const pageSize = 20;

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: "company",
        page: String(page),
        limit: String(pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (selectedSource !== "all") params.set("source", selectedSource);
      if (selectedRec !== "all") params.set("recommendation", selectedRec);

      const res = await fetch(`/api/analyst-reports?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setReports(data.reports || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
        if (data.availableSources?.length && availableSources.length === 0) {
          setAvailableSources(data.availableSources);
        }
        if (data.availableRecommendations?.length && availableRecs.length === 0) {
          setAvailableRecs(data.availableRecommendations);
        }
      }
    } catch (e) {
      console.error("Lỗi tải báo cáo doanh nghiệp:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, selectedSource, selectedRec]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchReports();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const resetFilters = () => {
    setSearch("");
    setSelectedSource("all");
    setSelectedRec("all");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Bộ điều khiển & Tìm kiếm */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo Mã CK (HPG, FPT, MWG, VCB...) hoặc tiêu đề báo cáo..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Bộ lọc Dropdown Nguồn CTCK & Khuyến nghị & Chế độ xem */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Khuyến Nghị */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={selectedRec}
                onChange={(e) => {
                  setSelectedRec(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
              >
                <option value="all">Khuyến nghị: Tất cả</option>
                {availableRecs.map((rec) => (
                  <option key={rec} value={rec}>
                    {rec}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Nguồn CTCK */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
              >
                <option value="all">Nguồn CTCK: Tất cả</option>
                {availableSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Chế độ xem Bảng / Lưới */}
            <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-colors cursor-pointer",
                  viewMode === "table"
                    ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Xem dạng Bảng"
              >
                <LayoutList className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Xem dạng Lưới thẻ"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái bộ lọc */}
        {(search || selectedSource !== "all" || selectedRec !== "all") && (
          <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
            <span>Đang lọc:</span>
            {search && (
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                Từ khóa: &quot;{search}&quot;
              </span>
            )}
            {selectedRec !== "all" && (
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                Khuyến nghị: {selectedRec}
              </span>
            )}
            {selectedSource !== "all" && (
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                Nguồn: {selectedSource}
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              <RotateCcw className="size-3" /> Đặt lại
            </button>
          </div>
        )}
      </div>

      {/* Thông tin số lượng kết quả */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Tìm thấy <strong className="font-semibold text-foreground">{totalItems.toLocaleString("vi-VN")}</strong> báo cáo phân tích doanh nghiệp
        </span>
        <span>
          Trang {page} / {totalPages}
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/40 p-8 text-center">
          <div className="size-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải kho báo cáo doanh nghiệp...</p>
        </div>
      ) : reports.length === 0 ? (
        /* Empty State */
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
            <FileText className="size-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Không tìm thấy báo cáo nào phù hợp</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Vui lòng thử thay đổi từ khóa tìm kiếm hoặc chọn nguồn CTCK khác.
            </p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted cursor-pointer"
          >
            <RotateCcw className="size-3.5" /> Xem tất cả báo cáo
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Chế độ Bảng */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 pl-4 pr-3">Mã CP</th>
                  <th className="py-3.5 px-3 min-w-[320px]">Tiêu đề báo cáo</th>
                  <th className="py-3.5 px-3">CTCK</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Ngày</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Khuyến nghị</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">Giá mục tiêu</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {reports.map((item) => {
                  const recClass = item.recommendation
                    ? REC_COLORS[item.recommendation.toUpperCase()] || "bg-muted text-muted-foreground border-border"
                    : "";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      {/* Mã CP */}
                      <td className="py-3 pl-4 pr-3 font-semibold">
                        <Link
                          href={`/stock/${item.symbol.toLowerCase()}`}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                        >
                          {item.symbol}
                        </Link>
                      </td>

                      {/* Tiêu đề */}
                      <td className="py-3 px-3">
                        {item.downloadUrl ? (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-emerald-400 transition-colors line-clamp-2 leading-relaxed"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="font-medium text-foreground line-clamp-2 leading-relaxed">
                            {item.title}
                          </span>
                        )}
                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground font-normal">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* CTCK */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {item.source}
                        </span>
                      </td>

                      {/* Ngày */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-muted-foreground text-[11px]">
                        {item.displayDate || item.date}
                      </td>

                      {/* Khuyến nghị */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.recommendation ? (
                          <span
                            className={cn(
                              "inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                              recClass
                            )}
                          >
                            {item.recommendation}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Giá mục tiêu */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-medium">
                        {item.targetPrice ? (
                          <span className="text-emerald-400 font-bold">
                            {item.targetPrice.toLocaleString("vi-VN")} đ
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Tải về */}
                      <td className="py-3 pr-4 pl-3 text-right whitespace-nowrap">
                        {item.downloadUrl ? (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                          >
                            <Download className="size-3" />
                            <span>PDF</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground/40 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Chế độ Lưới */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((item) => {
            const recClass = item.recommendation
              ? REC_COLORS[item.recommendation.toUpperCase()] || "bg-muted text-muted-foreground border-border"
              : "";

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/stock/${item.symbol.toLowerCase()}`}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/20"
                    >
                      {item.symbol}
                    </Link>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.displayDate || item.date}
                    </span>
                  </div>

                  <h4 className="mt-2 text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {item.source}
                    </span>

                    {item.recommendation && (
                      <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", recClass)}>
                        {item.recommendation}
                      </span>
                    )}

                    {item.targetPrice && (
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {item.targetPrice.toLocaleString("vi-VN")} đ
                      </span>
                    )}
                  </div>

                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                    >
                      <Download className="size-3.5" /> Tải Báo Cáo PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="px-3 text-xs font-medium text-muted-foreground">
            Trang <strong className="text-foreground">{page}</strong> / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
