export const SOURCE_LABELS: Record<string, string> = {
  'ins-portal': 'פורטל ביטוחי',
}

export function sourceLabel(raw: string | null): string | null {
  if (!raw) return null
  return SOURCE_LABELS[raw] ?? raw
}
