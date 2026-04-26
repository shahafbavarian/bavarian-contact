import type { Metadata } from 'next'
import { Frank_Ruhl_Libre, Inter } from 'next/font/google'
import './globals.css'

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-frank',
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
  description: 'מלאי נחרב של רכבי יוקרה וספורט — בוואריאן מוטורס',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${frankRuhl.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
