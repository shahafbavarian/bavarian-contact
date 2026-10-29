'use client'

// A lab, reachable by link only: which lever actually moves the colour of the
// iPhone's top and bottom areas in Safari 26, live. Each button acts at once;
// look at the clock's background and at the bar below after each press.
import { useState } from 'react'

const DARK = '#06080c', LIGHT = '#f5f6f7'

export default function SbTest2() {
  const [on, setOn] = useState<string[]>([])
  const flip = (k: string, apply: (to: boolean) => void) => () => {
    const to = !on.includes(k)
    setOn(v => (to ? [...v, k] : v.filter(x => x !== k)))
    apply(to)
  }
  const btn = (k: string, label: string, apply: (to: boolean) => void) => (
    <button type="button" onClick={flip(k, apply)}
      style={{ display: 'block', width: '100%', minHeight: 56, margin: '10px 0', borderRadius: 14, border: '1px solid #888', fontSize: 17, background: on.includes(k) ? '#2563eb' : '#333', color: '#fff' }}>
      {label} — {on.includes(k) ? 'פועל' : 'כבוי'}
    </button>
  )
  return (
    <main dir="rtl" style={{ minHeight: '150vh', padding: '90px 20px', background: 'transparent', color: '#ddd', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20 }}>מעבדת צבע לפסי ספארי</h1>
      <p>אחרי כל לחיצה: להסתכל על אזור השעון למעלה ועל אזור הכתובת למטה.</p>
      {btn('body', '1. רקע html+body לבן', to => {
        document.documentElement.style.backgroundColor = to ? LIGHT : DARK
        document.body.style.backgroundColor = to ? LIGHT : DARK
      })}
      {btn('strip', '2. רצועות fixed לבנות (עם איפוס display)', to => {
        let t = document.getElementById('lab-t'), b = document.getElementById('lab-b')
        if (!t) {
          for (const [id, side] of [['lab-t', 'top'], ['lab-b', 'bottom']] as const) {
            const el = document.createElement('div')
            el.id = id
            el.style.cssText = `position:fixed;${side}:0;left:0;width:100%;height:14px;background:${DARK};pointer-events:none;z-index:2147483647;`
            document.body.appendChild(el)
          }
          t = document.getElementById('lab-t'); b = document.getElementById('lab-b')
        }
        for (const el of [t!, b!]) {
          el.style.display = 'none'
          requestAnimationFrame(() => { el.style.backgroundColor = to ? LIGHT : DARK; el.style.display = 'block' })
        }
      })}
      {btn('strip2', '3. רצועות fixed לבנות (בלי איפוס, רק צבע)', to => {
        for (const id of ['lab-t', 'lab-b']) {
          const el = document.getElementById(id)
          if (el) el.style.backgroundColor = to ? LIGHT : DARK
        }
      })}
      {btn('scheme', '4. color-scheme: light', to => {
        document.documentElement.style.colorScheme = to ? 'light' : 'dark'
      })}
      <p style={{ marginTop: 30 }}>הדף עצמו שקוף בכוונה: מה שנצבע הוא רק הרקע והרצועות.</p>
      <div style={{ height: 500 }} />
      <p>תחתית.</p>
    </main>
  )
}
