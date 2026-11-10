'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  Crown,
  Sparkles,
  CheckCircle2,
  X,
  Landmark,
  ShieldCheck,
  Clock,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Star,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'
import { AuthModal } from '@/components/auth/AuthModal'

/**
 * 3 Gói đăng ký Hội viên VIP chính thức của Dữ Liệu Đầu Tư
 */
export const VIP_PLANS = [
  {
    id: '1_month',
    name: '1 Tháng',
    price: 95000,
    priceFormatted: '95.000 đ',
    period: 'tháng',
    monthlyEquivalent: '95.000 đ / tháng',
    description: 'Trải nghiệm toàn diện các tính năng độc quyền cho 1 kỳ công bố',
    badge: null,
    popular: false,
    savings: null,
  },
  {
    id: '6_months',
    name: '6 Tháng',
    price: 495000,
    priceFormatted: '495.000 đ',
    period: '6 tháng',
    monthlyEquivalent: '82.500 đ / tháng',
    description: 'Lựa chọn được ưa chuộng nhất, theo sát 2 kỳ báo cáo tài chính',
    badge: '★ Phổ biến nhất',
    popular: true,
    savings: 'Tiết kiệm 13%',
  },
  {
    id: '1_year',
    name: '1 Năm',
    price: 890000,
    priceFormatted: '890.000 đ',
    period: 'năm',
    monthlyEquivalent: '74.100 đ / tháng',
    description: 'Đồng hành cả chu kỳ kinh doanh 4 quý, mùa ĐHĐCĐ & chia cổ tức',
    badge: '🔥 Tiết kiệm 22%',
    popular: false,
    savings: 'Chỉ ~74k / tháng',
  },
] as const

export type VipPlanId = typeof VIP_PLANS[number]['id']

/** Thông tin tài khoản ngân hàng thụ hưởng TPBank */
export const BANK_INFO = {
  bankName: 'TPBank',
  bankFullName: 'Ngân hàng TMCP Tiên Phong',
  accountNumber: '0000 4944 263',
  accountOwner: 'NGUYEN TRUNG NHAT',
  qrImage: '/qr-tpbank.jpg',
  zaloContact: '0983.627.018',
  zaloLink: 'https://zalo.me/0983627018',
} as const

/** 5 Đặc quyền lớn nhất của Hội viên VIP */
export const VIP_PRIVILEGES = [
  'Thuyết minh BCTC chi tiết 34 quý: Bóc tách nợ vay, dự án dở dang & hàng tồn kho',
  'Toàn bộ Nghị quyết ĐHĐCĐ chi tiết: Kế hoạch cổ tức, thù lao HĐQT & biểu quyết',
  'Báo cáo Nghiên cứu chuyên sâu AI & Audio Podcast tóm tắt độc quyền',
  'Kế hoạch kinh doanh ĐHĐCĐ 10 năm & đối chiếu mức độ cam kết Ban lãnh đạo',
  'Chỉ số độc quyền: P/E thực tế & Tỷ lệ trích ngoài cổ đông (Quỹ KTPL & Thưởng BĐH)',
] as const

interface VipUpgradeModalProps {
  open: boolean
  onClose: () => void
  initialPlanId?: VipPlanId
  title?: string
  subtitle?: string
}

