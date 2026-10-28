import type { Agent } from './agent-format'

// The portraits shot for the new site, committed under /public/team and keyed
// by the person's recNo on the main site. They win over whatever photo_url the
// import scraped; people without a new portrait fall back to that.
const LOCAL_PHOTOS: Record<number, string> = {
  257080: '/team/257080.jpg', // ארז שליחוב
  257075: '/team/257075.jpg', // ים מכלוף
  257076: '/team/257076.jpg', // חיים אברהמי
  257077: '/team/257077.jpg', // ניר רוכברגר
  258775: '/team/258775.jpg', // אלדר נוימן
  259104: '/team/259104.jpg', // יאנקל שוקרון
  260394: '/team/260394.jpg', // עמית דרורי
  280576: '/team/280576.jpg', // גרגורי טישלר
  280833: '/team/280833.jpg', // דניאל שבצ׳קה
  281088: '/team/281088.jpg', // ארז דהן
}

export function agentPhoto(a: Pick<Agent, 'source_rec_no' | 'photo_url'>): string | null {
  return (a.source_rec_no && LOCAL_PHOTOS[a.source_rec_no]) || a.photo_url
}
