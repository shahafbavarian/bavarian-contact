// The team's photos for the hall (/showroom) and the person page: per committed
// portrait, a 768px card copy (public/team/card, drawn ahead in the hall) and a
// 1200px copy for the person page (public/team/hero, loaded only when opened),
// both cut so that every person has the same small margin above their hair.
// Both are anchored at their top, so the crop here is the framing there.
// Static copies cost nothing per visit (no image optimizer, no Supabase egress).
//
// A new portrait: add it under public/team (square; 1200px when there is
// one, smaller is used as it is — never enlarged), measure where the hair
// starts (pixels from the top of that file) into HAIR_TOP, then run:
//   node scripts/team-cards.mjs
import sharp from 'sharp'
import { mkdirSync } from 'fs'

// where the hair starts, in pixels from the top of each square original
const HAIR_TOP = {
  256441: 58,   // רוברט אנוקוב
  257075: 85,
  257076: 78,
  257077: 80,
  257080: 96,
  258775: 80,
  259104: 100,
  260394: 100,
  280576: 66,
  280833: 60,
  281088: 24,
}
// the margin left above the hair, as a share of the original's side
// (36px on a 1200px portrait)
const MARGIN = 0.03

mkdirSync('public/team/card', { recursive: true })
mkdirSync('public/team/hero', { recursive: true })
for (const [id, hair] of Object.entries(HAIR_TOP)) {
  const src = `public/team/${id}.jpg`
  const { width: W, height: H } = await sharp(src).metadata()
  const top = Math.max(0, Math.round(hair - MARGIN * W))
  const cut = () => sharp(src).extract({ left: 0, top, width: W, height: H - top })
  await cut().resize({ width: 768, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/team/card/${id}.jpg`)
  await cut().jpeg({ quality: 84, mozjpeg: true }).toFile(`public/team/hero/${id}.jpg`)
  console.log(id, `cut ${top}px from the top`)
}
