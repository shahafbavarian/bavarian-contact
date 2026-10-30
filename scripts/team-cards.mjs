// The team's card photos for the hall (/showroom): one static 768px copy per
// committed portrait, cut so that every person has the same small margin above
// their hair. The hall anchors these at their top, so the crop here is the
// framing there. Static copies cost nothing per visit (no image optimizer, no
// Supabase egress).
//
// A new portrait: add it under public/team, measure where the hair starts
// (pixels from the top of the 1200px original) into HAIR_TOP, then run:
//   node scripts/team-cards.mjs
import sharp from 'sharp'
import { mkdirSync } from 'fs'

// where the hair starts, in the 1200×1200 originals
const HAIR_TOP = {
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
// the margin left above the hair, in original pixels
const MARGIN = 36

mkdirSync('public/team/card', { recursive: true })
for (const [id, hair] of Object.entries(HAIR_TOP)) {
  const top = Math.max(0, hair - MARGIN)
  await sharp(`public/team/${id}.jpg`)
    .extract({ left: 0, top, width: 1200, height: 1200 - top })
    .resize({ width: 768 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`public/team/card/${id}.jpg`)
  console.log(id, `cut ${top}px from the top`)
}
