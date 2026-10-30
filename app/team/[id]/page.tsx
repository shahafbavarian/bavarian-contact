import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getActiveAgents, getAgentByPublicId } from '@/lib/agents'
import { INSTAGRAM_URL, whatsappLink } from '@/lib/agent-format'
import { agentPhoto, teamPhotoCopy } from '@/lib/team-photos'
import PersonView from '../PersonView'
import SiteFooter from '../SiteFooter'
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
  const photo = agentPhoto(agent)

  // Everything at first paint, one tap to talk (DESIGN.md): no intro motion.
  // The same page the hall opens over itself when its card is tapped.
  return (
    <div className="bm">
      <PersonView
        mode="page"
        p={{
          name: agent.full_name,
          role: agent.title,
          photo: photo ? teamPhotoCopy(photo, 'hero') : null,
          whatsapp: whatsappLink(agent.phone),
          vcard: `/api/agents/${agent.public_id}/vcard`,
          instagram: INSTAGRAM_URL,
        }}
      />
      <SiteFooter />
    </div>
  )
}
