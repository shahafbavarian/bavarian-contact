import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

const BASE = 'https://www.bavarian-motors.co.il'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9',
}

async function analyzeHtml(url: string) {
  const res = await fetch(url, { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  // All script src URLs — might reveal API endpoints
  const scripts: string[] = []
  $('script[src]').each((_, el) => { scripts.push($(el).attr('src') ?? '') })

  // Inline scripts — look for fetch/ajax/api patterns
  const inlineScripts: string[] = []
  $('script:not([src])').each((_, el) => {
    const code = $(el).html() ?? ''
    if (code.includes('recNo') || code.includes('api') || code.includes('ajax') || code.includes('fetch') || code.includes('Available') || code.includes('vehicle') || code.includes('car')) {
      inlineScripts.push(code.slice(0, 2000))
    }
  })

  // Search for recNo occurrences in full HTML
  const recNoMatches: string[] = []
  const recNoRe = /recNo[=:"'\s]+(\d+)/gi
  let m: RegExpExecArray | null
  while ((m = recNoRe.exec(html)) !== null && recNoMatches.length < 20) recNoMatches.push(m[0])

  // Search for any API-like URLs
  const apiUrls: string[] = []
  const apiRe = /["'](\/[^"']*(?:api|json|data|cars|vehicle|Available)[^"']*)/gi
  while ((m = apiRe.exec(html)) !== null && apiUrls.length < 20) apiUrls.push(m[1])

  // All class names on divs/sections that might be car containers
  const containerClasses: string[] = []
  $('div[class], section[class], article[class], li[class], a[class]').each((_, el) => {
    const cls = $(el).attr('class') ?? ''
    if (cls.includes('car') || cls.includes('vehicle') || cls.includes('item') || cls.includes('card') || cls.includes('listing') || cls.includes('product')) {
      if (!containerClasses.includes(cls)) containerClasses.push(cls)
    }
  })

  // First 2000 chars of body (after head)
  const bodyStart = html.indexOf('<body')
  const bodyHtml = bodyStart >= 0 ? html.slice(bodyStart, bodyStart + 3000) : ''

  // Last 3000 chars of HTML (often where data/scripts are)
  const htmlEnd = html.slice(-3000)

  return {
    url,
    statusCode: res.status,
    totalLength: html.length,
    bodyStart: bodyHtml,
    htmlEnd,
    scripts,
    inlineScripts,
    recNoMatches,
    apiUrls,
    containerClasses: containerClasses.slice(0, 30),
  }
}

export async function GET() {
  try {
    const [listResult, carResult] = await Promise.allSettled([
      analyzeHtml(`${BASE}/He/Available_Cars`),
      analyzeHtml(`${BASE}/He/Car?recNo=1210`),
    ])

    return NextResponse.json(
      {
        list: listResult.status === 'fulfilled' ? listResult.value : String((listResult as PromiseRejectedResult).reason),
        car: carResult.status === 'fulfilled' ? carResult.value : String((carResult as PromiseRejectedResult).reason),
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
