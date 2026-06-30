import { getSupabaseAdmin } from '@/lib/supabase'
import { fetchCarList } from '@/lib/scraper'
import { getCachedImageUrls } from '@/lib/image-sync'
import FleetDashboard from './FleetDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type EventRow = {
  id: string
  type: string
  device: string | null
  utm_source: string | null
  rec_no: string | null
  created_at: string
}

export type LeadRow = {
  id: string
  name: string | null
  phone: string
  message: string | null
  utm_source: string | null
  utm_campaign: string | null
  device: string | null
  rec_no: string | null
  created_at: string
}

const PAGE = 1000
const MAX_PAGES = 200 // hard backstop (200k rows) so a runaway never hangs the page

// Supabase/PostgREST caps rows per request (commonly 1000). Page through with
// .range() until exhausted so analytics never silently drop older rows.
// Returns 'columnMissing' if a selected column doesn't exist yet (pre-migration).
async function fetchAllPaged<T>(table: string, columns: string): Promise<T[] | 'columnMissing'> {
  const sb = getSupabaseAdmin()
  const out: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) {
      if (error.code === '42703') return 'columnMissing'
      break // on any other error, return what we have rather than failing the page
    }
    out.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < PAGE) break
  }
  return out
}

async function loadEvents(): Promise<{ events: EventRow[]; migrated: boolean }> {
  const withRec = await fetchAllPaged<EventRow>('events', 'id, type, device, utm_source, rec_no, created_at')
  if (withRec !== 'columnMissing') return { events: withRec, migrated: true }
  const legacy = await fetchAllPaged<Omit<EventRow, 'rec_no'>>('events', 'id, type, device, utm_source, created_at')
  return { events: legacy === 'columnMissing' ? [] : legacy.map(e => ({ ...e, rec_no: null })), migrated: false }
}

async function loadLeads(): Promise<LeadRow[]> {
  const withRec = await fetchAllPaged<LeadRow>('leads', 'id, name, phone, message, utm_source, utm_campaign, device, rec_no, created_at')
  if (withRec !== 'columnMissing') return withRec
  const legacy = await fetchAllPaged<Omit<LeadRow, 'rec_no'>>('leads', 'id, name, phone, message, utm_source, utm_campaign, device, created_at')
  return legacy === 'columnMissing' ? [] : legacy.map(l => ({ ...l, rec_no: null }))
}

export default async function FleetStatsPage() {
  const [{ events, migrated }, leads] = await Promise.all([loadEvents(), loadLeads()])

  // Resolve rec_no → human car name + thumbnail. Best-effort; the dashboard
  // falls back gracefully when a car is no longer listed. Thumbnails prefer the
  // Supabase CDN URL (cheaper egress than the source site).
  let carNames: Record<string, string> = {}
  let carImages: Record<string, string> = {}
  try {
    const [cars, cdn] = await Promise.all([
      fetchCarList(),
      getCachedImageUrls().catch(() => ({} as Record<string, string>)),
    ])
    for (const c of cars) {
      carNames[c.recNo] = c.name
      const img = cdn[c.recNo] ?? c.imageUrl
      if (img) carImages[c.recNo] = img
    }
  } catch {}

  return (
    <div style={{ padding: '28px 24px 80px', maxWidth: 1080, margin: '0 auto', direction: 'rtl' }}>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.3em', color: 'rgba(200,169,110,0.6)', textTransform: 'uppercase', margin: '0 0 3px' }}>
        מערך רכבים
      </p>
      <h1 style={{ fontFamily: 'var(--font-heebo)', fontWeight: 300, fontSize: 22, color: '#fff', margin: '0 0 24px' }}>
        מעקב ונתונים
      </h1>
      {!migrated && (
        <div style={{
          border: '1px solid rgba(248,180,80,0.4)', background: 'rgba(248,180,80,0.07)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          fontFamily: 'var(--font-heebo)', fontSize: 13, color: 'rgba(255,210,140,0.95)', lineHeight: 1.6,
        }}>
          ⚠️ מעקב לפי רכב לא פעיל עדיין — חסרה עמודת <code style={{ direction: 'ltr', display: 'inline-block' }}>rec_no</code>.
          הרץ ב-Supabase: <code style={{ direction: 'ltr', display: 'inline-block' }}>ALTER TABLE events ADD COLUMN rec_no text;</code> ו-<code style={{ direction: 'ltr', display: 'inline-block' }}>ALTER TABLE leads ADD COLUMN rec_no text;</code>
          עד אז אירועים נשמרים אך אינם משויכים לרכב.
        </div>
      )}
      <FleetDashboard events={events} leads={leads} carNames={carNames} carImages={carImages} />
    </div>
  )
}
