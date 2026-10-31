'use client'

import { useMemo, useRef } from 'react'
import type { Range as R } from './search'

// A two-thumb range slider for the advanced filter. Right to left: the low
// end on the right. Over the track, the stock's own spread as a small
// histogram, the chosen span in ink. Values snap to `step`; 'sq' gives the
// low end more room (prices: most cars sit in the first third). Untouched —
// both thumbs at the ends — it reports null, so cars missing the value still
// count.
export default function Range({ label, min, max, step, value, onChange, fmt, scale = 'lin', data }: {
  label: string; min: number; max: number; step: number
  value: R; onChange: (r: R) => void; fmt: (n: number) => string
  scale?: 'lin' | 'sq'; data?: number[]
}) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<0 | 1 | null>(null)
  const span = Math.max(1, max - min)
  const toT = (v: number) => { const x = Math.min(1, Math.max(0, (v - min) / span)); return scale === 'sq' ? Math.sqrt(x) : x }
  const toV = (t: number) => {
    const x = scale === 'sq' ? t * t : t
    const v = Math.round((min + x * span) / step) * step
    return Math.min(max, Math.max(min, v))
  }
  const [lo, hi] = value ?? [min, max]
  const tLo = toT(lo), tHi = toT(hi)
  const set = (a: number, b: number) => onChange(a <= min && b >= max ? null : [a, b])

  // the histogram: 26 bins over the track
  const bins = useMemo(() => {
    const n = 26, out = new Array(n).fill(0)
    for (const v of data ?? []) if (Number.isFinite(v)) out[Math.min(n - 1, Math.floor(toT(v) * n))]++
    const top = Math.max(1, ...out)
    return out.map(c => c / top)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, min, max, scale])

  // a point on the track, as t (right edge = 0: right to left)
  const tAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (r.right - clientX) / r.width))
  }
  const onDown = (e: React.PointerEvent) => {
    const t = tAt(e.clientX)
    // the nearer thumb; on a tie (both at one spot) the side pressed decides
    const dLo = Math.abs(t - tLo), dHi = Math.abs(t - tHi)
    drag.current = dLo < dHi ? 0 : dHi < dLo ? 1 : t <= tLo ? 0 : 1
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    move(t)
  }
  const move = (t: number) => {
    const v = toV(t)
    if (drag.current === 0) set(Math.min(v, hi), hi)
    else if (drag.current === 1) set(lo, Math.max(v, lo))
  }
  const key = (end: 0 | 1) => (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? -1 : 0
    if (!d) return
    e.preventDefault()
    if (end === 0) set(Math.min(hi, Math.max(min, lo + d * step)), hi)
    else set(lo, Math.max(lo, Math.min(max, hi + d * step)))
  }

  return (
    <div className="sr-rg">
      <div className="sr-fh">
        <span>{label}</span>
        <bdi className={value ? 'on' : ''}>{value ? `${fmt(lo)} – ${fmt(hi)}` : 'הכל'}</bdi>
      </div>
      {data && (
        <div className="sr-rg-hist" aria-hidden="true">
          {bins.map((h, i) => {
            const t = (i + 0.5) / bins.length
            return <i key={i} data-in={t >= tLo && t <= tHi ? '' : undefined} style={{ height: `${Math.max(6, h * 100)}%` }} />
          })}
        </div>
      )}
      <div ref={track} className="sr-rg-track" onPointerDown={onDown}
        onPointerMove={e => { if (drag.current !== null) move(tAt(e.clientX)) }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <div className="sr-rg-rail" />
        <div className="sr-rg-fill" style={{ right: `${tLo * 100}%`, left: `${(1 - tHi) * 100}%` }} />
        {([0, 1] as const).map(end => (
          <div key={end} className="sr-rg-thumb" role="slider" tabIndex={0}
            aria-label={`${label} — ${end === 0 ? 'מינימום' : 'מקסימום'}`} aria-valuemin={min} aria-valuemax={max}
            aria-valuenow={end === 0 ? lo : hi} aria-valuetext={fmt(end === 0 ? lo : hi)}
            style={{ right: `${(end === 0 ? tLo : tHi) * 100}%` }} onKeyDown={key(end)}>
            <i />
          </div>
        ))}
      </div>
    </div>
  )
}
