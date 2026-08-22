'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown,
  Lock,
  CheckCircle2,
  Landmark,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Clock,
  Loader2,
} from 'lucide-react'
import type { AccessStatus } from '@/lib/auth-check'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Thông tin thanh toán chuyển khoản ngân hàng (đồng bộ với trang /lien-he). */
export const BANK_INFO = {
  bankName: 'TPBank',
  accountNumber: '0000 4944 263',
  accountOwner: 'NGUYEN TRUNG NHAT',
  transferSyntax: '[DULIEUCOPHIEU - Email hoặc Mã User]',
} as const

/** Số Zalo hỗ trợ / kích hoạt nhanh. */
export const ZALO_CONTACT = '0983.627.018'

/** Quyền lợi gói VIP hiển thị trong Paywall. */
const VIP_BENEFITS = [
  'Truy cập không giới hạn toàn bộ báo cáo phân tích',
  'Định giá chi tiết & bóc tách RNAV tài sản ngầm',
  'Khuyến nghị đầu tư cập nhật liên tục',
] as const

type PaywallProps = {
  /** Trạng thái quyền truy cập hiện tại của người dùng. */
  status: AccessStatus
  /** Callback sau khi bắt đầu dùng thử thành công (vd: đóng modal). */
  onStarted?: () => void
  className?: string
}

/**
 * Giao diện Paywall — khóa nội dung chi tiết báo cáo & hướng dẫn nâng cấp.
 * Hiển thị 2 trạng thái chính:
 *  - `UNAUTHENTICATED`: mời đăng nhập / bắt đầu 7 ngày dùng thử.
 *  - `EXPIRED`        : thông báo hết hạn + hướng dẫn chuyển khoản nâng cấp VIP.
 * (TRIAL_ACTIVE / SUBSCRIPTION_ACTIVE không render Paywall.)
 */
export function Paywall({ status, onStarted, className }: PaywallProps) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExpired = status === 'EXPIRED'

  /** Bắt đầu 7 ngày dùng thử miễn phí (tạo session + refresh để mở khóa báo cáo). */
  async function handleStartTrial() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_trial' }),
      })
      if (!res.ok) {
        throw new Error('Không thể bắt đầu dùng thử. Vui lòng thử lại sau.')
      }
      onStarted?.()
      // Refresh Server Component hiện tại để server đọc lại cookie → mở khóa nội dung
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <section
      className={cn(
        'mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative border-b border-border bg-secondary/50 px-6 py-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isExpired ? <Lock className="size-6" /> : <Sparkles className="size-6" />}
        </div>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {isExpired
            ? 'Thời gian trải nghiệm 7 ngày miễn phí đã kết thúc'
            : 'Vui lòng đăng nhập để bắt đầu 7 ngày dùng thử'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {isExpired
            ? 'Nâng cấp tài khoản VIP để tiếp tục truy cập toàn bộ báo cáo và định giá chi tiết.'
            : 'Khám phá trọn vẹn kho báo cáo phân tích và công cụ định giá giá trị.'}
        </p>
      </div>

      <div className="px-6 py-6">
        {/* ── Quyền lợi gói VIP ────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Crown className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Quyền lợi gói VIP</h3>
          </div>
          <ul className="space-y-1.5">
            {VIP_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── CTA dùng thử / đăng nhập ─────────────────────────────────── */}
        {!isExpired && (
          <div className="mb-6">
            <Button
              className="w-full"
              size="lg"
              onClick={handleStartTrial}
              disabled={starting}
            >
              {starting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {starting ? 'Đang tạo tài khoản dùng thử...' : 'Bắt đầu 7 ngày dùng thử miễn phí'}
            </Button>
            {error && <p className="mt-2 text-center text-xs text-negative">{error}</p>}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Không cần thẻ tín dụng. Hết hạn có thể nâng cấp bất cứ lúc nào.
            </p>
          </div>
        )}

        {/* ── Hướng dẫn thanh toán ngân hàng ───────────────────────────── */}
        <div className="mb-4 flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Thanh toán chuyển khoản</h3>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ngân hàng</p>
              <p className="text-sm font-semibold text-foreground">{BANK_INFO.bankName}</p>
            </div>
            <ShieldCheck className="size-5 text-positive" />
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Số tài khoản
                </p>
                <p className="font-mono text-base font-bold tabular-nums text-foreground">
                  {BANK_INFO.accountNumber}
                </p>
              </div>
              <CopyButton value={BANK_INFO.accountNumber} label="Sao chép STK" />
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Chủ tài khoản
                </p>
                <p className="text-sm font-semibold text-foreground">{BANK_INFO.accountOwner}</p>
              </div>
              <CopyButton value={BANK_INFO.accountOwner} label="Sao chép" />
            </div>

            <div className="px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Cú pháp chuyển khoản
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground">
                  {BANK_INFO.transferSyntax}
                </code>
                <CopyButton value={BANK_INFO.transferSyntax} label="Sao chép" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Clock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Sau khi chuyển khoản thành công, tài khoản VIP sẽ được kích hoạt trong vòng 24 giờ
            làm việc.
          </span>
        </p>

        {/* ── Liên hệ kích hoạt nhanh ──────────────────────────────────── */}
        <a
          href={`tel:${ZALO_CONTACT}`}
          className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <MessageCircle className="size-4" />
          Liên hệ Zalo {ZALO_CONTACT} để kích hoạt nhanh
        </a>
      </div>
    </section>
  )
}
