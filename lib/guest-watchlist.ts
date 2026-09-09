'use client'

const GUEST_WATCHLIST_KEY = 'dulieudautu_guest_watchlist'

export function getGuestWatchlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(GUEST_WATCHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((t) => String(t).toUpperCase().trim()) : []
  } catch {
    return []
  }
}

export function addGuestTicker(ticker: string): string[] {
  if (typeof window === 'undefined') return []
  const clean = ticker.toUpperCase().trim()
  if (!clean) return getGuestWatchlist()
  const current = getGuestWatchlist()
  if (!current.includes(clean)) {
    const updated = [clean, ...current]
    try {
      localStorage.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event('watchlist-updated'))
    } catch {}
    return updated
  }
  return current
}

export function removeGuestTicker(ticker: string): string[] {
  if (typeof window === 'undefined') return []
  const clean = ticker.toUpperCase().trim()
  const current = getGuestWatchlist()
  const updated = current.filter((t) => t !== clean)
  try {
    localStorage.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('watchlist-updated'))
  } catch {}
  return updated
}

export function isGuestTicker(ticker: string): boolean {
  const current = getGuestWatchlist()
  return current.includes(ticker.toUpperCase().trim())
}

export function clearGuestWatchlist(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(GUEST_WATCHLIST_KEY)
    window.dispatchEvent(new Event('watchlist-updated'))
  } catch {}
}

export function addBulkGuestTickers(tickers: string[]): string[] {
  if (typeof window === 'undefined') return []
  const current = getGuestWatchlist()
  const clean = tickers.map((t) => t.toUpperCase().trim()).filter(Boolean)
  const updated = Array.from(new Set([...clean, ...current]))
  try {
    localStorage.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('watchlist-updated'))
  } catch {}
  return updated
}
