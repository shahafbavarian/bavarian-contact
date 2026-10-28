import type { Metadata } from 'next'
import TopBar from '../team/TopBar'
import SiteFooter from '../team/SiteFooter'

export const metadata: Metadata = { title: 'צרו קשר | בוואריאן מוטורס' }

// Placeholder until the contact page is built: the real details are in the footer
export default function ContactPage() {
  return (
    <div className="bm">
      <TopBar title="צרו קשר" watch="contact-title" />
      <main className="bm-main">
        <h1 id="contact-title" className="bm-display">צרו קשר</h1>
        <p className="bm-lede">העמוד בהכנה. בינתיים, כל הדרכים אלינו כאן למטה.</p>
      </main>
      <SiteFooter />
    </div>
  )
}
