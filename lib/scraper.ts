import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

const BASE = 'https://www.bavarian-motors.co.il'

// ─── SELECTORS ─────────────────────────────────────────────────────────────
// Confirmed from /api/admin/scrape-debug analysis
const SEL = {
  // /He/Available_Cars — confirmed class from live HTML
  carItem:    '.carBtn',
  recNoAttr:  'data-recno',
  recNoHref:  /[?&]recNo=(\d+)/i,
  carName:    '.carName, .car-name, .title, h2, h3, [class*="name"], [class*="title"], strong',
  carPrice:   '.price, .carPrice, .car-price, [class*="price"]',
  carImg:     'img',

  // /He/Car?recNo=XXX — update after seeing car HTML
  detailName:   'h1, .carName, .car-title, [class*="title"] h1',
  detailPrice:  '.price, .carPrice, [class*="price"]',
  specRow:      'tr, .spec-row, .spec-item, [class*="spec"] li, dl dt',
  specVal:      'td:last-child, .spec-value, [class*="value"], dl dd',
  gallery:      '.fancybox, [data-fancybox] img, .gallery img, .slick-slide img, [class*="photo"] img, [class*="gallery"] img',
  description:  '.description, [class*="description"] p, .about p, .carDesc',
  soldIndicator: '.sold, [class*="sold"], .not-available',
}
// ───────────────────────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
}

export type CarSummary = {
  recNo: string
  name: string
  price: string
  imageUrl: string
}

export type CarDetail = CarSummary & {
  year: string | null
  mileage: string | null
  engine: string | null
  color: string | null
  transmission: string | null
  bodyType: string | null
  description: string | null
  images: string[]
  sourceUrl: string
  specs: Record<string, string>
}

function toAbsolute(src: string): string {
  if (!src || src.startsWith('data:')) return ''
  try {
    return new URL(src, BASE).href
  } catch {
    return src
  }
}

function extractRecNo(el: AnyNode, $: cheerio.CheerioAPI): string | null {
  const recnoAttr = $(el).attr(SEL.recNoAttr) ?? $(el).find(`[${SEL.recNoAttr}]`).first().attr(SEL.recNoAttr)
  if (recnoAttr) return recnoAttr

  // Try href of the element or its child links
  const href = $(el).attr('href') ?? $(el).find('a[href*="recNo"]').first().attr('href') ?? ''
  const match = href.match(SEL.recNoHref)
  if (match) return match[1]

  return null
}

export async function fetchCarList(): Promise<CarSummary[]> {
  const res = await fetch(`${BASE}/He/Available_Cars`, { headers: FETCH_HEADERS, next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`fetchCarList: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const cars: CarSummary[] = []

  $(SEL.carItem).each((_, el) => {
    const recNo = extractRecNo(el, $)
    if (!recNo) return

    const name = $(el).find(SEL.carName).first().text().trim() || $(el).attr('title') || ''
    const price = $(el).find(SEL.carPrice).first().text().trim()
    const imgSrc = $(el).find(SEL.carImg).first().attr('src') ?? $(el).find(SEL.carImg).first().attr('data-src') ?? ''
    const imageUrl = toAbsolute(imgSrc)

    if (recNo && name) {
      cars.push({ recNo, name, price, imageUrl })
    }
  })

  // Deduplicate by recNo
  const seen = new Set<string>()
  return cars.filter(c => {
    if (seen.has(c.recNo)) return false
    seen.add(c.recNo)
    return true
  })
}

export async function fetchCarDetail(recNo: string): Promise<CarDetail | null> {
  const sourceUrl = `${BASE}/He/Car?recNo=${recNo}`
  const res = await fetch(sourceUrl, {
    headers: FETCH_HEADERS,
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  const html = await res.text()
  const $ = cheerio.load(html)

  // Check if sold
  if ($(SEL.soldIndicator).length > 0) return null

  const name = $(SEL.detailName).first().text().trim()
  if (!name) return null

  const price = $(SEL.detailPrice).first().text().trim()

  // Collect all images
  const images: string[] = []
  $(SEL.gallery).each((_, img) => {
    const src = $(img).attr('src') ?? $(img).attr('data-src') ?? $(img).attr('data-lazy') ?? ''
    const abs = toAbsolute(src)
    if (abs && !images.includes(abs)) images.push(abs)
  })

  // Collect specs as key→value pairs
  const specs: Record<string, string> = {}
  $(SEL.specRow).each((_, row) => {
    const cells = $(row).find(SEL.specVal)
    if (cells.length >= 2) {
      const key = cells.eq(0).text().trim()
      const val = cells.eq(1).text().trim()
      if (key && val) specs[key] = val
    } else {
      // dt/dd style — key is the row itself, value is next sibling
      const key = $(row).text().trim()
      const val = $(row).next().text().trim()
      if (key && val) specs[key] = val
    }
  })

  const description = $(SEL.description).first().text().trim() || null

  // Pull common fields from specs map
  const findSpec = (...keys: string[]) => {
    for (const k of Object.keys(specs)) {
      if (keys.some(key => k.includes(key))) return specs[k]
    }
    return null
  }

  return {
    recNo,
    name,
    price,
    imageUrl: images[0] ?? '',
    year: findSpec('שנה', 'year', 'שנת'),
    mileage: findSpec('ק"מ', 'קילומטר', 'mileage', 'km'),
    engine: findSpec('מנוע', 'engine', 'נפח'),
    color: findSpec('צבע', 'color'),
    transmission: findSpec('תיבת', 'הילוכים', 'גיר', 'transmission'),
    bodyType: findSpec('סוג', 'גוף', 'body'),
    description,
    images,
    sourceUrl,
    specs,
  }
}

export async function fetchRawHtml(): Promise<{ listUrl: string; listHtml: string; sampleCarUrl: string; sampleCarHtml: string }> {
  const listUrl = `${BASE}/He/Available_Cars`
  const sampleCarUrl = `${BASE}/He/Car?recNo=1258`

  const [listRes, carRes] = await Promise.allSettled([
    fetch(listUrl, { headers: FETCH_HEADERS }),
    fetch(sampleCarUrl, { headers: FETCH_HEADERS }),
  ])

  const listHtml = listRes.status === 'fulfilled' ? (await listRes.value.text()).slice(0, 8000) : `ERROR: ${(listRes as PromiseRejectedResult).reason}`
  const sampleCarHtml = carRes.status === 'fulfilled' ? (await carRes.value.text()).slice(0, 8000) : `ERROR: ${(carRes as PromiseRejectedResult).reason}`

  return { listUrl, listHtml, sampleCarUrl, sampleCarHtml }
}
