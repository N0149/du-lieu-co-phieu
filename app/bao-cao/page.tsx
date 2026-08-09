"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Report {
  slug: string;
  ticker: string;
  title: string;
  category: string;
  date: string;
  driveDocId: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

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
        return (
          r.ticker.toLowerCase().includes(query) ||
          r.title.toLowerCase().includes(query)
        );
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
  }, [reports, search, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
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
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
          >
            <option value="newest">📅 Mới cập nhật nhất</option>
            <option value="oldest">📅 Cũ nhất</option>
          </select>
        </div>
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
            filteredAndSortedReports.map((report) => (
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
              </Link>
            ))
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