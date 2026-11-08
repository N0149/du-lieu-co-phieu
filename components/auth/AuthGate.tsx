'use client'

import React, { useState } from 'react'
import { Lock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/use-auth'
import { AuthModal } from '@/components/auth/AuthModal'
import { cn } from '@/lib/utils'

export type AuthGateProps = {
  /** Toàn bộ nội dung đầy đủ được bảo vệ (chỉ mở khi đã đăng nhập) */
  children: React.ReactNode
  /** Nội dung mẫu xem trước công khai (tùy chọn). Nếu không truyền, AuthGate sẽ lấy phần đầu của children */
  preview?: React.ReactNode
  /** Kiểu hiển thị cổng khóa: 'blur' (mờ dần), 'card' (thẻ khóa), 'inline' (thanh nhỏ gọn) */
  variant?: 'blur' | 'card' | 'inline'
  /** Chiều cao vùng hiển thị xem trước trước khi bị mờ dần (áp dụng cho variant='blur', mặc định 240px) */
  blurHeight?: number | string
  /** Tiêu đề kêu gọi đăng nhập */
  title?: string
  /** Mô tả phụ chi tiết hơn */
  subtitle?: string
  /** Danh sách các lợi ích mở khóa khi đăng nhập */
  features?: string[]
  /** Chữ hiển thị trên nút kêu gọi hành động */
  ctaText?: string
  /** Cho phép ép trạng thái đăng nhập từ Server Component (tránh giật layout khi SSR) */
  isLoggedIn?: boolean
  /** Class tùy biến cho khung bao ngoài */
  className?: string
  /** Callback tùy chọn gọi khi đăng nhập thành công */
  onAuthSuccess?: () => void
}

const DEFAULT_FEATURES = [
  'Mở khóa dữ liệu tài chính lịch sử toàn diện',
  'Đồng bộ danh mục theo dõi trên mọi thiết bị',
  'Đăng nhập miễn phí trong 3 giây bằng Google',
]

/**
 * Component Cổng Chặn Đăng Nhập (AuthGate)
 * Bảo vệ các nội dung chuyên sâu, yêu cầu người dùng đăng nhập để mở khóa.
 */
export function AuthGate({
  children,
  preview,
  variant = 'blur',
  blurHeight = 240,
  title = 'Đăng nhập để xem nội dung đầy đủ',
  subtitle = 'Đăng nhập tài khoản miễn phí chỉ trong 3 giây để mở khóa toàn bộ dữ liệu chuyên sâu.',
  features = DEFAULT_FEATURES,
  ctaText = 'Đăng nhập miễn phí',
  isLoggedIn: serverIsLoggedIn,
  className,
}: AuthGateProps) {
  const { isLoggedIn: clientIsLoggedIn, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Ưu tiên trạng thái từ server nếu có truyền vào, nếu không dùng trạng thái client
  const isAuthenticated = Boolean(serverIsLoggedIn) || clientIsLoggedIn

  // Nếu người dùng đã đăng nhập -> Hiển thị 100% nội dung
  if (isAuthenticated) {
    return <>{children}</>
  }

  // Đang kiểm tra phiên đăng nhập (chưa xác định) -> Tạm hiển thị preview để tránh giật giao diện
  if (loading && serverIsLoggedIn === undefined) {
    return (
      <div className={cn('relative', className)}>
        {preview ? preview : children}
      </div>
    )
  }

  // Chế độ 1: Card độc lập (Dành cho tab riêng, công cụ chuyên biệt, xuất file)
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
            {title}
          </h3>
          <p className="relative max-w-md mx-auto text-xs sm:text-sm text-[#9EACB9] leading-relaxed mb-6">
            {subtitle}
          </p>

          {/* Danh sách lợi ích */}
          {features && features.length > 0 && (
            <div className="relative mb-6 max-w-sm mx-auto space-y-2 text-left">
              {features.map((feat, idx) => (
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
            <span>{ctaText}</span>
            <ArrowRight className="size-4" />
          </button>
        </div>

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title={title}
          subtitle={subtitle}
        />
      </>
    )
  }

  // Chế độ 2: Inline Banner (Dành cho các nút bấm, widget nhỏ)
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
              <p className="font-semibold text-white">{title}</p>
              <p className="text-[#9EACB9] text-[11px]">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 font-bold text-black hover:bg-emerald-400 transition cursor-pointer"
          >
            <span>{ctaText}</span>
            <ArrowRight className="size-3" />
          </button>
        </div>

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title={title}
          subtitle={subtitle}
        />
      </>
    )
  }

  // Chế độ 3: Blur Mờ dần (Mặc định - Trải nghiệm tốt nhất cho bài viết, bảng biểu dài)
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
                {title}
              </h4>
              <p className="text-xs text-[#9EACB9] leading-relaxed max-w-md mx-auto mb-4">
                {subtitle}
              </p>

              {/* Danh sách lợi ích tóm tắt */}
              {features && features.length > 0 && (
                <div className="mb-4 inline-flex flex-col gap-1.5 text-left text-[11px] sm:text-xs text-slate-300">
                  {features.map((feat, idx) => (
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
                  <span>{ctaText}</span>
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
        title={title}
        subtitle={subtitle}
      />
    </>
  )
}
