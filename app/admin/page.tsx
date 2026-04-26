import { supabase, type Lead } from '@/lib/supabase'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[--bg] p-8">

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="font-montserrat text-[10px] tracking-[0.4em] text-[--gold] uppercase mb-2">
              Bavarian Motors Club
            </p>
            <h1 className="font-cormorant font-light text-4xl text-[--text]">
              פניות נכנסות
            </h1>
          </div>
          <div className="text-left">
            <p className="font-montserrat text-xs text-[--text-muted]">
              סה&quot;כ פניות
            </p>
            <p className="font-cormorant text-3xl text-[--gold]">
              {leads?.length ?? 0}
            </p>
          </div>
        </div>

        <div className="gold-line mb-8" />

        {/* Error state */}
        {error && (
          <div className="border border-red-900 bg-red-950/20 p-6 text-center">
            <p className="font-montserrat text-sm text-red-400">
              שגיאה בטעינת הנתונים. בדוק את חיבור Supabase.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!error && (!leads || leads.length === 0) && (
          <div className="border border-[--border] p-16 text-center">
            <svg className="mx-auto mb-4 opacity-20" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="1" stroke="#C8A96E" strokeWidth="1.5" />
              <path d="M4 14h32" stroke="#C8A96E" strokeWidth="1.5" />
              <path d="M12 20h16M12 26h8" stroke="#C8A96E" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="font-montserrat text-sm text-[--text-muted]">
              אין פניות עדיין
            </p>
          </div>
        )}

        {/* Leads table */}
        {leads && leads.length > 0 && (
          <div className="border border-[--border] overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead>
                <tr className="border-b border-[--border] bg-[--surface]">
                  {['תאריך', 'שם', 'טלפון', 'הודעה', 'מקור', 'קמפיין'].map(col => (
                    <th
                      key={col}
                      className="px-5 py-4 text-right font-montserrat text-[10px] tracking-widest text-[--gold] uppercase font-normal"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(leads as Lead[]).map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-[--border] hover:bg-[--surface] transition-colors duration-150 ${
                      i % 2 === 0 ? 'bg-[--bg]' : 'bg-[--surface-2]'
                    }`}
                  >
                    <td className="px-5 py-4 font-montserrat text-xs text-[--text-muted] whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-5 py-4 font-montserrat text-sm text-[--text] font-medium whitespace-nowrap">
                      {lead.name}
                    </td>
                    <td className="px-5 py-4" dir="ltr">
                      <a
                        href={`tel:${lead.phone}`}
                        className="font-montserrat text-sm text-[--gold] hover:text-[--gold-light] transition-colors"
                      >
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-5 py-4 font-montserrat text-sm text-[--text] max-w-xs">
                      <span className="line-clamp-2">{lead.message || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      {lead.utm_source ? (
                        <span className="font-montserrat text-[10px] tracking-wide border border-[--border] px-2 py-1 text-[--text-muted]">
                          {lead.utm_source}
                        </span>
                      ) : (
                        <span className="text-[--text-muted] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {lead.utm_campaign ? (
                        <span className="font-montserrat text-[10px] tracking-wide border border-[rgba(200,169,110,0.3)] px-2 py-1 text-[--gold]">
                          {lead.utm_campaign}
                        </span>
                      ) : (
                        <span className="text-[--text-muted] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  )
}
