import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

const BASE = 'https://www.bavarian-motors.co.il'

// ─── SELECTORS ─────────────────────────────────────────────────────────────
// Confirmed from /api/admin/scrape-debug analysis of live HTML
const SEL = {
  // /He/Available_Cars
  carItem:    '.carBtn',

  // data-* attrs on .carBtn (all confirmed from live HTML)
  attrRecNo:       'data-prev_recno',
  attrManufacturer:'data-manufacturer',
  attrModel:       'data-model',
  attrTitle:       'data-title',       // trim of variant/edition
  attrImg:         'data-img',
  attrRegisterDt:  'data-register_dt', // "4/2024"
  attrKm:          'data-km',
  attrPrice:       'data-our_price',   // "628000.00"
  attrCarType:     'data-car_type',
  attrEngineType:  'data-engine_type',
  attrStatus:      'data-car_status',  // "במלאי"
  attrMonthly:     'data-funding_monthly_price',

  // /He/Car?recNo=XXX — car detail page
  detailName:   'h1, .carName, .car-title, [class*="title"] h1',
  detailPrice:  '.price, .carPrice, [class*="price"]',
  specRow:      'tr, .spec-row, .spec-item, [class*="spec"] li, dl dt',
  specVal:      'td:last-child, .spec-value, [class*="value"], dl dd',
  // Gallery: confirmed class prefix from live HTML
  gallery:      '.carSlider img, .slick-slide img, [class*="carSlider"] img, .gallery img, [class*="photo"] img',
  description:  '.description, [class*="description"] p, .about p, .carDesc',
  soldIndicator:'.sold, [class*="sold"], .not-available',
}
// ───────────────────────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
}

export type CarSummary = {
  recNo:        string
  name:         string
  price:        string
  monthlyPrice: string
  imageUrl:     string
  year:         string
  mileage:      string
  engine:       string
  carType:      string
  status:       string
}

export type CarDetail = CarSummary & {
  color:        string | null
  transmission: string | null
  bodyType:     string | null
  description:  string | null
  images:       string[]
  sourceUrl:    string
  specs:        Record<string, string>
}

function toAbsolute(src: string): string {
  if (!src || src.startsWith('data:')) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  try {
    return new URL(src, BASE).href
  } catch {
    return src
  }
}

function formatPrice(raw: string): string {
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  return n.toLocaleString('he-IL') + ' ₪'
}

function buildName(el: cheerio.Cheerio<AnyNode>): string {
  const manufacturer = el.attr(SEL.attrManufacturer) ?? ''
  const model        = el.attr(SEL.attrModel) ?? ''
  const title        = el.attr(SEL.attrTitle) ?? ''
  const parts = [manufacturer, model, title].map(s => s.trim()).filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  // Fallback: h5 child text (confirmed from live HTML)
  return el.find('h5').first().text().trim()
}

