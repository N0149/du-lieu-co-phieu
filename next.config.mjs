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
  outputFileTracingExcludes: {
    '*': [
      'data/evaluation_cache/**',
      'data/shareholder_cache/**',
      'data/*.db',
      'data/**/*.db',
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
