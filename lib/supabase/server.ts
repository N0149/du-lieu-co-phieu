import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function cleanSupabaseUrl(url: string | undefined): string | null {
  if (!url) return null
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export async function createClient() {
  const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component gọi set cookie sẽ bị ignore, route handler/action thì ghi bình thường
          }
        },
      },
    }
  )
}
