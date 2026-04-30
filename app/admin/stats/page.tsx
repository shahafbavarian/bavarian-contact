import { getSupabaseAdmin } from '@/lib/supabase'
import type { Event } from '@/lib/supabase'
import StatsPanel from './StatsPanel'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const supabase = getSupabaseAdmin()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--font-heebo)',
        fontSize: 22,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.85)',
        margin: '0 0 28px',
        letterSpacing: '-0.01em',
      }}>
        סטטיסטיקות
      </h1>
      <StatsPanel events={(events ?? []) as Event[]} />
    </div>
  )
}
