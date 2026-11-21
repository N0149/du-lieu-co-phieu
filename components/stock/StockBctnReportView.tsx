"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  BookOpen,
  Calendar,
  Building2,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  Landmark,
  Leaf,
  FileSpreadsheet,
  FileText,
  Search,
  Copy,
  Check,
  Printer,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowUpRight,
  Loader2,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BctnReportData, BctnSection, BctnSectionCategory } from "@/lib/bctn-service"

interface StockBctnReportViewProps {
  bctnData?: BctnReportData | null
  ticker: string
  companyName?: string
  availableTickers?: string[]
}

export function StockBctnReportView({
  bctnData,
  ticker,
  companyName,
  availableTickers = [],
}: StockBctnReportViewProps) {
  const [data, setData] = useState<BctnReportData | null>(bctnData || null)
  const [tickers, setTickers] = useState<string[]>(availableTickers)
  const [isLoading, setIsLoading] = useState<boolean>(!bctnData && (!availableTickers || availableTickers.length === 0))

  useEffect(() => {
    if (bctnData) {
      setData(bctnData)
      setTickers(availableTickers)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    fetch(`/api/stock/${encodeURIComponent(ticker)}/bctn`)
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi khi nạp dữ liệu Báo Cáo Thường Niên")
        return res.json()
      })
      .then((res) => {
        if (!isMounted) return
        setData(res.bctnData || null)
        if (res.availableTickers && Array.isArray(res.availableTickers)) {
          setTickers(res.availableTickers)
        }
      })
      .catch((err) => {
        console.error("Lỗi tải BCTN:", err)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [bctnData, availableTickers, ticker])

  const [selectedSectionId, setSelectedSectionId] = useState<string>("all")
  const [searchKeyword, setSearchKeyword] = useState<string>("")
  const [tickerSearch, setTickerSearch] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)

  const filteredTickers = useMemo(() => {
    if (!tickerSearch.trim()) return tickers
    const query = tickerSearch.toUpperCase().trim()
    return tickers.filter((sym) => sym.includes(query))
  }, [tickers, tickerSearch])

  // Điều hướng thanh cuộn Sub-tabs
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkTabScroll = useCallback(() => {
    const el = tabsContainerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 6)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6)
  }, [])

  useEffect(() => {
    const el = tabsContainerRef.current
    if (!el) return
    checkTabScroll()
    el.addEventListener("scroll", checkTabScroll, { passive: true })
    window.addEventListener("resize", checkTabScroll)
    return () => {
      el.removeEventListener("scroll", checkTabScroll)
      window.removeEventListener("resize", checkTabScroll)
    }
  }, [checkTabScroll])

  useEffect(() => {
    const btn = tabButtonRefs.current[selectedSectionId]
    if (btn && tabsContainerRef.current) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
    const t = setTimeout(checkTabScroll, 120)
    return () => clearTimeout(t)
  }, [selectedSectionId, checkTabScroll])

  const scrollTabs = (direction: "left" | "right") => {
    const el = tabsContainerRef.current
    if (!el) return
    const scrollAmount = Math.max(220, el.clientWidth * 0.45)
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsContainerRef.current
    if (!el) return
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > 0) {
      el.scrollLeft += e.deltaY * 0.85
    }
  }

  const sections = data?.sections || []

  // Lọc section theo tab chọn
  const visibleSections = useMemo(() => {
    let list = sections
    if (selectedSectionId !== "all") {
      list = sections.filter((s) => s.id === selectedSectionId)
    }
    if (!searchKeyword.trim()) return list

    // Lọc các section có chứa từ khóa
    const kw = searchKeyword.toLowerCase().trim()
    return list.filter((s) =>
      s.title.toLowerCase().includes(kw) || s.rawMarkdown.toLowerCase().includes(kw)
    )
  }, [sections, selectedSectionId, searchKeyword])

  // Đếm số kết quả tìm kiếm khớp
  const searchMatchCount = useMemo(() => {
    if (!searchKeyword.trim() || !data) return 0
    const kw = searchKeyword.toLowerCase().trim()
    return sections.filter((s) =>
      s.title.toLowerCase().includes(kw) || s.rawMarkdown.toLowerCase().includes(kw)
    ).length
  }, [sections, searchKeyword, data])

  const getSectionIcon = (category: BctnSectionCategory) => {
    switch (category) {
      case "intro":
        return <Building2 className="size-4 text-sky-400 shrink-0" />
      case "operations":
        return <TrendingUp className="size-4 text-emerald-400 shrink-0" />
      case "management":
        return <Briefcase className="size-4 text-amber-400 shrink-0" />
      case "bod":
        return <ShieldCheck className="size-4 text-indigo-400 shrink-0" />
      case "governance":
        return <Landmark className="size-4 text-purple-400 shrink-0" />
      case "esg":
        return <Leaf className="size-4 text-teal-400 shrink-0" />
      case "financials":
        return <FileSpreadsheet className="size-4 text-blue-400 shrink-0" />
      default:
        return <FileText className="size-4 text-primary shrink-0" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-2xl border border-border/70 bg-card/60">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-mono">
          Đang nạp dữ liệu Báo Cáo Thường Niên {ticker}...
        </p>
      </div>
    )
  }

  // Khi mã chưa có dữ liệu BCTN
  if (!data || !data.hasReport) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-10 text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          <BookOpen className="size-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-foreground">
            Chưa có Báo Cáo Thường Niên 2025 cho {ticker}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Dữ liệu báo cáo thường niên của {companyName || ticker} đang được xử lý trích xuất hoặc doanh nghiệp chưa công bố báo cáo thường niên năm 2025.
          </p>
        </div>

        {tickers.length > 0 && (
          <div className="pt-4 border-t border-border/50 max-w-2xl mx-auto text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Các mã đã có Báo Cáo Thường Niên 2025 ({tickers.length} mã):
              </p>
              <div className="relative">
                <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Lọc mã..."
                  value={tickerSearch}
                  onChange={(e) => setTickerSearch(e.target.value)}
                  className="h-6 w-28 rounded-md border border-border bg-background/80 pl-6 pr-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredTickers.length === 0 ? (
                <span className="text-xs text-muted-foreground py-1">
                  Không tìm thấy mã &quot;{tickerSearch}&quot;
                </span>
              ) : (
                filteredTickers.map((sym) => (
                  <Link
                    key={sym}
                    href={`/stock/${sym}?tab=bctn`}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors",
                      sym === ticker
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80 text-foreground/80 hover:bg-primary/20 hover:text-primary"
                    )}
                  >
                    <span>{sym}</span>
                    <ArrowUpRight className="size-3 opacity-60" />
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const { title, subtitle, year, stats } = data

  const handleCopy = () => {
    if (typeof window === "undefined" || !data) return
    const contentToCopy =
      selectedSectionId === "all"
        ? `${title}\n\n` + sections.map((s) => `${s.title}\n\n${s.rawMarkdown}`).join("\n\n---\n\n")
        : visibleSections.map((s) => `${s.title}\n\n${s.rawMarkdown}`).join("\n\n---\n\n")

    navigator.clipboard.writeText(contentToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. HERO HEADER CARD ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-indigo-950/20 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-indigo-400 border border-indigo-500/30">
                <BookOpen className="size-3" />
                BÁO CÁO THƯỜNG NIÊN {year}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <Sparkles className="size-3" />
                {stats.sectionCount} chương / phần
              </span>
              {stats.tableCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
                  <TableIcon className="size-3" />
                  {stats.tableCount} bảng số liệu
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Quick Actions & Search */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            {/* Thanh tìm kiếm nội dung */}
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm nội dung..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-9 w-36 sm:w-44 rounded-xl border border-border bg-card/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary shadow-2xs transition-all"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer shadow-2xs"
              title="Sao chép nội dung"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-muted-foreground" />
                  <span>Sao chép</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer shadow-2xs"
              title="In / Lưu PDF"
            >
              <Printer className="size-3.5 text-muted-foreground" />
              <span>In</span>
            </button>
          </div>
        </div>

        {/* Thông báo kết quả tìm kiếm nếu có */}
        {searchKeyword.trim() && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Tìm thấy <strong className="text-foreground">{searchMatchCount}</strong> mục chứa từ khóa &ldquo;{searchKeyword}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setSearchKeyword("")}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* ── 2. SECTION TABS BAR (SUB-TABS) ── */}
      <div className="sticky top-14 sm:top-16 z-20 relative group">
        {/* Nút lướt sang trái khi màn hình nhỏ bị tràn */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 pl-1 bg-gradient-to-r from-card via-card/95 to-transparent rounded-l-2xl">
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-background/90 text-foreground shadow-md border border-border/80 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer touch-manipulation"
              title="Xem các mục trước"
              aria-label="Xem các mục trước"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        )}

        {/* Danh sách tab co giãn thông minh */}
        <div
          ref={tabsContainerRef}
          onWheel={handleTabsWheel}
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto rounded-2xl border border-border/80 bg-card/95 p-1 sm:p-1.5 backdrop-blur-md shadow-xs scrollbar-none scroll-smooth touch-pan-x"
        >
          <button
            ref={(el) => {
              tabButtonRefs.current["all"] = el
            }}
            type="button"
            onClick={() => setSelectedSectionId("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 min-h-[38px] touch-manipulation active:scale-95",
              selectedSectionId === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Layers className="size-3.5" />
            <span>Toàn bộ báo cáo</span>
          </button>

          {sections.map((sec) => {
            const isSelected = selectedSectionId === sec.id
            return (
              <button
                key={sec.id}
                ref={(el) => {
                  tabButtonRefs.current[sec.id] = el
                }}
                type="button"
                onClick={() => setSelectedSectionId(sec.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 min-h-[38px] touch-manipulation active:scale-95",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {getSectionIcon(sec.category)}
                <span>{sec.shortTitle}</span>
                {sec.tableCount > 0 && (
                  <span className="rounded-full bg-muted/80 px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground">
                    {sec.tableCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Nút lướt sang phải khi màn hình nhỏ bị tràn */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-3 pr-1 bg-gradient-to-l from-card via-card/95 to-transparent rounded-r-2xl">
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-background/90 text-foreground shadow-md border border-border/80 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
              title="Xem thêm mục tiếp theo"
              aria-label="Xem thêm mục tiếp theo"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── 3. SECTIONS CONTENT ── */}
      <div className="space-y-6">
        {visibleSections.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Không tìm thấy mục nào khớp với &ldquo;{searchKeyword}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground">
              Vui lòng thử tìm với từ khóa khác hoặc chuyển sang xem &ldquo;Toàn bộ báo cáo&rdquo;.
            </p>
          </div>
        ) : (
          visibleSections.map((sec) => (
            <div
              key={sec.id}
              id={sec.id}
              className="rounded-2xl border border-border/70 bg-card/60 p-5 sm:p-7 shadow-xs backdrop-blur-xs transition-all hover:border-border"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-background/80 border border-border">
                    {getSectionIcon(sec.category)}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    {sec.title}
                  </h2>
                </div>

                {sec.tableCount > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    <TableIcon className="size-3" />
                    {sec.tableCount} bảng
                  </span>
                )}
              </div>

              {/* Section Body (HTML Rendered via Marked) */}
              <div
                className="agm-markdown-content bctn-markdown-content text-foreground/90 space-y-3"
                dangerouslySetInnerHTML={{ __html: sec.contentHtml }}
              />
            </div>
          ))
        )}
      </div>

      {/* ── 4. QUICK STOCK SWITCHER (CHUYỂN NHANH GIỮA CÁC MÃ CÓ BCTN) ── */}
      {tickers.length > 1 && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <BookOpen className="size-3.5 text-indigo-400" />
              <span>Khám phá Báo Cáo Thường Niên 2025 của các doanh nghiệp khác ({tickers.length} mã):</span>
            </div>
            <div className="relative">
              <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Lọc mã..."
                value={tickerSearch}
                onChange={(e) => setTickerSearch(e.target.value)}
                className="h-6 w-28 rounded-md border border-border bg-background/80 pl-6 pr-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {filteredTickers.map((sym) => (
              <Link
                key={sym}
                href={`/stock/${sym}?tab=bctn`}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors",
                  sym === ticker
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/70 text-foreground/80 hover:bg-primary/20 hover:text-primary"
                )}
              >
                <span>{sym}</span>
                <ArrowUpRight className="size-3 opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
