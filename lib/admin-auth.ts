// lib/admin-auth.ts
// Quản lý danh sách và kiểm tra quyền Quản trị viên (Admin) và Hội viên VIP

export const ADMIN_EMAILS: readonly string[] = [
  'trungnhat232@gmail.com',
]

/**
 * Kiểm tra xem một email có quyền Quản trị viên hay không
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized)
}

/**
 * Kiểm tra xem người dùng có quyền VIP hay không
 * 1. Admin luôn có quyền VIP
 * 2. Supabase metadata (user_metadata / app_metadata có is_vip: true, plan: 'vip', status: 'active')
 * 3. vip_until hợp lệ còn hạn (> Date.now())
 * 4. localStorage override 'dulieudautu_vip_active' === 'true' (cho phép test / kích hoạt tức thì)
 */
export function isVipUser(user?: {
  email?: string | null
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
} | null): boolean {
  // Local storage override cho Client (test nhanh hoặc vừa kích hoạt qua modal)
  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem('dulieudautu_vip_active') === 'true') {
        return true
      }
    } catch {}
  }

  if (!user) return false

  // Admin luôn là VIP
  if (isAdminEmail(user.email)) return true

  const meta = user.user_metadata || {}
  const appMeta = user.app_metadata || {}

  if (meta.is_vip === true || appMeta.is_vip === true) return true
  if (meta.plan === 'vip' || appMeta.plan === 'vip') return true
  if (meta.status === 'active' || appMeta.status === 'active') return true

  // Kiểm tra hạn VIP nếu có trường vip_until / expires_at
  const vipUntil = meta.vip_until || appMeta.vip_until || meta.expires_at || appMeta.expires_at
  if (vipUntil && typeof vipUntil === 'string') {
    const time = new Date(vipUntil).getTime()
    if (!Number.isNaN(time) && time > Date.now()) {
      return true
    }
  }

  return false
}
