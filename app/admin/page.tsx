'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Users,
  Eye,
  Star,
  ShieldCheck,
  Lock,
  ExternalLink,
  RefreshCw,
  Search,
  Download,
  AlertTriangle,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
  Clock,
  LogIn,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Crown,
  Zap,
  Ban,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin-auth'
import { AuthModal } from '@/components/auth/AuthModal'

type UserInfo = {
  id: string
  email: string
  name: string
  avatarUrl?: string
  provider: string
  createdAt: string
  lastSignInAt?: string
  watchlistCount?: number
  isOnlineRecent?: boolean
  isVip?: boolean
  vipPlan?: string | null
  vipUntil?: string | null
  vipSince?: string | null
}

type TrafficData = {
  totalPageViews: number
  totalUniqueVisitors: number
  todayPageViews: number
  todayVisitors: number
  deviceBreakdown: { desktop: number; mobile: number; tablet: number }
  topPages: { path: string; count: number }[]
  dailyTrends: { date: string; views: number; visitors: number }[]
  recentVisits: {
    path: string
    referrer: string
    device: 'desktop' | 'mobile' | 'tablet'
    timestamp: number
  }[]
}

type TopStock = {
  ticker: string
  count: number
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Chưa rõ'
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function timeAgo(iso?: string | null): string {
  if (!iso) return 'Chưa rõ'
  try {
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSec < 60) return 'Vừa xong'
    if (diffMin < 60) return `${diffMin} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 30) return `${diffDays} ngày trước`
    return d.toLocaleDateString('vi-VN')
  } catch {
    return 'Chưa rõ'
  }
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Dữ liệu Admin
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [traffic, setTraffic] = useState<TrafficData | null>(null)
  const [topStocks, setTopStocks] = useState<TopStock[]>([])
  const [hasServiceRoleKey, setHasServiceRoleKey] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'users' | 'traffic' | 'watchlist'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Kích hoạt VIP nhanh
  const [vipEmail, setVipEmail] = useState('')
  const [vipPlanId, setVipPlanId] = useState<'1_month' | '6_months' | '1_year' | 'custom'>('1_month')
  const [vipCustomDays, setVipCustomDays] = useState('30')
  const [vipSubmitting, setVipSubmitting] = useState(false)
  const [vipFeedback, setVipFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const vipInputRef = useRef<HTMLInputElement>(null)

  // 1. Kiểm tra phiên đăng nhập người dùng hiện tại
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 2. Tải dữ liệu Admin từ API khi đã xác thực đúng email
  const fetchAdminData = async () => {
    if (!currentUser || !isAdminEmail(currentUser.email)) return
    setDataLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/overview', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Không thể tải dữ liệu quản trị')
      }

      setUsers(json.users || [])
      setTraffic(json.traffic || null)
      setTopStocks(json.topStocks || [])
      setHasServiceRoleKey(Boolean(json.hasServiceRoleKey))
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối')
    } finally {
      setDataLoading(false)
    }
  };

  useEffect(() => {
    if (currentUser && isAdminEmail(currentUser.email)) {
      fetchAdminData()
    }
  }, [currentUser])

  // Lọc người dùng theo từ khóa tìm kiếm
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase().trim()
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  // Gợi ý nhanh email khi đang gõ vào ô kích hoạt VIP
  const emailSuggestions = useMemo(() => {
    const q = vipEmail.toLowerCase().trim()
    if (!q) return []
    return users
      .filter((u) => u.email && (u.email.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q)))
      .slice(0, 5)
  }, [users, vipEmail])

  // Kích hoạt hoặc thu hồi VIP nhanh cho 1 email
  const handleVipAction = async (opts: {
    email: string
    action?: 'activate' | 'revoke'
    planId?: '1_month' | '6_months' | '1_year' | 'custom'
    days?: number
  }) => {
    const cleanEmail = opts.email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setVipFeedback({ type: 'error', text: 'Vui lòng nhập email hợp lệ của khách hàng.' })
      return
    }

    setVipSubmitting(true)
    setVipFeedback(null)

    try {
      const res = await fetch('/api/admin/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          action: opts.action || 'activate',
          planId: opts.planId || vipPlanId,
          days: opts.days ?? (vipPlanId === 'custom' ? Number(vipCustomDays) : undefined),
        }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Không thể cập nhật quyền VIP')
      }

      setVipFeedback({ type: 'success', text: json.message })
      if (json.user) {
        setUsers((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === cleanEmail
              ? {
                  ...u,
                  isVip: json.user.isVip,
                  vipPlan: json.user.plan,
                  vipUntil: json.user.vipUntil,
                }
              : u
          )
        )
      }
      // Đồng bộ lại toàn bộ danh sách từ server
      fetchAdminData()
    } catch (err: any) {
      setVipFeedback({ type: 'error', text: err.message || 'Lỗi kết nối máy chủ' })
    } finally {
      setVipSubmitting(false)
    }
  }

  // Xuất file CSV danh sách người dùng
  const handleExportUsers = () => {
    if (users.length === 0) return
    const headers = ['Email', 'Tên', 'Gói VIP', 'Hạn VIP', 'Phương thức', 'Ngày tạo', 'Lần đăng nhập gần nhất', 'Mã theo dõi']
    const rows = users.map((u) => [
      `"${u.email}"`,
      `"${u.name}"`,
      `"${u.isVip ? 'VIP' : 'Miễn phí'}"`,
      `"${u.vipUntil ? formatDate(u.vipUntil) : ''}"`,
      `"${u.provider}"`,
      `"${formatDate(u.createdAt)}"`,
      `"${formatDate(u.lastSignInAt)}"`,
      u.watchlistCount || 0,
    ])
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `thanh_vien_dulieudautu_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // MÀN HÌNH CHỜ XÁC THỰC
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#9EACB9]">
          <RefreshCw className="size-5 animate-spin text-emerald-400" />
          <span>Đang xác thực thông tin tài khoản...</span>
        </div>
      </div>
    )
  }

  // TRƯỜNG HỢP 1: CHƯA ĐĂNG NHẬP
  if (!currentUser) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-3xl border border-white/10 bg-[#14171f] p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Khu Vực Quản Trị Hệ Thống</h1>
          <p className="mt-2 text-xs text-[#9EACB9] leading-relaxed">
            Trang này dành riêng cho Quản trị viên (<span className="text-emerald-400 font-mono">trungnhat232@gmail.com</span>). Vui lòng đăng nhập để tiếp tục.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <LogIn className="size-4" />
            <span>Đăng nhập tài khoản Admin</span>
          </button>
        </div>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    )
  }

  // TRƯỜNG HỢP 2: ĐÃ ĐĂNG NHẬP NHƯNG KHÔNG PHẢI ADMIN
  if (!isAdminEmail(currentUser.email)) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-3xl border border-red-500/20 bg-[#14171f] p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Lock className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Truy Cập Bị Từ Chối (403)</h1>
          <p className="mt-2 text-xs text-[#9EACB9] leading-relaxed">
            Tài khoản <span className="text-white font-medium">{currentUser.email}</span> không có quyền truy cập trang quản trị này.
          </p>
          <p className="mt-1 text-[11px] text-[#9EACB9]">
            Chỉ tài khoản <span className="text-emerald-400 font-mono">trungnhat232@gmail.com</span> mới được phân quyền.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // TRƯỜNG HỢP 3: LÀ ADMIN (trungnhat232@gmail.com) -> HIỂN THỊ DASHBOARD ĐẦY ĐỦ
  const totalUsersCount = users.length
  const vipUsersCount = users.filter((u) => u.isVip && !isAdminEmail(u.email)).length
  const activeTodayUsers = users.filter((u) => u.isOnlineRecent).length
  const totalPageViews = traffic?.totalPageViews || 0
  const todayPageViews = traffic?.todayPageViews || 0
  const todayVisitors = traffic?.todayVisitors || 0

  return (
    <div className="min-h-screen bg-[#0e1117] pb-20 text-[#F0F3F6]">
      {/* HEADER QUẢN TRỊ */}
      <header className="border-b border-white/10 bg-[#14171f]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">Bảng Điều Khiển Quản Trị</h1>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    ADMIN
                  </span>
                </div>
                <p className="text-xs text-[#9EACB9]">
                  Xin chào <strong className="text-white">{currentUser.email}</strong> • Cập nhật thời gian thực
                </p>
              </div>
            </div>

            {/* CÁC PHÍM TẮT HỮU ÍCH */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchAdminData}
                disabled={dataLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>

              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 hover:text-emerald-400"
              >
                <span>Vercel Analytics</span>
                <ExternalLink className="size-3 text-[#9EACB9]" />
              </a>

              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 hover:text-emerald-400"
              >
                <span>Supabase Auth</span>
                <ExternalLink className="size-3 text-[#9EACB9]" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 space-y-6">
        {/* BANNER HƯỚNG DẪN NẾU CHƯA CÓ SERVICE ROLE KEY */}
        {!hasServiceRoleKey && !bannerDismissed && (
          <div className="relative rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="absolute right-3 top-3 rounded-lg p-1 text-amber-400 hover:bg-amber-500/20 hover:text-white transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="size-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-amber-300">
                  Mẹo: Đồng bộ toàn bộ danh sách thành viên từ Supabase Auth
                </h4>
                <p className="text-amber-200/80 leading-relaxed">
                  Hiện tại hệ thống đang lấy dữ liệu qua tài khoản đã ghi nhận. Để hiển thị ngay 100% tất cả người dùng trong hệ thống Supabase (kể cả những người đã đăng nhập từ lâu), bạn chỉ cần lấy <strong>service_role key</strong> từ{' '}
                  <a
                    href="https://supabase.com/dashboard/project/pxtmuwrpuywrkclobfpa/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-white hover:text-amber-300"
                  >
                    Supabase Project Settings → API (bấm để mở)
                  </a>{' '}
                  rồi gửi key vào chat hoặc dán vào file <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300">.env.local</code> với biến <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300">SUPABASE_SERVICE_ROLE_KEY=...</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KÍCH HOẠT VIP NHANH THEO EMAIL */}
        <section className="rounded-2xl border border-amber-500/30 bg-linear-to-br from-[#191610] via-[#14171f] to-[#14171f] p-5 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Crown className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Kích Hoạt VIP Nhanh Theo Email</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    1 CHẠM
                  </span>
                </h2>
                <p className="text-[11px] text-[#9EACB9]">
                  Nhận được tiền &quot;ting ting&quot; → nhập email khách → chọn gói → bấm Kích hoạt là xong.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-amber-300/90 font-medium">
              Đang có <strong className="text-amber-300">{vipUsersCount}</strong> khách VIP hoạt động
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleVipAction({ email: vipEmail })
            }}
            className="mt-4 space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              {/* Ô nhập email */}
              <div className="lg:col-span-5 relative">
                <input
                  ref={vipInputRef}
                  type="email"
                  required
                  list="admin-vip-user-emails"
                  value={vipEmail}
                  onChange={(e) => {
                    setVipEmail(e.target.value)
                    if (vipFeedback) setVipFeedback(null)
                  }}
                  placeholder="Nhập email khách (VD: khachhang@gmail.com)..."
                  className="w-full rounded-xl border border-white/15 bg-[#0e1117] px-3.5 py-2.5 text-sm text-white placeholder-[#7c8999] focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <datalist id="admin-vip-user-emails">
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Chọn gói */}
              <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
                {[
                  { id: '1_month' as const, label: '1 Tháng', sub: '95k' },
                  { id: '6_months' as const, label: '6 Tháng', sub: '495k' },
                  { id: '1_year' as const, label: '1 Năm', sub: '890k' },
                  { id: 'custom' as const, label: 'Số ngày', sub: 'Tùy chỉnh' },
                ].map((plan) => {
                  const active = vipPlanId === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setVipPlanId(plan.id)}
                      className={`flex-1 min-w-[78px] rounded-xl border px-2.5 py-1.5 text-center transition-all cursor-pointer ${
                        active
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                          : 'border-white/10 bg-white/5 text-[#9EACB9] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">{plan.label}</div>
                      <div className="text-[10px] opacity-80">{plan.sub}</div>
                    </button>
                  )
                })}

                {vipPlanId === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={vipCustomDays}
                    onChange={(e) => setVipCustomDays(e.target.value)}
                    placeholder="Ngày"
                    className="w-20 rounded-xl border border-amber-400/50 bg-[#0e1117] px-2.5 py-2 text-xs font-bold text-amber-300 focus:outline-none"
                  />
                )}
              </div>

              {/* Nút kích hoạt */}
              <div className="lg:col-span-3 flex gap-2">
                <button
                  type="submit"
                  disabled={vipSubmitting || !vipEmail.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-black transition-all hover:bg-amber-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                >
                  {vipSubmitting ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4 fill-black" />
                  )}
                  <span>{vipSubmitting ? 'Đang kích hoạt...' : 'Kích Hoạt VIP Ngay'}</span>
                </button>
              </div>
            </div>

            {/* Gợi ý email nhanh nếu đang gõ khớp thành viên trong hệ thống */}
            {emailSuggestions.length > 0 && !users.some((u) => u.email.toLowerCase() === vipEmail.trim().toLowerCase()) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-[#9EACB9]">Chọn nhanh:</span>
                {emailSuggestions.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setVipEmail(u.email)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white hover:border-amber-400/50 hover:bg-amber-500/10 cursor-pointer transition-colors"
                  >
                    <span className="font-mono">{u.email}</span>
                    {u.isVip && <Crown className="size-3 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Thông báo kết quả */}
            {vipFeedback && (
              <div
                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  vipFeedback.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {vipFeedback.type === 'success' ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-red-400" />
                  )}
                  <span>{vipFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVipFeedback(null)}
                  className="text-white/60 hover:text-white cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <p className="text-[11px] text-[#9EACB9]">
              💡 Mẹo: Nếu khách đang mở sẵn web lúc bạn kích hoạt xong, chỉ cần nhắn khách bấm <strong className="text-white">F5 (tải lại trang)</strong> là dùng được VIP ngay. Nếu khách đang còn hạn cũ, hệ thống tự cộng dồn thêm ngày.
            </p>
          </form>
        </section>

        {/* THẺ CHỈ SỐ KPI CHÍNH */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Tổng người dùng */}
          <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#9EACB9]">Tổng Thành Viên Đăng Nhập</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalUsersCount}</span>
              <span className="text-xs text-[#9EACB9]">tài khoản</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              <span>{activeTodayUsers} người hoạt động 24h qua</span>
            </p>
          </div>

          {/* Card 2: Lượt xem trang hôm nay */}
          <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#9EACB9]">Lượt Xem Trang Hôm Nay</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Eye className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{todayPageViews}</span>
              <span className="text-xs text-[#9EACB9]">views</span>
            </div>
            <p className="mt-1 text-[11px] text-[#9EACB9]">
              Tổng lượt xem ghi nhận: <strong className="text-white">{totalPageViews}</strong>
            </p>
          </div>

          {/* Card 3: Khách truy cập hôm nay */}
          <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#9EACB9]">Khách Truy Cập Hôm Nay</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{todayVisitors}</span>
              <span className="text-xs text-[#9EACB9]">người</span>
            </div>
            <p className="mt-1 text-[11px] text-[#9EACB9]">
              Unique Visitors (tính theo thiết bị)
            </p>
          </div>

          {/* Card 4: Cổ phiếu được theo dõi */}
          <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#9EACB9]">Cổ Phiếu Trong Danh Mục</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Star className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{topStocks.length}</span>
              <span className="text-xs text-[#9EACB9]">mã hot</span>
            </div>
            <p className="mt-1 text-[11px] text-[#9EACB9]">
              Top mã: <strong className="text-amber-400">{topStocks[0]?.ticker || 'Chưa có'}</strong>
            </p>
          </div>
        </div>

        {/* ĐIỀU HƯỚNG TABS */}
        <div className="flex border-b border-white/10">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#9EACB9] hover:text-white'
              }`}
            >
              <Users className="size-4" />
              <span>Danh Sách Người Đã Đăng Nhập ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('traffic')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'traffic'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#9EACB9] hover:text-white'
              }`}
            >
              <BarChart3 className="size-4" />
              <span>Lượt Truy Cập & Các Trang Xem Nhiều</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'watchlist'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#9EACB9] hover:text-white'
              }`}
            >
              <Star className="size-4" />
              <span>Cổ Phiếu Người Dùng Quan Tâm ({topStocks.length})</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG TAB 1: DANH SÁCH NGƯỜI DÙNG */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* THANH TÌM KIẾM VÀ XUẤT CSV */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9EACB9]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo email, họ tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#14171f] py-2 pl-9 pr-4 text-xs text-white placeholder-[#9EACB9] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleExportUsers}
                disabled={users.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-50"
              >
                <Download className="size-3.5" />
                <span>Xuất file Excel/CSV</span>
              </button>
            </div>

            {/* BẢNG NGƯỜI DÙNG */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#14171f]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-[#9EACB9]">
                    <tr>
                      <th className="px-4 py-3.5">Thành viên</th>
                      <th className="px-4 py-3.5">Gói tài khoản</th>
                      <th className="px-4 py-3.5">Phương thức</th>
                      <th className="px-4 py-3.5">Đăng nhập gần nhất</th>
                      <th className="px-4 py-3.5">Ngày tham gia</th>
                      <th className="px-4 py-3.5 text-center">Watchlist</th>
                      <th className="px-4 py-3.5 text-right">Trạng thái</th>
                      <th className="px-4 py-3.5 text-right">Kích hoạt VIP nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#9EACB9]">
                          {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có thông tin người dùng'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelf = user.email.toLowerCase() === currentUser.email?.toLowerCase()
                        const initial = (user.name || user.email).charAt(0).toUpperCase()
                        const hasVip = Boolean(user.isVip || isSelf)
                        const vipUntilLabel = user.vipUntil
                          ? new Date(user.vipUntil).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : null

                        return (
                          <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Cột 1: Thành viên */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                {user.avatarUrl ? (
                                  <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="size-8 rounded-full border border-white/10 object-cover"
                                  />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                                    {initial}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-white truncate max-w-[180px] sm:max-w-none">
                                      {user.name}
                                    </p>
                                    {isSelf && (
                                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                                        BẠN (ADMIN)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#9EACB9] font-mono truncate">{user.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Gói tài khoản */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {hasVip ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                                    <Crown className="size-3" />
                                    {isSelf ? 'ADMIN VIP' : 'VIP'}
                                  </span>
                                  {vipUntilLabel && !isSelf && (
                                    <span className="text-[10px] text-amber-200/75">
                                      Đến {vipUntilLabel}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-[#9EACB9] border border-white/10">
                                  Miễn phí
                                </span>
                              )}
                            </td>

                            {/* Cột 3: Phương thức */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white border border-white/10 capitalize">
                                {user.provider || 'Google'}
                              </span>
                            </td>

                            {/* Cột 4: Đăng nhập gần nhất */}
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-medium text-white">{timeAgo(user.lastSignInAt)}</span>
                                <span className="text-[10px] text-[#9EACB9]">{formatDate(user.lastSignInAt)}</span>
                              </div>
                            </td>

                            {/* Cột 5: Ngày tạo */}
                            <td className="px-4 py-3.5 text-[#9EACB9]">
                              {formatDate(user.createdAt)}
                            </td>

                            {/* Cột 6: Số mã trong Watchlist */}
                            <td className="px-4 py-3.5 text-center">
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                                {user.watchlistCount || 0} mã
                              </span>
                            </td>

                            {/* Cột 7: Trạng thái */}
                            <td className="px-4 py-3.5 text-right">
                              {user.isOnlineRecent ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Gần đây
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#9EACB9]">Trước đây</span>
                              )}
                            </td>

                            {/* Cột 8: Thao tác VIP nhanh */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              {isSelf ? (
                                <span className="text-[11px] text-emerald-400/80 font-medium">Toàn quyền</span>
                              ) : (
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    disabled={vipSubmitting}
                                    onClick={() => handleVipAction({ email: user.email, planId: '1_month' })}
                                    title="Kích hoạt / Cộng thêm 1 tháng (95k)"
                                    className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    +1T
                                  </button>
                                  <button
                                    type="button"
                                    disabled={vipSubmitting}
                                    onClick={() => handleVipAction({ email: user.email, planId: '6_months' })}
                                    title="Kích hoạt / Cộng thêm 6 tháng (495k)"
                                    className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    +6T
                                  </button>
                                  <button
                                    type="button"
                                    disabled={vipSubmitting}
                                    onClick={() => handleVipAction({ email: user.email, planId: '1_year' })}
                                    title="Kích hoạt / Cộng thêm 1 năm (890k)"
                                    className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    +1N
                                  </button>
                                  {user.isVip && (
                                    <button
                                      type="button"
                                      disabled={vipSubmitting}
                                      onClick={() => {
                                        if (window.confirm(`Thu hồi quyền VIP của ${user.email}?`)) {
                                          handleVipAction({ email: user.email, action: 'revoke' })
                                        }
                                      }}
                                      title="Thu hồi quyền VIP"
                                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-1 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <Ban className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NỘI DUNG TAB 2: LƯỢT TRUY CẬP (TRAFFIC & PAGES) */}
        {activeTab === 'traffic' && (
          <div className="space-y-6">
            {/* THỐNG KÊ THIẾT BỊ VÀ TỔNG QUAN */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5">
                <h3 className="text-xs font-bold text-[#9EACB9] uppercase tracking-wider mb-3">
                  Cơ Cấu Thiết Bị Truy Cập
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-white">
                      <Laptop className="size-4 text-blue-400" />
                      Máy tính (Desktop)
                    </span>
                    <span className="font-bold text-white">{traffic?.deviceBreakdown.desktop || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-white">
                      <Smartphone className="size-4 text-emerald-400" />
                      Điện thoại (Mobile)
                    </span>
                    <span className="font-bold text-white">{traffic?.deviceBreakdown.mobile || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-white">
                      <Tablet className="size-4 text-purple-400" />
                      Máy tính bảng (Tablet)
                    </span>
                    <span className="font-bold text-white">{traffic?.deviceBreakdown.tablet || 0}</span>
                  </div>
                </div>
              </div>

              {/* Vercel Analytics Shortcut */}
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-linear-to-br from-[#14171f] to-[#1a202c] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-400" />
                      <span>Vercel Web Analytics Đang Hoạt Động</span>
                    </h3>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      LIVE
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#9EACB9] leading-relaxed">
                    Website <strong className="text-white">dulieudautu.com</strong> đã được tích hợp Vercel Web Analytics trong mã nguồn. Bạn có thể xem biểu đồ thời gian thực, quốc gia, tỉnh thành, tỷ lệ thoát trang và nguồn giới thiệu chi tiết nhất trên Vercel.
                  </p>
                </div>

                <div className="mt-4 flex gap-3">
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black transition-all hover:bg-neutral-200"
                  >
                    <span>Mở Vercel Analytics Dashboard</span>
                    <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* TOP 10 TRANG ĐƯỢC XEM NHIỀU NHẤT */}
            <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-400" />
                <span>Top Trang & Cổ Phiếu Được Xem Nhiều Nhất</span>
              </h3>

              <div className="divide-y divide-white/5">
                {traffic?.topPages && traffic.topPages.length > 0 ? (
                  traffic.topPages.map((page, idx) => (
                    <div key={page.path} className="flex items-center justify-between py-2.5 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-5 items-center justify-center rounded-md bg-white/5 text-[11px] font-bold text-[#9EACB9]">
                          {idx + 1}
                        </span>
                        <Link
                          href={page.path}
                          target="_blank"
                          className="font-mono text-emerald-400 hover:underline truncate"
                        >
                          {page.path}
                        </Link>
                      </div>
                      <span className="rounded-lg bg-white/5 px-2.5 py-1 font-bold text-white">
                        {page.count} lượt xem
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-[#9EACB9]">
                    Đang thu thập dữ liệu lượt xem các trang...
                  </p>
                )}
              </div>
            </div>

            {/* NHẬT KÝ LƯỢT TRUY CẬP GẦN ĐÂY */}
            <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="size-4 text-blue-400" />
                <span>Lượt Truy Cập Gần Nhất (Live Stream)</span>
              </h3>

              <div className="divide-y divide-white/5">
                {traffic?.recentVisits && traffic.recentVisits.length > 0 ? (
                  traffic.recentVisits.map((visit, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {visit.device === 'mobile' ? (
                          <Smartphone className="size-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Laptop className="size-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="font-mono text-white truncate">{visit.path}</span>
                      </div>
                      <span className="text-[11px] text-[#9EACB9] shrink-0">
                        {timeAgo(new Date(visit.timestamp).toISOString())}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-[#9EACB9]">Chưa có lượt truy cập mới nào ghi nhận</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NỘI DUNG TAB 3: CỔ PHIẾU ĐƯỢC THEO DÕI NHIỀU NHẤT */}
        {activeTab === 'watchlist' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#14171f] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Xếp Hạng Cổ Phiếu Trong Watchlist</h3>
                  <p className="text-xs text-[#9EACB9]">
                    Những mã cổ phiếu được các tài khoản bấm theo dõi nhiều nhất trên hệ thống
                  </p>
                </div>
              </div>

              {topStocks.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#9EACB9]">
                  Chưa có dữ liệu theo dõi cổ phiếu từ các tài khoản.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {topStocks.map((stock, i) => (
                    <Link
                      key={stock.ticker}
                      href={`/stock/${stock.ticker}`}
                      className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-emerald-500/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-white group-hover:text-emerald-400">
                          {stock.ticker}
                        </span>
                        <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                          #{i + 1}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between text-xs">
                        <span className="text-[#9EACB9]">Người theo dõi:</span>
                        <span className="font-bold text-emerald-400">{stock.count}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
