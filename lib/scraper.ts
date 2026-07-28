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
  attrYad:         'data-yad',         // owner hand — verify via /api/admin/car-debug

  // /He/Car?recNo=XXX — car detail page
  detailName:   'h1, .carName, .car-title, [class*="title"] h1',
  detailPrice:  '.price, .carPrice, [class*="price"]',
  specRow:      'tr, .spec-row, .spec-item, [class*="spec"] li, dl dt',
  specVal:      'td, .spec-value, [class*="value"], dl dd',
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
  recNo:          string
  name:           string
  price:          string
  monthlyPrice:   string
  imageUrl:       string
  year:           string
  mileage:        string
  engine:         string
  carType:        string
  status:         string
  yad:            string
  pollutionGrade: number | null
  safetyLevel:    number | null
}

export type CarDetail = CarSummary & {
  color:          string | null
  transmission:   string | null
  bodyType:       string | null
  description:    string | null
  images:         string[]
  sourceUrl:      string
  specs:          Record<string, string>
  pollutionGrade: number | null
  safetyLevel:    number | null
  licensePlate:   string | null
}

function extractIndexValue(html: string, keyword: RegExp, min: number, max: number): number | null {
  const idx = html.search(keyword)
  if (idx < 0) return null
  // Strip HTML tags from the next 500 chars, then find first standalone number in range
  const ctx = html.slice(idx, idx + 500).replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ')
  const m = ctx.match(/\b(\d{1,2})\b/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return (n >= min && n <= max) ? n : null
}

function toAbsolute(src: string): string {
  if (!src || src.startsWith('data:')) return ''
  let url: string
  if (src.startsWith('http://') || src.startsWith('https://')) {
    url = src
  } else {
    try { url = new URL(src, BASE).href } catch { return src }
  }
  // Normalize to www hostname so next/image remotePatterns always match
  try {
    const u = new URL(url)
    if (u.hostname === 'bavarian-motors.co.il') u.hostname = 'www.bavarian-motors.co.il'
    // Strip duplicate leading slashes in path
    u.pathname = u.pathname.replace(/\/\/+/, '/')
    // Strip noisy ?v= cache-busters that vary between requests
    u.search = ''
    return u.href
  } catch {
    return url
  }
}

function formatPrice(raw: string): string {
  const n = parseFloat(raw)
  if (isNaN(n) || n === 0) return ''
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

// The list page is the one genuinely load-bearing scrape: without it there is
// no car. Give it room and one retry — a single transient hiccup must not be
// enough to take a page down. Callers still have to treat it as fallible.
async function fetchCarListHtml(): Promise<string> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE}/He/Available_Cars`, {
        headers: FETCH_HEADERS,
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`fetchCarList: ${res.status}`)
      return await res.text()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

export async function fetchCarList(): Promise<CarSummary[]> {
  const html = await fetchCarListHtml()
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

    // Prefer the actual img[src] (already absolute with correct hostname);
    // fall back to data-img relative path
    const imgSrc  = $el.find('img').first().attr('src') ?? ''
    const imgData = $el.attr(SEL.attrImg) ?? ''
    const imageUrl = toAbsolute(imgSrc || imgData)

    const rawPrice   = $el.attr(SEL.attrPrice) ?? ''
    const price      = rawPrice ? formatPrice(rawPrice) : ''
    const rawMonthly = $el.attr(SEL.attrMonthly) ?? ''
    const monthlyNum = parseFloat(rawMonthly)
    const monthlyPrice = (!isNaN(monthlyNum) && monthlyNum > 0)
      ? 'החל מ-' + monthlyNum.toLocaleString('he-IL') + ' ₪/חודש'
      : ''

    cars.push({
      recNo,
      name,
      price,
      monthlyPrice,
      imageUrl,
      year:           $el.attr(SEL.attrRegisterDt) ?? '',
      mileage:        $el.attr(SEL.attrKm) ?? '',
      engine:         $el.attr(SEL.attrEngineType) ?? '',
      carType:        $el.attr(SEL.attrCarType) ?? '',
      status:         $el.attr(SEL.attrStatus) ?? '',
      yad:            $el.attr('data-yad') ?? '',
      pollutionGrade: null,  // enriched via fetchCarDetail in /api/cars
      safetyLevel:    null,  // enriched via fetchCarDetail in /api/cars
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

// Optional data by contract — every caller already treats null as "no extra
// detail available". It must therefore never reject: a thrown timeout here used
// to reject the car page's Promise.all and replace the entire page with an
// error screen over a field that is not required to render it.
export async function fetchCarDetail(recNo: string): Promise<CarDetail | null> {
  try {
    return await fetchCarDetailInner(recNo)
  } catch {
    return null
  }
}

async function fetchCarDetailInner(recNo: string): Promise<CarDetail | null> {
  const sourceUrl = `${BASE}/He/Car?recNo=${recNo}`
  const res = await fetch(sourceUrl, {
    headers: FETCH_HEADERS,
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const html = await res.text()

  // Guard against gateway error pages (200 status but HTML error body)
  if (html.length < 800) return null

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
  // Confirmed structure: <tr><th>key1</th><td>val1</td><th>key2</th><td>val2</td></tr>
  const specs: Record<string, string> = {}
  $(SEL.specRow).each((_, row) => {
    const $row = $(row)
    const ths = $row.children('th')
    const tds = $row.children('td')

    if (ths.length >= 1 && tds.length >= 1) {
      // Handle 1 or 2 key-value pairs per row
      for (let i = 0; i < Math.min(ths.length, tds.length); i++) {
        const key = ths.eq(i).text().trim()
        const val = tds.eq(i).text().trim()
        if (key && val) specs[key] = val
      }
      return
    }
    // <tr><td>key</td><td>val</td></tr> fallback
    if (tds.length >= 2) {
      const key = tds.eq(0).text().trim()
      const val = tds.eq(1).text().trim()
      if (key && val) specs[key] = val
      return
    }
    // <dl><dt>key</dt><dd>val</dd></dl>
    if ($row.is('dt')) {
      const key = $row.text().trim()
      const val = $row.next('dd').text().trim()
      if (key && val) specs[key] = val
      return
    }
    // Generic .spec-row / .spec-item with .spec-value child
    const valEl = $row.find('.spec-value, [class*="value"]').first()
    if (valEl.length) {
      const key = $row.clone().find('.spec-value, [class*="value"]').remove().end().text().trim()
      const val = valEl.text().trim()
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
    yad:          findSpec('יד') ?? '',
    color:        findSpec('צבע', 'color'),
    transmission: findSpec('תיבת', 'הילוכים', 'גיר', 'transmission'),
    bodyType:     findSpec('סוג', 'גוף', 'body'),
    description,
    images,
    sourceUrl,
    specs,
    licensePlate: (() => {
      const raw = findSpec('מספר רכב', 'לוחית', 'רישוי')
      if (!raw) return null
      // normalise: keep only digits and dashes, strip spaces
      const cleaned = raw.replace(/[^\d-]/g, '').replace(/^-+|-+$/g, '')
      return cleaned.length >= 5 ? cleaned : null
    })(),
    // Try spec table first, then HTML regex (these appear in a separate section below the main table)
    pollutionGrade: (() => {
      const s = findSpec('דרגת זיהום', 'זיהום אוויר')
      if (s) { const n = parseInt(s, 10); if (!isNaN(n) && n >= 1 && n <= 15) return n }
      return extractIndexValue(html, /דרגת\s*זיהום/i, 1, 15)
    })(),
    safetyLevel: (() => {
      const s = findSpec('דרגת אבזור', 'רמת אבזור', 'אבזור בטיחות')
      if (s) { const n = parseInt(s, 10); if (!isNaN(n) && n >= 0 && n <= 8) return n }
      return extractIndexValue(html, /(?:דרגת|רמת)\s*אבזור/i, 0, 8)
    })(),
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
