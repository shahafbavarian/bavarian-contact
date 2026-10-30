import { unstable_cache } from 'next/cache'
import { getActiveAgents, getAgentByPublicId } from '@/lib/agents'
import { INSTAGRAM_URL, whatsappLink } from '@/lib/agent-format'
import { agentPhoto } from '@/lib/team-photos'
import PersonSheet from '../../../PersonSheet'

// A team card opened inside the hall: /team/<id> is intercepted here and shown
// over the hall (no reload, the hall stays as it was). Opened any other way —
// a shared link, a QR, a refresh — the address renders the full person page.
// Cached like that page; admin edits revalidate the person's path
export const revalidate = 300

// built ahead for the current team, like the person page; someone added later
// is rendered on first open and cached from then on
export async function generateStaticParams() {
  return (await getActiveAgents()).map(a => ({ id: a.public_id }))
}

// An intercepted route is rendered per open (it depends on where you came
// from), so the person is read through a 5-minute cache: Supabase sees at most
// one read per person per 5 minutes; an admin edit clears it (tag 'agents')
const agentById = unstable_cache((id: string) => getAgentByPublicId(id), ['sheet-agent'], { revalidate: 300, tags: ['agents'] })

export default async function PersonOverHall({ params }: { params: { id: string } }) {
  const agent = await agentById(params.id).catch(() => null)
  if (!agent || !agent.active) return null
  return (
    <PersonSheet
      name={agent.full_name}
      role={agent.title}
      photo={agentPhoto(agent)}
      whatsapp={whatsappLink(agent.phone)}
      vcard={`/api/agents/${agent.public_id}/vcard`}
      instagram={INSTAGRAM_URL}
    />
  )
}
