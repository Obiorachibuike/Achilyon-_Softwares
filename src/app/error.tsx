'use client'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" role="alert">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-down/30 bg-down/10 text-down"><AlertTriangle className="h-6 w-6" aria-hidden /></div>
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted">This part of Achilyon failed to load. It&apos;s usually temporary — try again.{error.digest ? ` (ref ${error.digest})` : ''}</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <ButtonLink href="/">Home</ButtonLink>
      </div>
    </div>
  )
}
