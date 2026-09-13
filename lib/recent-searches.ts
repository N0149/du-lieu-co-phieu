'use client'

export interface RecentSearchItem {
  id: string
  title: string
  subtitle?: string
  ticker?: string
  icon?: string
  category: 'stock' | 'macro' | 'sector' | 'chart' | 'layout' | 'maritime' | 'customs' | string
  categoryLabel: string
  href: string
  timestamp?: number
}

const STORAGE_KEY = 'app_recent_searches'
const MAX_RECENT_SEARCHES = 10
export const RECENT_SEARCHES_EVENT = 'app_recent_searches_updated'

/**
 * Lấy danh sách các mã / nội dung đã tìm kiếm gần đây từ LocalStorage
 */
export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_RECENT_SEARCHES)
    }
    return []
  } catch {
    return []
  }
}

/**
 * Thêm một mã / nội dung tìm kiếm vào danh sách gần đây
 */
export function saveRecentSearch(
  item: Omit<RecentSearchItem, 'timestamp'>
): RecentSearchItem[] {
  if (typeof window === 'undefined') return []
  try {
    const current = getRecentSearches()
    // Lọc trùng theo ticker nếu có, hoặc theo href / id
    const filtered = current.filter((x) => {
      if (item.ticker && x.ticker) {
        return x.ticker.toUpperCase() !== item.ticker.toUpperCase()
      }
      return x.id !== item.id && x.href !== item.href
    })

    const newItem: RecentSearchItem = {
      ...item,
      timestamp: Date.now(),
    }

    const next = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT, { detail: next }))
    return next
  } catch {
    return []
  }
}

/**
 * Xóa một mục khỏi danh sách tìm kiếm gần đây
 */
export function removeRecentSearch(idOrTicker: string): RecentSearchItem[] {
  if (typeof window === 'undefined') return []
  try {
    const current = getRecentSearches()
    const target = idOrTicker.toUpperCase()
    const next = current.filter(
      (x) => x.id !== idOrTicker && x.ticker?.toUpperCase() !== target
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT, { detail: next }))
    return next
  } catch {
    return []
  }
}

/**
 * Xóa toàn bộ lịch sử tìm kiếm gần đây
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT, { detail: [] }))
  } catch {}
}
