'use client'

import { useState, useEffect, useTransition } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isGuestTicker, addGuestTicker, removeGuestTicker } from '@/lib/guest-watchlist'
import { addTickerToWatchlist, removeTickerFromWatchlist } from '@/lib/watchlist-service'
import { AuthModal } from '@/components/auth/AuthModal'
import { cn } from '@/lib/utils'

type WatchlistStarButtonProps = {
  ticker: string
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function WatchlistStarButton({
  ticker,
  className,
  showLabel = false,
  size = 'md',
}: WatchlistStarButtonProps) {
  const cleanTicker = ticker.toUpperCase().trim()
  const [isWatched, setIsWatched] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Kiểm tra trạng thái watchlist ban đầu
  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      const supabase = createClient()
      if (!supabase) {
        // Fallback sang guest mode nếu chưa cấu hình
        if (!cancelled) {
          setIsWatched(isGuestTicker(cleanTicker))
          setLoading(false)
        }
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (cancelled) return
      setUser(currentUser)

      if (currentUser) {
        // Đã đăng nhập -> Truy vấn trạng thái từ Supabase
        const { data } = await supabase
          .from('watchlist_items')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('ticker', cleanTicker)
          .maybeSingle()

        if (!cancelled) {
          setIsWatched(Boolean(data))
          setLoading(false)
        }
      } else {
        // Chưa đăng nhập -> Lấy từ guest localStorage
        if (!cancelled) {
          setIsWatched(isGuestTicker(cleanTicker))
          setLoading(false)
        }
      }
    }

    checkStatus()

    // Lắng nghe sự kiện đồng bộ giữa các component
    const handleUpdate = () => {
      checkStatus()
    }
    window.addEventListener('watchlist-updated', handleUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('watchlist-updated', handleUpdate)
    }
  }, [cleanTicker])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const nextState = !isWatched
    setIsWatched(nextState) // Optimistic update ngay lập tức

    startTransition(async () => {
      if (user) {
        // Người dùng đã đăng nhập -> Lưu lên Supabase
        if (nextState) {
          const res = await addTickerToWatchlist(cleanTicker)
          if (!res.success) {
            setIsWatched(!nextState)
            showToast('Lỗi: ' + (res.error || 'Không thể lưu'))
            return
          }
          showToast(`Đã thêm ${cleanTicker} vào danh mục theo dõi`)
        } else {
          const res = await removeTickerFromWatchlist(cleanTicker)
          if (!res.success) {
            setIsWatched(!nextState)
            showToast('Lỗi: ' + (res.error || 'Không thể xóa'))
            return
          }
          showToast(`Đã bỏ theo dõi ${cleanTicker}`)
        }
        window.dispatchEvent(new Event('watchlist-updated'))
      } else {
        // Khách vãng lai -> Lưu tạm vào localStorage
        if (nextState) {
          addGuestTicker(cleanTicker)
          showToast(`Đã thêm ${cleanTicker} vào theo dõi (Lưu tạm)`)
        } else {
          removeGuestTicker(cleanTicker)
          showToast(`Đã bỏ theo dõi ${cleanTicker}`)
        }
      }
    })
  }

  const starSizes = {
    sm: 'size-3.5',
    md: 'size-4',
    lg: 'size-5',
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || isPending}
        title={isWatched ? `Bỏ theo dõi ${cleanTicker}` : `Theo dõi ${cleanTicker}`}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50',
          isWatched
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 shadow-xs'
            : 'border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/10 hover:text-white hover:border-white/20',
          className
        )}
      >
        {isPending ? (
          <Loader2 className={cn(starSizes[size], 'animate-spin text-amber-400')} />
        ) : (
          <Star
            className={cn(
              starSizes[size],
              'transition-all duration-200',
              isWatched
                ? 'fill-amber-400 text-amber-400 scale-105'
                : 'text-current group-hover:text-amber-400'
            )}
          />
        )}
        {showLabel && (
          <span className="font-medium">
            {isWatched ? 'Đang theo dõi' : 'Theo dõi'}
          </span>
        )}
      </button>

      {/* Toast thông báo nhanh nổi lên trên nút */}
      {toastMsg && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-lg border border-white/15 bg-[#1a1f2c] px-2.5 py-1 text-[11px] font-medium text-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5">
            <span>{toastMsg}</span>
            {!user && (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="text-emerald-400 underline font-bold hover:text-emerald-300 ml-1"
              >
                Đăng nhập để đồng bộ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal đăng nhập nếu khách muốn đồng bộ */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Đồng bộ danh mục theo dõi"
        subtitle={`Đăng nhập để lưu trữ ${cleanTicker} và toàn bộ danh mục của bạn an toàn trên đám mây.`}
      />
    </div>
  )
}
