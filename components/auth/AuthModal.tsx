'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, Sparkles, Loader2, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getGuestWatchlist, clearGuestWatchlist } from '@/lib/guest-watchlist'
import { syncGuestWatchlist } from '@/lib/watchlist-service'

type AuthModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
}

export function AuthModal({
  open,
  onClose,
  title = 'Đăng nhập tài khoản',
  subtitle = 'Lưu trữ danh mục theo dõi và đồng bộ tức thì giữa điện thoại & máy tính',
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const configured = isSupabaseConfigured()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  // Đăng nhập bằng Google
  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setError('Chưa kết nối Supabase. Vui lòng kiểm tra biến môi trường.')
      setGoogleLoading(false)
      return
    }

    try {
      const origin = window.location.origin
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_redirect_next', window.location.pathname)
      }
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      })
      if (authErr) throw authErr
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng nhập với Google')
      setGoogleLoading(false)
    }
  }

  // Đăng nhập bằng Email OTP / Magic Link
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }

    setError(null)
    setLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setError('Chưa kết nối Supabase. Vui lòng kiểm tra biến môi trường.')
      setLoading(false)
      return
    }

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auth_redirect_next', window.location.pathname)
      }
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      })

      if (otpErr) throw otpErr
      setSentSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Không thể gửi liên kết đăng nhập. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-50 duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#14171f] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-[#9EACB9] transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* Header Modal */}
        <div className="text-center mb-6 pt-2">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-xs">
            <Sparkles className="size-5" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-1.5 text-xs text-[#9EACB9] leading-relaxed max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {!configured ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-bold mb-1 text-amber-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>Cần cấu hình Supabase</span>
            </div>
            <p className="leading-relaxed">
              Vui lòng điền <code className="rounded bg-black/40 px-1 py-0.5 text-white">NEXT_PUBLIC_SUPABASE_URL</code> và{' '}
              <code className="rounded bg-black/40 px-1 py-0.5 text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> vào file{' '}
              <code className="text-emerald-400">.env.local</code> để kích hoạt đăng nhập.
            </p>
          </div>
        ) : sentSuccess ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center text-xs space-y-2">
            <CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
            <p className="font-bold text-sm text-emerald-300">Đã gửi liên kết đăng nhập!</p>
            <p className="text-[#9EACB9] leading-relaxed">
              Chúng tôi đã gửi đường link xác thực đến <span className="font-semibold text-white">{email}</span>. Vui lòng kiểm tra hộp thư (cả mục Spam) và bấm vào liên kết để hoàn tất đăng nhập.
            </p>
            <button
              type="button"
              onClick={() => {
                setSentSuccess(false)
                setEmail('')
              }}
              className="mt-3 text-xs text-emerald-400 hover:underline inline-block font-medium"
            >
              Gửi lại với email khác
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Nút Google 1-click */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10 hover:border-white/25 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.2.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
              )}
              <span>Tiếp tục với Google</span>
            </button>

            {/* Dải phân cách */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-[#64748b]">Hoặc bằng Email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Form Email Magic Link */}
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#9EACB9] mb-1.5">
                  Địa chỉ Email nhận liên kết đăng nhập
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#64748b]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tenban@gmail.com"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0e1117] py-2.5 pl-10 pr-3 text-xs text-white placeholder-[#64748b] outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-black transition-all hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Gửi liên kết đăng nhập không cần mật khẩu</span>
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-[#64748b]">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>Không cần nhớ mật khẩu. Xác thực an toàn 100%.</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
