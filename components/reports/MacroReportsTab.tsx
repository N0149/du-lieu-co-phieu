"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  RotateCcw,
  Globe2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MacroReportItem {
  id: number;
  title: string;
  source: string;
  date: string;
  url: string;
  category: string;
}

export function MacroReportsTab({ subType = "macro_strategy" }: { subType?: "macro_strategy" | "bond_ir" }) {
  const [reports, setReports] = useState<MacroReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  const pageSize = 15;

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: subType,
        page: String(page),
        limit: String(pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (selectedSource !== "all") params.set("source", selectedSource);

      const res = await fetch(`/api/analyst-reports?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        let list: MacroReportItem[] = data.reports || [];
        if (categoryFilter !== "all") {
          list = list.filter((r) => r.category === categoryFilter);
        }
        setReports(list);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
        if (data.availableSources?.length) {
          setAvailableSources(data.availableSources);
        }
      }
    } catch (e) {
      console.error("Lỗi tải báo cáo vĩ mô/chiến lược:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, selectedSource, categoryFilter, subType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchReports();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return isoStr;
    }
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
              placeholder="Tìm theo chủ đề vĩ mô, lãi suất, tỷ giá, GDP, chiến lược thị trường..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Bộ lọc Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Thể Loại */}
            <div className="relative min-w-[170px] flex-1 sm:flex-initial">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
              >
                <option value="all">Tất cả phân loại</option>
                {subType === "macro_strategy" ? (
                  <>
                    <option value="Báo cáo Vĩ mô">Báo cáo Vĩ mô</option>
                    <option value="Báo cáo Chiến lược">Báo cáo Chiến lược</option>
                  </>
                ) : (
                  <>
                    <option value="Báo cáo Trái phiếu">Báo cáo Trái phiếu</option>
                    <option value="Bản tin IR">Bản tin IR</option>
                  </>
                )}
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
                <option value="all">Nguồn: Tất cả</option>
                {availableSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Chế độ xem */}
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
                title="Xem dạng Lưới"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin số lượng kết quả */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Tìm thấy <strong className="font-semibold text-foreground">{totalItems}</strong> báo cáo chuyên sâu
        </span>
        <span>
          Trang {page} / {totalPages}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/40 p-8 text-center">
          <div className="size-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải danh sách báo cáo...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
            <FileText className="size-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Không tìm thấy báo cáo nào phù hợp</h3>
            <p className="mt-1 text-xs text-muted-foreground">Vui lòng thử thay đổi từ khóa tìm kiếm.</p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 pl-4 pr-3 min-w-[340px]">Tiêu đề báo cáo</th>
                  <th className="py-3.5 px-3">Phân loại</th>
                  <th className="py-3.5 px-3">Nguồn phát hành</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Ngày công bố</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {reports.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-muted/30">
                    <td className="py-3.5 pl-4 pr-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground hover:text-emerald-400 transition-colors line-clamp-2 leading-relaxed"
                      >
                        {item.title}
                      </a>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-400">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {item.source}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap font-mono text-muted-foreground text-[11px]">
                      {formatDate(item.date)}
                    </td>

                    <td className="py-3.5 pr-4 pl-3 text-right whitespace-nowrap">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                        >
                          <Download className="size-3" />
                          <span>PDF</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                    {item.category}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{formatDate(item.date)}</span>
                </div>

                <h4 className="mt-2.5 text-sm font-semibold text-foreground line-clamp-3 leading-snug group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h4>
              </div>

              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {item.source}
                  </span>
                </div>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                  >
                    <Download className="size-3.5" /> Tải Báo Cáo PDF
                  </a>
                )}
              </div>
            </div>
          ))}
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
