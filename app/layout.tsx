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
  openGraph: {
    title: 'Bavarian Motors Club',
    description: 'רכבי יוקרה וספורט 2026 ללא יד — מחכים לכם בבוואריאן מוטורס',
    url: 'https://contact.bavarian-motors.co.il',
    siteName: 'Bavarian Motors Club',
    images: [
      {
        url: 'https://contact.bavarian-motors.co.il/og-image.PNG',
        width: 1200,
        height: 630,
        alt: 'Bavarian Motors Club',
      },
    ],
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bavarian Motors Club',
    description: 'רכבי יוקרה וספורט 2026 ללא יד — מחכים לכם בבוואריאן מוטורס',
    images: ['https://contact.bavarian-motors.co.il/og-image.PNG'],
  },
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
      <body>{children}</body>
    </html>
  )
}
