import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import QRCode from 'qrcode'
import { getPublicCar, recNoOfSlug, type PublicCar } from '@/lib/car-public'
import CarView from './CarView'
import './car.css'

// The car's own page (docs/CAR_PAGE_SPEC.md): /cars/<number>-<make>-<model>.
// The number is the lookup; the words are for people (and a light hint for
// search). An address whose words are out of date moves to the right one.
// Rendered on a car's first visit and kept 5 minutes, like the hall
export const revalidate = 300
// no car is built ahead; each is rendered on its first visit and cached (the
// listing's status — a 404, a move to its full address — is then a real one)
export const dynamicParams = true
export function generateStaticParams() { return [] as { slug: string }[] }

const SITE = 'https://contact.bavarian-motors.co.il'
const urlOf = (car: PublicCar) => `${SITE}/cars/${car.slug}`

async function load(slug: string) {
  const recNo = recNoOfSlug(slug)
  return recNo ? getPublicCar(recNo) : null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const car = await load(params.slug).catch(() => null)
  // decided here, before the page streams: a real 404 and a real 308 for
  // search (in the page body they arrived as a 200 with a client-side hop)
  if (!car) notFound()
  if (params.slug !== car.slug) permanentRedirect(`/cars/${car.slug}`)
  const title = [car.make, car.model, car.trim, car.year].filter(Boolean).join(' ')
  const facts = [car.year && `שנת ${car.year}`, car.km && (/\d/.test(car.km) ? `${car.km} ק״מ` : car.km), car.hand && (car.hand === 'חדש' ? 'יד חדשה' : `יד ${car.hand}`), car.price].filter(Boolean).join(' · ')
  return {
    title: `${title} | בוואריאן מוטורס`,
    description: `${car.name} — ${facts}. ${car.status === 'stock' ? 'במלאי' : 'בדרך לארץ'} בבוואריאן מוטורס.`,
    alternates: { canonical: urlOf(car) },
    openGraph: { title, url: urlOf(car), images: car.hero ? [{ url: car.hero }] : [], locale: 'he_IL', type: 'website' },
    // not in the index until the new pages replace the old ones (the same
    // cars live at /car/<number> today — one page per car in the index)
    robots: { index: false, follow: true },
  }
}

// Structured data for the car (schema.org Car with its offer): what the page
// shows, and nothing private (spec §11)
function jsonLd(car: PublicCar) {
  const url = urlOf(car)
  const n = (s: string | null) => (s ? Number(s.replace(/[^\d]/g, '')) || undefined : undefined)
  return [
    {
      '@context': 'https://schema.org', '@type': 'Car', url,
      name: car.name, brand: { '@type': 'Brand', name: car.make }, model: car.model,
      vehicleConfiguration: car.trim ?? undefined, vehicleModelDate: car.year ?? undefined,
      mileageFromOdometer: n(car.km) ? { '@type': 'QuantitativeValue', value: n(car.km), unitCode: 'KMT' } : undefined,
      fuelType: car.fuel ?? undefined, bodyType: car.body ?? undefined, color: car.colorExt ?? undefined,
      vehicleInteriorColor: car.colorInt ?? undefined,
      vehicleEngine: car.hp || car.engineCc ? { '@type': 'EngineSpecification',
        enginePower: car.hp ? { '@type': 'QuantitativeValue', value: Number(car.hp), unitCode: 'BHP' } : undefined,
        engineDisplacement: n(car.engineCc) ? { '@type': 'QuantitativeValue', value: n(car.engineCc), unitCode: 'CMQ' } : undefined } : undefined,
      itemCondition: car.hand === 'חדש' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      image: car.images.slice(0, 6),
      offers: car.priceN ? { '@type': 'Offer', url, price: car.priceN, priceCurrency: 'ILS',
        availability: car.status === 'stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        seller: { '@type': 'AutoDealer', name: 'בוואריאן מוטורס', telephone: '+972-9-9561906' } } : undefined,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'בוואריאן מוטורס', item: `${SITE}/showroom` },
        { '@type': 'ListItem', position: 2, name: 'מלאי רכבים', item: `${SITE}/showroom/cars` },
        { '@type': 'ListItem', position: 3, name: car.name, item: url },
      ],
    },
  ]
}

export default async function CarPage({ params }: { params: { slug: string } }) {
  const car = await load(params.slug)
  if (!car) notFound()
  if (params.slug !== car.slug) permanentRedirect(`/cars/${car.slug}`)
  const qr = await QRCode.toString(urlOf(car), { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).catch(() => '')
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(car)).replace(/</g, '\\u003c') }} />
      <CarView car={car} url={urlOf(car)} qr={qr} />
    </>
  )
}
