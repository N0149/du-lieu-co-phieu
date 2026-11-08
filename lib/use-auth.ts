'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type AuthState = {
  user: User | null
  isLoggedIn: boolean
  loading: boolean
  signOut: () => Promise<void>
}

/**
 * Hook theo dõi trạng thái xác thực người dùng trên Client (Supabase Session)
 * Đồng bộ realtime khi đăng nhập / đăng xuất hoặc đổi tab.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    if (!supabase) {
      setLoading(false)
      return
    }

    // 1. Lấy session tức thì từ storage/cookie
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Lắng nghe thay đổi trạng thái đăng nhập
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
      setUser(null)
    }
  }, [])

  return {
    user,
    isLoggedIn: Boolean(user),
    loading,
    signOut,
  }
}
