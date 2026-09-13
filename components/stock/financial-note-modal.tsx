"use client";

import { useEffect, useState } from "react";
import {
  X,
  FileSpreadsheet,
  ArrowUpRight,
  Building2,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BctcNoteItem } from "@/lib/bctc-service";

interface FinancialNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  rowName: string;
  periodLabel?: string;
  cellValueFormatted?: string;
  noteHopNhat?: BctcNoteItem | null;
  noteCongTyMe?: BctcNoteItem | null;
  initialReportType?: "HopNhat" | "CongTyMe";
  hasHopNhat?: boolean;
  hasCongTyMe?: boolean;
  onNavigateToFullReport?: (reportType: "HopNhat" | "CongTyMe", sectionNumber?: number) => void;
}

export function FinancialNoteModal({
  isOpen,
  onClose,
  ticker,
  rowName,
  periodLabel,
  cellValueFormatted,
  noteHopNhat,
  noteCongTyMe,
  initialReportType = "HopNhat",
  hasHopNhat = true,
  hasCongTyMe = false,
  onNavigateToFullReport,
}: FinancialNoteModalProps) {
  const [selectedType, setSelectedType] = useState<"HopNhat" | "CongTyMe">(initialReportType);

  // Đồng bộ loại báo cáo khởi tạo khi mở modal
  useEffect(() => {
    if (noteHopNhat) {
      setSelectedType("HopNhat");
    } else if (noteCongTyMe) {
      setSelectedType("CongTyMe");
    } else {
      setSelectedType(initialReportType);
    }
  }, [noteHopNhat, noteCongTyMe, initialReportType, isOpen]);

  // Phím tắt ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentNote = selectedType === "HopNhat" ? noteHopNhat : noteCongTyMe;
  const otherNote = selectedType === "HopNhat" ? noteCongTyMe : noteHopNhat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in-0 duration-200">
      {/* Click ngoài để đóng */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Hộp thoại Modal chính */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border/90 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ── HEADER ── */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-2xs">
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                    {ticker} · Thuyết Minh BCTC
                  </span>
                  {periodLabel && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                      <Calendar className="size-3" />
                      {periodLabel}
                    </span>
                  )}
                  {cellValueFormatted && cellValueFormatted !== "—" && (
                    <span className="text-[12px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20">
                      Giá trị: {cellValueFormatted}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground mt-1 truncate">
                  {rowName}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Thanh công cụ chuyển đổi Hợp nhất / Công ty mẹ */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-background/80 border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedType("HopNhat")}
                disabled={!hasHopNhat}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  selectedType === "HopNhat"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  !hasHopNhat && "opacity-40 cursor-not-allowed"
                )}
              >
                Thuyết minh Hợp nhất
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("CongTyMe")}
                disabled={!hasCongTyMe}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  selectedType === "CongTyMe"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                  !hasCongTyMe && "opacity-40 cursor-not-allowed"
                )}
              >
                Thuyết minh Công ty mẹ
              </button>
            </div>

            {currentNote && (
              <span className="text-[11.5px] font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <FileText className="size-3.5" />
                {currentNote.rawTitle || currentNote.title}
              </span>
            )}
          </div>
        </div>

        {/* ── NỘI DUNG THUYẾT MINH CHI TIẾT (SCROLLABLE) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {currentNote ? (
            <div className="space-y-4">
              <div
                className="agm-markdown-content text-xs sm:text-sm leading-relaxed text-foreground/90"
                dangerouslySetInnerHTML={{ __html: currentNote.contentHtml }}
              />
            </div>
          ) : (
            <div className="py-12 px-4 rounded-xl border border-dashed border-border/80 text-center space-y-3 bg-muted/20">
              <FileSpreadsheet className="size-10 mx-auto text-muted-foreground/60" />
              <div className="text-sm font-semibold text-foreground">
                Chưa tìm thấy mục thuyết minh riêng cho chỉ tiêu này ở bản {selectedType === "HopNhat" ? "Hợp nhất" : "Công ty mẹ"}
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Một số khoản mục có thể được gộp chung trong thuyết minh tổng hợp hoặc trình bày trong các mục liên quan khác. Bạn có thể mở toàn văn thuyết minh để tra cứu chi tiết.
              </p>
              {otherNote && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedType(selectedType === "HopNhat" ? "CongTyMe" : "HopNhat")}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Xem ở bản {selectedType === "HopNhat" ? "Công ty mẹ" : "Hợp nhất"} →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 border-t border-border bg-muted/30 shrink-0">
          <div className="text-[11px] sm:text-xs text-muted-foreground">
            Dữ liệu trích xuất từ Báo cáo tài chính chính thức có kiểm toán/soát xét
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToFullReport && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToFullReport(selectedType, currentNote?.sectionNumber);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>Xem trên Tab Thuyết minh BCTC</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
