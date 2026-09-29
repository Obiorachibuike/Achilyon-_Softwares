import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Offline', robots: { index: false } }

export default function Offline() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-card text-muted"><WifiOff className="h-6 w-6" aria-hidden /></div>
      <h1 className="font-display text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-md text-sm text-muted">Achilyon needs a connection for live market data — we never show stale prices as current. Reconnect and reload.</p>
    </div>
  )
}
