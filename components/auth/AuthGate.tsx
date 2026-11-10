'use client'

import React, { useState } from 'react'
import { Lock, Sparkles, CheckCircle2, ArrowRight, Crown } from 'lucide-react'
import { useAuth } from '@/lib/use-auth'
import { AuthModal } from '@/components/auth/AuthModal'
import { VipUpgradeModal } from '@/components/auth/VipUpgradeModal'
import { cn } from '@/lib/utils'

export type AuthGateProps = {
  /** Toàn bộ nội dung đầy đủ được bảo vệ */
  children: React.ReactNode
  /** Nội dung mẫu xem trước công khai (tùy chọn). Nếu không truyền, AuthGate sẽ lấy phần đầu của children */
  preview?: React.ReactNode
  /** Kiểu hiển thị cổng khóa: 'blur' (mờ dần), 'card' (thẻ khóa), 'inline' (thanh nhỏ gọn) */
  variant?: 'blur' | 'card' | 'inline'
  /** Chiều cao vùng hiển thị xem trước trước khi bị mờ dần (áp dụng cho variant='blur', mặc định 240px) */
  blurHeight?: number | string
  /** Tiêu đề kêu gọi đăng nhập hoặc nâng cấp VIP */
  title?: string
  /** Mô tả phụ chi tiết hơn */
  subtitle?: string
  /** Danh sách các lợi ích mở khóa */
  features?: string[]
  /** Chữ hiển thị trên nút kêu gọi hành động */
  ctaText?: string
  /** Cho phép ép trạng thái đăng nhập từ Server Component (tránh giật layout khi SSR) */
  isLoggedIn?: boolean
  /** Cho phép ép trạng thái VIP từ bên ngoài */
  isVip?: boolean
  /** Phân tầng truy cập: 'member' (đăng nhập miễn phí) | 'vip' (bắt buộc gói VIP) */
  requiredTier?: 'member' | 'vip'
  /** Class tùy biến cho khung bao ngoài */
  className?: string
  /** Callback tùy chọn gọi khi đăng nhập thành công */
  onAuthSuccess?: () => void
}

const DEFAULT_MEMBER_FEATURES = [
  'Mở khóa dữ liệu tài chính lịch sử toàn diện',
  'Đồng bộ danh mục theo dõi trên mọi thiết bị',
  'Đăng nhập miễn phí trong 3 giây bằng Google',
]

const DEFAULT_VIP_FEATURES = [
  'Thuyết minh BCTC bóc tách nợ vay, chi phí dở dang & ĐHĐCĐ chi tiết',
  'Báo cáo Nghiên cứu chuyên sâu AI & Audio Podcast tóm tắt độc quyền',
  'Chỉ số độc quyền: P/E thực tế & Tỷ lệ trích ngoài cổ đông (KTPL / ĐHĐCĐ)',
]

/**
 * Component Cổng Chặn Truy Cập (AuthGate)
 * Hỗ trợ 2 phân tầng:
 * - 'member': Yêu cầu đăng nhập tài khoản miễn phí.
 * - 'vip': Yêu cầu gói Hội viên VIP (95k/tháng, 495k/6 tháng, 890k/1 năm).
 */
