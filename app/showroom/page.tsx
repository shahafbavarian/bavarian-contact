import { fetchCarList } from '@/lib/scraper'
import { getCachedImageUrls } from '@/lib/image-sync'
import { INSTAGRAM_URL } from '@/lib/agent-format'
import Showroom from './Showroom'
import type { Card } from './scene'

export const revalidate = 300

const img = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=828&q=78`
// The new portraits committed under /public/team
const PORTRAITS = ['257080', '257075', '257076', '257077', '258775', '259104', '260394', '281088'].map(n => `/team/${n}.jpg`)

// The floating gallery is the site's menu: each card is a real destination.
// The gallery is the inventory: one card per car, in stock and on the way as
// one list, in a random order. The caption carries the car's own details
export default async function ShowroomPage() {
  let cards: Card[] = []
  try {
    const [list, cdn] = await Promise.all([fetchCarList(), getCachedImageUrls()])
    const cars = list.map(c => (cdn[c.recNo] ? { ...c, imageUrl: cdn[c.recNo] } : c)).filter(c => c.imageUrl)
    // in a random order, reshuffled with every refresh of the page's data
    for (let i = cars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cars[i], cars[j]] = [cars[j], cars[i]] }
    // in a random order, reshuffled with every refresh of the page's data
    for (let i = cars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cars[i], cars[j]] = [cars[j], cars[i]] }
    cards = cars.map(c => ({
      title: c.name,
      sub: [c.year, c.price, c.status.includes('מלאי') ? 'במלאי' : 'בדרך לארץ'].filter(Boolean).join(' · '),
      href: `/car/${c.recNo}`,
      images: [img(c.imageUrl)],
    }))
  } catch {}
  // no stock reachable: one quiet card that still leads somewhere
  if (!cards.length) cards = [{ title: 'הרכבים שלנו', sub: '', href: '/cars', images: [] }]
  return <Showroom cards={cards} />
}
