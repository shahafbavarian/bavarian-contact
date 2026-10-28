import type { Viewport } from 'next'
import { IBM_Plex_Sans_Hebrew, Michroma } from 'next/font/google'
import './showroom.css'

const plex = IBM_Plex_Sans_Hebrew({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

const michroma = Michroma({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-michroma',
  display: 'swap',
})

// The showroom is bright — match the browser chrome to the wall colour.
export const viewport: Viewport = {
  themeColor: '#FBFAF8',
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${plex.variable} ${michroma.variable}`}>{children}</div>
}
