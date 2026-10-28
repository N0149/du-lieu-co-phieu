// lib/analytics-service.ts
// Quản lý và tổng hợp dữ liệu lượt truy cập (Pageviews/Visitors) và người dùng

import crypto from 'crypto'
import { createAdminClient, hasServiceRoleKey } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

export type PageViewEntry = {
  path: string
  referrer: string
  device: 'mobile' | 'desktop' | 'tablet'
  visitorHash: string
  timestamp: number
}

export type UserAdminInfo = {
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

// In-Memory Ring Buffer lưu 500 lượt xem gần nhất
const MAX_RECENT_VIEWS = 500
const recentViewsBuffer: PageViewEntry[] = []

// Lưu cache thống kê theo ngày (YYYY-MM-DD -> { views, uniqueVisitors: Set<string> })
const dailyStatsMap = new Map<string, { views: number; visitors: Set<string> }>()

// Danh sách người dùng được ghi nhận qua session (bảo đảm luôn có dữ liệu dù chưa có Service Key)
const observedUsersMap = new Map<string, UserAdminInfo>()

/**
 * Sinh mã băm ẩn danh cho khách truy cập dựa trên IP + User Agent + Ngày
 */
export function generateVisitorHash(ip: string, userAgent: string, dateStr: string): string {
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}:${dateStr}:dulieudautu_salt`)
    .digest('hex')
    .slice(0, 16)
}

/**
 * Ghi nhận một lượt xem trang mới
 */
export async function recordPageView(params: {
  path: string
  referrer: string
  userAgent: string
  ip: string
  userEmail?: string | null
  userId?: string | null
}) {
  const { path, referrer, userAgent, ip, userEmail, userId } = params

  // Bỏ qua các đường dẫn nội bộ không cần tính traffic
  if (
    !path ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/favicon') ||
    path === '/robots.txt' ||
    path === '/sitemap.xml'
  ) {
    return
  }

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
  const isTablet = /tablet|ipad/i.test(userAgent)
  const device: 'mobile' | 'desktop' | 'tablet' = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
  const visitorHash = generateVisitorHash(ip, userAgent, dateStr)

  // 1. Cập nhật In-memory stats
  let dayStat = dailyStatsMap.get(dateStr)
  if (!dayStat) {
    dayStat = { views: 0, visitors: new Set<string>() }
    dailyStatsMap.set(dateStr, dayStat)
  }
  dayStat.views += 1
  dayStat.visitors.add(visitorHash)

  // 2. Thêm vào ring buffer
  recentViewsBuffer.unshift({
    path,
    referrer: referrer || '',
    device,
    visitorHash,
    timestamp: now.getTime(),
  })
  if (recentViewsBuffer.length > MAX_RECENT_VIEWS) {
    recentViewsBuffer.pop()
  }

  // 3. Nếu người dùng đã đăng nhập, ghi nhận vào observedUsers
  if (userId && userEmail) {
    const existing = observedUsersMap.get(userId)
    observedUsersMap.set(userId, {
      id: userId,
      email: userEmail,
      name: existing?.name || userEmail.split('@')[0],
      avatarUrl: existing?.avatarUrl,
      provider: existing?.provider || 'google',
      createdAt: existing?.createdAt || now.toISOString(),
      lastSignInAt: now.toISOString(),
      isOnlineRecent: true,
    })
  }

  // 4. Nếu có bảng public.site_pageviews trên Supabase, ghi thêm vào Supabase (chạy bất đồng bộ, không chờ)
  try {
    const adminSb = createAdminClient()
    if (adminSb) {
      Promise.resolve(
        adminSb.from('site_pageviews').insert({
          path,
          referrer: referrer?.slice(0, 255) || null,
          visitor_hash: visitorHash,
          device,
          created_at: now.toISOString(),
        })
      ).catch(() => {})
    }
  } catch {}
}

/**
 * Ghi nhận hoặc cập nhật thông tin người dùng khi đăng nhập
 */
export function recordUserSession(user: {
  id: string
  email?: string | null
  user_metadata?: any
  app_metadata?: any
  created_at?: string
  last_sign_in_at?: string
}) {
  if (!user.id || !user.email) return

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email.split('@')[0]
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const provider = user.app_metadata?.provider || 'google'

  observedUsersMap.set(user.id, {
    id: user.id,
    email: user.email,
    name,
    avatarUrl,
    provider,
    createdAt: user.created_at || new Date().toISOString(),
    lastSignInAt: user.last_sign_in_at || new Date().toISOString(),
    isOnlineRecent: true,
  })
}

/**
 * Lấy toàn bộ danh sách người dùng đã đăng nhập
 */
export async function getAllUsers(): Promise<{
  users: UserAdminInfo[]
  source: 'supabase_admin_api' | 'supabase_table' | 'observed_sessions'
  hasServiceRoleKey: boolean
}> {
  const serviceKeyReady = hasServiceRoleKey()
  const adminSb = createAdminClient()

  // 1. Thử lấy danh sách trực tiếp qua Supabase Auth Admin API (Đầy đủ và chính xác nhất)
  if (adminSb) {
    try {
      const { data, error } = await adminSb.auth.admin.listUsers({
        page: 1,
        perPage: 500,
      })

      if (!error && data?.users && data.users.length > 0) {
        // Lấy số lượng watchlist items của từng user
        const { data: watchlists } = await adminSb
          .from('watchlists')
          .select('id, user_id')
        const { data: items } = await adminSb
          .from('watchlist_items')
          .select('watchlist_id')

        const watchlistMap = new Map<string, number>()
        if (watchlists && items) {
          const wlUserMap = new Map<string, string>()
          watchlists.forEach((w: any) => wlUserMap.set(w.id, w.user_id))
          items.forEach((it: any) => {
            const uid = wlUserMap.get(it.watchlist_id)
            if (uid) {
              watchlistMap.set(uid, (watchlistMap.get(uid) || 0) + 1)
            }
          })
        }

        const users: UserAdminInfo[] = data.users.map((u) => {
          const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0
          const isRecent = Date.now() - lastSignIn < 24 * 60 * 60 * 1000

          return {
            id: u.id,
            email: u.email || '',
            name:
              u.user_metadata?.full_name ||
              u.user_metadata?.name ||
              (u.email ? u.email.split('@')[0] : 'Thành viên'),
            avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
            provider: u.app_metadata?.provider || 'google',
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at,
            watchlistCount: watchlistMap.get(u.id) || 0,
            isOnlineRecent: isRecent,
          }
        })

        // Sắp xếp người đăng nhập gần nhất lên đầu
        users.sort((a, b) => {
          const timeA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0
          const timeB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0
          return timeB - timeA
        })

        return {
          users,
          source: 'supabase_admin_api',
          hasServiceRoleKey: true,
        }
      }
    } catch (err) {
      console.warn('[Admin Overview] listUsers failed:', err)
    }
  }

  // 2. Thử truy vấn bảng public.user_profiles nếu có
  try {
    const sb = await createServerClient()
    if (sb) {
      const { data: profiles, error } = await sb
        .from('user_profiles')
        .select('*')
        .order('last_sign_in_at', { ascending: false })

      if (!error && profiles && profiles.length > 0) {
        const users: UserAdminInfo[] = profiles.map((p: any) => ({
          id: p.id,
          email: p.email,
          name: p.full_name || p.email?.split('@')[0],
          avatarUrl: p.avatar_url,
          provider: p.provider || 'google',
          createdAt: p.created_at,
          lastSignInAt: p.last_sign_in_at,
          watchlistCount: 0,
          isOnlineRecent: Date.now() - new Date(p.last_sign_in_at || 0).getTime() < 86400000,
        }))

        return {
          users,
          source: 'supabase_table',
          hasServiceRoleKey: serviceKeyReady,
        }
      }
    }
  } catch {}

  // 3. Fallback: Danh sách ghi nhận qua session bộ nhớ
  const fallbackUsers = Array.from(observedUsersMap.values())
  fallbackUsers.sort((a, b) => {
    const timeA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0
    const timeB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0
    return timeB - timeA
  })

  return {
    users: fallbackUsers,
    source: 'observed_sessions',
    hasServiceRoleKey: serviceKeyReady,
  }
}

/**
 * Lấy thống kê tổng quan về Lượt truy cập (Traffic & Pageviews)
 */
export async function getTrafficOverview(): Promise<{
  totalPageViews: number
  totalUniqueVisitors: number
  todayPageViews: number
  todayVisitors: number
  deviceBreakdown: { desktop: number; mobile: number; tablet: number }
  topPages: { path: string; count: number }[]
  dailyTrends: { date: string; views: number; visitors: number }[]
  recentVisits: PageViewEntry[]
}> {
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Thử truy vấn từ bảng cơ sở dữ liệu Supabase nếu có
  try {
    const adminSb = createAdminClient()
    if (adminSb) {
      const { data: dbViews, error } = await adminSb
        .from('site_pageviews')
        .select('path, referrer, device, visitor_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (!error && dbViews && dbViews.length > 0) {
        const dbPathCount = new Map<string, number>()
        let dbDesktop = 0
        let dbMobile = 0
        let dbTablet = 0
        const dbUniqueVisitors = new Set<string>()
        const dbTodayVisitors = new Set<string>()
        let dbTodayViews = 0

        const past7DaysMap = new Map<string, { views: number; visitors: Set<string> }>()
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          past7DaysMap.set(d.toISOString().split('T')[0], { views: 0, visitors: new Set() })
        }

        dbViews.forEach((row: any) => {
          const p = row.path || '/'
          dbPathCount.set(p, (dbPathCount.get(p) || 0) + 1)
          if (row.device === 'desktop') dbDesktop++
          else if (row.device === 'mobile') dbMobile++
          else dbTablet++

          if (row.visitor_hash) dbUniqueVisitors.add(row.visitor_hash)

          const rowDate = (row.created_at || '').split('T')[0]
          if (rowDate === todayStr) {
            dbTodayViews++
            if (row.visitor_hash) dbTodayVisitors.add(row.visitor_hash)
          }

          const daySlot = past7DaysMap.get(rowDate)
          if (daySlot) {
            daySlot.views++
            if (row.visitor_hash) daySlot.visitors.add(row.visitor_hash)
          }
        })

        const topPages = Array.from(dbPathCount.entries())
          .map(([path, count]) => ({ path, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        const dailyTrends = Array.from(past7DaysMap.entries()).map(([dateStr, slot]) => ({
          date: dateStr.slice(5),
          views: slot.views,
          visitors: slot.visitors.size,
        }))

        const recentVisits: PageViewEntry[] = dbViews.slice(0, 30).map((r: any) => ({
          path: r.path,
          referrer: r.referrer || '',
          device: (r.device as any) || 'desktop',
          visitorHash: r.visitor_hash || '',
          timestamp: new Date(r.created_at).getTime(),
        }))

        return {
          totalPageViews: dbViews.length,
          totalUniqueVisitors: Math.max(dbUniqueVisitors.size, 1),
          todayPageViews: dbTodayViews,
          todayVisitors: dbTodayVisitors.size,
          deviceBreakdown: { desktop: dbDesktop, mobile: dbMobile, tablet: dbTablet },
          topPages,
          dailyTrends,
          recentVisits,
        }
      }
    }
  } catch {}

  // 2. Fallback: Thống kê từ bộ nhớ tạm in-memory
  const todayStat = dailyStatsMap.get(todayStr)
  const pathCountMap = new Map<string, number>()
  let desktopCount = 0
  let mobileCount = 0
  let tabletCount = 0

  recentViewsBuffer.forEach((entry) => {
    pathCountMap.set(entry.path, (pathCountMap.get(entry.path) || 0) + 1)
    if (entry.device === 'desktop') desktopCount++
    else if (entry.device === 'mobile') mobileCount++
    else tabletCount++
  })

  const topPages = Array.from(pathCountMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const dailyTrends: { date: string; views: number; visitors: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const stat = dailyStatsMap.get(dateStr)
    dailyTrends.push({
      date: dateStr.slice(5),
      views: stat?.views || 0,
      visitors: stat?.visitors ? stat.visitors.size : 0,
    })
  }

  let totalPageViews = 0
  const allUniqueVisitors = new Set<string>()
  dailyStatsMap.forEach((stat) => {
    totalPageViews += stat.views
    stat.visitors.forEach((v) => allUniqueVisitors.add(v))
  })

  if (totalPageViews < recentViewsBuffer.length) {
    totalPageViews = recentViewsBuffer.length
  }

  return {
    totalPageViews: Math.max(totalPageViews, recentViewsBuffer.length),
    totalUniqueVisitors: Math.max(allUniqueVisitors.size, 1),
    todayPageViews: todayStat?.views || 0,
    todayVisitors: todayStat?.visitors ? todayStat.visitors.size : 0,
    deviceBreakdown: {
      desktop: desktopCount,
      mobile: mobileCount,
      tablet: tabletCount,
    },
    topPages,
    dailyTrends,
    recentVisits: recentViewsBuffer.slice(0, 30),
  }
}

/**
 * Thống kê top cổ phiếu được lưu vào Watchlists nhiều nhất
 */
export async function getTopWatchlistStocks(): Promise<{ ticker: string; count: number }[]> {
  try {
    const adminSb = createAdminClient()
    const sb = adminSb || (await createServerClient())

    if (!sb) return []

    const { data: items, error } = await sb
      .from('watchlist_items')
      .select('ticker')

    if (error || !items) return []

    const countMap = new Map<string, number>()
    items.forEach((item: { ticker: string }) => {
      const t = item.ticker?.toUpperCase()
      if (t) {
        countMap.set(t, (countMap.get(t) || 0) + 1)
      }
    })

    return Array.from(countMap.entries())
      .map(([ticker, count]) => ({ ticker, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  } catch {
    return []
  }
}
