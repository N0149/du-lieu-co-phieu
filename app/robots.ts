import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dulieudautu.com'

  return {
    rules: [
      {
        // Chặn hoàn toàn các AI bot tự động cào vét dữ liệu báo cáo & tài chính độc quyền
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'Bytespider',
          'Claude-Web',
          'AnthropicAI',
          'Diffbot',
          'PerplexityBot',
          'Omgilibot',
          'FacebookBot',
        ],
        disallow: ['/'],
      },
      {
        // Quy định chung cho tất cả crawler khác: Cho phép xem trang công khai, cấm tuyệt đối cào API & dữ liệu thô
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/api/reports/',
          '/api/stock/',
          '/api/customs-trade/',
          '/api/sync-market-data',
          '/api/security/',
        ],
        crawlDelay: 2,
      },
      {
        // Tối ưu riêng cho Googlebot & Bingbot index trang web
        userAgent: ['Googlebot', 'Bingbot'],
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
