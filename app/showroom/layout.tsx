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

// Decided before the first paint (an inline script, no React): a refresh of
// the bright inside view must not open on black edges and repaint — the
// CLAUDE.md Safari rulebook, first-paint clause
// (inside: the address says so — /showroom/cars, /showroom/team — or the
// remembered state does)
const FIRST_PAINT = `try{if(location.search.indexOf('theme=dark')<0&&(/^\\/showroom\\/(cars|team)\\/?$/.test(location.pathname)||sessionStorage.getItem('sr-view')==='in'))document.documentElement.setAttribute('data-sr-bright','')}catch(e){}`

// `sheet`: a person opened from the hall (/team/<id>), laid over the hall while
// it stays alive behind; empty everywhere else
export default function ShowroomLayout({ children, sheet }: { children: React.ReactNode; sheet: React.ReactNode }) {
  return (
    <div className={plex.variable}>
      <script dangerouslySetInnerHTML={{ __html: FIRST_PAINT }} />
      {children}
      {sheet}
    </div>
  )
}
