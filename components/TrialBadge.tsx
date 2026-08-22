'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, Clock, TimerOff, Sparkles } from 'lucide-react'
import {
  checkUserAccess,
  type AccessResult,
  type UserProfile,
} from '@/lib/auth-check'
import { PaywallModal } from '@/components/PaywallModal'

type SessionPayload = {
  user: UserProfile | null
  access: AccessResult
}

/**
 * Badge trạng thái dùng thử/VIP trên header (cạnh ThemeToggle).
 *
 * Lấy session từ `GET /api/auth/session` sau khi mount (cookie httpOnly nên
 * client không đọc trực tiếp được — phải qua API).
 *
 *  - UNAUTHENTICATED     → nút "Dùng thử 7 ngày" (mở modal nâng cấp)
 *  - TRIAL_ACTIVE        → badge emerald "Dùng thử: còn X ngày"
 *  - SUBSCRIPTION_ACTIVE → badge VIP "Thành viên VIP"
 *  - EXPIRED             → badge cảnh báo "Hết hạn dùng thử" (click mở modal)
 */
export function TrialBadge() {
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const loadSession = useCallback(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SessionPayload | null) => {
        if (!cancelled && data) setSession(data)
      })
      .catch(() => {
        // Giữ trạng thái hiện tại khi API lỗi — không làm vỡ header
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cancel = loadSession()
    return cancel
  }, [loadSession, reloadKey])

  function openModal() {
    setModalOpen(true)
  }

  /** Đóng modal + nạp lại session (để badge cập nhật sau khi bắt đầu dùng thử). */
  function handleModalClosed() {
    setModalOpen(false)
    setReloadKey((k) => k + 1)
  }

  // ── Skeleton khi đang tải session ─────────────────────────────────────
  if (loading && !session) {
    return <span className="h-7 w-24 animate-pulse rounded-md bg-muted" aria-hidden="true" />
  }

  const access = session?.access ?? checkUserAccess(session?.user ?? null)

  // ── Đang trong 7 ngày dùng thử ────────────────────────────────────────
  if (access.status === 'TRIAL_ACTIVE') {
    return (
      <span
        className="hidden items-center gap-1.5 rounded-full border border-positive/30 bg-positive-muted px-2.5 py-1 text-[11px] font-semibold text-positive sm:inline-flex"
        title={`Hết hạn: ${access.expiresAt ?? '—'}`}
      >
        <Clock className="size-3" />
        Dùng thử: còn {access.daysRemaining} ngày
      </span>
    )
  }

  // ── Đã kích hoạt VIP ──────────────────────────────────────────────────
  if (access.status === 'SUBSCRIPTION_ACTIVE') {
    return (
      <span className="hidden items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground sm:inline-flex">
        <Crown className="size-3" />
        Thành viên VIP
      </span>
    )
  }

  // ── Hết hạn dùng thử → badge cảnh báo, click mở modal nâng cấp ────────
  if (access.status === 'EXPIRED') {
    return (
      <>
        <button
          type="button"
          onClick={openModal}
          className="hidden items-center gap-1.5 rounded-full border border-warning/40 bg-warning-muted px-2.5 py-1 text-[11px] font-semibold text-warning transition-colors hover:bg-warning/20 sm:inline-flex"
          title="Nâng cấp tài khoản VIP"
        >
          <TimerOff className="size-3" />
          Hết hạn dùng thử
        </button>
        <PaywallModal
          open={modalOpen}
          onClose={handleModalClosed}
          onStarted={handleModalClosed}
          status="EXPIRED"
        />
      </>
    )
  }

  // ── Chưa đăng nhập → CTA bắt đầu dùng thử 7 ngày ──────────────────────
  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 sm:inline-flex"
        title="Bắt đầu 7 ngày dùng thử miễn phí"
      >
        <Sparkles className="size-3" />
        Dùng thử 7 ngày
      </button>
      <PaywallModal
        open={modalOpen}
        onClose={handleModalClosed}
        onStarted={handleModalClosed}
        status="UNAUTHENTICATED"
      />
    </>
  )
}