export function AuthGate({
  children,
  preview,
  variant = 'blur',
  blurHeight = 240,
  title,
  subtitle,
  features,
  ctaText,
  isLoggedIn: serverIsLoggedIn,
  isVip: serverIsVip,
  requiredTier = 'member',
  className,
}: AuthGateProps) {
  const { isLoggedIn: clientIsLoggedIn, isVip: clientIsVip } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [vipModalOpen, setVipModalOpen] = useState(false)

  // Trạng thái xác thực và quyền VIP
  const isAuthenticated = Boolean(serverIsLoggedIn) || clientIsLoggedIn
  const isEffectiveVip = serverIsVip !== undefined ? serverIsVip : clientIsVip

  // 1. Kiểm tra điều kiện mở khóa hoàn toàn
  if (requiredTier === 'vip') {
    if (isEffectiveVip) {
      return <>{children}</>
    }
  } else {
    // requiredTier === 'member'
    if (isAuthenticated) {
      return <>{children}</>
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHÂN TẦNG 2: YÊU CẦU HỘI VIÊN VIP (GOLD / AMBER LUXURY GATE)
  // ───────────────────────────────────────────────────────────────────────────
  if (requiredTier === 'vip') {
    const vipTitle = title || 'Tính năng dành riêng cho Hội viên VIP'
    const vipSubtitle =
      subtitle ||
      'Chức năng này yêu cầu gói Hội viên VIP (từ 95.000 đ/tháng). Nâng cấp ngay để mở khóa toàn bộ dữ liệu độc quyền.'
    const vipFeatures = features && features.length > 0 ? features : DEFAULT_VIP_FEATURES
    const vipCta = ctaText || '👑 Nâng cấp Hội viên VIP ngay'

    // Chế độ 1: Card độc lập (Dành cho tab riêng, công cụ chuyên biệt)
    if (variant === 'card') {
      return (
        <>
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1f1a14] via-[#16141a] to-[#121118] p-6 sm:p-8 text-center shadow-2xl',
              className
            )}
          >
            {/* Vầng sáng vàng kim luxury */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-44 w-80 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

            {/* Icon Vương Miện VIP */}
            <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 text-amber-400 shadow-xl shadow-amber-500/15">
              <Crown className="size-7 animate-pulse text-amber-300" />
              <Sparkles className="absolute -top-1 -right-1 size-4 text-yellow-300" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300 mb-2">
              <Crown className="size-3" />
              <span>GÓI HỘI VIÊN VIP</span>
            </div>

            <h3 className="relative text-lg sm:text-xl font-black tracking-tight text-white mb-2">
              {vipTitle}
            </h3>
            <p className="relative max-w-md mx-auto text-xs sm:text-sm text-[#c4b5a5] leading-relaxed mb-5">
              {vipSubtitle}
            </p>

            {/* Thẻ giá 3 gói nhanh */}
            <div className="relative mb-5 max-w-md mx-auto grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 text-center">
                <span className="block text-[10px] text-amber-300/80 font-medium">1 Tháng</span>
                <span className="block text-xs sm:text-sm font-black text-amber-300">95.000 đ</span>
              </div>
              <div className="relative rounded-xl border border-amber-500/40 bg-amber-500/15 p-2 text-center shadow-xs">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-1.5 py-0.2 text-[8.5px] font-black text-black">
                  Phổ biến
                </span>
                <span className="block text-[10px] text-amber-300/80 font-medium">6 Tháng</span>
                <span className="block text-xs sm:text-sm font-black text-amber-300">495.000 đ</span>
              </div>
              <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 text-center">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-1.5 py-0.2 text-[8.5px] font-black text-white">
                  -22%
                </span>
                <span className="block text-[10px] text-amber-300/80 font-medium">1 Năm</span>
                <span className="block text-xs sm:text-sm font-black text-amber-300">890.000 đ</span>
              </div>
            </div>

            {/* Danh sách đặc quyền */}
            {vipFeatures && vipFeatures.length > 0 && (
              <div className="relative mb-6 max-w-md mx-auto space-y-2 text-left">
                {vipFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-amber-100/90">
                    <CheckCircle2 className="size-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nút Kêu gọi Hành động */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setVipModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-2.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
              >
                <span>{vipCta}</span>
                <ArrowRight className="size-4" />
              </button>

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <span>Đã có tài khoản VIP? Đăng nhập</span>
                </button>
              )}
            </div>
          </div>

          <VipUpgradeModal
            open={vipModalOpen}
            onClose={() => setVipModalOpen(false)}
            title={vipTitle}
            subtitle={vipSubtitle}
          />

          <AuthModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            title="Đăng nhập tài khoản"
            subtitle="Đăng nhập để tự động kích hoạt quyền Hội viên VIP của bạn."
          />
        </>
      )
    }

    // Chế độ 2: Inline Banner VIP (Dành cho thanh nhỏ gọn)
    if (variant === 'inline') {
      return (
        <>
          <div
            className={cn(
              'flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-xs shadow-md',
              className
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Crown className="size-4" />
              </div>
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>{vipTitle}</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black text-amber-300">
                    VIP
                  </span>
                </p>
                <p className="text-[#c4b5a5] text-[11px]">{vipSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setVipModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1.5 font-bold text-black hover:brightness-110 transition cursor-pointer"
              >
                <span>Nâng cấp VIP</span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          </div>

          <VipUpgradeModal
            open={vipModalOpen}
            onClose={() => setVipModalOpen(false)}
            title={vipTitle}
            subtitle={vipSubtitle}
          />
        </>
      )
    }

    // Chế độ 3: Blur Mờ dần VIP (Mặc định cho các bài báo cáo, bảng biểu dài)
    const heightStyle = typeof blurHeight === 'number' ? `${blurHeight}px` : blurHeight

    return (
      <>
        <div className={cn('relative overflow-hidden rounded-2xl', className)}>
          {/* Vùng xem trước bị mờ */}
          <div
            style={{ maxHeight: heightStyle }}
            className="pointer-events-none select-none overflow-hidden opacity-45 blur-[0.7px]"
            aria-hidden="true"
          >
            {preview ? preview : children}
          </div>

          {/* Lớp phủ Gradient Mờ Dần & Hộp Nâng cấp VIP */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-transparent via-[#141318]/85 to-[#121117] backdrop-blur-[2px]">
            <div className="px-4 pb-6 pt-10 text-center">
              <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-[#1a171d]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 text-amber-300 shadow-lg shadow-amber-500/15">
                  <Crown className="size-6 animate-pulse text-amber-300" />
                </div>

                <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 mb-1.5">
                  <Sparkles className="size-3" />
                  <span>ĐẶC QUYỀN HỘI VIÊN VIP</span>
                </div>

                <h4 className="text-sm sm:text-base font-black text-white mb-1.5">
                  {vipTitle}
                </h4>
                <p className="text-xs text-[#c4b5a5] leading-relaxed max-w-md mx-auto mb-3.5">
                  {vipSubtitle}
                </p>

                {/* 3 gói giá thu nhỏ */}
                <div className="mb-3.5 grid grid-cols-3 gap-1.5 text-center max-w-sm mx-auto">
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1">
                    <span className="block text-[9px] text-[#c4b5a5]">1 Tháng</span>
                    <span className="block text-xs font-black text-amber-300">95.000 đ</span>
                  </div>
                  <div className="relative rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1">
                    <span className="block text-[9px] text-amber-200">6 Tháng</span>
                    <span className="block text-xs font-black text-amber-300">495.000 đ</span>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1">
                    <span className="block text-[9px] text-[#c4b5a5]">1 Năm</span>
                    <span className="block text-xs font-black text-amber-300">890.000 đ</span>
                  </div>
                </div>

                {/* Nút bấm hành động */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVipModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-5 py-2.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                  >
                    <span>{vipCta}</span>
                    <ArrowRight className="size-4" />
                  </button>

                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <span>Đăng nhập</span>
                    </button>
                  )}
                </div>

                <p className="mt-2.5 text-[10.5px] text-[#8c8275]">
                  Kích hoạt tức thì qua chuyển khoản QR · Hỗ trợ kỹ thuật 24/7
                </p>
              </div>
            </div>
          </div>
        </div>

        <VipUpgradeModal
          open={vipModalOpen}
          onClose={() => setVipModalOpen(false)}
          title={vipTitle}
          subtitle={vipSubtitle}
        />

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title="Đăng nhập tài khoản"
          subtitle="Đăng nhập để tự động kích hoạt quyền Hội viên VIP của bạn."
        />
      </>
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHÂN TẦNG 1: YÊU CẦU ĐĂNG NHẬP THÀNH VIÊN MIỄN PHÍ (EMERALD GATE)
  // ───────────────────────────────────────────────────────────────────────────
  const memberTitle = title || 'Đăng nhập để xem nội dung đầy đủ'
  const memberSubtitle =
    subtitle || 'Đăng nhập tài khoản miễn phí chỉ trong 3 giây để mở khóa toàn bộ dữ liệu chuyên sâu.'
  const memberFeatures = features && features.length > 0 ? features : DEFAULT_MEMBER_FEATURES
  const memberCta = ctaText || 'Đăng nhập miễn phí'

  // Chế độ 1: Card độc lập
  if (variant === 'card') {
    return (
      <>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#181d28] to-[#12151d] p-6 sm:p-8 text-center shadow-xl',
            className
          )}
        >
          {/* Vầng sáng nền (Aura glow) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-40 w-72 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Icon Khóa */}
          <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Lock className="size-6" />
            <Sparkles className="absolute -top-1 -right-1 size-4 text-amber-400 animate-pulse" />
          </div>

          <h3 className="relative text-lg sm:text-xl font-bold tracking-tight text-white mb-2">
            {memberTitle}
          </h3>
          <p className="relative max-w-md mx-auto text-xs sm:text-sm text-[#9EACB9] leading-relaxed mb-6">
            {memberSubtitle}
          </p>

          {/* Danh sách lợi ích */}
          {memberFeatures && memberFeatures.length > 0 && (
            <div className="relative mb-6 max-w-sm mx-auto space-y-2 text-left">
              {memberFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          )}

          {/* Nút Đăng nhập mở Modal */}
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
          >
            <span>{memberCta}</span>
            <ArrowRight className="size-4" />
          </button>
        </div>

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title={memberTitle}
          subtitle={memberSubtitle}
        />
      </>
    )
  }

  // Chế độ 2: Inline Banner
  if (variant === 'inline') {
    return (
      <>
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 sm:p-4 text-xs',
            className
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Lock className="size-3.5" />
            </div>
            <div>
              <p className="font-semibold text-white">{memberTitle}</p>
              <p className="text-[#9EACB9] text-[11px]">{memberSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 font-bold text-black hover:bg-emerald-400 transition cursor-pointer"
          >
            <span>{memberCta}</span>
            <ArrowRight className="size-3" />
          </button>
        </div>

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title={memberTitle}
          subtitle={memberSubtitle}
        />
      </>
    )
  }

  // Chế độ 3: Blur Mờ dần
  const heightStyle = typeof blurHeight === 'number' ? `${blurHeight}px` : blurHeight

  return (
    <>
      <div className={cn('relative overflow-hidden rounded-2xl', className)}>
        {/* Phần nội dung hiển thị hé lộ (Preview) */}
        <div
          style={{ maxHeight: heightStyle }}
          className="pointer-events-none select-none overflow-hidden opacity-50 blur-[0.6px]"
          aria-hidden="true"
        >
          {preview ? preview : children}
        </div>

        {/* Lớp phủ Gradient Mờ Dần & Kính Frosted */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-transparent via-[#14171f]/85 to-[#14171f] backdrop-blur-[2px]">
          <div className="px-4 pb-6 pt-10 text-center">
            {/* Box Kêu gọi hành động */}
            <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#161a24]/90 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-md shadow-emerald-500/10">
                <Lock className="size-5" />
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white mb-1.5">
                {memberTitle}
              </h4>
              <p className="text-xs text-[#9EACB9] leading-relaxed max-w-md mx-auto mb-4">
                {memberSubtitle}
              </p>

              {/* Danh sách lợi ích tóm tắt */}
              {memberFeatures && memberFeatures.length > 0 && (
                <div className="mb-4 inline-flex flex-col gap-1.5 text-left text-[11px] sm:text-xs text-slate-300">
                  {memberFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Nút bấm Đăng nhập */}
              <div>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
                >
                  <Sparkles className="size-3.5 text-black" />
                  <span>{memberCta}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>

              <p className="mt-2.5 text-[10.5px] text-[#64748b]">
                Đăng nhập tức thì với tài khoản Google · Không cần cài đặt mật khẩu
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={memberTitle}
        subtitle={memberSubtitle}
      />
    </>
  )
}
