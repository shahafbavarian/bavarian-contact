import type { Metadata } from 'next'
import Link from 'next/link'
import { getActiveAgents } from '@/lib/agents'
import AgentMedia from './AgentMedia'
import Reveal from './Reveal'
import TopBar from './TopBar'
import { he as t } from './strings'

// Served from the CDN; admin edits revalidate this path immediately.
export const revalidate = 300

export const metadata: Metadata = {
  title: t.metaTeamTitle,
  description: t.metaTeamDescription,
}

export default async function TeamPage() {
  const people = await getActiveAgents()

  return (
    <div className="bm">
      <TopBar title={t.teamTitle} watch="team-title" />
      <main className="bm-main">
        <h1 id="team-title" className="bm-display">
          {t.teamTitle.split(' ').map((w, i) => (
            <span key={i} className="bm-word" style={{ '--i': i } as React.CSSProperties}><span>{w}</span></span>
          ))}
        </h1>
        <p className="bm-lede">{t.teamLede}</p>

        {people.length === 0 ? (
          <p className="bm-empty">{t.emptyTeam}</p>
        ) : (
          <Reveal className="bm-grid">
            {people.map((p, i) => (
              <li key={p.public_id} data-reveal>
                {/* Phone numbers never reach this page — only name, role, photo. */}
                <Link href={`/team/${p.public_id}`} className="bm-card" aria-label={t.meet(p.full_name)}>
                  <div className="bm-photo">
                    <AgentMedia name={p.full_name} photoUrl={p.photo_url} eager={i < 6} />
                  </div>
                  <div className="bm-text">
                    <p className="bm-name">{p.full_name}</p>
                    {p.title && <p className="bm-role">{p.title}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </Reveal>
        )}
      </main>
    </div>
  )
}
