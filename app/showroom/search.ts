// Search over the stock, in steps: first the maker, then one of its models,
// each picked from a list that narrows as you type (the makers' Hebrew names
// count too); beside it, filters and an order. Shared by the hall (and,
// later, the cars page)

export type Searchable = { make: string; model: string; year: string; price: string; stock: boolean }

// punctuation (geresh, gershayim, dots, dashes, commas) never decides a match
export const norm = (s: string) =>
  s.toLowerCase().replace(/[׳״'"`.,\-_/()]+/g, ' ').replace(/\s+/g, ' ').trim()

// how people here type the makers in Hebrew
const ALIASES: [string[], string[]][] = [
  [['bmw'], ['במוו', 'ב מ וו', 'בי אם', 'במו']],
  [['mercedes', 'benz'], ['מרצדס', 'בנץ']],
  [['porsche'], ['פורשה', 'פורש']],
  [['ferrari'], ['פרארי']],
  [['lamborghini'], ['למבורגיני', 'למבו']],
  [['bentley'], ['בנטלי']],
  [['rolls'], ['רולס', 'רויס']],
  [['audi'], ['אאודי', 'אודי']],
  [['land rover', 'range'], ['לנד רובר', 'ריינג', 'רובר']],
  [['mclaren'], ['מקלארן', 'מקלרן']],
  [['aston'], ['אסטון', 'מרטין']],
  [['maserati'], ['מזראטי', 'מאזרטי']],
  [['tesla'], ['טסלה']],
  [['lexus'], ['לקסוס']],
  [['cadillac'], ['קדילק', 'קאדילק']],
  [['ford'], ['פורד']],
  [['chevrolet'], ['שברולט']],
  [['jeep'], ['גיפ']],
  [['toyota'], ['טויוטה']],
  [['alfa'], ['אלפא', 'רומיאו']],
  [['volvo'], ['וולוו']],
  [['volkswagen'], ['פולקסווגן']],
  [['mini'], ['מיני']],
  [['dodge'], ['דודג']],
  [['gmc'], ['גי אם סי']],
  [['lotus'], ['לוטוס']],
  [['genesis'], ['גנסיס']],
  [['jaguar'], ['יגואר']],
  [['cupra'], ['קופרה']],
  [['polestar'], ['פולסטאר']],
]
const aliasesOf = (name: string) => {
  const n = norm(name)
  return ALIASES.filter(([keys]) => keys.some(k => n.includes(k))).flatMap(([, he]) => he)
}

// a model's line: its first word ("911", "Cayenne", "G63")
export const lineOf = (model: string) => model.trim().split(/\s+/)[0] ?? ''

// one entry of a list: a maker or a model line, with how many cars it has;
// `he` its Hebrew names, `extra` the full model names under it
export type Option = { key: string; label: string; count: number; he: string[]; extra: string }

export function makesOf(cars: Searchable[]): Option[] {
  const m = new Map<string, Option>()
  cars.forEach(c => {
    const k = norm(c.make); if (!k) return
    let o = m.get(k)
    if (!o) { o = { key: c.make, label: c.make, count: 0, he: aliasesOf(c.make), extra: '' }; m.set(k, o) }
    o.count++
  })
  // A to Z
  return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
}

export function modelsOf(cars: Searchable[], make: string): Option[] {
  const m = new Map<string, Option>()
  const mk = norm(make)
  cars.forEach(c => {
    if (norm(c.make) !== mk) return
    const line = lineOf(c.model); if (!line) return
    const k = norm(line)
    let o = m.get(k)
    if (!o) { o = { key: line, label: line, count: 0, he: [], extra: '' }; m.set(k, o) }
    o.count++; o.extra += ' ' + norm(c.model)
  })
  return Array.from(m.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// the list for what has been typed: starts with it first, then a Hebrew name
// of it, then a word of it starting so, then anywhere in it (or in a full
// model name); `hit` marks the typed letters in the label
export type Ranked = { opt: Option; hit: [number, number] | null }
export function rank(opts: Option[], text: string): Ranked[] {
  const t = norm(text)
  if (!t) return opts.map(opt => ({ opt, hit: null }))
  const raw = text.trim().toLowerCase()
  const out: (Ranked & { score: number })[] = []
  for (const opt of opts) {
    const l = norm(opt.label)
    let score = 0
    if (l.startsWith(t)) score = 4
    else if (opt.he.some(h => h.startsWith(t) || t.startsWith(h))) score = 3.5
    else if (l.split(' ').some(w => w.startsWith(t))) score = 3
    else if (t.length > 1 && l.includes(t)) score = 2
    else if (t.length > 1 && opt.extra.includes(t)) score = 1.5
    if (!score) continue
    const at = raw ? opt.label.toLowerCase().indexOf(raw) : -1
    out.push({ opt, hit: at >= 0 ? [at, at + raw.length] : null, score })
  }
  // the best matches first; among equals, the list's own order (makers A to Z)
  out.sort((a, b) => b.score - a.score || opts.indexOf(a.opt) - opts.indexOf(b.opt))
  return out.map(({ opt, hit }) => ({ opt, hit }))
}

export const priceNum = (p: string) => { const n = parseInt(p.replace(/\D/g, ''), 10); return n > 1000 ? n : null }

export type Avail = 'all' | 'stock' | 'way'
export const AVAIL: [Avail, string][] = [['all', 'הכל'], ['stock', 'במלאי'], ['way', 'בדרך לארץ']]
export const PRICES: { label: string; min: number; max: number }[] = [
  { label: 'עד 300 אלף', min: 0, max: 300_000 },
  { label: '300–600 אלף', min: 300_000, max: 600_000 },
  { label: '600 אלף–מיליון', min: 600_000, max: 1_000_000 },
  { label: 'מעל מיליון', min: 1_000_000, max: Infinity },
]
// The order: mixed, by year or by price. The first press on year or price
// orders it the usual way (newest first; cheapest first), the next press
// turns it round
export type SortKey = 'mix' | 'year' | 'price'
export type Sort = { key: SortKey; up: boolean }
export const SORTS: { key: SortKey; label: string; first: boolean; dir?: [string, string] }[] = [
  { key: 'mix', label: 'מעורב', first: false },
  { key: 'year', label: 'שנה', first: false, dir: ['מהישן לחדש', 'מהחדש לישן'] },
  { key: 'price', label: 'מחיר', first: true, dir: ['מהזול ליקר', 'מהיקר לזול'] },
]

export const carsWord = (n: number) => (n === 1 ? 'רכב אחד' : `${n} רכבים`)
