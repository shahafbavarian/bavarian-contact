// Fetches pollution grade (1-15) and safety level (0-8) from Israel's open
// government vehicle database (data.gov.il).
//
// Priority:
//   1. Exact lookup by license plate (mispar_rechev) — one record, fully precise.
//   2. Fallback: model + year + engine type — statistical best-guess across trims.

const RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
const API      = 'https://data.gov.il/api/3/action/datastore_search'

const POLL_FIELD   = 'kvutzat_zihum'         // pollution grade 1-15
const SAFETY_FIELD = 'ramat_eivzur_betihuty'  // safety level 0-8

const FUEL_KW: Record<string, string[]> = {
  bev:    ['חשמל'],
  phev:   ['בנזין/חשמל', 'חשמל'],
  hev:    ['בנזין/חשמל', 'דיזל/חשמל'],
  mhev:   ['בנזין', 'דיזל'],
  diesel: ['דיזל'],
  petrol: ['בנזין'],
}

const TWO_WORD_MFR = ['MERCEDES-BENZ', 'LAND ROVER', 'ALFA ROMEO', 'ROLLS-ROYCE', 'ASTON MARTIN']

function parseMfrModel(name: string): [string, string] {
  const u = name.trim().toUpperCase()
  for (const m of TWO_WORD_MFR) {
    if (u.startsWith(m)) return [m, u.slice(m.length).trim()]
  }
  const words = u.split(' ')
  return [words[0], words.slice(1).join(' ')]
}

function parseYear(raw: string): string | null {
  const m = raw.match(/(\d{4})/)
  return m ? m[1] : null
}

function modelSearchKey(model: string): string {
  const words = model.split(' ').filter(Boolean)
  if (!words.length) return ''
  if (words[0].length <= 2 && words.length > 1) return `${words[0]} ${words[1]}`
  return words[0]
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

type GovResult = { pollutionGrade: number | null; safetyLevel: number | null }
const EMPTY: GovResult = { pollutionGrade: null, safetyLevel: null }

function parseGovRecord(r: Record<string, unknown>): GovResult {
  const p = parseInt(String(r[POLL_FIELD]   ?? ''), 10)
  const s = parseInt(String(r[SAFETY_FIELD] ?? ''), 10)
  return {
    pollutionGrade: (!isNaN(p) && p >= 1  && p <= 15) ? p : null,
    safetyLevel:    (!isNaN(s) && s >= 0  && s <= 8)  ? s : null,
  }
}

// ── 1. Exact lookup by license plate ────────────────────────────────────────

async function fetchByPlate(plate: string): Promise<GovResult> {
  const plateNum = parseInt(plate.replace(/\D/g, ''), 10)
  if (isNaN(plateNum)) return EMPTY

  const params = new URLSearchParams({
    resource_id: RESOURCE,
    filters:     JSON.stringify({ mispar_rechev: plateNum }),
    limit:       '1',
  })
  const res = await fetch(`${API}?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return EMPTY
  const json = await res.json()
  const recs: Array<Record<string, unknown>> = json.result?.records ?? []
  return recs.length ? parseGovRecord(recs[0]) : EMPTY
}

// ── 2. Fallback: model + year + engine (+ trim words) ───────────────────────

async function fetchByModel(name: string, year: string, engine: string): Promise<GovResult> {
  const parsedYear = parseYear(year)
  if (!parsedYear) return EMPTY

  const [, model] = parseMfrModel(name)
  const modelWords = model.split(' ').filter(Boolean)
  const mKey = modelSearchKey(model) // e.g. "M2", "5 SERIES", "X5"
  if (!mKey) return EMPTY

  // Trim words: everything after the search key that might identify the variant.
  // e.g. "M2 COMPETITION M-SPORT" → mKey="M2", trimWords=["COMPETITION","M-SPORT"]
  // e.g. "5 SERIES 530I"         → mKey="5 SERIES", trimWords=["530I"]
  const keyWordCount = mKey.split(' ').length
  const trimWords = modelWords
    .slice(keyWordCount)
    .filter(w => w.length >= 3)          // skip very short tokens
    .map(w => w.replace(/[^A-Z0-9]/g, '')) // strip non-alphanumeric
    .filter(Boolean)

  const params = new URLSearchParams({
    resource_id: RESOURCE,
    q:           mKey,
    limit:       '200',
    filters:     JSON.stringify({ shnat_yitzur: parsedYear }),
  })
  const res = await fetch(`${API}?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return EMPTY
  const json = await res.json()
  if (!json.success) return EMPTY

  let recs: Array<Record<string, unknown>> = json.result?.records ?? []

  // Step 1 — filter by model key
  recs = recs.filter(r => {
    const k = String(r.kinuy_mishari ?? '').toUpperCase()
    const d = String(r.degem_nm      ?? '').toUpperCase()
    return k.includes(mKey) || d.includes(mKey)
  })

  // Step 2 — narrow by trim words (kinuy_mishari or ramat_gimur must match at least one)
  if (trimWords.length > 0) {
    const trimFiltered = recs.filter(r => {
      const k = String(r.kinuy_mishari ?? '').toUpperCase()
      const g = String(r.ramat_gimur   ?? '').toUpperCase()
      return trimWords.some(w => k.includes(w) || g.includes(w))
    })
    // Only narrow down if we still have results — otherwise keep broader set
    if (trimFiltered.length > 0) recs = trimFiltered
  }

  // Step 3 — fuel type
  const fuelKw = FUEL_KW[engine.toLowerCase()] ?? []
  if (fuelKw.length) {
    const narrow = recs.filter(r => {
      const f = String(r.sug_delek_nm ?? '').toUpperCase()
      return fuelKw.some(k => f.includes(k.toUpperCase()))
    })
    if (narrow.length) recs = narrow
  }

  const polls = recs.map(r => parseGovRecord(r).pollutionGrade).filter((n): n is number => n !== null)
  const safes = recs.map(r => parseGovRecord(r).safetyLevel).filter((n): n is number => n !== null)

  return {
    // Pollution: mode — all same-powertrain cars should agree
    pollutionGrade: statMode(polls),
    // Safety: max — after trim narrowing this is the highest level the variant supports
    safetyLevel: safes.length ? Math.max(...safes) : null,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchGovIndices(
  name: string, year: string, engine: string,
  licensePlate?: string | null,
): Promise<GovResult> {
  const timeout = new Promise<GovResult>(resolve => setTimeout(() => resolve(EMPTY), 4000))

  const work = async (): Promise<GovResult> => {
    // Exact plate lookup first
    if (licensePlate) {
      const byPlate = await fetchByPlate(licensePlate)
      if (byPlate.pollutionGrade !== null || byPlate.safetyLevel !== null) return byPlate
    }
    return fetchByModel(name, year, engine)
  }

  try {
    return await Promise.race([work(), timeout])
  } catch {
    return EMPTY
  }
}