export function VipUpgradeModal({
  open,
  onClose,
  initialPlanId = '1_year',
  title = 'Nâng Cấp Hội Viên VIP',
  subtitle = 'Mở khóa toàn bộ Thuyết minh BCTC chi tiết, ĐHĐCĐ, Kế hoạch 10 năm, Nghiên cứu AI và P/E thực tế.',
}: VipUpgradeModalProps) {
  const { user, isLoggedIn } = useAuth()
  const [selectedPlanId, setSelectedPlanId] = useState<VipPlanId>(initialPlanId)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Khóa cuộn trang khi modal mở
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open || !mounted) return null

  const selectedPlan = VIP_PLANS.find((p) => p.id === selectedPlanId) || VIP_PLANS[2]
  
  // Cú pháp chuyển khoản: nap [tên tài khoản] (giữ nguyên chữ hoa / chữ thường chính xác)
  const userIdentifier = user?.email
    ? (user.user_metadata?.user_name || user.email.split('@')[0]).trim().replace(/[^a-zA-Z0-9_.-]/g, '')
    : 'tentaikhoan'
  const transferSyntax = `nap ${userIdentifier}`

  // Link VietQR tự động sinh số tiền và nội dung chuyển khoản
  const vietQrUrl = `https://img.vietqr.io/image/tpbank-00004944263-compact2.png?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=NGUYEN%20TRUNG%20NHAT`

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Nâng cấp Hội viên VIP"
    >
      <div
        className="relative my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0e121a] text-slate-100 shadow-2xl shadow-amber-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex size-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          aria-label="Đóng"
        >
          <X className="size-4.5" />
        </button>

        {/* ── HEADER VÀNG ÁNH KIM ────────────────────────────────────── */}
        <div className="relative border-b border-amber-500/20 bg-gradient-to-b from-amber-500/15 via-[#161a24] to-[#0e121a] px-5 py-5 sm:px-7 sm:py-6 text-center">
          {/* Aura vầng sáng */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-80 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

          <div className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5">
            <Crown className="size-3.5 text-amber-400" />
            <span>Đặc Quyền Hội Viên Cao Cấp</span>
            <Sparkles className="size-3 text-amber-300 animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            {subtitle}
          </p>

          {!isLoggedIn && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
              <span>Bạn chưa đăng nhập.</span>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="font-bold underline hover:text-emerald-200 cursor-pointer"
              >
                Đăng nhập miễn phí trước
              </button>
            </div>
          )}
        </div>

        {/* ── NỘI DUNG CUỘN CHÍNH ─────────────────────────────────────── */}
        <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {/* 1. LỰA CHỌN GÓI ĐĂNG KÝ (3 GÓI) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-400" />
                Chọn gói hội viên phù hợp
              </span>
              <span className="text-[11px] text-amber-400/90 font-medium">
                Kích hoạt tức thì sau chuyển khoản
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {VIP_PLANS.map((plan) => {
                const isSelected = plan.id === selectedPlanId
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      'relative flex flex-col justify-between rounded-xl p-3.5 text-left transition-all cursor-pointer border',
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/30'
                        : 'border-slate-800 bg-[#131722] hover:border-slate-700 hover:bg-[#181d2a]'
                    )}
                  >
                    {/* Badge khuyến mãi */}
                    {plan.badge && (
                      <span className="absolute -top-2.5 right-2 rounded-full border border-amber-500/50 bg-amber-500 px-2 py-0.2 text-[9.5px] font-black text-black uppercase tracking-tight shadow-xs">
                        {plan.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Gói {plan.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="size-4 text-amber-400 shrink-0" />
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="font-mono text-lg sm:text-xl font-black text-white tabular-nums">
                          {plan.priceFormatted}
                        </span>
                      </div>

                      {plan.monthlyEquivalent && (
                        <div className="text-[11px] font-semibold text-amber-400/90 mt-0.5">
                          {plan.monthlyEquivalent}
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-[10.5px] text-slate-400 leading-tight border-t border-white/5 pt-2">
                      {plan.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. BẢNG QUYỀN LỢI VIP */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Crown className="size-3.5 text-amber-400" />
              <span>Quyền lợi tài khoản VIP đã chọn ({selectedPlan.name})</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {VIP_PRIVILEGES.map((privilege, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{privilege}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. KHUNG THANH TOÁN CHUYỂN KHOẢN & VIETQR */}
          <div className="rounded-xl border border-slate-800 bg-[#11151f] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                <Landmark className="size-4 text-emerald-400" />
                <span>Thông tin chuyển khoản Ngân hàng</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                Số tiền: {selectedPlan.priceFormatted}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Cột trái: Mã VietQR */}
              <div className="md:col-span-5 text-center">
                <div className="relative mx-auto w-40 sm:w-44 rounded-xl border border-slate-700 bg-white p-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vietQrUrl}
                    alt={`VietQR ${selectedPlan.priceFormatted} - TPBank`}
                    className="w-full h-auto rounded"
                    onError={(e) => {
                      // Fallback nếu API vietqr bị chặn mạng
                      ;(e.target as HTMLImageElement).src = BANK_INFO.qrImage
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[10.5px] text-slate-400">
                  Quét mã qua app ngân hàng để điền tự động số tiền & nội dung
                </p>
              </div>

              {/* Cột phải: Chi tiết tài khoản & Cú pháp */}
              <div className="md:col-span-7 space-y-2 text-xs">
                {/* Ngân hàng */}
                <div className="flex items-center justify-between rounded-lg bg-[#161b26] p-2.5 border border-slate-800">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Ngân hàng</div>
                    <div className="font-bold text-white text-xs mt-0.5">
                      {BANK_INFO.bankName} - {BANK_INFO.bankFullName}
                    </div>
                  </div>
                  <ShieldCheck className="size-4 text-emerald-400" />
                </div>

                {/* Số tài khoản */}
                <div className="flex items-center justify-between rounded-lg bg-[#161b26] p-2.5 border border-slate-800">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Số tài khoản</div>
                    <div className="font-mono text-sm sm:text-base font-black text-amber-400 mt-0.5">
                      {BANK_INFO.accountNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_INFO.accountNumber, 'stk')}
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
                  >
                    {copiedField === 'stk' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                {/* Chủ tài khoản */}
                <div className="flex items-center justify-between rounded-lg bg-[#161b26] p-2.5 border border-slate-800">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Chủ tài khoản</div>
                    <div className="font-bold text-white text-xs mt-0.5">
                      {BANK_INFO.accountOwner}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_INFO.accountOwner, 'owner')}
                    className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
                  >
                    {copiedField === 'owner' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedField === 'owner' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                {/* Cú pháp chuyển khoản */}
                <div className="rounded-lg bg-amber-500/[0.08] p-2.5 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-400">
                      Cú pháp chuyển khoản (Quan trọng)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferSyntax, 'syntax')}
                      className="flex items-center gap-1 rounded bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300 transition cursor-pointer"
                    >
                      {copiedField === 'syntax' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      <span>{copiedField === 'syntax' ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs font-black text-white mt-1 break-all bg-black/40 px-2 py-1 rounded border border-amber-500/20">
                    {transferSyntax}
                  </div>
                  {!user && (
                    <p className="text-[10px] text-amber-300/80 mt-1.5 leading-relaxed">
                      * Thay <code className="text-white font-mono bg-white/10 px-1 rounded">tentaikhoan</code> bằng tên tài khoản hoặc email của bạn (chú ý viết hoa viết thường chính xác), hoặc{' '}
                      <button
                        type="button"
                        onClick={() => setAuthModalOpen(true)}
                        className="font-bold underline text-amber-300 hover:text-white cursor-pointer"
                      >
                        đăng nhập
                      </button>{' '}
                      để hệ thống tự điền chính xác.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. FOOTER HỖ TRỢ KÍCH HOẠT NHANH QUA ZALO */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Clock className="size-4.5" />
              </div>
              <div>
                <p className="font-bold text-white">Kích hoạt nhanh trong 5 - 15 phút</p>
                <p className="text-[11px] text-slate-300">
                  Sau khi chuyển khoản, chụp màn hình gửi Zalo để được duyệt tài khoản ngay.
                </p>
              </div>
            </div>

            <a
              href={BANK_INFO.zaloLink}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 font-bold text-white shadow-xs transition cursor-pointer"
            >
              <MessageCircle className="size-3.5" />
              <span>Zalo: {BANK_INFO.zaloContact}</span>
            </a>
          </div>
        </div>

        {/* AuthModal phụ nếu người dùng bấm đăng nhập trước */}
        {authModalOpen && (
          <AuthModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            title="Đăng nhập tài khoản"
            subtitle="Đăng nhập để liên kết email với mã kích hoạt VIP tự động."
          />
        )}
      </div>
    </div>,
    document.body
  )
}
