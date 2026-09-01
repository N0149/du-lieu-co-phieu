"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import industryData from "@/data/industry-reports.json";

export interface IndustryReportItem {
  id: string;
  slug: string;
  title: string;
  source: string;
  date: string;
  displayDate: string;
  scope: string;
  sectorName: string;
  symbol: string | null;
  description: string;
  pageCount: number;
  downloadUrl: string;
  thumbnailUrl: string;
  recommendation: string | null;
  targetPrice: number | null;
}

const SECTOR_COLORS: Record<string, string> = {
  "Ngân hàng": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Bất động sản": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Bất động sản khu công nghiệp": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Điện": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Dầu khí": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Vận tải & Logistics": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "Nông nghiệp & Thủy sản": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "Hóa chất": "bg-lime-500/15 text-lime-400 border-lime-500/30",
  "Bán lẻ": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "Dệt May": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "Thực phẩm & Đồ uống": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Chứng khoán": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Vật liệu xây dựng": "bg-stone-500/15 text-stone-300 border-stone-500/30",
  "Công nghệ": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Dược phẩm": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export function IndustryReportsTab() {
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const rawReports: IndustryReportItem[] = useMemo(() => {
    return (industryData.reports as IndustryReportItem[]) || [];
  }, []);

  const availableSectors = useMemo(() => {
    return (industryData.availableSectors as string[]) || [];
  }, []);

  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    for (const r of rawReports) {
      if (r.source) sources.add(r.source);
    }
    return Array.from(sources).sort();
  }, [rawReports]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rawReports) {
      counts[r.sectorName] = (counts[r.sectorName] || 0) + 1;
    }
    return counts;
  }, [rawReports]);

  const filteredReports = useMemo(() => {
    return rawReports.filter((item) => {
      if (selectedSector !== "all" && item.sectorName !== selectedSector) {
        return false;
      }
      if (selectedSource !== "all" && item.source !== selectedSource) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const haystack = `${item.title} ${item.sectorName} ${item.description} ${item.source}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rawReports, selectedSector, selectedSource, search]);

  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, page, pageSize]);

  const handleSectorChange = (sec: string) => {
    setSelectedSector(sec);
    setPage(1);
  };

  const handleSourceChange = (src: string) => {
    setSelectedSource(src);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedSector("all");
    setSelectedSource("all");
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
              placeholder="Tìm theo tiêu đề, từ khóa, ngành (vd: Cảng biển, Cá tra, Phân bón, Dầu khí)..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Bộ lọc Dropdown Ngành & Nguồn CTCK & Chế độ xem */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Ngành */}
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <select
                value={selectedSector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
              >
                <option value="all">Tất cả ngành ({rawReports.length})</option>
                {availableSectors.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} ({sectorCounts[sec] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Nguồn CTCK */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={selectedSource}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
              >
                <option value="all">Nguồn CTCK</option>
                {availableSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Table / Grid */}
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

            {(selectedSector !== "all" || selectedSource !== "all" || search) && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground cursor-pointer"
                title="Xóa bộ lọc"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh Quick Filter các ngành hot */}
        <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none border-t border-border/40 pt-3">
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap mr-1">
            Ngành phổ biến:
          </span>
          {["Ngân hàng", "Bất động sản", "Điện", "Dầu khí", "Vận tải & Logistics", "Hóa chất", "Nông nghiệp & Thủy sản", "Dệt May"].map(
            (sec) => {
              const active = selectedSector === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSectorChange(active ? "all" : sec)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer",
                    active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                      : "bg-card text-muted-foreground border border-border hover:text-foreground hover:border-border/80"
                  )}
                >
                  {sec}
                  <span className="text-[9px] opacity-70 font-mono">({sectorCounts[sec] || 0})</span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Thông tin số lượng kết quả */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
        <span>
          Tìm thấy <strong>{totalItems}</strong> báo cáo ngành
          {selectedSector !== "all" && <span> trong ngành <strong className="text-foreground">{selectedSector}</strong></span>}
          {selectedSource !== "all" && <span> từ <strong className="text-foreground">{selectedSource}</strong></span>}
        </span>
        <span>
          Trang <strong>{page}</strong> / {totalPages}
        </span>
      </div>

      {/* Hiển thị danh sách báo cáo */}
      {paginatedReports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Không tìm thấy báo cáo ngành nào phù hợp</p>
          <p className="mt-1 text-xs">Vui lòng thử thay đổi từ khóa tìm kiếm hoặc chọn ngành khác.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            Xem tất cả báo cáo
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* DẠNG BẢNG (TABLE VIEW - GIỐNG RUATICHSAN) */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 whitespace-nowrap w-[95px]">Ngày</th>
                  <th className="px-3 py-3.5 whitespace-nowrap w-[150px]">Ngành</th>
                  <th className="px-3 py-3.5 min-w-[220px] max-w-[300px]">Tiêu đề</th>
                  <th className="px-3 py-3.5 min-w-[320px]">Tóm tắt luận điểm</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap w-[80px]">Nguồn</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap w-[85px]">Số trang</th>
                  <th className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap w-[90px]">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedReports.map((report) => {
                  const badgeStyle =
                    SECTOR_COLORS[report.sectorName] ||
                    "bg-slate-500/15 text-slate-300 border-slate-500/30";

                  return (
                    <tr
                      key={report.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      {/* Ngày */}
                      <td className="py-3.5 pl-4 pr-3 font-mono text-muted-foreground whitespace-nowrap align-top">
                        {report.displayDate}
                      </td>

                      {/* Ngành */}
                      <td className="px-3 py-3.5 align-top">
                        <span
                          className={cn(
                            "inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                            badgeStyle
                          )}
                        >
                          {report.sectorName}
                        </span>
                      </td>

                      {/* Tiêu đề & Thumbnail */}
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex gap-2.5 items-start">
                          {report.thumbnailUrl ? (
                            <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          <div className="flex-1">
                            <a
                              href={report.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-foreground leading-snug group-hover:text-emerald-400 transition-colors inline-block"
                            >
                              {report.title}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Tóm tắt */}
                      <td className="px-3 py-3.5 align-top text-muted-foreground leading-relaxed">
                        <p className="line-clamp-3 text-[11px] sm:text-xs">
                          {report.description}
                        </p>
                      </td>

                      {/* Nguồn */}
                      <td className="px-3 py-3.5 text-center font-bold text-foreground/90 whitespace-nowrap align-top font-mono">
                        <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[11px]">
                          {report.source || "MAS"}
                        </span>
                      </td>

                      {/* Số trang */}
                      <td className="px-3 py-3.5 text-center text-muted-foreground whitespace-nowrap align-top font-mono">
                        {report.pageCount ? `${report.pageCount} trang` : "—"}
                      </td>

                      {/* Tải về */}
                      <td className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap align-top">
                        <a
                          href={report.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 shadow-sm"
                          title="Tải / Xem PDF báo cáo"
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
        /* DẠNG LƯỚI CARD (GRID VIEW) */
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedReports.map((report) => {
            const badgeStyle =
              SECTOR_COLORS[report.sectorName] ||
              "bg-slate-500/15 text-slate-300 border-slate-500/30";

            return (
              <div
                key={report.id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
              >
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                        badgeStyle
                      )}
                    >
                      {report.sectorName}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {report.displayDate}
                    </span>
                  </div>

                  <div className="flex gap-3 mb-2.5">
                    {report.thumbnailUrl && (
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                      {report.source || "MAS"}
                    </span>
                    {report.pageCount > 0 && (
                      <span className="text-[11px] font-mono">{report.pageCount} trang</span>
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

      {/* Phân trang (Pagination) */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              return p === 1 || p === totalPages || Math.abs(p - page) <= 2;
            })
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev && p - prev > 1;

              return (
                <div key={p} className="flex items-center gap-1">
                  {showEllipsis && (
                    <span className="px-1 text-xs text-muted-foreground">...</span>
                  )}
                  <button
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
                </div>
              );
            })}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
