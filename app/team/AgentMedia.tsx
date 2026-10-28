import { initials } from '@/lib/agent-format'

// A person's photo, or their initials on a quiet frame when none was uploaded.
export default function AgentMedia({ name, photoUrl, eager }: { name: string; photoUrl: string | null; eager?: boolean }) {
  if (!photoUrl) {
    return <div className="bm-mono" aria-hidden="true">{initials(name)}</div>
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoUrl} alt="" draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}
