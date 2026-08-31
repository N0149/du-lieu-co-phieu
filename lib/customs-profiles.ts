import fs from 'fs'
import path from 'path'

export interface CustomsStockSegment {
  ten: string
  chitiet: string
  vaitro: string
  pill: string
}

export interface CustomsDriverProfile {
  name: string
  sub_head?: string
  nganh?: string
  main_market?: string
  segments: CustomsStockSegment[]
  markets: string[]
  drivers: string[]
  no_data?: string
  reservation?: string
  cite?: string
}

let cachedProfiles: Record<string, CustomsDriverProfile> | null = null

export function getAllDriverProfiles(): Record<string, CustomsDriverProfile> {
  if (cachedProfiles) return cachedProfiles
  try {
    const filePath = path.join(process.cwd(), 'data', 'customs_driver_profiles.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      cachedProfiles = JSON.parse(raw)
      return cachedProfiles || {}
    }
  } catch (err) {
    console.error('Error loading customs_driver_profiles.json:', err)
  }
  return {}
}

export function getCustomsDriverProfile(ticker: string): CustomsDriverProfile | null {
  if (!ticker) return null
  const profiles = getAllDriverProfiles()
  const upper = ticker.trim().toUpperCase()
  return profiles[upper] || null
}

export function searchCustomsProfiles(query: string): Array<{ ticker: string; profile: CustomsDriverProfile }> {
  if (!query || !query.trim()) return []
  const q = query.trim().toLowerCase()
  const profiles = getAllDriverProfiles()
  const results: Array<{ ticker: string; profile: CustomsDriverProfile }> = []

  for (const [ticker, profile] of Object.entries(profiles)) {
    const matchTicker = ticker.toLowerCase().includes(q)
    const matchName = (profile.name || '').toLowerCase().includes(q)
    const matchNganh = (profile.nganh || '').toLowerCase().includes(q)
    const matchMarket = (profile.main_market || '').toLowerCase().includes(q)
    const matchSegment = profile.segments?.some(
      (s) => s.ten.toLowerCase().includes(q) || s.chitiet.toLowerCase().includes(q) || s.pill.toLowerCase().includes(q)
    )

    if (matchTicker || matchName || matchNganh || matchMarket || matchSegment) {
      results.push({ ticker, profile })
    }
  }

  return results.slice(0, 30)
}
