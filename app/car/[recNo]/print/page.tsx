import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

// The print sheet used to be its own server-rendered route, which meant every
// print click re-scraped the source site with a hard timeout — an independent
// failure surface that intermittently errored out. Printing now happens on the
// car page itself, from data that page already has, so this route only exists
// to keep old links and bookmarks working.
export default function PrintRedirect({ params }: { params: { recNo: string } }) {
  redirect(`/car/${params.recNo}?print=1`)
}
