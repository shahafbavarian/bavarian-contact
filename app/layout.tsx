import type { Metadata, Viewport } from 'next'
import { Heebo, Inter } from 'next/font/google'
import './globals.css'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-heebo',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bavarian Motors Club',
  description: 'מלאי נרחב של רכבי יוקרה וספורט — בוואריאן מוטורס',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${inter.variable}`}>
      <head>
        <link rel="preload" as="image" href="/BG0.PNG" />
      </head>
      <body>{children}</body>
    </html>
  )
}
