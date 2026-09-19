import fs from 'node:fs'
import path from 'node:path'

export interface CompanyWebsiteMeta {
  website: string | null
  address?: string | null
  auditor?: string | null
  listingDate?: string | null
  name?: string | null
  intro?: string | null
}

let cache: Record<string, CompanyWebsiteMeta> | null = null

function loadCache(): Record<string, CompanyWebsiteMeta> {
  if (cache) return cache
  try {
    const p = path.join(process.cwd(), 'data', 'company_websites.json')
    if (fs.existsSync(p)) {
      cache = JSON.parse(fs.readFileSync(p, 'utf8'))
      return cache!
    }
  } catch {}
  cache = {}
  return cache
}

export function getCompanyWebsiteMeta(symbol: string): CompanyWebsiteMeta | null {
  const sym = symbol.toUpperCase().trim()
  if (!sym) return null
  const data = loadCache()
  return data[sym] || null
}

export function getCompanyWebsiteUrl(symbol: string): string | null {
  const meta = getCompanyWebsiteMeta(symbol)
  const ws = meta?.website?.trim()
  if (!ws) return null
  if (ws.startsWith('http://') || ws.startsWith('https://')) {
    return ws
  }
  return `https://${ws}`
}
