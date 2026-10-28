import sharp from 'sharp'
import { getSupabaseAdmin } from './supabase'
import { AGENT_PHOTO_BUCKET, revalidateAgent } from './agents'
import type { Agent } from './agent-format'

// Stored whole — EXIF-rotated, scaled down, WebP — never cropped here. Framing
// happens on display (object-position), so a photo is never cut around the
// wrong subject. Replaces and removes any previous photo.
export async function saveAgentPhoto(
  agent: Pick<Agent, 'id' | 'public_id' | 'photo_path'>,
  input: Buffer,
): Promise<Agent> {
  const webp = await sharp(input)
    .rotate()
    .resize(1000, 1300, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const sb = getSupabaseAdmin()
  // A fresh path per upload, so CDNs and phones never show the old photo.
  const path = `${agent.public_id}/${Date.now()}.webp`
  const { error: upErr } = await sb.storage.from(AGENT_PHOTO_BUCKET)
    .upload(path, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
  if (upErr) throw upErr
  const { data: { publicUrl } } = sb.storage.from(AGENT_PHOTO_BUCKET).getPublicUrl(path)

  const { data, error } = await sb.from('agents')
    .update({ photo_path: path, photo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', agent.id).select('*').single()
  if (error) throw error

  if (agent.photo_path) await sb.storage.from(AGENT_PHOTO_BUCKET).remove([agent.photo_path])
  revalidateAgent(agent.public_id)
  return data as Agent
}
