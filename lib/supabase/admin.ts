// lib/supabase/admin.ts
// Khởi tạo Supabase Client với Service Role Key để truy xuất quyền Admin (server-side only)

import { createClient } from '@supabase/supabase-js'

function cleanSupabaseUrl(url: string | undefined): string | null {
  if (!url) return null
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

/**
 * Trả về Supabase Admin Client có quyền bypass RLS và gọi Auth Admin API.
 * Nếu chưa cấu hình SUPABASE_SERVICE_ROLE_KEY thì trả về null.
 */
export function createAdminClient() {
  const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Kiểm tra xem hệ thống đã được cấp Service Role Key chưa
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20)
}
