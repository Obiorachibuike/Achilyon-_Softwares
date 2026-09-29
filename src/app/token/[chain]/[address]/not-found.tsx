import { SearchX } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'

export default function TokenNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-card text-muted"><SearchX className="h-6 w-6" aria-hidden /></div>
      <h1 className="font-display text-2xl font-semibold">Token not found</h1>
      <p className="max-w-md text-sm text-muted">We couldn&apos;t find a market for this address on this network. Check the network, or run it through the analyzer.</p>
      <div className="flex gap-2"><ButtonLink href="/discover" variant="primary">Explore markets</ButtonLink><ButtonLink href="/analyzer">Analyzer</ButtonLink></div>
    </div>
  )
}
