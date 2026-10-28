import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getActiveAgents, getAgentByPublicId } from '@/lib/agents'
import { INSTAGRAM_URL, whatsappLink } from '@/lib/agent-format'
import { agentPhoto } from '@/lib/team-photos'
import AgentMedia from '../AgentMedia'
import SiteFooter from '../SiteFooter'
import TopBar from '../TopBar'
import { he as t } from '../strings'

// Rendered on first visit, then served from the CDN; admin edits revalidate
// the person's path immediately.
export const revalidate = 300

type Props = { params: { id: string } }

// Pre-build the current team; people added later render on first visit and
// are cached from then on.
export async function generateStaticParams() {
  return (await getActiveAgents()).map(a => ({ id: a.public_id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agent = await getAgentByPublicId(params.id)
  if (!agent || !agent.active) return { title: t.brand }
  const photo = agentPhoto(agent)
  return {
    title: `${agent.full_name} | ${t.brand}`,
    description: agent.title ? `${agent.full_name} · ${agent.title} · ${t.brand}` : `${agent.full_name} · ${t.brand}`,
    openGraph: photo
      ? { images: [{ url: photo.startsWith('/') ? `https://contact.bavarian-motors.co.il${photo}` : photo }] }
      : undefined,
  }
}

export default async function PersonPage({ params }: Props) {
  const agent = await getAgentByPublicId(params.id)
  // Unknown or deactivated: send the visitor to the team instead of a dead end.
  if (!agent || !agent.active) redirect('/team')

  return (
    <div className="bm">
      <TopBar title={agent.full_name} back />
      <main className="bm-person">
        <div className="bm-hero">
          <AgentMedia name={agent.full_name} photoUrl={agentPhoto(agent)} eager />
        </div>

        <div className="bm-person-text">
          <h1 className="bm-person-name">{agent.full_name}</h1>
          {agent.title && <p className="bm-person-role">{agent.title}</p>}
        </div>

        <div className="bm-actions">
          <a className="bm-btn bm-btn-primary" href={whatsappLink(agent.phone)} target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zM12 0a12 12 0 00-10.3 18L0 24l6.2-1.6A12 12 0 1012 0z" />
            </svg>
            {t.whatsapp}
          </a>
          <a className="bm-btn" href={`/api/agents/${agent.public_id}/vcard`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M19 3v5M16.5 5.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {t.saveContact}
          </a>
          <a className="bm-btn" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.4" cy="6.6" r="1" fill="currentColor" />
            </svg>
            {t.instagram}
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
