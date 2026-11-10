'use client'

import { useState } from 'react'
import { Crown } from 'lucide-react'
import { useAuth } from '@/lib/use-auth'
import { VipUpgradeModal } from '@/components/auth/VipUpgradeModal'

/**
 * Nút Nâng cấp VIP / Huy hiệu Hội viên VIP trên Header cạnh ThemeToggle.
 *
 * Loại bỏ hoàn toàn cơ chế dùng thử theo yêu cầu:
 * - Khách chưa nâng cấp VIP: Nút "Nâng cấp VIP" mở VipUpgradeModal (3 gói: 95k/495k/890k)
 * - Thành viên VIP: Huy hiệu sang trọng "Hội viên VIP"
 */
export function TrialBadge() {
  const { isVip, loading } = useAuth()
  const [vipModalOpen, setVipModalOpen] = useState(false)

  if (loading) {
    return (
      <span
        className="hidden sm:inline-block h-7 w-24 animate-pulse rounded-full bg-white/5"
        aria-hidden="true"
      />
    )
  }

  // Đã kích hoạt Hội viên VIP
  if (isVip) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-3 py-1 text-xs font-bold text-amber-300 shadow-sm shadow-amber-500/10">
        <Crown className="size-3.5 text-amber-300" />
        <span>Hội viên VIP</span>
      </div>
    )
  }

  // Chưa nâng cấp VIP → Nút kêu gọi nâng cấp mở modal
  return (
    <>
      <button
        type="button"
        onClick={() => setVipModalOpen(true)}
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/25 to-amber-600/15 px-3 py-1 text-xs font-bold text-amber-300 transition-all hover:brightness-110 hover:border-amber-400 active:scale-95 cursor-pointer shadow-sm shadow-amber-500/10 group"
        title="Nâng cấp gói Hội viên VIP"
      >
        <Crown className="size-3.5 text-amber-300 group-hover:scale-110 transition-transform animate-pulse" />
        <span>Nâng cấp VIP</span>
      </button>

      <VipUpgradeModal
        open={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
      />
    </>
  )
}
