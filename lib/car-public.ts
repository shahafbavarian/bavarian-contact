import { fetchCarDetail, fetchCarSummaryByRecNo } from './scraper'
import { getCachedImageUrl, freshImage } from './image-sync'
import { getActiveAgents } from './agents'
import { agentPhoto, teamPhotoCopy } from './team-photos'
import { fetchGovIndices } from './gov-data'
import HANDS from '@/app/showroom/hands.json'

// A car as the public may see it (docs/CAR_PAGE_SPEC.md). Everything the page,
// the share, the print and the structured data read comes from here, and only
// the fields listed below exist: the scraper's plate number, its raw spec
// table and anything else private never leave this file (spec §11).
// Optional fields that the main site does not carry are simply absent —
// never invented (spec §12).
export type PublicCar = {
  recNo: string
  slug: string
  /** always shown */
  make: string
  model: string
  /** shown whenever it exists */
  trim: string | null
  name: string
  status: 'stock' | 'way'
  price: string | null
  priceN: number | null
  /** a valid, approved offer, and only with a visible price (spec §4–5) */
  finance: { down: string | null; monthly: string; months: number; balloon: string | null; note: string | null } | null
  year: string | null
  km: string | null
  hand: string | null
  ownership: string | null
  engineCc: string | null
  hp: string | null
  fuel: string | null
  body: string | null
  colorExt: string | null
  colorInt: string | null
  listPrice: string | null
  description: string | null
  hero: string | null
  images: string[]
  pollution: number | null
  safety: number | null
  videos: string[]
  agent: { name: string; title: string | null; photo: string | null; href: string } | null
}

const slugPart = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, ' ').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

/** the car's own address: its number first (the lookup), then its name for people */
export const carSlug = (recNo: string, name: string) => [recNo, slugPart(name)].filter(Boolean).join('-')
export const recNoOfSlug = (slug: string) => slug.match(/^(\d+)/)?.[1] ?? null

