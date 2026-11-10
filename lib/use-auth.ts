'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isVipUser } from '@/lib/admin-auth'

export type AuthState = {
  user: User | null
  isLoggedIn: boolean
  isVip: boolean
  loading: boolean
  signOut: () => Promise<void>
}

/**
 * Hook theo dõi trạng thái xác thực và phân hạng tài khoản (Member vs VIP) trên Client
 * Đồng bộ realtime khi đăng nhập / đăng xuất, nâng cấp VIP hoặc đổi tab.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVip, setIsVip] = useState(false)

  // Kiểm tra quyền VIP từ user Supabase + localStorage override
  const recomputeVip = useCallback((currentUser: User | null) => {
    return isVipUser(currentUser)
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    if (!supabase) {
      setIsVip(recomputeVip(null))
      setLoading(false)
      return
    }

    // 1. Lấy session tức thì từ storage/cookie
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const u = session?.user ?? null
      setUser(u)
      setIsVip(recomputeVip(u))
      setLoading(false)
    })

    // 2. Lắng nghe thay đổi trạng thái đăng nhập
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const u = session?.user ?? null
      setUser(u)
      setIsVip(recomputeVip(u))
      setLoading(false)
    })

    // 3. Lắng nghe custom event khi người dùng vừa kích hoạt VIP (từ modal chuyển khoản)
    const handleVipChanged = () => {
      if (!cancelled) {
        setIsVip(true)
      }
    }
    window.addEventListener('dulieudautu_vip_updated', handleVipChanged)
    window.addEventListener('storage', handleVipChanged)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.removeEventListener('dulieudautu_vip_updated', handleVipChanged)
      window.removeEventListener('storage', handleVipChanged)
    }
  }, [recomputeVip])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
      setUser(null)
      setIsVip(false)
      try {
        localStorage.removeItem('dulieudautu_vip_active')
      } catch {}
    }
  }, [])

  return {
    user,
    isLoggedIn: Boolean(user),
    isVip,
    loading,
    signOut,
  }
}
