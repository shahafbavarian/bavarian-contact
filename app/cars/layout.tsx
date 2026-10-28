import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Hebrew } from 'next/font/google'
import '../team/team.css'

const plex = IBM_Plex_Sans_Hebrew({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'הרכבים | בוואריאן מוטורס',
  description: 'נבחרת רכבי היוקרה והספורט של בוואריאן מוטורס — במלאי ובדרך לארץ',
  icons: {
    icon: [{ url: '/brand/icons/favicon-32.png', sizes: '32x32' }, { url: '/brand/icons/favicon-16.png', sizes: '16x16' }],
    apple: '/brand/icons/apple-touch-icon-180.png',
  },
}

// Bright page: browser chrome matches, pinch-zoom stays available.
export const viewport: Viewport = {
  themeColor: '#F5F6F7',
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return <div className={plex.variable}>{children}</div>
}