const num = (s?: string | null) => { const n = parseInt((s ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null }
const clean = (s?: string | null) => { const t = (s ?? '').replace(/\s+/g, ' ').trim(); return t || null }
const shekel = (n: number) => `${n.toLocaleString('he-IL')} ₪`

async function videosOf(recNo: string): Promise<string[]> {
  try {
    const { getSupabaseAdmin } = await import('./supabase')
    const { data } = await getSupabaseAdmin().from('car_videos').select('youtube_url, youtube_url_2')
      .eq('rec_no', recNo).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
    return [data?.youtube_url, data?.youtube_url_2].filter(Boolean) as string[]
  } catch { return [] }
}

async function overridesOf(recNo: string): Promise<{ pollution: number | null; safety: number | null } | null> {
  try {
    const { getSupabaseAdmin } = await import('./supabase')
    const { data } = await getSupabaseAdmin().from('car_overrides').select('pollution_grade, safety_level')
      .eq('rec_no', recNo).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
    return data ? { pollution: data.pollution_grade ?? null, safety: data.safety_level ?? null } : null
  } catch { return null }
}

// the agent the main site names for the car — shown only when that person is
// one of our own, active team (the approved list): name, role, photo, page
async function agentOf(name: string | null) {
  if (!name) return null
  try {
    const n = (s: string) => s.replace(/\s+/g, ' ').trim()
    const a = (await getActiveAgents()).find(x => n(x.full_name) === n(name))
    if (!a) return null
    const photo = agentPhoto(a)
    return { name: a.full_name, title: a.title ?? null, photo: photo ? teamPhotoCopy(photo, 'card') : null, href: `/team/${a.public_id}` }
  } catch { return null }
}

// The pollution and safety indices, from a source that can be trusted (spec
// §7: shown as the law requires; missing means not shown — never invented):
// a manual correction first, then the official registry by the plate (read
// here, on the server, and never passed on), then the main site's own value —
// but not its blank form: it prints 15 and 0 when nothing was entered (an
// electric car as the worst polluter), and an electric car cannot be above 1
async function indicesOf(
  recNo: string,
  ov: { pollution: number | null; safety: number | null } | null,
  detail: Awaited<ReturnType<typeof fetchCarDetail>>,
  fuel: string | null,
): Promise<{ pollution: number | null; safety: number | null }> {
  if (ov && (ov.pollution != null || ov.safety != null)) return { pollution: ov.pollution, safety: ov.safety }
  if (detail?.licensePlate) {
    const g = await fetchGovIndices(detail.name, detail.year, detail.engine, detail.licensePlate).catch(() => null)
    if (g && (g.pollutionGrade != null || g.safetyLevel != null)) return { pollution: g.pollutionGrade, safety: g.safetyLevel }
  }
  let p = detail?.pollutionGrade ?? null, s = detail?.safetyLevel ?? null
  if (p === 15 && s === 0) { p = null; s = null }
  if (p != null && /חשמל/.test(fuel ?? '') && !/בנזין|דיזל/.test(fuel ?? '') && p > 1) p = null
  return { pollution: p, safety: s }
}

export async function getPublicCar(recNo: string): Promise<PublicCar | null> {
  if (!/^\d{1,9}$/.test(recNo)) return null
  const [summary, detail, cdn, videos, ov] = await Promise.all([
    fetchCarSummaryByRecNo(recNo).catch(() => null),
    fetchCarDetail(recNo).catch(() => null),
    getCachedImageUrl(recNo),
    videosOf(recNo),
    overridesOf(recNo),
  ])
  // on the main site's list: the car is for sale. Sold or gone: no public page here yet
  if (!summary) return null
  const sp = detail?.specs ?? {}
  const spec = (...keys: string[]) => { for (const [k, v] of Object.entries(sp)) if (keys.some(key => k.includes(key))) return clean(v); return null }

  const make = clean(spec('יצרן')) ?? summary.name.split(' ')[0]
  const model = clean(spec('דגם')) ?? summary.name.slice(make.length).trim().split(' ')[0] ?? ''
  // the trim: what the full name carries after the make and the model
  let rest = summary.name.trim()
  for (const w of [make, model]) if (w && rest.toLowerCase().startsWith(w.toLowerCase())) rest = rest.slice(w.length).trim()
  const trim = clean(rest)

  const priceN = num(summary.price) || num(spec('המחיר שלנו'))
  const price = priceN ? shekel(priceN) : null
  // the financing table: down payment, "8,018 ₪ x 60", the end-of-term payment
  const [, mStr, monthsStr] = (spec('תשלומים') ?? '').match(/([\d,]+)\s*₪?\s*x\s*(\d+)/) ?? []
  const monthlyN = num(mStr) ?? num(spec('תשלום חודשי'))
  const months = num(monthsStr)
  const finance = price && monthlyN && months
    ? { down: num(spec('מקדמה')) ? shekel(num(spec('מקדמה'))!) : null, monthly: shekel(monthlyN), months,
        balloon: num(spec('תשלום בסוף')) ? shekel(num(spec('תשלום בסוף'))!) : null, note: detail?.financeNote ?? null }
    : null

  // the year of registration: the main site prints it as a number ("2,025")
  const regYear = num(spec('עליה לכביש'))
  const year = regYear && regYear > 1950 && regYear < 2100 ? String(regYear) : clean(summary.year)
  const kmRaw = clean(spec('קילומטראז')) ?? clean(summary.mileage)
  const km = kmRaw ? (/\d/.test(kmRaw) ? (num(kmRaw) ? num(kmRaw)!.toLocaleString('en-US') : 'חדש') : kmRaw) : null
  const handRaw = clean(spec('יד')) ?? clean(summary.yad) ?? clean((HANDS as Record<string, string>)[recNo])
  const hand = handRaw ? (/^\d+$/.test(handRaw) ? handRaw : /חדש/.test(handRaw) ? 'חדש' : null) : null
  const list = num(spec('מחירון'))

  const hero = freshImage(summary.imageUrl, cdn ? { url: cdn.url, source: cdn.source } : null) || null
  const images = Array.from(new Set([hero, ...(detail?.images ?? []).filter(i => i !== summary.imageUrl)].filter(Boolean) as string[]))

  return {
    recNo, slug: carSlug(recNo, summary.name), make, model, trim, name: summary.name.trim(),
    status: summary.status.includes('מלאי') ? 'stock' : 'way',
    price, priceN: priceN || null, finance,
    year, km, hand,
    ownership: clean(spec('בעלות')), engineCc: num(spec('נפח מנוע')) ? num(spec('נפח מנוע'))!.toLocaleString('en-US') : null,
    hp: num(spec('הספק')) ? String(num(spec('הספק'))) : null, fuel: clean(spec('סוג מנוע')), body: clean(spec('סוג רכב')) ?? clean(summary.carType),
    colorExt: clean(spec('צבע חיצוני')), colorInt: clean(spec('צבע פנים')),
    listPrice: list ? shekel(list) : null,
    description: clean(detail?.description),
    hero, images,
    ...(await indicesOf(recNo, ov, detail, clean(spec('סוג מנוע')))),
    videos, agent: await agentOf(detail?.agentName ?? null),
  }
}
