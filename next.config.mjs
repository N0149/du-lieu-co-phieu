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
    ]
  },
}

export default nextConfig
