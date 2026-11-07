/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
]

const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['node:sqlite'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'marked'],
  },
  outputFileTracingIncludes: {
    '/stock/[symbol]': [
      './data/financial_charts/**/*',
      './data/valuation_history/**/*',
      './data/dividend_history/**/*',
      './data/segments/**/*',
      './data/price_history/**/*',
      './data/industry-reports.json',
      './data/reports-snapshot.json',
      './data/company_reports_snapshot.json',
      './data/industry_reports_snapshot.json',
      './data/stock_evaluations_summary.json',
      './content/bctc/**/*',
      './content/nghien_cuu_ai/**/*',
      './data/nghien_cuu_ai_snapshot.json',
      './data/nghien_cuu_ai_live_prices.json',
    ],
    '/api/stock/[symbol]/bctc': [
      './content/bctc/**/*',
    ],
    '/api/analyst-reports': [
      './data/company_reports_snapshot.json',
      './data/industry_reports_snapshot.json',
      './data/widata_archive/reports/**/*',
    ],
    '/bao-cao': [
      './data/company_reports_snapshot.json',
      './data/industry_reports_snapshot.json',
      './data/widata_archive/reports/**/*',
    ],
    '/api/customs-trade': [
      './data/customs_*.json',
    ],
    '/api/news/china': [
      './data/china_news_snapshot.json',
    ],
    '/thuy-san': [
      './data/thuy_san_*.json',
    ],
    '/xuat-nhap-khau': [
      './data/customs_*.json',
    ],
    '/api/funds': [
      './data/funds_snapshot.json',
    ],
    '/bo-loc': [
      './data/screener_stocks_snapshot.json',
      './data/longlive_manifest.json',
    ],
    '/api/screener/stocks': [
      './data/screener_stocks_snapshot.json',
    ],
    '/cang-bien': [
      './data/maritime/**/*',
    ],
    '/dau-thau': [
      './data/bidding/**/*',
    ],
    '/nganh': [
      './data/industry/**/*',
    ],
    '/thi-truong': [
      './data/pe_pb_vnindex.json',
      './data/ctck_margin_lending.json',
      './data/brokerage_share_hose.json',
      './data/world_market_snapshot.json',
    ],
    '/mcp': [
      './content/agm/**/*',
      './content/bctc/**/*',
      './content/nghien_cuu_ai/**/*',
      './data/longlive_manifest.json',
      './data/financial_charts/**/*',
      './data/reports-snapshot.json',
      './data/disclosures_snapshot.json',
      './data/screener_stocks_snapshot.json',
      './data/nghien_cuu_ai_snapshot.json',
      './data/nghien_cuu_ai_live_prices.json',
    ],
    '/api/mcp': [
      './content/agm/**/*',
      './content/bctc/**/*',
      './content/nghien_cuu_ai/**/*',
      './data/longlive_manifest.json',
      './data/financial_charts/**/*',
      './data/reports-snapshot.json',
      './data/disclosures_snapshot.json',
      './data/screener_stocks_snapshot.json',
      './data/nghien_cuu_ai_snapshot.json',
      './data/nghien_cuu_ai_live_prices.json',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      'data/evaluation_cache/**',
      'data/shareholder_cache/**',
      'data/notes-cache/**',
      'data/*.db',
      'data/**/*.db',
      'scripts/**',
    ],
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Áp dụng security headers cho toàn bộ routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Chặn cache và chặn index đối với toàn bộ API nội bộ
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
      {
        // Cache vĩnh viễn hình ảnh tĩnh, fonts và biểu tượng để tăng tốc LCP
        source: '/:all*(svg|jpg|png|webp|avif|woff2|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
