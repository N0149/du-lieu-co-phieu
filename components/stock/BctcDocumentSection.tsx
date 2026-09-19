'use client'

import React, { useState, useMemo } from 'react'
import {
  Download,
  FileText,
  FileArchive,
  ExternalLink,
  Search,
  Calendar,
  Building2,
  ShieldCheck,
  Globe,
  ChevronDown,
  ChevronUp,
  FolderDown,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BctcCompanyDocumentsPayload } from '@/lib/bctc-document-service'

interface BctcDocumentSectionProps {
  documents: BctcCompanyDocumentsPayload
  companyName?: string
  defaultExpanded?: boolean
}

export function BctcDocumentSection({
  documents,
  companyName,
  defaultExpanded = false,
}: BctcDocumentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { ticker, totalFiles, hasArchivedPdfs, groups, externalPortals } = documents

  // Lấy danh sách các năm có tài liệu
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(groups.map((g) => g.nam))).filter(Boolean)
    return years.sort((a, b) => Number(b) - Number(a))
  }, [groups])

  // Lọc danh sách nhóm và file
  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (selectedYear !== 'all' && g.nam !== selectedYear) return false
        return true
      })
      .map((g) => {
        if (!searchQuery.trim()) return g
        const q = searchQuery.toLowerCase().trim()
        const matchingFiles = g.files.filter(
          (f) =>
            f.tenbaocao.toLowerCase().includes(q) ||
            f.tenfile.toLowerCase().includes(q) ||
            g.periodLabel.toLowerCase().includes(q)
        )
        return { ...g, files: matchingFiles }
      })
      .filter((g) => g.files.length > 0)
  }, [groups, selectedYear, searchQuery])

  const visibleFileCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.files.length, 0)
  }, [filteredGroups])

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden transition-all">
      {/* ── 1. HEADER BANNER TẢI FILE GỐC ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-card to-card border-b border-border/70">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs">
            <FolderDown className="size-5.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Tài Liệu Báo Cáo Tài Chính Gốc ({ticker})
              </h3>
              {hasArchivedPdfs ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                  <ShieldCheck className="size-3" />
                  {totalFiles} file PDF/ZIP chính thức
                </span>
              ) : (
                <span className="rounded-full bg-sky-500/20 border border-sky-500/40 px-2.5 py-0.5 text-xs font-bold text-sky-400">
                  Công bố thông tin UBCKNN
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasArchivedPdfs
                ? `Tải trực tiếp bản gốc PDF có chữ ký kiểm toán viên & dấu đỏ của ${companyName || ticker}.`
                : `Truy cập tài liệu BCTC chính thức qua các cổng công bố thông tin đại chúng của ${companyName || ticker}.`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/60 hover:bg-muted px-4 py-2 text-xs font-bold text-foreground transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Thu gọn danh sách' : 'Mở danh mục file gốc'}</span>
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {/* ── 2. NỘI DUNG KHI MỞ RỘNG ── */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6 animate-in fade-in-50 duration-200">
          {/* Bộ lọc theo Năm và Ô tìm kiếm */}
          {hasArchivedPdfs && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
              {/* Lọc theo Năm */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                  <Calendar className="size-3.5" /> Năm:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedYear('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer',
                    selectedYear === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                  )}
                >
                  Tất cả ({totalFiles})
                </button>
                {availableYears.slice(0, 8).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer',
                      selectedYear === yr
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {yr}
                  </button>
                ))}
              </div>

              {/* Ô tìm kiếm báo cáo */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm BCTC (Kiểm toán, Q2, Soát xét...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 rounded-xl border border-border bg-background/80 pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Danh sách file PDF tải về */}
          {hasArchivedPdfs && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Hiển thị {visibleFileCount} tài liệu báo cáo:</span>
                {selectedYear !== 'all' && (
                  <span className="text-emerald-400 font-bold">Năm {selectedYear}</span>
                )}
              </div>

              {filteredGroups.length > 0 ? (
                <div className="space-y-4">
                  {filteredGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="rounded-xl border border-border/70 bg-background/50 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                          {group.periodLabel}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({group.files.length} tài liệu)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {group.files.map((file, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-emerald-500/40 hover:bg-muted/40 transition-all group shadow-2xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              {file.isZip ? (
                                <FileArchive className="size-4.5 text-amber-400 shrink-0 mt-0.5" />
                              ) : (
                                <FileText className="size-4.5 text-rose-400 shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                                  {file.tenbaocao}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                                  {file.tenfile}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={file.linkbaocao}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.tenfile}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400 transition-colors"
                                title="Tải file về máy"
                              >
                                <Download className="size-3" />
                                <span>Tải</span>
                              </a>
                              <a
                                href={file.linkbaocao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center size-7 rounded-lg border border-border bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Xem trực tiếp trên trình duyệt"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border p-6">
                  Không tìm thấy tài liệu phù hợp với bộ lọc.
                </div>
              )}
            </div>
          )}

          {/* ── 3. CÁC CỔNG THÔNG TIN CÔNG BỐ BCTC CHÍNH THỨC ── */}
          <div className="pt-4 border-t border-border/60 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Cổng Công Bố & Tải BCTC Chính Thức Khác:
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {externalPortals.map((portal, idx) => (
                <a
                  key={idx}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/30 p-3.5 hover:bg-muted/70 hover:border-primary/50 transition-all group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {portal.name}
                      </p>
                      <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {portal.description}
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-primary/80 font-semibold">
                    Mở cổng thông tin →
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
