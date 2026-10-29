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
export default async function ShowroomPage() {
  let stock = 0, away = 0, stockImgs: string[] = [], awayImg = ''
  try {
    const [list, cdn] = await Promise.all([fetchCarList(), getCachedImageUrls()])
    const cars = list.map(c => (cdn[c.recNo] ? { ...c, imageUrl: cdn[c.recNo] } : c)).filter(c => c.imageUrl)
    const inHall = cars.filter(c => c.status.includes('מלאי')), onWay = cars.filter(c => !c.status.includes('מלאי'))
    stock = inHall.length; away = onWay.length
    stockImgs = inHall.slice(0, 8).map(c => c.imageUrl!)
    awayImg = onWay[0]?.imageUrl ?? ''
  } catch {}

  const cards: Card[] = [
    // several cars: the front screen plays them as a reel outside and a grid inside
    { title: 'הרכבים במלאי', sub: stock ? `${stock} רכבים באולם` : 'כל הרכבים', href: '/cars', images: stockImgs.map(img) },
    { title: 'בדרך לארץ', sub: away ? `${away} רכבים` : 'רכבים בדרך', href: '/cars', images: awayImg ? [img(awayImg)] : [] },
    { title: 'הצוות', sub: 'האנשים שלנו', href: '/team', images: PORTRAITS },
    { title: 'וואטסאפ', sub: 'שיחה עם האולם', href: 'https://wa.me/97299561906', external: true, images: [] },
    { title: 'אינסטגרם', sub: '@bavarianmotors', href: INSTAGRAM_URL, external: true, images: [] },
  ]
  return <Showroom cards={cards} />
}
