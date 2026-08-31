import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
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
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1f2b' },
  ],
}

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('rnav-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.add(t);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${jetbrainsMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <div className="flex-1">{children}</div>
        <SiteFooter />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
