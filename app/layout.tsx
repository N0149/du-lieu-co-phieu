import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import { AntiScrapingTrap } from '@/components/security/anti-scraping-trap'
import { NavigationProgressBar } from '@/components/navigation-progress-bar'
import { ThemeInitializer } from '@/components/theme-toggle'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dulieudautu.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Phân Tích Chuyên Sâu Cổ Phiếu - Cổng Dữ Liệu & Báo Cáo Đầu Tư',
    template: '%s | Dữ Liệu Đầu Tư',
  },
  description:
    'Cổng dữ liệu đầu tư giá trị cấp tổ chức: bộ lọc cổ phiếu định giá hấp dẫn, phân tích tài sản và bóc tách giá trị tiềm ẩn.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Phân Tích Chuyên Sâu Cổ Phiếu - Cổng Dữ Liệu & Báo Cáo Đầu Tư',
    description:
      'Cổng dữ liệu đầu tư giá trị cấp tổ chức: bộ lọc cổ phiếu định giá hấp dẫn, phân tích tài sản và bóc tách giá trị tiềm ẩn.',
    url: siteUrl,
    siteName: 'Dữ Liệu Đầu Tư',
    locale: 'vi_VN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#14171f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} dark bg-background`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeInitializer />
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <div className="flex-1 pb-16 lg:pb-0">{children}</div>
        <SiteFooter />
        <AntiScrapingTrap />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
