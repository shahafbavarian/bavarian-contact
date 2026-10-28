import Link from 'next/link'
import { INSTAGRAM_URL } from '@/lib/agent-format'
import { he as t } from './strings'

// Real contact details only — the numbers the contact page already uses.
const PHONE_DISPLAY = '09-9561906'
const PHONE_TEL = 'tel:+97299561906'
const WHATSAPP = 'https://wa.me/97299561906'
const MAIN_SITE = 'https://bavarian-motors.co.il'

export default function SiteFooter() {
  return (
    <footer className="bm-footer">
      <div className="bm-footer-in">
        <div className="bm-footer-top">
          <a href={MAIN_SITE} aria-label={t.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bm-footer-logo" src="/brand/logo-full-light-sm.png" alt={t.brand} width={176} height={82} />
          </a>
          <div className="bm-footer-cols">
            <nav aria-label={t.footerNav}>
              <h3>{t.footerNav}</h3>
              <Link href="/cars">{t.navCars}</Link>
              <Link href="/team">{t.navTeam}</Link>
              <a href={MAIN_SITE}>{t.mainSite}</a>
            </nav>
            <div>
              <h3>{t.footerContact}</h3>
              <a href={PHONE_TEL}><bdi dir="ltr">{PHONE_DISPLAY}</bdi></a>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">{t.footerWhatsapp}</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{t.instagram}</a>
            </div>
          </div>
        </div>
        <p className="bm-footer-legal">© {new Date().getFullYear()} {t.brand}</p>
      </div>
    </footer>
  )
}
