// Showroom animation check, the way it must be verified (CLAUDE.md rule 6):
// a 60 fps FRAME clock drives the page — every real frame advances its time by
// exactly 16.67 ms however slow the software renderer is — so the walk in and
// the walk out are sampled precisely as on a device, frozen at chosen instants
// and laid out as contact sheets (qa/sheet-fk.png in, qa/sheet-fo.png out).
// It also reports `born`: faces created DURING each walk (must be 0 — a face
// born mid-walk is a visible hitch on the phone).
// Usage: npx next build && npx next start -p 3200, then: node scripts/showroom-frames.js
// A 60 fps FRAME clock: every real frame advances the page's time by exactly
// 16.67 ms, however slow the software renderer is — the animation is sampled
// precisely as on a device. __pause freezes it for a screenshot.
const { chromium, devices } = require('playwright');
const sharp = require('sharp');
require('fs').mkdirSync('qa', { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: devices['iPhone 15 Pro'].userAgent });
  await ctx.addInitScript(() => {
    window.__t = 0; window.__pause = false; let lastTs = -1;
    const o = window.requestAnimationFrame.bind(window);
    performance.now = () => window.__t;
    window.requestAnimationFrame = (cb) => o((ts) => { if (!window.__pause && ts !== lastTs) { lastTs = ts; window.__t += 1000 / 60 } cb(window.__t) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await p.goto('http://localhost:3200/showroom', { waitUntil: 'domcontentloaded' });
  const until = async (T) => { await p.waitForFunction((t) => window.__t >= t, T, { timeout: 600000, polling: 30 }); await p.evaluate(() => { window.__pause = true }); };
  const go = async () => p.evaluate(() => { window.__pause = false });
  // the street: let everything load (8 s of page time)
  await until(8000); await go();
  await until(8100);
  const bornStreet = await p.evaluate(() => window.__showroom.stats().born);
  await go(); await p.keyboard.press('ArrowDown');
  const t0 = await p.evaluate(() => window.__t);
  const shoot = async (prefix, list, base) => { const fs = []; for (const ms of list) { await until(base + ms); const f = `qa/${prefix}-${ms}.png`; await p.screenshot({ path: f, timeout: 60000 }); fs.push(f); await go(); } return fs; };
  const inF = await shoot('fk', [200, 450, 700, 950, 1200, 1450, 1700, 1950, 2250, 2600, 3000, 3600], t0);
  const st = await p.evaluate(() => { const s = window.__showroom.stats(); return { p: s.progress, born: s.born } });
  await until(t0 + 4500);
  // faces born at rest (after the walk, before leaving) are fine: idle time
  const bornRest = await p.evaluate(() => window.__showroom.stats().born);
  await go();
  await p.keyboard.press('ArrowUp');
  const x0 = await p.evaluate(() => window.__t);
  const outF = await shoot('fo', [200, 450, 700, 950, 1200, 1450, 1700, 1950, 2250, 2600, 3000, 6000], x0);
  const so = await p.evaluate(() => { const s = window.__showroom.stats(); return { p: s.progress, born: s.born, dbg: s.dbg } });
  for (const [name, fs] of [['sheet-fk', inF], ['sheet-fo', outF]]) {
    const buf = await Promise.all(fs.map(n => sharp(n).resize({ width: 260 }).toBuffer()));
    const m = await sharp(buf[0]).metadata(); const W = m.width, H = m.height;
    await sharp({ create: { width: W * 4, height: H * Math.ceil(buf.length / 4), channels: 3, background: '#111' } })
      .composite(buf.map((bb, i) => ({ input: bb, left: (i % 4) * W, top: Math.floor(i / 4) * H }))).png().toFile(`qa/${name}.png`);
  }
  console.log(JSON.stringify({ bornStreet, insideP: +st.p.toFixed(3), bornIn: st.born - bornStreet, outP: +so.p.toFixed(3), bornAtRest: bornRest - st.born, bornOut: so.born - bornRest, errs }));
  await b.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
