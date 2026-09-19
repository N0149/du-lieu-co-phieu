"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  FileSpreadsheet,
  FileText,
  Search,
  Copy,
  Check,
  Printer,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Layers,
  Building2,
  PieChart,
  Users2,
  Landmark,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BctcReportData } from "@/lib/bctc-service"
import { BctcDocumentSection } from "./BctcDocumentSection"
import type { BctcCompanyDocumentsPayload } from "@/lib/bctc-document-service"

interface StockBctcReportViewProps {
  bctcDataHopNhat: BctcReportData | null
  bctcDataCongTyMe: BctcReportData | null
  ticker: string
  companyName?: string
  availableTickers?: string[]
  bctcDocuments?: BctcCompanyDocumentsPayload | null
}

export function StockBctcReportView({
  bctcDataHopNhat,
  bctcDataCongTyMe,
  ticker,
  companyName,
  availableTickers = [],
  bctcDocuments = null,
}: StockBctcReportViewProps) {
  // Chọn giữa Hợp nhất và Công ty mẹ
  const [selectedType, setSelectedType] = useState<'HopNhat' | 'CongTyMe'>(() => {
    if (bctcDataHopNhat?.hasReport) return 'HopNhat'
    if (bctcDataCongTyMe?.hasReport) return 'CongTyMe'
    return 'HopNhat'
  })

  const currentData = selectedType === 'HopNhat' ? bctcDataHopNhat : bctcDataCongTyMe

  const [selectedSectionId, setSelectedSectionId] = useState<string>("all")
  const [searchKeyword, setSearchKeyword] = useState<string>("")
  const [tickerSearch, setTickerSearch] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)

  const filteredTickers = useMemo(() => {
    if (!tickerSearch.trim()) return availableTickers
    const query = tickerSearch.toUpperCase().trim()
    return availableTickers.filter((sym) => sym.includes(query))
  }, [availableTickers, tickerSearch])

  // Quản lý thanh điều hướng tab phần
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

  // Khi chưa có dữ liệu Thuyết minh BCTC
  if (!currentData || !currentData.hasReport) {
    return (
      <div className="space-y-6">
        {/* Danh mục Tải File Gốc BCTC */}
        {bctcDocuments && (
          <BctcDocumentSection
            documents={bctcDocuments}
            companyName={companyName}
            defaultExpanded={true}
          />
        )}

        <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-10 text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
            <FileSpreadsheet className="size-8 text-primary" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              Thuyết minh BCTC số hóa đang được cập nhật
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Các bảng biểu thuyết minh chi tiết của {companyName || ticker} đang trong tiến trình trích xuất tự động. Bạn có thể xem và tải trực tiếp bản scan Báo cáo tài chính gốc từ danh mục phía trên!
            </p>
          </div>

        {availableTickers.length > 0 && (
          <div className="pt-4 border-t border-border/50 max-w-2xl mx-auto text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Các mã đã có Thuyết minh BCTC ({availableTickers.length} mã):
              </p>
              <div className="relative">
                <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Lọc nhanh..."
                  value={tickerSearch}
                  onChange={(e) => setTickerSearch(e.target.value)}
                  className="h-6 w-28 rounded-md border border-border bg-background/80 pl-6 pr-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredTickers.map((sym) => (
                <Link
                  key={sym}
                  href={`/stock/${sym}?tab=bctc`}
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
      </div>
    )
  }

  const { title, sections, tableCount } = currentData

  // Lọc section theo tab chọn và từ khóa tìm kiếm
  const visibleSections = useMemo(() => {
    let list = selectedSectionId === "all" ? sections : sections.filter((s) => s.id === selectedSectionId)

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim()
      list = list.filter((s) => s.rawMarkdown.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    }

    return list
  }, [sections, selectedSectionId, searchKeyword])

  const handleCopy = () => {
    if (typeof window === "undefined" || !currentData) return
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

  const getSectionIcon = (num: number) => {
    switch (num) {
      case 1:
        return <Building2 className="size-4 text-sky-400 shrink-0" />
      case 2:
        return <Landmark className="size-4 text-emerald-400 shrink-0" />
      case 3:
        return <PieChart className="size-4 text-amber-400 shrink-0" />
      case 4:
        return <Users2 className="size-4 text-purple-400 shrink-0" />
      default:
        return <FileSpreadsheet className="size-4 text-primary shrink-0" />
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Danh mục Tải File Gốc BCTC ── */}
      {bctcDocuments && (
        <BctcDocumentSection
          documents={bctcDocuments}
          companyName={companyName}
          defaultExpanded={false}
        />
      )}

      {/* ── 1. HEADER BÁO CÁO THUYẾT MINH BCTC ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-card/90 via-card/60 to-background p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                <ShieldCheck className="size-3.5" />
                <span>Kiểm toán Soát xét 2026</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 text-xs font-medium text-sky-400">
                <TableIcon className="size-3" />
                <span>{tableCount} Bảng số liệu chi tiết</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 text-xs font-medium text-purple-400">
                <span>Gemini Native Vision</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Trích xuất toàn văn phần Thuyết minh từ Báo cáo tài chính chính thức của {companyName || ticker}. Mọi bảng biểu và chú thích số liệu được bảo toàn nguyên vẹn.
            </p>
          </div>

          {/* Nút chuyển đổi Hợp nhất vs Công ty mẹ & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/70 border border-border">
              <button
                type="button"
                onClick={() => setSelectedType('HopNhat')}
                disabled={!bctcDataHopNhat?.hasReport}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  selectedType === 'HopNhat'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  !bctcDataHopNhat?.hasReport && "opacity-40 cursor-not-allowed"
                )}
              >
                BCTC Hợp nhất
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('CongTyMe')}
                disabled={!bctcDataCongTyMe?.hasReport}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  selectedType === 'CongTyMe'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  !bctcDataCongTyMe?.hasReport && "opacity-40 cursor-not-allowed"
                )}
              >
                BCTC Công ty mẹ
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background/80 hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Đã chép" : "Chép Markdown"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background/80 hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <Printer className="size-3.5" />
              <span>In BCTC</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. THANH ĐIỀU HƯỚNG CÁC PHẦN (SECTIONS TABS) & TÌM KIẾM ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="relative flex items-center min-w-0 max-w-full">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className="absolute -left-2 z-10 size-7 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}

          <div
            ref={tabsContainerRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth"
          >
            <button
              ref={(el) => { tabButtonRefs.current["all"] = el }}
              onClick={() => setSelectedSectionId("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                selectedSectionId === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Layers className="size-3.5" />
              <span>Tất cả các phần ({sections.length})</span>
            </button>

            {sections.map((sec) => (
              <button
                key={sec.id}
                ref={(el) => { tabButtonRefs.current[sec.id] = el }}
                onClick={() => setSelectedSectionId(sec.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  selectedSectionId === sec.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {getSectionIcon(sec.number)}
                <span>{sec.shortTitle}</span>
                {sec.tableCount > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    selectedSectionId === sec.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {sec.tableCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className="absolute -right-2 z-10 size-7 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>

        {/* Ô tìm kiếm từ khóa trong BCTC */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm tài sản, ngân hàng, nợ vay..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-card/60 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* ── 3. DANH SÁCH CÁC PHẦN NỘI DUNG ── */}
      {visibleSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs sm:text-sm">
          Không tìm thấy nội dung phù hợp với từ khóa &quot;{searchKeyword}&quot;.
        </div>
      ) : (
        <div className="space-y-8">
          {visibleSections.map((sec) => (
            <div
              key={sec.id}
              className="rounded-2xl border border-border/80 bg-card/50 p-5 sm:p-7 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  {getSectionIcon(sec.number)}
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {sec.title}
                  </h3>
                </div>
                {sec.tableCount > 0 && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                    {sec.tableCount} bảng
                  </span>
                )}
              </div>

              <div
                className="agm-markdown-content text-xs sm:text-sm leading-relaxed text-foreground/90 space-y-4"
                dangerouslySetInnerHTML={{ __html: sec.contentHtml }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
