import fs from 'node:fs'
import path from 'node:path'

export type ChinaNewsItem = {
  id: string
  titleVi: string
  titleOriginal: string
  takeaways: string[]
  category: 'ai' | 'tech' | 'economy' | 'investment'
  categoryName: string
  tags: string[]
  source: string
  pubDate: string
  link: string
}

export type ChinaNewsSnapshot = {
  lastUpdated: string
  dateStr: string
  total: number
  items: ChinaNewsItem[]
}

const DEFAULT_SNAPSHOT: ChinaNewsSnapshot = {
  lastUpdated: new Date().toISOString(),
  dateStr: new Date().toLocaleDateString('vi-VN'),
  total: 0,
  items: [],
}

export function getCachedChinaNews(): ChinaNewsSnapshot {
  try {
    const filePath = path.join(process.cwd(), 'data', 'china_news_snapshot.json')
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    }
  } catch (err) {
    console.warn('[china-news-service] Lỗi khi đọc cache china_news_snapshot.json:', err)
  }
  return DEFAULT_SNAPSHOT
}
