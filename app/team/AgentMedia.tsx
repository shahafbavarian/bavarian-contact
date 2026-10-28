import { initials } from '@/lib/agent-format'

// Agent photo, or the "clay model" monogram when none was uploaded.
export default function AgentMedia({ name, photoUrl, eager }: { name: string; photoUrl: string | null; eager?: boolean }) {
  if (!photoUrl) {
    return <div className="sr-media sr-mono" aria-hidden="true"><span>{initials(name)}</span></div>
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="sr-media" src={photoUrl} alt="" draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}
