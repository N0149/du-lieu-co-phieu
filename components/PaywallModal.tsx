'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { AccessStatus } from '@/lib/auth-check'
import { Paywall } from '@/components/Paywall'

type PaywallModalProps = {
  /** Mở/đóng modal. */
  open: boolean
  /** Đóng modal (click nền / nút X / phím Escape). */
  onClose: () => void
  /** Callback sau khi bắt đầu dùng thử thành công (thường giống onClose + refresh). */
  onStarted?: () => void
  /** Trạng thái quyền truy cập để chọn nội dung Paywall. */
  status: AccessStatus
}

/**
 * Modal nâng cấp gói VIP — bọc nội dung `<Paywall />` trong overlay.
 * Dùng cho TrialBadge (badge trạng thái trên header) khi bấm "Hết hạn dùng thử"
 * hoặc "Dùng thử 7 ngày".
 */
export function PaywallModal({ open, onClose, onStarted, status }: PaywallModalProps) {
  // Đóng bằng phím Escape
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Khóa cuộn nền khi modal mở
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Nâng cấp gói VIP"
    >
      {/* Lớp nền mờ */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Nội dung modal */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <Paywall status={status} onStarted={onStarted} />
      </div>
    </div>
  )
}
