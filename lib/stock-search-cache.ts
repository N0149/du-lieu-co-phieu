'use client'

import type { SearchPaletteItem } from './search-palette-data'

const DB_NAME = 'dulieudautu_search_db'
const DB_VERSION = 1
const STORE_NAME = 'search_cache'
const CACHE_KEY = 'global_search_pool'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 giờ

interface CacheEntry {
  key: string
  timestamp: number
  items: SearchPaletteItem[]
}

// In-memory hot cache for instant 0ms access within the session
let memoryPoolCache: SearchPaletteItem[] | null = null

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Lấy danh sách tìm kiếm đã lưu trong IndexedDB hoặc Memory Cache
 */
export async function getStoredSearchPool(): Promise<SearchPaletteItem[] | null> {
  // 1. Kiểm tra RAM cache trước (0ms)
  if (memoryPoolCache && memoryPoolCache.length > 0) {
    return memoryPoolCache
  }

  // 2. Kiểm tra IndexedDB
  try {
    const db = await openDatabase()
    if (!db) return null

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(CACHE_KEY)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined
          if (entry && Array.isArray(entry.items) && entry.items.length > 0) {
            const isFresh = Date.now() - entry.timestamp < CACHE_TTL_MS
            if (isFresh) {
              memoryPoolCache = entry.items
              resolve(entry.items)
              return
            }
          }
          resolve(null)
        }

        request.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

/**
 * Lưu danh mục tìm kiếm vào IndexedDB và RAM Cache
 */
export async function saveStoredSearchPool(items: SearchPaletteItem[]): Promise<void> {
  if (!items || items.length === 0) return

  memoryPoolCache = items

  try {
    const db = await openDatabase()
    if (!db) return

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const entry: CacheEntry = {
      key: CACHE_KEY,
      timestamp: Date.now(),
      items,
    }
    store.put(entry)
  } catch (err) {
    console.warn('[IndexedDB Search Cache] Could not persist search pool:', err)
  }
}

/**
 * Lấy trực tiếp từ bộ nhớ RAM nếu đã có sẵn
 */
export function getMemorySearchPool(): SearchPaletteItem[] | null {
  return memoryPoolCache
}
