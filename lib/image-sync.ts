import type { CarSummary } from './scraper'

// The old module-level throttle lived here. It could not work: each serverless
// instance holds its own copy, so every cold start believed it was allowed to
// sync. Scheduling is now the cron's job, which actually is global.

async function sha256short(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

// A stored copy of a car's main photo, and the source-site photo it was made
// from. The source names every upload uniquely, so a different source URL means
// the photo was replaced there and this copy is out of date.
export type CachedImage = { url: string; source: string }

// The photo to show: the stored copy while it still matches the source, else
// the source photo itself until the daily cron stores the new one. Costs
// nothing extra — both values are already loaded. With no source URL (the list
// scrape failed) the copy is the best we have.
export function freshImage(sourceUrl: string | undefined, cached: CachedImage | null | undefined): string {
  if (!cached) return sourceUrl ?? ''
  if (!sourceUrl || cached.source === sourceUrl) return cached.url
  return sourceUrl
}

// Single-car lookup. A car page needs exactly one row, so it must not pull the
// whole table the way the list pages legitimately do.
export async function getCachedImageUrl(recNo: string): Promise<CachedImage | null> {
  try {
    const { getSupabaseAdmin } = await import('./supabase')
    const { data } = await getSupabaseAdmin()
      .from('car_image_cache')
      .select('storage_url, original_url')
      .eq('rec_no', recNo)
      .abortSignal(AbortSignal.timeout(5000))
      .maybeSingle()
    return data ? { url: data.storage_url, source: data.original_url } : null
  } catch {
    return null
  }
}

// Returns map of recNo → stored copy for all cached cars
export async function getCachedImageUrls(): Promise<Record<string, CachedImage>> {
  try {
    const { getSupabaseAdmin } = await import('./supabase')
    const { data } = await getSupabaseAdmin()
      .from('car_image_cache')
      .select('rec_no, storage_url, original_url')
      // Bounded: this only upgrades image URLs, so a slow Supabase must never
      // hold up a page render.
      .abortSignal(AbortSignal.timeout(5000))
    return Object.fromEntries((data ?? []).map(r => [r.rec_no, { url: r.storage_url, source: r.original_url }]))
  } catch {
    return {}
  }
}

export async function syncCarImages(
  cars: CarSummary[],
  deadline = Date.now() + 50_000,
): Promise<{ synced: number; skipped: number; ranOutOfTime: boolean }> {
  let synced = 0
  let skipped = 0
  let ranOutOfTime = false
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
      // Stop cleanly rather than being killed mid-upload; whatever is left is
      // picked up by the next run, since progress is recorded per car.
      if (Date.now() >= deadline) {
        ranOutOfTime = true
        console.log('[image-sync] budget reached, resuming next run')
        break
      }
      if (!car.imageUrl) continue
      const row = cached.get(car.recNo)
      const ageMs = row ? Date.now() - new Date(row.synced_at).getTime() : Infinity
      const urlChanged = row?.original_url !== car.imageUrl

      // Re-check daily to catch silent image replacements on the source site
      if (row && !urlChanged && ageMs < 23 * 60 * 60 * 1000) { skipped++; continue }

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
        // The content hash is in the name, so a new photo gets a new URL. With a
        // fixed name the Supabase CDN, browsers and Vercel's image cache (7 days)
        // all kept serving the old photo under the unchanged URL.
        const path = `${car.recNo}-${hash}.${ext}`

        // A URL's content never changes now, so it can be cached for a year —
        // less Supabase egress than the old 1-day header.
        const { error: uploadErr } = await sb.storage
          .from(BUCKET)
          .upload(path, buf, { contentType: ct, upsert: true, cacheControl: '31536000' })
        if (uploadErr) { console.error('[image-sync] upload', car.recNo, uploadErr.message); continue }

        const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path)

        const { error: rowErr } = await sb.from('car_image_cache').upsert({
          rec_no: car.recNo,
          original_url: car.imageUrl,
          content_hash: hash,
          storage_path: path,
          storage_url: publicUrl,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'rec_no' })
        if (rowErr) { console.error('[image-sync] row', car.recNo, rowErr.message); continue }

        // Only once the row points at the new file: storage never grows, and a
        // failed upsert leaves the old copy in place for the row that uses it.
        if (row && row.storage_path !== path) {
          await sb.storage.from(BUCKET).remove([row.storage_path])
        }

        synced++
        console.log('[image-sync] updated', car.recNo, urlChanged ? '(url changed)' : '(content changed)')
      } catch (e) {
        console.error('[image-sync] skip', car.recNo, String(e))
      }
    }

    console.log('[image-sync] done', { synced, skipped, ranOutOfTime })
  } catch (e) {
    console.error('[image-sync] fatal', e)
  }
  return { synced, skipped, ranOutOfTime }
}
