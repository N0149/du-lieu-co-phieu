import type { MetadataRoute } from 'next'
import { getAllStocks } from '@/lib/longlivestock'
import { getAllStocksIntel } from '@/lib/maritime'
import { getSnapshotReports } from '@/lib/report-stocks'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dulieudautu.com'

  // 1. Static main routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/bao-cao`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/cang-bien`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/cang-bien/tau`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/cang-bien/nguon-du-lieu`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/xuat-nhap-khau`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tra-cuu`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/danh-muc`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/chinh-sach-bao-mat`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/dieu-khoan`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/lien-he`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // 2. Maritime port stock routes
  const stocksIntel = getAllStocksIntel()
  const portRoutes: MetadataRoute.Sitemap = Object.keys(stocksIntel).flatMap((ticker) => [
    {
      url: `${siteUrl}/cang/${ticker.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/cang-bien/co-phieu/${ticker.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ])

  // 3. Reports routes
  const reports = getSnapshotReports()
  const reportRoutes: MetadataRoute.Sitemap = reports.map((r) => ({
    url: `${siteUrl}/bao-cao/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // 4. Stock detail routes (1530 tickers)
  const allStocks = getAllStocks()
  const stockRoutes: MetadataRoute.Sitemap = allStocks.map((s) => ({
    url: `${siteUrl}/stock/${s.t.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...portRoutes, ...reportRoutes, ...stockRoutes]
}
