import type { CarSummary } from './scraper'

// Module-level throttle — prevents multiple concurrent syncs
let lastSyncStartedAt = 0
const MIN_INTERVAL_MS = 15 * 60 * 1000 // at most once per 15 min

export function shouldSync(): boolean {
  const now = Date.now()
  if (now - lastSyncStartedAt < MIN_INTERVAL_MS) return false
  lastSyncStartedAt = now
  return true
}

async function sha256short(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

// Returns map of recNo → Supabase CDN URL for all cached cars
export async function getCachedImageUrls(): Promise<Record<string, string>> {
  try {
    const { getSupabaseAdmin } = await import('./supabase')
    const { data } = await getSupabaseAdmin()
      .from('car_image_cache')
      .select('rec_no, storage_url')
    return Object.fromEntries((data ?? []).map(r => [r.rec_no, r.storage_url]))
  } catch {
    return {}
  }
}

export async function syncCarImages(cars: CarSummary[]): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('./supabase')
    const sb = getSupabaseAdmin()
    const BUCKET = 'car-images'

    // Load existing cache
    const { data: rows } = await sb
      .from('car_image_cache')
      .select('rec_no, original_url, content_hash, storage_path, storage_url, synced_at')
    const cached = new Map((rows ?? []).map(r => [r.rec_no, r]))

    const currentSet = new Set(cars.filter(c => c.imageUrl).map(c => c.recNo))

    // Delete removed cars from storage + cache
    for (const [recNo, row] of Array.from(cached)) {
      if (!currentSet.has(recNo)) {
        await sb.storage.from(BUCKET).remove([row.storage_path])
        await sb.from('car_image_cache').delete().eq('rec_no', recNo)
      }
    }

    // Process each car (sequential to avoid hammering the source server)
    for (const car of cars) {
      if (!car.imageUrl) continue
      const row = cached.get(car.recNo)
      const ageMs = row ? Date.now() - new Date(row.synced_at).getTime() : Infinity
      const urlChanged = row?.original_url !== car.imageUrl

      // Re-check daily to catch silent image replacements on the source site
      if (row && !urlChanged && ageMs < 23 * 60 * 60 * 1000) continue

      try {
        const res = await fetch(car.imageUrl, { signal: AbortSignal.timeout(15000) })
        if (!res.ok) continue
        const buf = await res.arrayBuffer()
        const hash = await sha256short(buf)

        if (row && row.content_hash === hash) {
          // Same content — just refresh timestamp so daily check doesn't re-run
          await sb.from('car_image_cache')
            .update({ synced_at: new Date().toISOString(), original_url: car.imageUrl })
            .eq('rec_no', car.recNo)
          continue
        }

        // New or changed image — upload to Supabase Storage
        const ct = res.headers.get('content-type') ?? 'image/jpeg'
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
        const path = `${car.recNo}.${ext}`

        // 7-day cache header (default is 1 h). Vercel's image optimizer caches
        // the transformed result for this long, so it re-pulls the full-size
        // source from Supabase ~weekly instead of hourly — far less egress.
        // Content changes are caught by the daily hash re-check above.
        const { error: uploadErr } = await sb.storage
          .from(BUCKET)
          .upload(path, buf, { contentType: ct, upsert: true, cacheControl: '604800' })
        if (uploadErr) { console.error('[image-sync] upload', car.recNo, uploadErr.message); continue }

        const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path)

        await sb.from('car_image_cache').upsert({
          rec_no: car.recNo,
          original_url: car.imageUrl,
          content_hash: hash,
          storage_path: path,
          storage_url: publicUrl,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'rec_no' })

        console.log('[image-sync] updated', car.recNo, urlChanged ? '(url changed)' : '(content changed)')
      } catch (e) {
        console.error('[image-sync] skip', car.recNo, String(e))
      }
    }

    console.log('[image-sync] done')
  } catch (e) {
    console.error('[image-sync] fatal', e)
  }
}
