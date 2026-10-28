import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Hebrew } from 'next/font/google'
import './showroom.css'

const plex = IBM_Plex_Sans_Hebrew({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

// Prototype of the virtual showroom — reachable by link only until approved.
export const metadata: Metadata = {
  title: 'האולם | בוואריאן מוטורס',
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: '/brand/icons/favicon-32.png', sizes: '32x32' }],
    apple: '/brand/icons/apple-touch-icon-180.png',
  },
}

export const viewport: Viewport = {
  // no theme colour in effect (a media query that never matches overrides the
  // site's black one): Safari would paint it behind the clock, over the stone
  themeColor: [{ media: 'not all', color: '#06080c' }],
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  return <div className={plex.variable}>{children}</div>
}
