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
  Minimize2,
  Maximize2,
  TrendingUp,
  ScrollText,
  Loader2,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BctcReportData, BctcPeriodOption } from "@/lib/bctc-service"
import { BctcDocumentSection } from "./BctcDocumentSection"
import type { BctcCompanyDocumentsPayload } from "@/lib/bctc-document-service"

interface StockBctcReportViewProps {
  bctcDataHopNhat?: BctcReportData | null
  bctcDataCongTyMe?: BctcReportData | null
  ticker: string
  companyName?: string
  availableTickers?: string[]
  bctcDocuments?: BctcCompanyDocumentsPayload | null
  targetPeriod?: 'Ban_Nien_2026' | 'Quy_3_2026' | string
  onSwitchPeriod?: (period: any) => void
}

export function StockBctcReportView({
  bctcDataHopNhat,
  bctcDataCongTyMe,
  ticker,
  companyName,
  availableTickers = [],
  bctcDocuments = null,
  targetPeriod = 'Quy_3_2026',
  onSwitchPeriod,
}: StockBctcReportViewProps) {
  const [dataHopNhat, setDataHopNhat] = useState<BctcReportData | null>(() => {
    if (bctcDataHopNhat && (!targetPeriod || bctcDataHopNhat.periodKey === targetPeriod)) return bctcDataHopNhat
    return null
  })
  const [dataCongTyMe, setDataCongTyMe] = useState<BctcReportData | null>(() => {
    if (bctcDataCongTyMe && (!targetPeriod || bctcDataCongTyMe.periodKey === targetPeriod)) return bctcDataCongTyMe
    return null
  })
  const [tickers, setTickers] = useState<string[]>(availableTickers)
  const [docs, setDocs] = useState<BctcCompanyDocumentsPayload | null>(bctcDocuments)
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasInitial = (bctcDataHopNhat && (!targetPeriod || bctcDataHopNhat.periodKey === targetPeriod)) ||
                       (bctcDataCongTyMe && (!targetPeriod || bctcDataCongTyMe.periodKey === targetPeriod))
    return !hasInitial
  })

  // Quản lý kỳ BCTC mục tiêu
  const [selectedPeriod, setSelectedPeriod] = useState<string>(targetPeriod)
  const [availablePeriods, setAvailablePeriods] = useState<BctcPeriodOption[]>(
    bctcDataHopNhat?.availablePeriods || bctcDataCongTyMe?.availablePeriods || []
  )
  const periodCache = useRef<Record<string, { hopNhat: BctcReportData | null; congTyMe: BctcReportData | null; docs?: BctcCompanyDocumentsPayload | null }>>({})

  // Lưu cache số liệu nạp ban đầu (0ms overhead)
  useEffect(() => {
    if (bctcDataHopNhat || bctcDataCongTyMe) {
      const pKey = bctcDataHopNhat?.periodKey || bctcDataCongTyMe?.periodKey || targetPeriod
      if (pKey) {
        periodCache.current[pKey] = {
          hopNhat: bctcDataHopNhat || null,
          congTyMe: bctcDataCongTyMe || null,
          docs: bctcDocuments || docs,
        }
      }
    }
  }, [bctcDataHopNhat, bctcDataCongTyMe, targetPeriod, bctcDocuments])

  useEffect(() => {
    const matchesTarget = (bctcDataHopNhat && bctcDataHopNhat.periodKey === targetPeriod) ||
                          (bctcDataCongTyMe && bctcDataCongTyMe.periodKey === targetPeriod)

    if (matchesTarget) {
      setDataHopNhat(bctcDataHopNhat || null)
      setDataCongTyMe(bctcDataCongTyMe || null)
      setTickers(availableTickers)
      setDocs(bctcDocuments)
      setSelectedPeriod(targetPeriod)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    const url = `/api/stock/${encodeURIComponent(ticker)}/bctc?period=${encodeURIComponent(targetPeriod)}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi tải Thuyết minh BCTC")
        return res.json()
      })
      .then((res) => {
        if (!isMounted) return
        setDataHopNhat(res.bctcDataHopNhat || null)
        setDataCongTyMe(res.bctcDataCongTyMe || null)
        if (res.availableTickers && Array.isArray(res.availableTickers)) {
          setTickers(res.availableTickers)
        }
        if (res.availablePeriods && Array.isArray(res.availablePeriods)) {
          setAvailablePeriods(res.availablePeriods)
        }
        if (res.bctcDocuments) setDocs(res.bctcDocuments)
        setSelectedPeriod(targetPeriod)
      })
      .catch((err) => {
        console.error("Lỗi tải BCTC:", err)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [bctcDataHopNhat, bctcDataCongTyMe, availableTickers, bctcDocuments, ticker, targetPeriod])

  // Chọn giữa Hợp nhất và Công ty mẹ
  const [selectedType, setSelectedType] = useState<'HopNhat' | 'CongTyMe'>(() => {
    if (bctcDataHopNhat?.hasReport) return 'HopNhat'
    if (bctcDataCongTyMe?.hasReport) return 'CongTyMe'
    return 'HopNhat'
  })

  // Đồng bộ selectedType và availablePeriods khi data nạp xong
  useEffect(() => {
    if (selectedType === 'HopNhat' && !dataHopNhat?.hasReport && dataCongTyMe?.hasReport) {
      setSelectedType('CongTyMe')
    } else if (selectedType === 'CongTyMe' && !dataCongTyMe?.hasReport && dataHopNhat?.hasReport) {
      setSelectedType('HopNhat')
    }
    const pers = dataHopNhat?.availablePeriods || dataCongTyMe?.availablePeriods
    if (pers && pers.length > 0) {
      setAvailablePeriods(pers)
    }
  }, [dataHopNhat, dataCongTyMe, selectedType])

  // Danh sách các tab con: Báo cáo tài chính bán niên & Báo cáo tài chính quý 3 (mở rộng tự động cho Quý 4...)
  const subTabs = useMemo(() => {
    const list: Array<{ id: string; label: string; shortLabel: string; badge?: string }> = [
      { id: 'Ban_Nien_2026', label: 'Báo cáo tài chính bán niên', shortLabel: 'Bán niên', badge: '2026' },
      { id: 'Quy_3_2026', label: 'Báo cáo tài chính quý 3', shortLabel: 'Quý 3', badge: 'MỚI' },
    ]

    if (availablePeriods && availablePeriods.length > 0) {
      availablePeriods.forEach((ap) => {
        if (!list.some((item) => item.id === ap.id)) {
          list.push({
            id: ap.id,
            label: ap.label?.startsWith('Báo cáo') ? ap.label : `Báo cáo tài chính ${ap.shortLabel || ap.label}`,
            shortLabel: ap.shortLabel || ap.label,
            badge: ap.isLatest ? 'MỚI' : undefined,
          })
        }
      })
    }
    return list
  }, [availablePeriods])

  const handlePeriodChange = (periodId: string) => {
    if (periodId === selectedPeriod && !isLoading) return
    setSelectedPeriod(periodId)
    setSelectedSectionId("all")
    setSearchKeyword("")

    if (onSwitchPeriod) {
      onSwitchPeriod(periodId)
    }

    // 0ms cache hit tức thì
    if (periodCache.current[periodId]) {
      const cached = periodCache.current[periodId]
      setDataHopNhat(cached.hopNhat)
      setDataCongTyMe(cached.congTyMe)
      if (cached.docs) setDocs(cached.docs)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetch(`/api/stock/${encodeURIComponent(ticker)}/bctc?period=${encodeURIComponent(periodId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi tải BCTC kỳ " + periodId)
        return res.json()
      })
      .then((res) => {
        const hopNhat = res.bctcDataHopNhat || null
        const congTyMe = res.bctcDataCongTyMe || null
        setDataHopNhat(hopNhat)
        setDataCongTyMe(congTyMe)
        if (res.availablePeriods && Array.isArray(res.availablePeriods)) {
          setAvailablePeriods(res.availablePeriods)
        }
        if (res.bctcDocuments) setDocs(res.bctcDocuments)
        periodCache.current[periodId] = {
          hopNhat,
          congTyMe,
          docs: res.bctcDocuments || docs,
        }
      })
      .catch((err) => {
        console.error("Lỗi chuyển kỳ BCTC:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const currentData = selectedType === 'HopNhat' ? dataHopNhat : dataCongTyMe
  const title = currentData?.title || ""
  const tableCount = currentData?.tableCount ?? 0

  // Thanh tab con: Báo cáo tài chính bán niên & Báo cáo tài chính quý 3 (hiển thị nổi bật ở phía trên)
  const renderSubTabsBar = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 sm:p-2 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xs shadow-xs">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {subTabs.map((tab) => {
          const isActive = selectedPeriod === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handlePeriodChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none",
                isActive
                  ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
              )}
            >
              <ScrollText className={cn("size-4", isActive ? "text-slate-950" : "text-emerald-400")} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                    isActive
                      ? "bg-slate-950/20 text-slate-950"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground px-2">
        <span className="font-mono text-emerald-400 font-bold">{ticker}</span>
        {currentData?.hasReport && tableCount > 0 && (
          <>
            <span>·</span>
            <span>{tableCount} bảng chi tiết</span>
          </>
        )}
      </div>
    </div>
  )

  const [selectedSectionId, setSelectedSectionId] = useState<string>("all")
  const [searchKeyword, setSearchKeyword] = useState<string>("")
  const [tickerSearch, setTickerSearch] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(true)

  const filteredTickers = useMemo(() => {
    if (!tickerSearch.trim()) return tickers
    const query = tickerSearch.toUpperCase().trim()
    return tickers.filter((sym) => sym.includes(query))
  }, [tickers, tickerSearch])

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

  const sections = currentData?.sections || []

  // Lọc section theo tab chọn và từ khóa tìm kiếm (Luôn gọi Hook trước mọi early return theo Rules of Hooks)
  const visibleSections = useMemo(() => {
    let list = selectedSectionId === "all" ? sections : sections.filter((s) => s.id === selectedSectionId)

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim()
      list = list.filter((s) => s.rawMarkdown.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    }

    return list
  }, [sections, selectedSectionId, searchKeyword])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {renderSubTabsBar()}
        <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-2xl border border-border/70 bg-card/60">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-mono">Đang tải {selectedPeriod === 'Ban_Nien_2026' ? 'Báo cáo Bán niên' : 'Báo cáo Quý 3'} {ticker}...</p>
        </div>
      </div>
    )
  }

  // Khi chưa có dữ liệu Thuyết minh BCTC
  if (!currentData || !currentData.hasReport) {
    return (
      <div className="space-y-6">
        {/* ── Thanh điều hướng các tab con (Bán niên, Quý 3, Quý 4...) ── */}
        {renderSubTabsBar()}

        {/* Danh mục Tải File Gốc BCTC */}
        {docs && (
          <BctcDocumentSection
            documents={docs}
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
              Chưa có dữ liệu {selectedPeriod === 'Quy_3_2026' ? 'Báo cáo Quý 3/2026' : 'Báo cáo Bán niên 2026'} cho {companyName || ticker}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Dữ liệu số hóa chi tiết của {selectedPeriod === 'Quy_3_2026' ? 'Báo cáo Quý 3/2026' : 'Báo cáo Bán niên 2026'} đang trong tiến trình trích xuất tự động hoặc doanh nghiệp chưa công bố. Bạn có thể xem và tải trực tiếp bản scan Báo cáo tài chính gốc từ danh mục phía trên!
            </p>
          </div>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => handlePeriodChange(selectedPeriod === 'Quy_3_2026' ? 'Ban_Nien_2026' : 'Quy_3_2026')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Calendar className="size-4" />
              <span>Chuyển sang xem {selectedPeriod === 'Quy_3_2026' ? 'Báo cáo Bán niên 2026' : 'Báo cáo Quý 3/2026'}</span>
              <ArrowUpRight className="size-4" />
            </button>
          </div>

        {tickers.length > 0 && (
          <div className="pt-4 border-t border-border/50 max-w-2xl mx-auto text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Các mã đã có BCTC số hóa ({tickers.length} mã):
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
                  href={`/stock/${sym}?tab=${selectedPeriod === 'Quy_3_2026' ? 'bctc-q3' : 'bctc-ban-nien'}`}
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
      case 0:
        return <TrendingUp className="size-4 text-rose-400 shrink-0" />
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
      {/* ── 0. THANH ĐIỀU HƯỚNG CÁC TAB CON: BCTC BÁN NIÊN, QUÝ 3 (VÀ QUÝ 4, CÁC KỲ SAU) ── */}
      {renderSubTabsBar()}

      {/* ── Danh mục Tải File Gốc BCTC ── */}
      {docs && (
        <BctcDocumentSection
          documents={docs}
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
                <span>{currentData?.periodLabel || "Báo cáo tài chính"}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 text-xs font-medium text-sky-400">
                <TableIcon className="size-3" />
                <span>{tableCount} Bảng số liệu chi tiết</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 text-xs font-medium text-purple-400">
                <span>BCTC Đầy Đủ</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Trích xuất toàn văn Báo cáo tài chính & Thuyết minh chi tiết từ tài liệu chính thức của {companyName || ticker}. Mọi bảng biểu và chú thích số liệu được bảo toàn nguyên vẹn.
            </p>
          </div>

          {/* Cụm điều khiển: Phạm vi số liệu (Hợp nhất vs Công ty mẹ) & Thao tác */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bộ chọn Phạm vi số liệu */}
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/70 border border-border shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground px-2">Phạm vi:</span>
              <button
                type="button"
                onClick={() => setSelectedType('HopNhat')}
                disabled={!dataHopNhat?.hasReport}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedType === 'HopNhat'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  !dataHopNhat?.hasReport && "opacity-40 cursor-not-allowed"
                )}
              >
                BCTC Hợp nhất
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('CongTyMe')}
                disabled={!dataCongTyMe?.hasReport}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedType === 'CongTyMe'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  !dataCongTyMe?.hasReport && "opacity-40 cursor-not-allowed"
                )}
              >
                BCTC Công ty mẹ
              </button>
            </div>

            {/* Nút chuyển đổi nhanh giữa Bán niên và Quý 3 */}
            {onSwitchPeriod && (
              <button
                type="button"
                onClick={() => onSwitchPeriod(currentData?.periodKey === 'Quy_3_2026' ? 'Ban_Nien_2026' : 'Quy_3_2026')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
                title={currentData?.periodKey === 'Quy_3_2026' ? "Xem Báo cáo Bán niên 2026" : "Xem Báo cáo Quý 3/2026"}
              >
                <Calendar className="size-3.5 text-primary" />
                <span>{currentData?.periodKey === 'Quy_3_2026' ? "Xem Bán niên 2026" : "Xem Quý 3/2026"}</span>
                <ArrowUpRight className="size-3 opacity-60" />
              </button>
            )}

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

            <button
              type="button"
              onClick={() => setIsCompactLayout(!isCompactLayout)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer",
                isCompactLayout
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                  : "border-border bg-background/80 hover:bg-muted text-foreground"
              )}
              title={isCompactLayout ? "Chuyển sang xem bố cục rộng toàn màn hình" : "Chuyển sang bố cục gọn gàng (dễ đọc, đỡ đảo mắt)"}
            >
              {isCompactLayout ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              <span>{isCompactLayout ? "Bố cục: Gọn (Đỡ đảo mắt)" : "Bố cục: Toàn màn hình"}</span>
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

            {sections.map((sec, idx) => (
              <button
                key={sec.id || `sec-${idx}`}
                ref={(el) => { tabButtonRefs.current[sec.id] = el }}
                onClick={() => setSelectedSectionId(sec.id)}
                title={sec.title}
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
          {visibleSections.map((sec, idx) => (
            <div
              key={sec.id || `sec-${idx}`}
              className="rounded-2xl border border-border/80 bg-card/50 p-5 sm:p-7 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  {getSectionIcon(sec.number)}
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {sec.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {sec.hasAttachedNotes && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`#bang-chinh-${sec.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/80 hover:bg-muted text-foreground border border-border/60 transition-colors shadow-2xs"
                        title="Cuộn tới Bảng số liệu chính"
                      >
                        <span>📊 Bảng chính</span>
                      </a>
                      <a
                        href={`#thuyet-minh-${sec.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors shadow-2xs"
                        title="Cuộn tới Thuyết minh chi tiết"
                      >
                        <span>📑 Thuyết minh chi tiết</span>
                        <span className="text-[10px] font-mono opacity-80 font-bold">({sec.tableCount > 1 ? `${sec.tableCount - 1} bảng` : 'Đầy đủ'})</span>
                      </a>
                    </div>
                  )}
                  {sec.tableCount > 0 && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                      {sec.tableCount} bảng
                    </span>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "agm-markdown-content text-xs sm:text-sm leading-relaxed text-foreground/90 space-y-4",
                  isCompactLayout ? "agm-compact-layout" : "agm-wide-layout"
                )}
                dangerouslySetInnerHTML={{ __html: sec.contentHtml }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
