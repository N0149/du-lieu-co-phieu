'use client'

import { useState, useEffect, useMemo } from 'react'
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

  // Xuất file CSV danh sách người dùng
  const handleExportUsers = () => {
    if (users.length === 0) return
    const headers = ['Email', 'Tên', 'Phương thức', 'Ngày tạo', 'Lần đăng nhập gần nhất', 'Mã theo dõi']
    const rows = users.map((u) => [
      `"${u.email}"`,
      `"${u.name}"`,
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
                      <th className="px-4 py-3.5">Phương thức</th>
                      <th className="px-4 py-3.5">Đăng nhập gần nhất</th>
                      <th className="px-4 py-3.5">Ngày tham gia</th>
                      <th className="px-4 py-3.5 text-center">Watchlist</th>
                      <th className="px-4 py-3.5 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#9EACB9]">
                          {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có thông tin người dùng'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelf = user.email.toLowerCase() === currentUser.email?.toLowerCase()
                        const initial = (user.name || user.email).charAt(0).toUpperCase()

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

                            {/* Cột 2: Phương thức */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center rounded-lg bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white border border-white/10 capitalize">
                                {user.provider || 'Google'}
                              </span>
                            </td>

                            {/* Cột 3: Đăng nhập gần nhất */}
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-medium text-white">{timeAgo(user.lastSignInAt)}</span>
                                <span className="text-[10px] text-[#9EACB9]">{formatDate(user.lastSignInAt)}</span>
                              </div>
                            </td>

                            {/* Cột 4: Ngày tạo */}
                            <td className="px-4 py-3.5 text-[#9EACB9]">
                              {formatDate(user.createdAt)}
                            </td>

                            {/* Cột 5: Số mã trong Watchlist */}
                            <td className="px-4 py-3.5 text-center">
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                                {user.watchlistCount || 0} mã
                              </span>
                            </td>

                            {/* Cột 6: Trạng thái */}
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
