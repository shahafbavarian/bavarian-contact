import { randomInt } from 'crypto'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from './supabase'
import { isValidEmail, normalizePhone, type Agent } from './agent-format'

export const AGENT_PHOTO_BUCKET = 'agent-photos'

// Without Supabase configured (a local build) the public pages render empty
// instead of failing the build. A real query error still throws, so ISR keeps
// serving the last good page rather than caching an empty one.
function configured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL
}

// Until supabase-agents.sql has been run the table doesn't exist. Treat that
// as "no agents yet" so deploys keep building and the pages show their empty state.
function isMissingTable(error: { code?: string }): boolean {
  return error.code === '42P01' || error.code === 'PGRST205'
}

export async function getActiveAgents(): Promise<Agent[]> {
  if (!configured()) return []
  const { data, error } = await getSupabaseAdmin()
    .from('agents')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    if (isMissingTable(error)) return []
    throw error
  }
  return (data ?? []) as Agent[]
}

export async function getAgentByPublicId(publicId: string): Promise<Agent | null> {
  if (!configured() || !/^[a-z0-9]{4,16}$/.test(publicId)) return null
  const { data, error } = await getSupabaseAdmin()
    .from('agents')
    .select('*')
    .eq('public_id', publicId)
    .maybeSingle()
  if (error) {
    if (isMissingTable(error)) return null
    throw error
  }
  return (data as Agent) ?? null
}

// Short, unambiguous, non-sequential. Uniqueness is enforced by the DB; the
// caller retries on a collision.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function newPublicId(len = 6): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

// Purge the CDN copies of the team page, this agent's page and the hall after an edit.
export function revalidateAgent(publicId: string) {
  revalidatePath('/team')
  revalidatePath(`/team/${publicId}`)
  revalidatePath('/showroom', 'layout')   // the hall (all its addresses) carries the team's cards too
}

export type AgentFields = {
  full_name?: string
  phone?: string
  email?: string | null
  title?: string | null
  active?: boolean
}

// Validates admin input. `partial` allows omitting fields (edits); a create
// must carry name and phone. Returns the cleaned fields or a Hebrew error.
export function parseAgentInput(body: Record<string, unknown>, partial: boolean): { fields: AgentFields } | { error: string } {
  const fields: AgentFields = {}

  if (body.full_name !== undefined || !partial) {
    const name = String(body.full_name ?? '').trim().replace(/\s+/g, ' ')
    if (!name) return { error: 'שם מלא הוא שדה חובה' }
    if (name.length > 60) return { error: 'השם ארוך מדי' }
    fields.full_name = name
  }
  if (body.phone !== undefined || !partial) {
    const phone = normalizePhone(String(body.phone ?? ''))
    if (!phone) return { error: 'מספר טלפון נייד לא תקין (לדוגמה 050-1234567)' }
    fields.phone = phone
  }
  if (body.email !== undefined) {
    const email = String(body.email ?? '').trim()
    if (email && !isValidEmail(email)) return { error: 'כתובת אימייל לא תקינה' }
    if (email.length > 120) return { error: 'כתובת האימייל ארוכה מדי' }
    fields.email = email || null
  }
  if (body.title !== undefined) {
    const title = String(body.title ?? '').trim().replace(/\s+/g, ' ')
    if (title.length > 50) return { error: 'התפקיד ארוך מדי' }
    fields.title = title || null
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') return { error: 'ערך לא תקין' }
    fields.active = body.active
  }
  return { fields }
}
