'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  FileText,
  FileArchive,
  ExternalLink,
  Search,
  Calendar,
  ShieldCheck,
  Globe,
  FolderDown,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BctcCompanyDocumentsPayload } from '@/lib/bctc-document-service'

interface BctcDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documents: BctcCompanyDocumentsPayload | null
  companyName?: string
}

export function BctcDocumentModal({
  isOpen,
  onClose,
  documents,
  companyName,
}: BctcDocumentModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Phím tắt ESC để đóng modal & khóa cuộn body khi modal mở
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const groups = documents?.groups || []
  const ticker = documents?.ticker || ''
  const totalFiles = documents?.totalFiles || 0
  const hasArchivedPdfs = documents?.hasArchivedPdfs ?? false
  const externalPortals = documents?.externalPortals || []

  // Danh sách các năm có tài liệu
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

  if (!isOpen || !mounted || !documents) return null

  return createPortal(
    <div
      className={cn(
        "portal-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200",
        isFullscreen ? "p-0" : "p-2 sm:p-4 md:p-6"
      )}
      style={{ zIndex: 999999 }}
    >
      {/* Click ngoài để đóng (khi không fullscreen) */}
      {!isFullscreen && (
        <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      )}

      {/* Khối hộp thoại Modal chính */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "portal-modal-content relative z-10 flex flex-col bg-card border border-border/90 shadow-2xl transition-all duration-200 animate-in zoom-in-95",
          isFullscreen
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none border-0"
            : "w-[96vw] max-w-4xl xl:max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden"
        )}
        style={{ zIndex: 1000000 }}
      >
        {/* ── 1. HEADER MODAL ── */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-card to-card border-b border-border/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs">
              <FolderDown className="size-5 sm:size-5.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate">
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
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {hasArchivedPdfs
                  ? `Tải trực tiếp bản gốc PDF có chữ ký kiểm toán viên & dấu đỏ của ${companyName || ticker}.`
                  : `Truy cập tài liệu BCTC chính thức qua các cổng công bố thông tin đại chúng của ${companyName || ticker}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="size-8 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ── 2. THANH BỘ LỌC THEO NĂM & TÌM KIẾM ── */}
        {hasArchivedPdfs && (
          <div className="p-3 sm:p-4 bg-muted/20 border-b border-border/60 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                {availableYears.map((yr) => (
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
          </div>
        )}

        {/* ── 3. NỘI DUNG CUỘN DANH SÁCH FILE ── */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
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
                  Không tìm thấy tài liệu phù hợp với bộ lọc &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          )}

          {/* ── 4. CÁC CỔNG THÔNG TIN CÔNG BỐ BCTC CHÍNH THỨC ── */}
          {externalPortals.length > 0 && (
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
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/30 p-3 hover:bg-muted/70 hover:border-primary/50 transition-all group"
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
          )}
        </div>

        {/* ── 5. FOOTER MODAL ── */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 border-t border-border/80 shrink-0">
          <div className="text-xs text-muted-foreground font-mono">
            {totalFiles > 0 ? (
              <span>Đang hiển thị {visibleFileCount}/{totalFiles} tài liệu gốc ({ticker})</span>
            ) : (
              <span>Tài liệu công bố chính thức</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
