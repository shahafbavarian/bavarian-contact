import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getActiveAgents, getAgentByPublicId } from '@/lib/agents'
import { toPublicAgent } from '@/lib/agent-format'
import AgentShowroom from './AgentShowroom'

// Rendered on first visit, then served from the CDN; admin edits revalidate
// the agent's path immediately.
export const revalidate = 300

type Props = { params: { id: string } }

// Pre-build the current agents; agents added later render on first visit and
// are cached from then on.
export async function generateStaticParams() {
  return (await getActiveAgents()).map(a => ({ id: a.public_id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agent = await getAgentByPublicId(params.id)
  if (!agent || !agent.active) return { title: 'Bavarian Motors' }
  return {
    title: `${agent.full_name} | Bavarian Motors`,
    description: agent.title ? `${agent.full_name} · ${agent.title} · Bavarian Motors` : `${agent.full_name} · Bavarian Motors`,
    openGraph: agent.photo_url ? { images: [{ url: agent.photo_url }] } : undefined,
  }
}

export default async function AgentPage({ params }: Props) {
  const agent = await getAgentByPublicId(params.id)
  // Unknown or deactivated agent: send the visitor to the team instead of a dead end.
  if (!agent || !agent.active) redirect('/team')
  return <AgentShowroom agent={toPublicAgent(agent)} />
}
