import fs from 'fs'
import path from 'path'

export interface BctcAlertItem {
  ticker: string
  company_name: string
  exchange?: string
  quarter: string
  release_date: string
  title: string
  source?: string
  net_profit?: string
  net_profit_raw?: number
  prev_profit?: string
  prev_profit_raw?: number
  growth_rate?: string
  growth_direction?: 'up' | 'down' | 'flat'
  explanation?: string
  doc_url: string
  explanation_doc_url?: string
  is_hot?: boolean
  detected_at?: string
}

const ALERTS_FILE = path.join(process.cwd(), 'data', 'bctc_q3_live_alerts.json')
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/N0149/du-lieu-co-phieu/main/data/bctc_q3_live_alerts.json'

export function getBctcAlerts(): BctcAlertItem[] {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      const raw = fs.readFileSync(ALERTS_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        return data
      } else if (typeof data === 'object') {
        return Object.values(data)
      }
    }
  } catch (err) {
    console.error('[BctcAlertsService] Failed to read local alerts:', err)
  }
  return []
}

export async function fetchLiveBctcAlerts(): Promise<BctcAlertItem[]> {
  try {
    // Luôn ưu tiên tải bản mới nhất trực tiếp từ GitHub repository nếu có mạng
    const res = await fetch(GITHUB_RAW_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Dulieudautu-BCTC-Radar/1.0' }
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }
  } catch (err) {
    // Fallback sang file cục bộ nếu mạng ngoài không truy cập được
  }
  return getBctcAlerts()
}
