import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = { title: 'sbtest2', robots: { index: false, follow: false } }
export const viewport: Viewport = {
  themeColor: [{ media: 'not all', color: '#06080c' }],
  viewportFit: 'cover',
}

// the lab needs the page itself scrollable and unlocked, like the showroom
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="sb2" style={{ minHeight: '100%' }}>{children}</div>
}
