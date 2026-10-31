// A car's colour as a dot in the filter. The main site writes a colour either
// generic ("Black", "Grey") or by its maker's official name ("Obsidian Black",
// "Nardo Grey") — the official name nearly always holds a generic colour word,
// and that word decides the family. A name without one is looked up in a short
// list of known names; a name still unknown is left out (never guessed) until
// it is added here. The official name stays the car's own; the dot is its family.
//
// Two-tone ("Black/Green", "Rhodium Silver Bonnet / Anthracite") counts under
// both colours; stitching or seams ("Black/Red Stitching") are trim, not the
// colour; finishes (Metallic, Matte, Pearl, Mica, Magno) are not colours.

export type Family = { key: string; label: string; dot: string }

// the dots, in the order they are shown
export const FAMILIES: Family[] = [
  { key: 'black', label: 'שחור', dot: '#16181b' },
  { key: 'gray', label: 'אפור', dot: '#80868e' },
  { key: 'silver', label: 'כסוף', dot: 'linear-gradient(135deg, #f1f2f4 0%, #b9bdc3 55%, #8f949b 100%)' },
  { key: 'white', label: 'לבן', dot: '#ffffff' },
  { key: 'beige', label: 'בז׳', dot: '#d8c4a2' },
  { key: 'brown', label: 'חום', dot: '#6e4a2f' },
  { key: 'red', label: 'אדום', dot: '#b51f2b' },
  { key: 'orange', label: 'כתום', dot: '#e2742b' },
  { key: 'yellow', label: 'צהוב', dot: '#f0c419' },
  { key: 'gold', label: 'זהב', dot: 'linear-gradient(135deg, #f0dca0 0%, #c9a24f 55%, #a07a2e 100%)' },
  { key: 'green', label: 'ירוק', dot: '#2e6a45' },
  { key: 'turquoise', label: 'טורקיז', dot: '#45c2bf' },
  { key: 'blue', label: 'כחול', dot: '#1f4c9e' },
]

// the generic words, first match wins within a part of the name
const WORDS: [RegExp, string][] = [
  [/\b(black|ebony|nero)\b/, 'black'],
  [/\b(gr[ae]y|grigio|anthracite|graphite)\b/, 'gray'],
  [/\b(silver|argento)\b/, 'silver'],
  [/\b(white|bianco|ivory)\b/, 'white'],
  [/\bbeige\b/, 'beige'],
  [/\b(brown|caraway|camel|tan|saddle|brandy|cognac)\b/, 'brown'],
  [/\b(red|rosso|bordeaux|burgundy|garnet)\b/, 'red'],
  [/\b(orange|arancio)\b/, 'orange'],
  [/\b(yellow|giallo)\b/, 'yellow'],
  [/\bgold\b/, 'gold'],
  [/\b(green|verde|olive)\b/, 'green'],
  [/\btiffany\b/, 'turquoise'],
  [/\b(blue|blu)\b/, 'blue'],
]

// official names with no generic word in them
const KNOWN: Record<string, string[]> = {
  'wind chill pearl': ['white'],
}

export function familiesOf(name?: string): string[] {
  const n = (name ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (!n) return []
  if (KNOWN[n]) return KNOWN[n]
  const out: string[] = []
  // the parts of a two-tone name; the colour a stitching or seam names is trim
  for (const part of n.replace(/\b\w+\s+(stitching|stiching|stitches|seams?)\b/g, ' ').split(/\s*\/\s*|\s+-\s+/)) {
    const hit = WORDS.find(([rx]) => rx.test(part))
    if (hit && !out.includes(hit[1])) out.push(hit[1])
  }
  return out
}
