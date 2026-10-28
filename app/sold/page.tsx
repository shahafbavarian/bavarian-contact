import type { Metadata } from 'next'
import Link from 'next/link'
import TopBar from '../team/TopBar'
import SiteFooter from '../team/SiteFooter'

export const metadata: Metadata = { title: 'רכבים שנמכרו | בוואריאן מוטורס' }

// Placeholder until the sold-cars page is built
export default function SoldPage() {
  return (
    <div className="bm">
      <TopBar title="רכבים שנמכרו" watch="sold-title" />
      <main className="bm-main">
        <h1 id="sold-title" className="bm-display">רכבים שנמכרו</h1>
        <p className="bm-lede">העמוד בהכנה. <Link href="/cars">לרכבים שבמלאי</Link></p>
      </main>
      <SiteFooter />
    </div>
  )
}
