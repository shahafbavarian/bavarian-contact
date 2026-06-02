import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
}

export async function GET(req: NextRequest) {
  const recNo = req.nextUrl.searchParams.get('recNo') ?? '3159'
  const url = `https://www.bavarian-motors.co.il/He/Car?recNo=${recNo}`

  const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
  const html = await res.text()
  const $ = cheerio.load(html)

  // ── 1. Raw HTML around Hebrew spec keywords ─────────────────────────────
  const hebrewKeywords = ['נפח', 'הספק', 'יד', 'בעלות', 'מחיר', 'קילומטר', 'מועד', 'צבע', 'סוג']
  const contextSnippets: Record<string, string> = {}
  for (const kw of hebrewKeywords) {
    const idx = html.indexOf(kw)
    if (idx >= 0) {
      contextSnippets[kw] = html.slice(Math.max(0, idx - 150), idx + 250)
    }
  }

  // ── 2. Every <table> on the page ────────────────────────────────────────
  const tables: Array<{ outerHtml: string; rows: string[] }> = []
  $('table').each((_, tbl) => {
    const rows: string[] = []
    $(tbl).find('tr').each((_, tr) => {
      rows.push($(tr).toString())
    })
    if (tables.length < 5) tables.push({ outerHtml: $(tbl).toString().slice(0, 2000), rows: rows.slice(0, 20) })
  })

  // ── 3. Every <dl> on the page ───────────────────────────────────────────
  const dls: string[] = []
  $('dl').each((_, el) => { dls.push($(el).toString().slice(0, 1000)) })

  // ── 4. Elements whose class contains "spec", "detail", "info", "car" ────
  const classMatches: Array<{ tag: string; cls: string; html: string }> = []
  $('[class]').each((_, el) => {
    const cls = $(el).attr('class') ?? ''
    if (/spec|detail|info|prop|feature|attr/i.test(cls)) {
      classMatches.push({ tag: el.type === 'tag' ? el.name : '?', cls, html: $(el).toString().slice(0, 600) })
    }
  })

  // ── 5. All <li> elements that contain Hebrew text ────────────────────────
  const hebrewLis: string[] = []
  $('li').each((_, el) => {
    const txt = $(el).text()
    if (/[֐-׿]/.test(txt)) {
      hebrewLis.push($(el).toString().slice(0, 300))
    }
  })

  // ── 6. Simulate exactly what fetchCarDetail does ─────────────────────────
  const SEL_specRow = 'tr, .spec-row, .spec-item, [class*="spec"] li, dl dt'

  const simulatedSpecs: Record<string, string> = {}
  const specParseLog: string[] = []

  $(SEL_specRow).each((_, row) => {
    const $row = $(row)
    const tds = $row.children('td')

    if (tds.length >= 2) {
      const key = tds.eq(0).text().trim()
      const val = tds.eq(1).text().trim()
      specParseLog.push(`[td children] key="${key}" val="${val}"`)
      if (key && val) simulatedSpecs[key] = val
      return
    }

    if ($row.is('dt')) {
      const key = $row.text().trim()
      const val = $row.next('dd').text().trim()
      specParseLog.push(`[dt/dd] key="${key}" val="${val}"`)
      if (key && val) simulatedSpecs[key] = val
      return
    }

    const valEl = $row.find('.spec-value, [class*="value"]').first()
    if (valEl.length) {
      const key = $row.clone().find('.spec-value, [class*="value"]').remove().end().text().trim()
      const val = valEl.text().trim()
      specParseLog.push(`[spec-value class] key="${key}" val="${val}"`)
      if (key && val) simulatedSpecs[key] = val
    }
  })

  // ── 7. Check for JSON data embedded in <script> tags ─────────────────────
  const scriptData: string[] = []
  $('script').each((_, el) => {
    const code = $(el).html() ?? ''
    if (/נפח|הספק|recNo|carData|specs/i.test(code)) {
      scriptData.push(code.slice(0, 1500))
    }
  })

  // ── 8. All text nodes that look like spec key:value pairs ────────────────
  const bodyText = $('body').text()
  const specLikeLines = bodyText.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2 && l.length < 80 && /[֐-׿]/.test(l))
    .slice(0, 60)

  return NextResponse.json({
    recNo,
    url,
    status: res.status,
    htmlLength: html.length,
    simulatedSpecs,
    specParseLogSample: specParseLog.slice(0, 40),
    contextSnippets,
    tables: tables.slice(0, 5),
    dls,
    classMatchesSample: classMatches.slice(0, 15),
    hebrewLisSample: hebrewLis.slice(0, 20),
    scriptData,
    specLikeLines,
  }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
