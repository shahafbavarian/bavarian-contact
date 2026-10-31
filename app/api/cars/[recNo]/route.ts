import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getPublicCar } from '@/lib/car-public'

// One car as the public may see it (lib/car-public.ts — nothing private), for
// the car's page opened over the hall. Kept 5 minutes like the page itself,
// and at the CDN, so a car opened again costs nothing
export const revalidate = 300

const SITE = 'https://contact.bavarian-motors.co.il'

export async function GET(_: Request, { params }: { params: { recNo: string } }) {
  const car = await getPublicCar(params.recNo).catch(() => null)
  if (!car) return NextResponse.json({ car: null }, { status: 404, headers: { 'Cache-Control': 'public, s-maxage=60' } })
  const qr = await QRCode.toString(`${SITE}/cars/${car.slug}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).catch(() => '')
  return NextResponse.json({ car, qr }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