export async function fetchCarList(): Promise<CarSummary[]> {
  const res = await fetch(`${BASE}/He/Available_Cars`, { headers: FETCH_HEADERS, next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`fetchCarList: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const cars: CarSummary[] = []

  $(SEL.carItem).each((_, el) => {
    const $el = $(el)

    // recNo: prefer data-prev_recno, fallback to href query param
    let recNo = $el.attr(SEL.attrRecNo) ?? ''
    if (!recNo) {
      const href = $el.attr('href') ?? ''
      const m = href.match(/[?&]recNo=(\d+)/i)
      if (m) recNo = m[1]
    }
    if (!recNo) return

    const name = buildName($el)
    if (!name) return

    // Image: data-img is relative path, img[src] may already be absolute
    const imgData = $el.attr(SEL.attrImg) ?? ''
    const imgSrc  = $el.find('img').first().attr('src') ?? ''
    const imageUrl = toAbsolute(imgData || imgSrc)

    const rawPrice   = $el.attr(SEL.attrPrice) ?? ''
    const price      = rawPrice ? formatPrice(rawPrice) : ''
    const rawMonthly = $el.attr(SEL.attrMonthly) ?? ''
    const monthlyPrice = rawMonthly ? rawMonthly.replace(/[^\d,]/g, '') + ' ₪/חודש' : ''

    cars.push({
      recNo,
      name,
      price,
      monthlyPrice,
      imageUrl,
      year:    $el.attr(SEL.attrRegisterDt) ?? '',
      mileage: $el.attr(SEL.attrKm) ?? '',
      engine:  $el.attr(SEL.attrEngineType) ?? '',
      carType: $el.attr(SEL.attrCarType) ?? '',
      status:  $el.attr(SEL.attrStatus) ?? '',
    })
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

  // Check if sold / not found
  if ($(SEL.soldIndicator).length > 0) return null

  // If the detail page returns an error page, inline script often contains currPage:'err404'
  if (html.includes("currPage: 'err404'") || html.includes('currPage:"err404"')) return null

  const name = $(SEL.detailName).first().text().trim()
  if (!name) return null

  const price = $(SEL.detailPrice).first().text().trim()

  // Gallery images
  const images: string[] = []
  $(SEL.gallery).each((_, img) => {
    const src = $(img).attr('src') ?? $(img).attr('data-src') ?? $(img).attr('data-lazy') ?? ''
    if (!src || src.includes('spinner') || src.includes('placeholder') || src.includes('loading')) return
    const abs = toAbsolute(src)
    if (abs && !images.includes(abs)) images.push(abs)
  })

  // Collect specs as key→value pairs from table rows
  const specs: Record<string, string> = {}
  $(SEL.specRow).each((_, row) => {
    const cells = $(row).find(SEL.specVal)
    if (cells.length >= 2) {
      const key = cells.eq(0).text().trim()
      const val = cells.eq(1).text().trim()
      if (key && val) specs[key] = val
    } else {
      const key = $(row).text().trim()
      const val = $(row).next().text().trim()
      if (key && val) specs[key] = val
    }
  })

  const description = $(SEL.description).first().text().trim() || null

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
    monthlyPrice: '',
    imageUrl: images[0] ?? '',
    year:         findSpec('שנה', 'year', 'שנת') ?? '',
    mileage:      findSpec('ק"מ', 'קילומטר', 'mileage', 'km') ?? '',
    engine:       findSpec('מנוע', 'engine', 'נפח') ?? '',
    carType:      findSpec('סוג', 'גוף', 'body') ?? '',
    status:       '',
    color:        findSpec('צבע', 'color'),
    transmission: findSpec('תיבת', 'הילוכים', 'גיר', 'transmission'),
    bodyType:     findSpec('סוג', 'גוף', 'body'),
    description,
    images,
    sourceUrl,
    specs,
  }
}

/**
 * Fetch car summary from the list page by recNo.
 * More reliable than detail page for structured fields (uses data-* attrs).
 */
export async function fetchCarSummaryByRecNo(recNo: string): Promise<CarSummary | null> {
  const list = await fetchCarList()
  return list.find(c => c.recNo === recNo) ?? null
}

export async function fetchRawHtml(): Promise<{ listUrl: string; listHtml: string; sampleCarUrl: string; sampleCarHtml: string }> {
  const listUrl = `${BASE}/He/Available_Cars`
  const sampleCarUrl = `${BASE}/He/Car?recNo=3159`

  const [listRes, carRes] = await Promise.allSettled([
    fetch(listUrl, { headers: FETCH_HEADERS }),
    fetch(sampleCarUrl, { headers: FETCH_HEADERS }),
  ])

  const listHtml = listRes.status === 'fulfilled' ? (await listRes.value.text()).slice(0, 8000) : `ERROR: ${(listRes as PromiseRejectedResult).reason}`
  const sampleCarHtml = carRes.status === 'fulfilled' ? (await carRes.value.text()).slice(0, 8000) : `ERROR: ${(carRes as PromiseRejectedResult).reason}`

  return { listUrl, listHtml, sampleCarUrl, sampleCarHtml }
}
