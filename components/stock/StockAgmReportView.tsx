"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  Sparkles,
  Search,
  Copy,
  Check,
  Printer,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgmReportData } from "@/lib/agm-service"

interface StockAgmReportViewProps {
  agmData: AgmReportData | null
  ticker: string
  companyName?: string
  availableTickers?: string[]
}

export function StockAgmReportView({
  agmData,
  ticker,
  companyName,
  availableTickers = [],
}: StockAgmReportViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all")
  const [searchKeyword, setSearchKeyword] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)

  // Quản lý thanh điều hướng tab phần: hỗ trợ cuộn mượt và nút mũi tên
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
    el.addEventListener('scroll', checkTabScroll, { passive: true })
    window.addEventListener('resize', checkTabScroll)
    return () => {
      el.removeEventListener('scroll', checkTabScroll)
      window.removeEventListener('resize', checkTabScroll)
    }
  }, [checkTabScroll])

  useEffect(() => {
    const btn = tabButtonRefs.current[selectedSectionId]
    if (btn && tabsContainerRef.current) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
    const t = setTimeout(checkTabScroll, 120)
    return () => clearTimeout(t)
  }, [selectedSectionId, checkTabScroll])

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabsContainerRef.current
    if (!el) return
    const scrollAmount = Math.max(200, el.clientWidth * 0.45)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsContainerRef.current
    if (!el) return
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > 0) {
      el.scrollLeft += e.deltaY * 0.85
    }
  }

  // Empty state khi mã chưa có dữ liệu ĐHĐCĐ
  if (!agmData || !agmData.hasReport) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-10 text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          <FileText className="size-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-foreground">
            Chưa có Báo cáo ĐHĐCĐ 2026 cho {ticker}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Dữ liệu tài liệu đại hội đồng cổ đông của {companyName || ticker} đang được cập nhật hoặc doanh nghiệp chưa công bố tài liệu họp thường niên.
          </p>
        </div>

        {availableTickers.length > 0 && (
          <div className="pt-4 border-t border-border/50 max-w-2xl mx-auto text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Các mã đã có Báo cáo ĐHĐCĐ 2026 ({availableTickers.length} mã):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableTickers.map((sym) => (
                <Link
                  key={sym}
                  href={`/stock/${sym}?tab=agm`}
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
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const { title, subtitle, year, sections, stats } = agmData

  // Lọc section theo tab chọn
  const visibleSections = useMemo(() => {
    if (selectedSectionId === "all") return sections
    return sections.filter((s) => s.id === selectedSectionId)
  }, [sections, selectedSectionId])

  const handleCopy = () => {
    if (typeof window === "undefined" || !agmData) return
    const fullText = `${title}\n\n` + sections.map((s) => `${s.title}\n\n${s.rawMarkdown}`).join("\n\n---\n\n")
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  const getSectionIcon = (number: number) => {
    switch (number) {
      case 1:
        return <TrendingUp className="size-4 text-sky-400 shrink-0" />
      case 2:
        return <Coins className="size-4 text-amber-400 shrink-0" />
      case 3:
        return <HelpCircle className="size-4 text-emerald-400 shrink-0" />
      case 4:
        return <Sparkles className="size-4 text-purple-400 shrink-0" />
      default:
        return <FileText className="size-4 text-primary shrink-0" />
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 0. DANH SÁCH CÁC MÃ ĐÃ CÓ BÁO CÁO ĐHĐCĐ (TIỆN THEO DÕI) ── */}
      {availableTickers.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-xs backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Danh sách mã đã có dữ liệu ĐHĐCĐ {year} ({availableTickers.length} mã)
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground italic">
              (Bấm vào mã để xem ngay)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {availableTickers.map((sym) => {
              const isCurrent = sym.toUpperCase() === ticker.toUpperCase()
              return (
                <Link
                  key={sym}
                  href={`/stock/${sym}?tab=agm`}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all",
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/40"
                      : "bg-muted/70 text-foreground/85 hover:bg-primary/20 hover:text-primary border border-border/50 hover:border-primary/40"
                  )}
                  title={`Xem ĐHĐCĐ của ${sym}`}
                >
                  <span>{sym}</span>
                  {isCurrent ? (
                    <span className="size-1.5 rounded-full bg-primary-foreground" />
                  ) : (
                    <ArrowUpRight className="size-3 opacity-40" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 1. HEADER HERO CARD ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-muted/20 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-400 border border-sky-500/30">
                <Calendar className="size-3" />
                ĐHĐCĐ THƯỜNG NIÊN {year}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="size-3" />
                Đã biểu quyết thông qua
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

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer shadow-2xs"
              title="Sao chép toàn bộ nội dung"
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
              <span>In trang</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. SECTION TABS BAR (TƯƠNG THÍCH MỌI MÀN HÌNH TỪ LAPTOP ĐẾN DESKTOP) ── */}
      <div className="sticky top-20 z-20 relative group">
        {/* Nút lướt sang trái khi nội dung bị tràn trên màn hình nhỏ */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 pl-1 bg-gradient-to-r from-card via-card/95 to-transparent rounded-l-2xl">
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-background/90 text-foreground shadow-md border border-border/80 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
              title="Xem các mục trước"
              aria-label="Xem các mục trước"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        )}

        {/* Danh sách tab co giãn thông minh và hỗ trợ con lăn chuột */}
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
              "flex items-center gap-1.5 rounded-xl px-2.5 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
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
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {getSectionIcon(sec.number)}
                <span>{sec.shortTitle}</span>
                {sec.isQa && !stats.hasQa && (
                  <span className="rounded-sm bg-muted px-1.5 py-0.2 text-[9px] font-normal text-muted-foreground">
                    Trống
                  </span>
                )}
                {sec.isCapitalIncrease && !stats.hasCapitalIncrease && (
                  <span className="rounded-sm bg-muted px-1.5 py-0.2 text-[9px] font-normal text-muted-foreground">
                    Không có
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
        {visibleSections.map((sec) => {
          return (
            <div
              key={sec.id}
              id={sec.id}
              className="rounded-2xl border border-border/70 bg-card/60 p-5 sm:p-7 shadow-xs backdrop-blur-xs transition-all hover:border-border"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-background/80 border border-border">
                    {getSectionIcon(sec.number)}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    {sec.title}
                  </h2>
                </div>

                {sec.isQa && !stats.hasQa && (
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Không có chất vấn
                  </span>
                )}
                {sec.isCapitalIncrease && !stats.hasCapitalIncrease && (
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Không có tờ trình
                  </span>
                )}
              </div>

              {/* Section Body (HTML Rendered via Marked) */}
              <div
                className="agm-markdown-content text-foreground/90 space-y-3"
                dangerouslySetInnerHTML={{ __html: sec.contentHtml }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
