'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Crown, Sparkles, X } from 'lucide-react'
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
  // Chỉ mount sau khi client sẵn sàng — createPortal cần `document` (không có ở SSR)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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

  // Render qua createPortal vào <body> — tránh bị kẹt trong containing block:
  // header sticky có `backdrop-blur` (backdrop-filter) sẽ khiến `position: fixed`
  // của modal bị neo theo header (chỉ phủ 56px thay vì toàn viewport).
  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Nâng cấp gói VIP"
    >
      {/*
        Khung modal — dùng `my-auto` để khi nội dung cao hơn viewport thì phần
        đầu modal vẫn cuộn tới được (không bị che khuất bởi flexbox centering).
      */}
      <div
        className="relative my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header cố định — tiêu đề + badge dùng thử + nút đóng luôn hiển thị */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Crown className="size-5 shrink-0 text-primary" />
            <h2 className="truncate text-base font-bold tracking-tight text-foreground">
              Nâng cấp gói VIP
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-positive/30 bg-positive-muted px-2 py-0.5 text-[11px] font-semibold text-positive sm:inline-flex">
              <Sparkles className="size-3" />
              7 ngày dùng thử miễn phí
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Nội dung — cuộn bên trong nếu màn hình nhỏ */}
        <div className="overflow-y-auto p-6 space-y-4">
          <Paywall status={status} onStarted={onStarted} variant="modal" />
        </div>
      </div>
    </div>,
    document.body,
  )
}
