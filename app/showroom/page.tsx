import { fetchCarList } from '@/lib/scraper'
import { getCachedImageUrls, freshImage } from '@/lib/image-sync'
import { INSTAGRAM_URL } from '@/lib/agent-format'
import Showroom from './Showroom'
import { HISTORY } from './history'
import type { Card } from './scene'

export const revalidate = 300

// w=828&q=85 is exactly the variant the cars grid makes on a phone (its
// <Image quality={85}> with ~100vw sizes), so every car reuses the one
// transformation already cached — never a second variant per car
const img = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=828&q=85`
// The new portraits committed under /public/team
const PORTRAITS = ['257080', '257075', '257076', '257077', '258775', '259104', '260394', '281088'].map(n => `/team/${n}.jpg`)

// The gallery is the inventory: one card per car, in stock and on the way as
// one list, shuffled afresh on every visit (client side). The caption carries
// the car's own details: the maker large, the rest below
// the kilometres as the cars page shows them: a number, or new
const km = (mileage?: string) => {
  if (!mileage) return ''
  const n = parseInt(mileage.replace(/[^\d]/g, ''), 10)
  return !isNaN(n) && n > 0 ? n.toLocaleString('en-US') : 'חדש'
}

export default async function ShowroomPage() {
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
        make, model, year: c.year ?? '', price: c.price ?? '', stock, km: km(c.mileage), yad: c.yad || '',
      }
    })
  } catch {}
  // no stock reachable: one quiet card that still leads somewhere
  if (!cards.length) cards = [{ title: 'הרכבים שלנו', sub: '', href: '/cars', images: [] }]
  // the street gallery: history photos on the big screens outside
  const street: Card[] = HISTORY.map(src => ({ title: '', sub: '', href: '/cars', images: [src] }))
  return <Showroom cards={cards} street={street} />
}
