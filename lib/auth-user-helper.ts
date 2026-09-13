import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser as getCookieSessionUser } from '@/lib/session'
import type { UserAuthProfile } from '@/lib/article-interactions-service'

/**
 * Trích xuất người dùng hiện tại đang đăng nhập từ Supabase Token / Supabase Cookies hoặc Cookie Session
 */
export async function getAuthenticatedUser(request?: Request): Promise<UserAuthProfile | null> {
  try {
    // 1. Kiểm tra header Authorization nếu client gửi Bearer token
    const authHeader = request?.headers.get('authorization') || request?.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token) {
        const supabase = await createSupabaseServerClient()
        if (supabase) {
          const { data: { user }, error } = await supabase.auth.getUser(token)
          if (!error && user) {
            return {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Nhà đầu tư',
              avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            }
          }
        }
      }
    }

    // 2. Kiểm tra qua Supabase Session Cookie
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) {
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Nhà đầu tư',
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        }
      }
    }

    // 3. Kiểm tra qua Cookie Session của dự án (lib/session.ts)
    const cookieUser = await getCookieSessionUser()
    if (cookieUser && cookieUser.id) {
      return {
        id: cookieUser.id,
        email: cookieUser.email || '',
        name: cookieUser.name || cookieUser.email.split('@')[0] || 'Nhà đầu tư',
      }
    }

    return null
  } catch (error) {
    console.error('[AuthUserHelper] Error resolving authenticated user:', error)
    return null
  }
}
