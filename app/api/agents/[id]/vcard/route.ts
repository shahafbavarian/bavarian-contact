import { NextResponse } from 'next/server'
import { getAgentByPublicId } from '@/lib/agents'
import { buildVCard } from '@/lib/agent-format'

export const dynamic = 'force-dynamic'

// "שמור איש קשר" — always built from the agent's current details, so an edit in
// the admin is reflected the next time someone saves the card.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const agent = await getAgentByPublicId(params.id)
    if (!agent || !agent.active) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const filename = `${agent.full_name.trim()}.vcf`
    return new NextResponse(buildVCard(agent), {
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        // ASCII fallback first, then the Hebrew name for browsers that support RFC 5987.
        'Content-Disposition': `inline; filename="contact.vcf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[/api/agents/vcard]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
