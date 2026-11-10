"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { fmtPrice, fmtPct } from "@/lib/format";
import { getAllStocks, type StockManifestItem } from "@/lib/longlivestock";
import {
  Search,
  ArrowLeft,
  FileText,
  Layers,
  Building2,
  Sparkles,
  Globe2,
  Crown,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { CompanyReportsTab } from "@/components/reports/CompanyReportsTab";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/lib/use-auth";
import { VipUpgradeModal } from "@/components/auth/VipUpgradeModal";

// Nạp lười (Lazy load) Báo cáo ngành & Vĩ mô để loại bỏ 745 KB dữ liệu JSON khỏi bundle ban đầu
const IndustryReportsTab = dynamic(
  () => import("@/components/reports/IndustryReportsTab").then((m) => m.IndustryReportsTab),
  { ssr: false, loading: () => <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">Đang nạp dữ liệu Báo cáo ngành...</div> }
);

const MacroReportsTab = dynamic(
  () => import("@/components/reports/MacroReportsTab").then((m) => m.MacroReportsTab),
  { ssr: false, loading: () => <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">Đang nạp dữ liệu Báo cáo vĩ mô...</div> }
);

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

export type CategoryKey =
  | "all"
  | "rnav"
  | "real_estate"
  | "logistics"
  | "consumer"
  | "utilities"
  | "materials"
  | "industrial"
  | "healthcare"
  | "finance"
  | "macro_commodity";

interface CategoryDef {
  key: CategoryKey;
  label: string;
}

const CATEGORY_TABS: CategoryDef[] = [
  { key: "all", label: "Tất cả" },
  { key: "rnav", label: "Định giá RNAV" },
  { key: "real_estate", label: "BĐS & Xây dựng" },
  { key: "logistics", label: "Cảng & Logistics" },
  { key: "consumer", label: "Tiêu dùng & Nông sản" },
  { key: "utilities", label: "Năng lượng & Tiện ích" },
  { key: "materials", label: "Vật liệu & Hóa chất" },
  { key: "industrial", label: "Công nghiệp & Chế tạo" },
  { key: "healthcare", label: "Dược phẩm & Y tế" },
  { key: "finance", label: "Tài chính & Bảo hiểm" },
  { key: "macro_commodity", label: "Vĩ mô & Hàng hóa" },
];

function getReportCategory(
  report: Report,
  stockMap: Map<string, StockManifestItem>
): {
  key: CategoryKey;
  label: string;
  badgeClass: string;
} {
  const t = (report.title || "").toLowerCase();
  const c = (report.category || "").toLowerCase();
  const tick = (report.ticker || "").toUpperCase();

  if (
    c === "macro" ||
    t.includes("vĩ mô") ||
    t.includes("lãi suất") ||
    t.includes("cpi") ||
    t.includes("gdp")
  ) {
    return {
      key: "macro_commodity",
      label: "Kinh Tế Vĩ Mô",
      badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    };
  }

  if (
    c === "commodity" ||
    t.includes("hàng hóa") ||
    t.includes("giá thép") ||
    t.includes("giá dầu") ||
    t.includes("giá cao su")
  ) {
    return {
      key: "macro_commodity",
      label: "Hàng Hóa & Ngành",
      badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    };
  }

  if (
    c === "rnav" ||
    t.includes("rnav") ||
    t.includes("tài sản") ||
    ["SNZ", "LHG", "SZL", "SZC", "SZB", "IDV", "DRI", "SD9", "TNW", "VCP", "TID", "FMC"].includes(
      tick
    )
  ) {
    return {
      key: "rnav",
      label: "Định Giá RNAV",
      badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  }

  const stock = stockMap.get(tick);
  const s = (stock?.s || "").toLowerCase();

  if (
    s.includes("bất động sản") ||
    s.includes("xây dựng") ||
    s.includes("xây lắp") ||
    ["NLG", "DTD", "D11", "DC4", "MH3", "NTC", "TIP", "HUB", "MVC"].includes(tick)
  ) {
    return {
      key: "real_estate",
      label: "BĐS & Xây Dựng",
      badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
  }

  if (
    s.includes("vận tải") ||
    s.includes("cảng") ||
    s.includes("logistics") ||
    s.includes("hàng không") ||
    [
      "SGP",
      "DVP",
      "VTO",
      "VNL",
      "CLL",
      "PJT",
      "PVP",
      "PDV",
      "NCT",
      "SAS",
      "ILB",
      "GSP",
      "PCT",
    ].includes(tick)
  ) {
    return {
      key: "logistics",
      label: "Cảng & Logistics",
      badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    };
  }

  if (
    s.includes("điện") ||
    s.includes("nước") ||
    s.includes("khí") ||
    s.includes("tiện ích") ||
    ["BWS", "EIC", "HWS", "BTP", "DSH", "DNW", "BTU", "TTA", "HPD", "QTP", "NT2", "UIC"].includes(
      tick
    )
  ) {
    return {
      key: "utilities",
      label: "Năng Lượng & Tiện Ích",
      badgeClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    };
  }

  if (
    s.includes("thực phẩm") ||
    s.includes("nông sản") ||
    s.includes("thủy sản") ||
    s.includes("bia") ||
    s.includes("tiêu dùng") ||
    s.includes("dệt may") ||
    s.includes("quần áo") ||
    s.includes("da giầy") ||
    [
      "WSB",
      "MSN",
      "MLS",
      "HDM",
      "CAP",
      "BLT",
      "BHA",
      "SMB",
      "BIO",
      "CAT",
      "LAF",
      "ANT",
      "ABT",
      "FOC",
    ].includes(tick)
  ) {
    return {
      key: "consumer",
      label: "Tiêu Dùng & Nông Sản",
      badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    };
  }

  if (
    s.includes("hóa chất") ||
    s.includes("vật liệu") ||
    s.includes("thép") ||
    s.includes("than") ||
    s.includes("khoáng") ||
    s.includes("kim loại") ||
    s.includes("xi măng") ||
    s.includes("gỗ") ||
    s.includes("giấy") ||
    s.includes("nhựa") ||
    s.includes("cao su") ||
    [
      "DHA",
      "BMP",
      "DCM",
      "GDA",
      "GMX",
      "BTS",
      "CLH",
      "LIX",
      "HVT",
      "MDF",
      "VFG",
      "CLM",
      "DDV",
      "VLB",
      "NNC",
      "HMC",
      "HHP",
      "ACG",
      "TYA",
      "DHB",
      "PPY",
      "PSC",
    ].includes(tick)
  ) {
    return {
      key: "materials",
      label: "Vật Liệu & Hóa Chất",
      badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    };
  }

  if (
    s.includes("dược") ||
    s.includes("y tế") ||
    ["DTP", "MKV", "MED", "DMC", "BIO"].includes(tick)
  ) {
    return {
      key: "healthcare",
      label: "Dược Phẩm & Y Tế",
      badgeClass: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    };
  }

  if (
    s.includes("bảo hiểm") ||
    s.includes("tài chính") ||
    s.includes("ngân hàng") ||
    ["PVI", "ABI", "BMI", "BLI"].includes(tick)
  ) {
    return {
      key: "finance",
      label: "Tài Chính & Bảo Hiểm",
      badgeClass: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    };
  }

  return {
    key: "industrial",
    label: "Công Nghiệp & Khác",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
          <div className="inline-block size-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ReportsPageInner />
    </Suspense>
  );
}

export type MainTab = "company" | "industry" | "macro" | "bond_ir" | "rnav";

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get("ticker") ?? "";
  const searchParam = searchParams.get("search") ?? "";
  const tabParam = (searchParams.get("tab") as CategoryKey) ?? "all";
  const viewParam = searchParams.get("view") as string | null;

  const [mainTab, setMainTab] = useState<MainTab>(() => {
    if (viewParam === "industry") return "industry";
    if (viewParam === "macro") return "macro";
    if (viewParam === "bond_ir") return "bond_ir";
    if (viewParam === "rnav") return "rnav";
    return "company";
  });

  const [stats, setStats] = useState({
    company: 3994,
    industry: 485,
    macroStrategyTotal: 50,
    bondIrTotal: 50,
  });

  const { isVip } = useAuth();
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [vipModalConfig, setVipModalConfig] = useState<{ title?: string; subtitle?: string }>({});

  // Ẩn số điểm định giá trong tiêu đề báo cáo độc quyền đối với thành viên chưa nâng VIP
  const sanitizeReportTitle = (title: string) => {
    if (isVip) return title;
    return title
      .replace(/(?:điểm\s*)?[-–:]\s*(\d{2,3}(?:\.\d+)?)/gi, '· 🔒 ??? Điểm')
      .replace(/\.docx$/i, '');
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "upside">("newest");
  const [tab, setTab] = useState<CategoryKey>(tabParam);

  const stockManifestMap = useMemo(() => {
    const all = getAllStocks();
    return new Map(all.map((s) => [s.t.toUpperCase(), s]));
  }, []);

  useEffect(() => {
    fetch("/api/analyst-reports?type=stats")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.stats) {
          setStats(data.stats);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tickerParam) {
      setSearch(tickerParam.toUpperCase());
      setMainTab("company");
    } else if (searchParam) {
      setSearch(searchParam);
    }
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

  const categorizedReports = useMemo(() => {
    return reports.map((r) => {
      const cat = getReportCategory(r, stockManifestMap);
      return {
        ...r,
        categoryKey: cat.key,
        categoryLabel: cat.label,
        badgeClass: cat.badgeClass,
      };
    });
  }, [reports, stockManifestMap]);

  const tabCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: reports.length,
      rnav: 0,
      real_estate: 0,
      logistics: 0,
      consumer: 0,
      utilities: 0,
      materials: 0,
      industrial: 0,
      healthcare: 0,
      finance: 0,
      macro_commodity: 0,
    };

    for (const r of categorizedReports) {
      if (counts[r.categoryKey] !== undefined) {
        counts[r.categoryKey]++;
      }
    }
    return counts;
  }, [reports.length, categorizedReports]);

  const filteredAndSortedReports = useMemo(() => {
    return categorizedReports
      .filter((r) => {
        const query = search.toLowerCase().trim();
        if (query) {
          const haystack = `${r.ticker ?? ""} ${r.title} ${r.categoryLabel} ${r.category}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }

        if (tab !== "all" && r.categoryKey !== tab) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "upside") {
          const upA = a.upside ?? -999;
          const upB = b.upside ?? -999;
          return upB - upA;
        }

        const parseDate = (dStr: string) => {
          if (!dStr) return 0;
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
  }, [categorizedReports, search, sortBy, tab]);

  // Giới hạn 6 thẻ bài mẫu cho khách chưa nâng cấp VIP trong tab Định Giá RNAV Độc Quyền
  const visibleReports = useMemo(() => {
    if (isVip) return filteredAndSortedReports;
    return filteredAndSortedReports.slice(0, 6);
  }, [isVip, filteredAndSortedReports]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 flex-1">
        {/* Nút quay về trang chủ */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-card hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Quay lại Trang chủ
          </Link>
        </div>

        {/* Header trang */}
        <div className="mb-6 border-b border-border pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
                Kho Báo Cáo Phân Tích
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <Sparkles className="size-3" /> Cập nhật 2026
                </span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tổng hợp báo cáo phân tích chuyên sâu các ngành kinh tế từ CTCK hàng đầu và báo cáo định giá độc lập RNAV
              </p>
            </div>
          </div>

          {/* CHUYỂN ĐỔI CHUYÊN MỤC CHÍNH (MAIN TABS THEO PHONG CÁCH WIDATA) */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={() => setMainTab("company")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap",
                mainTab === "company"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <Building2 className="size-4" />
              <span>Báo Cáo Doanh Nghiệp</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold",
                  mainTab === "company" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {stats.company.toLocaleString("vi-VN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("industry")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap",
                mainTab === "industry"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <Layers className="size-4" />
              <span>Báo Cáo Ngành</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold",
                  mainTab === "industry" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {stats.industry.toLocaleString("vi-VN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("macro")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap",
                mainTab === "macro"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <Globe2 className="size-4" />
              <span>Thị Trường & Vĩ Mô</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold",
                  mainTab === "macro" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {stats.macroStrategyTotal.toLocaleString("vi-VN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("bond_ir")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap",
                mainTab === "bond_ir"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <FileText className="size-4" />
              <span>Trái Phiếu & Tin IR</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold",
                  mainTab === "bond_ir" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {stats.bondIrTotal.toLocaleString("vi-VN")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("rnav")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap",
                mainTab === "rnav"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <Sparkles className="size-4" />
              <span>Định Giá RNAV Độc Quyền</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                <Crown className="size-2.5" /> VIP
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-mono font-bold",
                  mainTab === "rnav" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {reports.length}
              </span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG THEO TAB ĐƯỢC CHỌN (TƯƠNG TỰ WIDATA) - BẢO VỆ BỞI AUTHGATE */}
        <AuthGate
          variant="blur"
          blurHeight={280}
          title="Đăng nhập để xem Kho Báo Cáo Phân Tích Toàn Diện"
          subtitle="Tạo tài khoản miễn phí trong 3 giây bằng Google để tra cứu hơn 4.000 báo cáo phân tích doanh nghiệp, báo cáo ngành và vĩ mô từ các CTCK hàng đầu."
          features={[
            "Tra cứu hơn 4.000+ báo cáo phân tích doanh nghiệp từ các CTCK",
            "Báo cáo ngành chuyên sâu (Bất động sản, Thép, Ngân hàng, Bán lẻ...)",
            "Định giá độc quyền RNAV và các phân tích cơ bản chuyên biệt",
          ]}
          ctaText="Đăng nhập tài khoản miễn phí"
        >
          {mainTab === "company" && (
            <CompanyReportsTab initialTicker={tickerParam} />
          )}

          {mainTab === "industry" && (
            <IndustryReportsTab />
          )}

          {mainTab === "macro" && (
            <MacroReportsTab subType="macro_strategy" />
          )}

          {mainTab === "bond_ir" && (
            <MacroReportsTab subType="bond_ir" />
          )}

          {mainTab === "rnav" && (
            <div className="flex flex-col gap-5">
              {/* Thanh công cụ tìm kiếm & sắp xếp cho Báo cáo doanh nghiệp */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh theo Mã CK (SNZ, VNF, LHG, HPG...) hoặc tên bài viết..."
                    className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "upside")}
                    className="h-10 rounded-xl border border-border bg-card px-3 pr-8 text-xs sm:text-sm font-medium text-foreground outline-none transition-colors cursor-pointer hover:border-border/80 focus:border-emerald-500"
                  >
                    <option value="newest">📅 Mới cập nhật nhất</option>
                    <option value="oldest">📅 Cũ nhất</option>
                    <option value="upside">📈 Upside cao nhất</option>
                  </select>
                </div>
              </div>

              {/* Thanh Tab phân loại ngành cho báo cáo độc quyền */}
              <div className="overflow-x-auto pb-1 scrollbar-none">
                <div className="flex items-center gap-1.5 min-w-max">
                  {CATEGORY_TABS.map((t) => {
                    const count = tabCounts[t.key] ?? 0;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                          active
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                            : "bg-card/50 text-muted-foreground border border-border/60 hover:bg-card hover:text-foreground"
                        )}
                      >
                        {t.label}
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px] font-mono font-medium",
                            active ? "bg-emerald-500/30 text-emerald-300" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hiển thị số lượng */}
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>
                  {isVip ? (
                    <>
                      Hiển thị <strong>{filteredAndSortedReports.length}</strong> / {reports.length} bài phân tích
                    </>
                  ) : (
                    <>
                      Hiển thị <strong>{Math.min(6, filteredAndSortedReports.length)}</strong> / {reports.length} bài phân tích{" "}
                      <span className="text-amber-400 font-bold">(Xem trước 6 bài VIP)</span>
                    </>
                  )}
                </span>
                {tab !== "all" && (
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    Xóa bộ lọc danh mục
                  </button>
                )}
              </div>

              {/* Danh sách thẻ báo cáo */}
              {loading ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  <div className="inline-block size-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Đang tải dữ liệu báo cáo...</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleReports.length > 0 ? (
                      visibleReports.map((report) => {
                        const upside = report.upside;
                        const isSpecial = report.categoryKey === "macro_commodity";
                        const displayTitle = sanitizeReportTitle(report.title);

                        const handleCardClick = (e: React.MouseEvent) => {
                          if (!isVip) {
                            e.preventDefault();
                            setVipModalConfig({
                              title: `Mở Khóa Báo Cáo Định Giá RNAV ${report.ticker || ''} (VIP)`,
                              subtitle: `Báo cáo định giá RNAV độc quyền này yêu cầu gói Hội viên VIP (từ 95.000 đ/tháng). Nâng cấp ngay để mở khóa toàn bộ điểm số, giá mục tiêu và chi tiết bóc tách tài sản ngầm.`,
                            });
                            setVipModalOpen(true);
                          }
                        };

                        if (isSpecial) {
                          return (
                            <Link
                              key={report.driveDocId}
                              href={`/bao-cao/${report.driveDocId}`}
                              onClick={handleCardClick}
                              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-md cursor-pointer"
                            >
                              <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase",
                                        report.badgeClass
                                      )}
                                    >
                                      {report.categoryLabel}
                                    </span>
                                    {!isVip && (
                                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                                        <Crown className="size-2.5" /> VIP
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {report.date}
                                  </span>
                                </div>
                                <h2 className="text-sm font-bold text-foreground leading-snug group-hover:text-amber-400 transition-colors">
                                  {displayTitle}
                                </h2>
                                {report.summary && (
                                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {report.summary}
                                  </p>
                                )}
                              </div>
                            </Link>
                          );
                        }

                        return (
                          <Link
                            key={report.driveDocId}
                            href={`/bao-cao/${report.driveDocId}`}
                            onClick={handleCardClick}
                            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-md cursor-pointer"
                          >
                            <div>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {report.ticker && (
                                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                                      {report.ticker}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                                      report.badgeClass
                                    )}
                                  >
                                    {report.categoryLabel}
                                  </span>
                                  {!isVip && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                                      <Crown className="size-2.5" /> VIP
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {report.date}
                                </span>
                              </div>

                              <h2 className="text-sm font-bold text-foreground leading-snug group-hover:text-amber-400 transition-colors">
                                {displayTitle}
                              </h2>
                            </div>

                            {report.targetPrice != null && (
                              <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2.5 text-xs font-medium">
                                {isVip ? (
                                  <>
                                    <span className="text-muted-foreground">
                                      Giá MT:{" "}
                                      <strong className="font-mono text-foreground font-bold">
                                        {fmtPrice(report.targetPrice)}
                                      </strong>
                                    </span>
                                    {upside != null && (
                                      <span
                                        className={cn(
                                          "rounded-md border px-1.5 py-0.5 font-mono text-xs font-bold",
                                          upside >= 0
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                            : "border-red-500/30 bg-red-500/10 text-red-400"
                                        )}
                                      >
                                        {fmtPct(upside)}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                                      <Lock className="size-3 text-amber-400" />
                                      <span>Giá MT: 🔒 Khóa VIP</span>
                                    </span>
                                    <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-bold text-[10px] text-amber-400 flex items-center gap-1">
                                      <Crown className="size-2.5" /> Upside VIP
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </Link>
                        );
                      })
                    ) : (
                      <div className="col-span-full rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                        <FileText className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                        Không tìm thấy bài viết phù hợp trong danh mục được chọn.
                      </div>
                    )}
                  </div>

                  {/* CỔNG KHÓA VIP NÂNG CẤP CHO BÁO CÁO ĐỊNH GIÁ RNAV ĐỘC QUYỀN */}
                  {!isVip && (
                    <div className="mt-8 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1c1813] via-[#151319] to-[#111015] p-6 sm:p-8 text-center shadow-2xl">
                      {/* Vầng hào quang vàng kim */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-36 w-80 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

                      {/* Icon vương miện */}
                      <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 text-amber-400 shadow-xl shadow-amber-500/15">
                        <Crown className="size-6 text-amber-300 animate-pulse" />
                        <Sparkles className="absolute -top-1 -right-1 size-3.5 text-yellow-300" />
                      </div>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold text-amber-300 mb-2">
                        <Crown className="size-3" />
                        ĐẶC QUYỀN HỘI VIÊN VIP
                      </span>

                      <h3 className="relative text-lg sm:text-xl font-black text-white mb-2">
                        Mở Khóa Toàn Bộ 225+ Báo Cáo Định Giá RNAV Độc Quyền
                      </h3>
                      <p className="relative max-w-lg mx-auto text-xs sm:text-sm text-[#c4b5a5] leading-relaxed mb-5">
                        Bạn đang xem 6 bài mẫu. Nâng cấp Hội viên VIP (chỉ từ 95.000 đ/tháng) để mở khóa trọn vẹn điểm số định giá lãi kép, giá mục tiêu, upside và chi tiết bóc tách tài sản ngầm của hơn 225 cổ phiếu.
                      </p>

                      {/* Bảng giá 3 gói nhanh */}
                      <div className="relative mb-5 max-w-md mx-auto grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                          <span className="block text-[10px] text-amber-300/80 font-medium">1 Tháng</span>
                          <span className="block text-xs sm:text-sm font-black text-amber-300">95.000 đ</span>
                        </div>
                        <div className="relative rounded-xl border border-amber-500/40 bg-amber-500/15 p-2.5 shadow-xs">
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-0.2 text-[8px] font-black text-black">
                            Phổ biến
                          </span>
                          <span className="block text-[10px] text-amber-300/80 font-medium">6 Tháng</span>
                          <span className="block text-xs sm:text-sm font-black text-amber-300">495.000 đ</span>
                        </div>
                        <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-1.5 py-0.2 text-[8px] font-black text-white">
                            -22%
                          </span>
                          <span className="block text-[10px] text-amber-300/80 font-medium">1 Năm</span>
                          <span className="block text-xs sm:text-sm font-black text-amber-300">890.000 đ</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setVipModalConfig({
                            title: "Mở Khóa 225+ Báo Cáo Định Giá RNAV Độc Quyền (VIP)",
                            subtitle: "Nâng cấp gói Hội viên VIP để xem trọn vẹn điểm số định giá, giá mục tiêu và chi tiết bóc tách tài sản của 225+ cổ phiếu.",
                          });
                          setVipModalOpen(true);
                        }}
                        className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-2.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                      >
                        <Crown className="size-4" />
                        <span>👑 Nâng cấp Hội viên VIP để mở khóa tất cả</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </AuthGate>

        {/* Modal Nâng cấp VIP */}
        <VipUpgradeModal
          open={vipModalOpen}
          onClose={() => setVipModalOpen(false)}
          title={vipModalConfig.title}
          subtitle={vipModalConfig.subtitle}
        />
      </main>
    </div>
  );
}
