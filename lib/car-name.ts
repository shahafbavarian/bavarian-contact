// A car's full name split into its make and the rest, one way everywhere: the
// hall's cards, and the car's page — both while it opens from a card and once
// its full details are in (two ways of splitting made the title jump)
const TWO = ['Land', 'Alfa', 'Aston', 'Rolls', 'לנד', 'אלפא', 'אסטון', 'רולס']

export function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/)
  const cut = TWO.includes(words[0]) ? 2 : 1
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}
