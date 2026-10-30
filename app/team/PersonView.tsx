import './person.css'

// A person of the team: their portrait, name and role, and the three ways to
// reach them. One design for both places it lives — the page at /team/<id>
// (a QR, a shared link: everything there at first paint, DESIGN.md) and the
// same page opened over the hall (/showroom), where the portrait grows out of
// the card that was tapped. No hooks here: the hall's layer drives the motion
// through the refs it passes in.
export type PersonData = {
  name: string
  role: string | null
  /** the 1200px framed copy (or the photo as uploaded) */
  photo: string | null
  /** shown at once while `photo` loads: the card's copy, already in the hall */
  quick?: string | null
  whatsapp: string
  vcard: string
  instagram: string
}

export default function PersonView({ p, mode, onClose, refs }: {
  p: PersonData
  mode: 'page' | 'over'
  onClose?: () => void
  refs?: {
    photo?: React.Ref<HTMLDivElement>
    hero?: React.Ref<HTMLImageElement>
    bg?: React.Ref<HTMLDivElement>
    rest?: React.Ref<HTMLDivElement>
  }
}) {
  const initials = p.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
  return (
    <div className={`pv pv-${mode}${mode === 'over' ? ' sr-sheet' : ''}`} role={mode === 'over' ? 'dialog' : undefined}
      aria-modal={mode === 'over' ? true : undefined} aria-label={mode === 'over' ? p.name : undefined}>
      <div ref={refs?.bg} className="pv-bg" aria-hidden="true" />
      <div className="pv-frame">
        <div ref={refs?.rest} className="pv-bar">
          {mode === 'over' ? (
            <button type="button" className="pv-close" aria-label="סגירה" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <a href="/team" className="pv-back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              הצוות
            </a>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pv-logo" src="/brand/logo-horizontal-dark.png" alt="בוואריאן מוטורס" width={1244} height={200} />
        </div>

        <main className="pv-main">
          <div ref={refs?.photo} className="pv-photo">
            {p.photo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.quick && <img className="pv-img" src={p.quick} alt="" draggable={false} decoding="sync" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={refs?.hero} className="pv-img pv-hero" src={p.photo} alt="" draggable={false}
                  data-quick={p.quick ? '' : undefined} decoding="async" />
              </>
            ) : <div className="pv-mono" aria-hidden="true">{initials}</div>}
          </div>

          <div className="pv-text pv-rest">
            <h1 className="pv-name">{p.name}</h1>
            {p.role && <p className="pv-role">{p.role}</p>}
          </div>

          <div className="pv-actions pv-rest">
            <a className="pv-btn pv-primary" href={p.whatsapp} target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
              </svg>
              שיחה בוואטסאפ
            </a>
            <a className="pv-btn" href={p.vcard}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="10" cy="8" r="4" />
                <path d="M3 21c1.3-3.7 4-5.6 7-5.6 1.5 0 2.9.5 4.1 1.3" />
                <path d="M18 14v6M15 17h6" />
              </svg>
              שמור איש קשר
            </a>
            <a className="pv-btn" href={p.instagram} target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="4" />
                <circle cx="12" cy="12" r="3.2" />
                <path d="M16.5 7.5v.01" />
              </svg>
              אינסטגרם
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}
