import type { Metadata } from 'next'
import { getActiveAgents } from '@/lib/agents'
import TeamShowroom, { type TeamAgent } from './TeamShowroom'

// Served from the CDN; admin edits revalidate this path immediately.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'הצוות שלנו | Bavarian Motors',
  description: 'הצוות של Bavarian Motors',
}

export default async function TeamPage() {
  // Only what the cards show — phone numbers never reach this page.
  const agents: TeamAgent[] = (await getActiveAgents()).map(a => ({
    publicId: a.public_id,
    name: a.full_name,
    title: a.title,
    photoUrl: a.photo_url,
  }))
  return <TeamShowroom agents={agents} />
}
