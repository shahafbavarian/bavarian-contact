// Fetches pollution grade (1-15) and safety level (0-8) from Israel's open
// government vehicle database (data.gov.il). Queries by manufacturer + model +
// year + fuel type for maximum accuracy. Results are cached 24h.
//
// Field names are verified via /api/admin/gov-debug — update POLL_FIELD /
// SAFETY_FIELD below if the debug output shows different column names.

const RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
const API      = 'https://data.gov.il/api/3/action/datastore_search'

// Confirmed field names from the gov database schema.
// If data stops working, open /api/admin/gov-debug to see actual field names.
const POLL_FIELD   = 'kvutzat_zihum'          // pollution grade 1-15
const SAFETY_FIELD = 'ramat_eivzur_betikhuti' // safety level 0-8

// Hebrew manufacturer names as stored in the gov database (tozeret_nm field)
const MFR_HE: Record<string, string> = {
  'BMW':           'ב.מ.וו',
  'MERCEDES-BENZ': 'מרצדס',
  'MERCEDES':      'מרצדס',
  'AUDI':          'אאודי',
  'PORSCHE':       'פורשה',
  'LAND ROVER':    'לנד רובר',
  'VOLKSWAGEN':    'פולקסווגן',
  'VOLVO':         'וולוו',
  'LEXUS':         'לקסוס',
  'MINI':          'מיני',
  'ALFA ROMEO':    'אלפא רומיאו',
  'JAGUAR':        'יגואר',
  'ROLLS-ROYCE':   'רולס רויס',
  'BENTLEY':       'בנטלי',
  'FERRARI':       'פרארי',
  'LAMBORGHINI':   'למבורגיני',
  'MASERATI':      'מזראטי',
  'ASTON MARTIN':  'אסטון מרטין',
}

// Fuel type substrings to match against sug_delek_nm in gov database
const FUEL_KW: Record<string, string[]> = {
  bev:    ['חשמל'],
  phev:   ['בנזין/חשמל', 'חשמל'],
  hev:    ['בנזין/חשמל', 'דיזל/חשמל', 'היברידי'],
  mhev:   ['בנזין', 'דיזל'],
  diesel: ['דיזל'],
  petrol: ['בנזין'],
}

const TWO_WORD = ['MERCEDES-BENZ', 'LAND ROVER', 'ALFA ROMEO', 'ROLLS-ROYCE', 'ASTON MARTIN']

function parseMfrModel(name: string): [string, string] {
  const u = name.trim().toUpperCase()
  for (const m of TWO_WORD) {
    if (u.startsWith(m)) return [m, u.slice(m.length).trim()]
  }
  const words = u.split(' ')
  return [words[0], words.slice(1).join(' ')]
}

function parseYear(raw: string): string | null {
  const m = raw.match(/(\d{4})/)
  return m ? m[1] : null
}

function statMode(nums: number[]): number | null {
  if (!nums.length) return null
  const freq: Record<number, number> = {}
  for (const n of nums) freq[n] = (freq[n] ?? 0) + 1
  let best = nums[0], bestCount = 0
  for (const key of Object.keys(freq)) {
    const n = Number(key), c = freq[n]
    if (c > bestCount) { best = n; bestCount = c }
  }
  return best
}

export async function fetchGovIndices(
  name: string, year: string, engine: string,
): Promise<{ pollutionGrade: number | null; safetyLevel: number | null }> {
  const empty = { pollutionGrade: null, safetyLevel: null }
  // Hard 4-second cap so a slow/unreachable gov.il never blocks the detail-page fallback
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 4000)

  try {
    const parsedYear = parseYear(year)
    if (!parsedYear) return empty

    const [mfr, model] = parseMfrModel(name)
    const modelWord = model.split(' ')[0] // first word = broadest reliable text match
    if (!modelWord) return empty

    const mfrHe = (MFR_HE[mfr] ?? '').toUpperCase()

    const params = new URLSearchParams({
      resource_id: RESOURCE,
      q:           modelWord,
      limit:       '200',
      filters:     JSON.stringify({ shnat_yitzur: parsedYear }),
    })

    const res = await fetch(`${API}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(tid)
    if (!res.ok) return empty

    const json = await res.json()
    if (!json.success) return empty

    let recs: Array<Record<string, unknown>> = json.result?.records ?? []

    // 1. Filter by manufacturer
    recs = recs.filter(r => {
      const t = String(r.tozeret_nm ?? '').toUpperCase()
      return t.includes(mfr) || (mfrHe && t.includes(mfrHe))
    })

    // 2. Filter by model name
    recs = recs.filter(r => {
      const k = String(r.kinuy_mishari ?? '').toUpperCase()
      const d = String(r.degem_nm      ?? '').toUpperCase()
      return k.includes(modelWord) || d.includes(modelWord)
    })

    // 3. Cross-reference fuel type — only narrows down if matches remain
    const fuelKw = FUEL_KW[engine.toLowerCase()] ?? []
    if (fuelKw.length) {
      const fuelFiltered = recs.filter(r => {
        const f = String(r.sug_delek_nm ?? '').toUpperCase()
        return fuelKw.some(k => f.includes(k.toUpperCase()))
      })
      if (fuelFiltered.length) recs = fuelFiltered
    }

    const pollGrades = recs
      .map(r => parseInt(String(r[POLL_FIELD]   ?? ''), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 15)

    const safetyLevels = recs
      .map(r => parseInt(String(r[SAFETY_FIELD] ?? ''), 10))
      .filter(n => !isNaN(n) && n >= 0 && n <= 8)

    return {
      pollutionGrade: statMode(pollGrades),
      safetyLevel:    statMode(safetyLevels),
    }
  } catch {
    clearTimeout(tid)
    return empty
  }
}
