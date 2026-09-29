import type { Metadata } from 'next'
import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Not found', robots: { index: false } }

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-card text-muted"><Compass className="h-6 w-6" aria-hidden /></div>
      <h1 className="font-display text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="max-w-md text-sm text-muted">The token or page may not exist, or the address could be on a different network. Try searching with ⌘K.</p>
      <div className="flex gap-2">
        <ButtonLink href="/discover" variant="primary">Explore markets</ButtonLink>
        <ButtonLink href="/">Home</ButtonLink>
      </div>
    </div>
  )
}
