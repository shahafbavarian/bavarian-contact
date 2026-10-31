import { fetchCarList } from '@/lib/scraper'
import { getCachedImageUrls, freshImage } from '@/lib/image-sync'
import { notFound } from 'next/navigation'
import { getActiveAgents } from '@/lib/agents'
import { agentPhoto, teamPhotoCopy } from '@/lib/team-photos'
import Showroom from '../Showroom'
import { HISTORY } from '../history'
// The owner's hand ("יד") for the MOCK site: a one-off snapshot taken from
// each car's own page (the list does not carry it) — read at build time, no
// request at run time. The real site will take it from its live data source
import HANDS from '../hands.json'
const handOf = (recNo: string) => { const h = (HANDS as Record<string, string>)[recNo] ?? ''; return /^\d+$/.test(h) ? h : '' }
// and the same kind of snapshot of the specs the list lacks, for the advanced
// filter: horsepower ("הספק") and electric range ("טווח נסיעה חשמלי")
import EXTRAS from '../extras.json'
const extra = (recNo: string) => (EXTRAS as Record<string, { hp?: number; ev?: number }>)[recNo] ?? {}
import type { Card } from '../scene'

export const revalidate = 300

// w=828&q=85 is exactly the variant the cars grid makes on a phone (its
// <Image quality={85}> with ~100vw sizes), so every car reuses the one
// transformation already cached — never a second variant per car
const img = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=828&q=85`
// The team's faces are drawn ahead for every visitor (so the walk to them never
// stutters): the committed portraits come as static 768px copies — no image
// transformation, no optimizer cache read, no Supabase egress per visit. Only
// a photo without a committed copy goes through the optimizer
const teamImg = (url: string) => (url.startsWith('/team/') ? url.replace('/team/', '/team/card/') : img(url))

// The gallery is the inventory: one card per car, in stock and on the way as
// one list, shuffled afresh on every visit (client side). The caption carries
// the car's own details: the maker large, the rest below
// the kilometres as the cars page shows them: a number, or new
const km = (mileage?: string) => {
  if (!mileage) return ''
  const n = parseInt(mileage.replace(/[^\d]/g, ''), 10)
  return !isNaN(n) && n > 0 ? n.toLocaleString('en-US') : 'חדש'
}

// One page for every place in the hall, each with its own address: the street
// (/showroom), all the cars inside (/showroom/cars) and the team inside
// (/showroom/team). The page is the same; the hall reads the address
const VIEWS = ['cars', 'team']
// all three are built ahead and served from the CDN, refreshed every 5 minutes
// like the one page was — never rendered per visit
export const dynamicParams = false
export function generateStaticParams() {
  return [{ view: [] as string[] }, ...VIEWS.map(v => ({ view: [v] }))]
}

export default async function ShowroomPage({ params }: { params: { view?: string[] } }) {
  const v = params.view
  if (v && (v.length !== 1 || !VIEWS.includes(v[0]))) notFound()
  let cards: Card[] = []
  try {
    const [list, cdn] = await Promise.all([fetchCarList(), getCachedImageUrls()])
    const cars = list.map(c => ({ ...c, imageUrl: freshImage(c.imageUrl, cdn[c.recNo]) })).filter(c => c.imageUrl)
    // title: the maker; everything else moves to the line below
    const TWO = ['Land', 'Alfa', 'Aston', 'Rolls', 'לנד', 'אלפא', 'אסטון', 'רולס']
    cards = cars.map(c => {
      const words = c.name.trim().split(/\s+/)
      const cut = TWO.includes(words[0]) ? 2 : 1
      const make = words.slice(0, cut).join(' '), model = words.slice(cut).join(' ')
      const stock = c.status.includes('מלאי')
      return {
        title: make,
        sub: [model, c.year, c.price, stock ? 'במלאי' : 'בדרך לארץ'].filter(Boolean).join(' · '),
        href: `/car/${c.recNo}`,
        images: [img(c.imageUrl)],
        make, model, year: c.year ?? '', price: c.price ?? '', stock, km: km(c.mileage), yad: c.yad || handOf(c.recNo),
        fuel: c.engine || '', body: c.carType || '', monthly: parseInt((c.monthlyPrice || '').replace(/\D/g, ''), 10) || 0, rec: parseInt(c.recNo, 10) || 0,
        hp: extra(c.recNo).hp ?? 0, ev: extra(c.recNo).ev ?? 0,
      }
    })
  } catch {}
  // no stock reachable: one quiet card that still leads somewhere
  if (!cards.length) cards = [{ title: 'הרכבים שלנו', sub: '', href: '/cars', images: [] }]
  // the team: the same hall, the same cards, one per person — name, role and
  // photo only (phone numbers never reach this page), opening their own page
  let team: Card[] = []
  try {
    team = (await getActiveAgents()).map(a => {
      const photo = agentPhoto(a)
      return { title: a.full_name, sub: a.title ?? '', href: `/team/${a.public_id}`, images: photo ? [teamImg(photo)] : [], hero: photo ? teamPhotoCopy(photo, 'hero') : undefined, person: true }
    })
  } catch {}
  // the street gallery: history photos on the big screens outside
  const street: Card[] = HISTORY.map(src => ({ title: '', sub: '', href: '/cars', images: [src] }))
  return <Showroom cards={cards} team={team} street={street} start={v?.[0] === 'team' ? 'team' : 'cars'} />
}
