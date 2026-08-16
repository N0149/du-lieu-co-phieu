"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fmtPrice, fmtPct } from "@/lib/format";

interface Report {
  slug: string;
  ticker: string | null;
  title: string;
  category: string;
  date: string;
  driveDocId: string;
  summary?: string | null;
  targetPrice?: number | null;
  currentPrice?: number | null;
  upside?: number | null;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 max-w-5xl">Đang tải...</div>}>
      <ReportsPageInner />
    </Suspense>
  );
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get("ticker") ?? "";
  const searchParam = searchParams.get("search") ?? "";

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [tab, setTab] = useState<"all" | "stock" | "commodity" | "macro">("all");

  // Khi được điều hướng từ bộ lọc/tìm kiếm (/?ticker=MÃ_CK hoặc ?search=TỪ_KHÓA),
  // tự điền ô tìm kiếm để lọc danh sách báo cáo tương ứng
  useEffect(() => {
    if (tickerParam) setSearch(tickerParam.toUpperCase());
    else if (searchParam) setSearch(searchParam);
  }, [tickerParam, searchParam]);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReports(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Xử lý lọc theo từ khóa và sắp xếp theo ngày đăng
  const filteredAndSortedReports = useMemo(() => {
    return reports
      .filter((r) => {
        const query = search.toLowerCase().trim();
        const haystack = `${r.ticker ?? ""} ${r.title}`.toLowerCase();
        if (!haystack.includes(query)) return false;

        // Lọc theo tab: Cổ phiếu / Hàng hóa & Ngành / Kinh tế Vĩ mô
        if (tab === "stock") return r.category !== "macro" && r.category !== "commodity";
        if (tab === "commodity") return r.category === "commodity";
        if (tab === "macro") return r.category === "macro";
        return true;
      })
      .sort((a, b) => {
        // Chuyển định dạng ngày YYYY-MM-DD hoặc DD/MM/YYYY thành Timestamp để so sánh
        const parseDate = (dStr: string) => {
          if (dStr.includes("/")) {
            const [d, m, y] = dStr.split("/");
            return new Date(`${y}-${m}-${d}`).getTime();
          }
          return new Date(dStr).getTime();
        };

        const timeA = parseDate(a.date) || 0;
        const timeB = parseDate(b.date) || 0;

        return sortBy === "newest" ? timeB - timeA : timeA - timeB;
      });
}, [reports, search, sortBy, tab]);

  // Số lượng báo cáo theo từng loại — hiển thị trên thanh Tab
  const tabCounts = useMemo(() => {
    const isStock = (r: Report) => r.category !== "macro" && r.category !== "commodity";
    return {
      all: reports.length,
      stock: reports.filter(isStock).length,
      commodity: reports.filter((r) => r.category === "commodity").length,
      macro: reports.filter((r) => r.category === "macro").length,
    };
  }, [reports]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Nút quay về trang chủ */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 shadow-sm hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all duration-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Quay lại Trang chủ
        </Link>
      </div>

      {/* Tiêu đề trang */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Báo Cáo Phân Tích Chuyên Sâu</h1>
        <p className="text-slate-500 text-sm mt-1">
          Hệ thống đồng bộ dữ liệu trực tiếp từ kho nghiên cứu Google Drive
        </p>
      </div>

      {/* Thanh công cụ: Ô tìm kiếm & Bộ sắp xếp */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Ô tìm kiếm theo Mã CK hoặc tiêu đề */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="🔍 Tìm nhanh theo Mã CK (SNZ, VNF, LHG, HPG...) hoặc tên bài viết..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔍</span>
        </div>

        {/* Dropdown sắp xếp theo Mới nhất / Cũ nhất */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 cursor-pointer"
          >
            <option value="newest">📅 Mới cập nhật nhất</option>
            <option value="oldest">📅 Cũ nhất</option>
          </select>
        </div>
      </div>

      {/* Thanh Tab lọc loại báo cáo: Tất cả / Cổ phiếu / Hàng hóa & Ngành / Kinh tế Vĩ mô */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <TabButton active={tab === "all"} onClick={() => setTab("all")} label="Tất cả" count={tabCounts.all} />
        <TabButton active={tab === "stock"} onClick={() => setTab("stock")} label="Cổ phiếu" count={tabCounts.stock} />
        <TabButton active={tab === "commodity"} onClick={() => setTab("commodity")} label="Hàng hóa & Ngành" count={tabCounts.commodity} tone="orange" />
        <TabButton active={tab === "macro"} onClick={() => setTab("macro")} label="Kinh tế Vĩ mô" count={tabCounts.macro} tone="purple" />
      </div>

      {/* Hiển thị số lượng kết quả */}
      <div className="text-xs text-slate-500 mb-4 font-medium">
        Hiển thị <strong>{filteredAndSortedReports.length}</strong> / {reports.length} báo cáo
      </div>

      {/* Trạng thái loading */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Đang tải danh sách báo cáo...</p>
        </div>
      ) : (
        /* Danh sách thẻ báo cáo */
        <div className="space-y-3">
          {filteredAndSortedReports.length > 0 ? (
            filteredAndSortedReports.map((report) => {
              const isMacro = report.category === "macro";
              const isCommodity = report.category === "commodity";
              const isSpecial = isMacro || isCommodity;

              // Bài Vĩ mô / Hàng hóa: Card riêng — badge màu cam/tím, tập trung
              // vào Tiêu đề, Tóm tắt và Ngày công bố (không có Giá MT / Upside)
              if (isSpecial) {
                return (
                  <Link
                    key={report.driveDocId}
                    href={`/bao-cao/${report.driveDocId}`}
                    className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          isMacro
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}
                      >
                        <span>{isMacro ? "📈" : "📦"}</span>
                        {isMacro ? "KINH TẾ VĨ MÔ" : "HÀNG HÓA & NGÀNH"}
                      </span>
                      <span className="text-xs text-slate-400">{report.date}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-600 transition">
                      {report.title}
                    </h3>
                    {report.summary && (
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-3">
                        {report.summary}
                      </p>
                    )}
                  </Link>
                );
              }

              // Cổ phiếu: giữ card cũ + dòng định giá (Giá MT / Upside) nếu có
              const upside = report.upside;
              return (
                <Link
                  key={report.driveDocId}
                  href={`/bao-cao/${report.driveDocId}`}
                  className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md text-xs border border-emerald-200">
                        {report.ticker}
                      </span>
                      <span className="text-xs text-slate-400">{report.category}</span>
                    </div>
                    <span className="text-xs text-slate-400">{report.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-600 transition">
                    {report.title}
                  </h3>
                  {report.targetPrice != null && (
                    <div className="mt-2 flex items-center gap-3 text-xs font-medium">
                      <span className="text-slate-500">
                        Giá MT:{" "}
                        <strong className="text-slate-700">{fmtPrice(report.targetPrice)}</strong>
                      </span>
                      {upside != null && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                            upside >= 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {fmtPct(upside)}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              Không tìm thấy báo cáo phù hợp với từ khóa "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Nút Tab lọc loại báo cáo — màu theo loại (emerald mặc định, cam/tím cho bài đặc biệt)
function TabButton({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "orange" | "purple";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
      : tone === "purple"
        ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
        active
          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
          : toneClass
      }`}
    >
      {label}
      <span className={`text-xs ${active ? "text-white/80" : "text-slate-400"}`}>({count})</span>
    </button>
  );
}