import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Hebrew } from 'next/font/google'
import './team.css'

const plex = IBM_Plex_Sans_Hebrew({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/brand/icons/favicon-32.png', sizes: '32x32' }, { url: '/brand/icons/favicon-16.png', sizes: '16x16' }],
    apple: '/brand/icons/apple-touch-icon-180.png',
  },
  openGraph: { images: [{ url: '/brand/social/og-image-1200x630.png', width: 1200, height: 630 }] },
}

// Bright pages: browser chrome matches the page, and pinch-zoom stays available
// (the site-wide viewport disables it, which DESIGN.md §9 does not allow here).
export const viewport: Viewport = {
  themeColor: '#F5F6F7',
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <div className={plex.variable}>{children}</div>
}
