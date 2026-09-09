'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type WatchlistItem = {
  id: string
  watchlist_id: string
  ticker: string
  note: string | null
  target_price: number | null
  created_at: string
}

/**
 * Lấy hoặc tự động tạo watchlist mặc định cho user.
 */
async function getOrCreateDefaultWatchlist(supabase: any, userId: string): Promise<string | null> {
  const { data: existing, error: selectErr } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selectErr) {
    console.error('[Watchlist] Lỗi tìm watchlist:', selectErr)
    return null
  }

  if (existing?.id) {
    return existing.id
  }

  // Chưa có thì tạo mới danh mục mặc định
  const { data: created, error: insertErr } = await supabase
    .from('watchlists')
    .insert({ user_id: userId, name: 'Mặc định' })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[Watchlist] Lỗi tạo watchlist mặc định:', insertErr)
    return null
  }

  return created.id
}

/**
 * Lấy danh sách cổ phiếu trong Watchlist của người dùng hiện tại (Server).
 */
export async function getUserWatchlist(): Promise<{
  isAuthenticated: boolean
  userEmail?: string
  userId?: string
  items: WatchlistItem[]
}> {
  const supabase = await createClient()
  if (!supabase) {
    return { isAuthenticated: false, items: [] }
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { isAuthenticated: false, items: [] }
  }

  const { data: items, error } = await supabase
    .from('watchlist_items')
    .select('id, watchlist_id, ticker, note, target_price, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Watchlist] Lỗi lấy danh sách watchlist:', error)
    return { isAuthenticated: true, userEmail: user.email, userId: user.id, items: [] }
  }

  return {
    isAuthenticated: true,
    userEmail: user.email,
    userId: user.id,
    items: (items || []).map((it: any) => ({
      ...it,
      ticker: it.ticker.toUpperCase(),
    })),
  }
}

/**
 * Thêm một mã cổ phiếu vào Watchlist của người dùng.
 */
export async function addTickerToWatchlist(
  ticker: string,
  note?: string,
  targetPrice?: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanTicker = ticker.trim().toUpperCase()
  if (!cleanTicker) {
    return { success: false, error: 'Mã cổ phiếu không hợp lệ.' }
  }

  const supabase = await createClient()
  if (!supabase) {
    return { success: false, error: 'Chưa cấu hình cơ sở dữ liệu Supabase.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'UNAUTHENTICATED' }
  }

  const watchlistId = await getOrCreateDefaultWatchlist(supabase, user.id)
  if (!watchlistId) {
    return { success: false, error: 'Không thể khởi tạo danh mục.' }
  }

  const { error } = await supabase
    .from('watchlist_items')
    .upsert(
      {
        watchlist_id: watchlistId,
        user_id: user.id,
        ticker: cleanTicker,
        note: note || null,
        target_price: targetPrice || null,
      },
      { onConflict: 'watchlist_id, ticker' }
    )

  if (error) {
    console.error('[Watchlist] Lỗi thêm cổ phiếu:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/danh-muc')
  return { success: true, message: `Đã thêm ${cleanTicker} vào danh mục theo dõi.` }
}

/**
 * Xóa một mã cổ phiếu khỏi Watchlist.
 */
export async function removeTickerFromWatchlist(
  ticker: string
): Promise<{ success: boolean; error?: string }> {
  const cleanTicker = ticker.trim().toUpperCase()
  const supabase = await createClient()
  if (!supabase) return { success: false, error: 'Chưa kết nối Supabase' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHENTICATED' }

  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('user_id', user.id)
    .eq('ticker', cleanTicker)

  if (error) {
    console.error('[Watchlist] Lỗi xóa cổ phiếu:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/danh-muc')
  return { success: true }
}

/**
 * Đồng bộ danh sách cổ phiếu từ localStorage của khách vãng lai lên Database sau khi đăng nhập.
 */
export async function syncGuestWatchlist(
  tickers: string[]
): Promise<{ success: boolean; count: number }> {
  if (!tickers || tickers.length === 0) return { success: true, count: 0 }

  const supabase = await createClient()
  if (!supabase) return { success: false, count: 0 }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, count: 0 }

  const watchlistId = await getOrCreateDefaultWatchlist(supabase, user.id)
  if (!watchlistId) return { success: false, count: 0 }

  const cleanTickers = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()))).filter(Boolean)

  const rows = cleanTickers.map((t) => ({
    watchlist_id: watchlistId,
    user_id: user.id,
    ticker: t,
  }))

  const { error } = await supabase
    .from('watchlist_items')
    .upsert(rows, { onConflict: 'watchlist_id, ticker', ignoreDuplicates: true })

  if (error) {
    console.error('[Watchlist] Lỗi đồng bộ guest tickers:', error)
    return { success: false, count: 0 }
  }

  revalidatePath('/danh-muc')
  return { success: true, count: cleanTickers.length }
}

/**
 * Thêm hàng loạt mã cổ phiếu vào Watchlist của người dùng hiện tại (Server).
 */
export async function addBulkTickersToWatchlist(
  tickers: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!tickers || tickers.length === 0) return { success: true, count: 0 }

  const supabase = await createClient()
  if (!supabase) return { success: false, count: 0, error: 'Chưa kết nối cơ sở dữ liệu Supabase.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, count: 0, error: 'UNAUTHENTICATED' }

  const watchlistId = await getOrCreateDefaultWatchlist(supabase, user.id)
  if (!watchlistId) return { success: false, count: 0, error: 'Không thể khởi tạo danh mục.' }

  const cleanTickers = Array.from(
    new Set(tickers.map((t) => t.trim().toUpperCase()))
  ).filter((t) => t.length >= 2 && t.length <= 10)

  if (cleanTickers.length === 0) {
    return { success: false, count: 0, error: 'Không có mã cổ phiếu hợp lệ.' }
  }

  const rows = cleanTickers.map((t) => ({
    watchlist_id: watchlistId,
    user_id: user.id,
    ticker: t,
  }))

  const { error } = await supabase
    .from('watchlist_items')
    .upsert(rows, { onConflict: 'watchlist_id, ticker', ignoreDuplicates: true })

  if (error) {
    console.error('[Watchlist] Lỗi thêm hàng loạt cổ phiếu:', error)
    return { success: false, count: 0, error: error.message }
  }

  revalidatePath('/danh-muc')
  return { success: true, count: cleanTickers.length }
}
