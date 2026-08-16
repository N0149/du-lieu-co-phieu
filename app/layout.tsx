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

export const metadata: Metadata = {
  metadataBase: new URL('https://dulieucophieu.com'),
  title: 'Phân Tích Chuyên Sâu Cổ Phiếu - Cổng Dữ Liệu & Báo Cáo Đầu Tư',
  description:
    'Cổng dữ liệu đầu tư giá trị cấp tổ chức: bộ lọc cổ phiếu định giá hấp dẫn, phân tích tài sản và bóc tách giá trị tiềm ẩn.',
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
