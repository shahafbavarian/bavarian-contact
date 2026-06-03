// Fetches pollution grade (1-15) and safety level (0-8) from Israel's open
// government vehicle database (data.gov.il). Queries by model + year + fuel
// type. Results are cached 24h (grades are model-level, rarely change).

const RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
const API      = 'https://data.gov.il/api/3/action/datastore_search'

// Field names verified via /api/admin/gov-debug
const POLL_FIELD   = 'kvutzat_zihum'         // pollution grade 1-15
const SAFETY_FIELD = 'ramat_eivzur_betihuty'  // safety level 0-8

// Fuel type substrings to match against sug_delek_nm in gov database
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

// Build the best search key from the model string.
// - "X5 XDRIVE30D"  → "X5"        (specific enough on its own)
// - "5 SERIES 530I" → "5 SERIES"  (bare "5" matches thousands of unrelated cars)
// - "MACAN S"       → "MACAN"
function modelSearchKey(model: string): string {
  const words = model.split(' ').filter(Boolean)
  if (!words.length) return ''
  // If the first word is short (≤2 chars: "3", "5", "M3", etc.) include the second word too
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

export async function fetchGovIndices(
  name: string, year: string, engine: string,
): Promise<GovResult> {
  const empty: GovResult = { pollutionGrade: null, safetyLevel: null }

  const timeout = new Promise<GovResult>(resolve =>
    setTimeout(() => resolve(empty), 4000),
  )

  const work = async (): Promise<GovResult> => {
    const parsedYear = parseYear(year)
    if (!parsedYear) return empty

    const [, model] = parseMfrModel(name)
    const mKey = modelSearchKey(model) // e.g. "X5", "5 SERIES", "MACAN"
    if (!mKey) return empty

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
    if (!res.ok) return empty

    const json = await res.json()
    if (!json.success) return empty

    let recs: Array<Record<string, unknown>> = json.result?.records ?? []

    // Filter: kinuy_mishari or degem_nm must contain the search key
    recs = recs.filter(r => {
      const k = String(r.kinuy_mishari ?? '').toUpperCase()
      const d = String(r.degem_nm      ?? '').toUpperCase()
      return k.includes(mKey) || d.includes(mKey)
    })

    // Narrow by fuel type — only if the narrowed set is non-empty
    const fuelKw = FUEL_KW[engine.toLowerCase()] ?? []
    if (fuelKw.length) {
      const narrow = recs.filter(r => {
        const f = String(r.sug_delek_nm ?? '').toUpperCase()
        return fuelKw.some(k => f.includes(k.toUpperCase()))
      })
      if (narrow.length) recs = narrow
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
  }

  try {
    return await Promise.race([work(), timeout])
  } catch {
    return empty
  }
}
