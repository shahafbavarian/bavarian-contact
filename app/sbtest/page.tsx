import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = { title: 'בדיקת שורת סטטוס', robots: { index: false, follow: false } }
export const viewport: Viewport = { viewportFit: 'cover', maximumScale: 5, userScalable: true }

// A hidden lab page: four ways of putting a stone texture at the top of the
// screen, to see on a real iPhone which one shows behind the clock.
// Open /sbtest?v=1 .. ?v=4 and look at the strip behind the clock.
const stone = `repeating-linear-gradient(90deg, #b3a48e 0 88px, #a89a85 88px 90px), repeating-linear-gradient(180deg, #b3a48e00 0 58px, #7c705e55 58px 60px)`

export default async function SBTest({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v = '0' } = await searchParams
  const num = { position: 'absolute', top: '40vh', width: '100%', textAlign: 'center', fontSize: 64, color: '#222', fontWeight: 700 } as const
  const base = { background: stone, backgroundColor: '#b3a48e' } as const
  return (
    <div style={{ minHeight: '100vh' }}>
      {v === '0' && (
        <div style={{ padding: '30vh 24px', textAlign: 'center', fontSize: 22 }}>
          {[1, 2, 3, 4].map(n => <p key={n}><a href={`/sbtest?v=${n}`} style={{ textDecoration: 'underline' }}>מצב {n}</a></p>)}
        </div>
      )}
      {/* 1: the stone in the page's own flow, nothing fixed, body transparent */}
      {v === '1' && <div style={{ ...base, height: '100lvh' }}><div style={num}>1</div></div>}
      {/* 2: the stone pinned full-screen (like the showroom's stage), plus a
          transparent, click-through strip at the top edge */}
      {v === '2' && (<>
        <div style={{ ...base, position: 'fixed', inset: 0 }}><div style={num}>2</div></div>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 12, background: 'transparent', pointerEvents: 'none', zIndex: 2147483647 }} />
      </>)}
      {/* 3: a really scrollable stone page (the bars should collapse on scroll) */}
      {v === '3' && <div style={{ ...base, height: '160lvh' }}><div style={num}>3</div></div>}
      {/* 4: the stone pinned, and a thin RED fixed strip at the top: if the
          clock strip turns red, Safari paints a sampled colour, not the page */}
      {v === '4' && (<>
        <div style={{ ...base, position: 'fixed', inset: 0 }}><div style={num}>4</div></div>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 8, background: '#e03434', pointerEvents: 'none', zIndex: 2147483647 }} />
      </>)}
    </div>
  )
}
