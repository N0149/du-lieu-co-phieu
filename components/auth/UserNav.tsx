'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User, LogIn, LogOut, Star, ChevronDown, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import { getGuestWatchlist, clearGuestWatchlist } from '@/lib/guest-watchlist'
import { syncGuestWatchlist } from '@/lib/watchlist-service'

export function UserNav() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    if (!supabase) {
      setLoading(false)
      return
    }

    // 1. Kiểm tra session hiện tại từ cookie/storage tức thì (0ms)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)

      // 2. Tự động đồng bộ nếu khách đã bấm mã ở localStorage trước khi đăng nhập
      if (currentUser) {
        const guestTickers = getGuestWatchlist()
        if (guestTickers.length > 0) {
          try {
            await syncGuestWatchlist(guestTickers)
            clearGuestWatchlist()
          } catch (e) {
            console.error('[UserNav] Lỗi đồng bộ danh mục khách:', e)
          }
        }
      }
    })

    // 3. Lắng nghe thay đổi auth state (khi đăng nhập / đăng xuất)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser && event === 'SIGNED_IN') {
        const guestTickers = getGuestWatchlist()
        if (guestTickers.length > 0) {
          try {
            await syncGuestWatchlist(guestTickers)
            clearGuestWatchlist()
          } catch (e) {}
        }
        setAuthModalOpen(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
      setUser(null)
      setMenuOpen(false)
      window.location.href = '/'
    }
  }

  if (loading) {
    return <span className="h-8 w-20 animate-pulse rounded-lg bg-white/5" aria-hidden="true" />
  }

  // Nếu người dùng đã đăng nhập -> Hiển thị Avatar / Email & Menu
  if (user) {
    const email = user.email || 'Thành viên'
    const initial = email.charAt(0).toUpperCase()

    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white transition-colors hover:bg-white/10 hover:border-white/20 cursor-pointer"
        >
          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
            {initial}
          </span>
          <span className="hidden md:inline max-w-[120px] truncate text-[#F0F3F6] font-medium">
            {email.split('@')[0]}
          </span>
          <ChevronDown className="size-3.5 text-[#9EACB9]" />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-[#14171f] p-1.5 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-white/8">
              <p className="text-[11px] text-[#9EACB9]">Tài khoản</p>
              <p className="text-xs font-bold text-white truncate">{email}</p>
            </div>

            <div className="py-1 space-y-0.5">
              <Link
                href="/danh-muc"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#F0F3F6] hover:bg-white/5 hover:text-emerald-400 transition-colors"
              >
                <Star className="size-4 text-amber-400" />
                <span>Danh mục theo dõi</span>
              </Link>
            </div>

            <div className="pt-1 border-t border-white/8">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Khách chưa đăng nhập -> Nút "Đăng nhập"
  return (
    <>
      <button
        type="button"
        onClick={() => setAuthModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-95 cursor-pointer shadow-xs"
      >
        <LogIn className="size-3.5" />
        <span>Đăng nhập</span>
      </button>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  )
}
