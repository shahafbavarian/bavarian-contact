import { NextResponse } from 'next/server'
import { getAgentByPublicId } from '@/lib/agents'
import { whatsappLink } from '@/lib/agent-format'

// "שליחת וואטסאפ" from a person opened in the hall: the hall's page never carries
// phone numbers, so the button comes here and is sent on to the person's chat.
// Runs only on a tap; the CDN keeps the answer 5 minutes per person
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentByPublicId(params.id).catch(() => null)
  if (!agent || !agent.active) return NextResponse.redirect(new URL('/team', req.url))
  return NextResponse.redirect(whatsappLink(agent.phone), {
    status: 302,
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
