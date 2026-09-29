'use client'
import { Star } from 'lucide-react'
import type { ChainId } from '@/types'
import { cn } from '@/lib/cn'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useMounted } from '@/hooks/useMounted'

export function WatchlistButton({ chain, address, symbol, withLabel = false, className }: { chain: ChainId; address: string; symbol?: string; withLabel?: boolean; className?: string }) {
  const mounted = useMounted()
  const { isWatched, toggle } = useWatchlist()
  const watched = mounted && isWatched(chain, address)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void toggle(chain, address, symbol)
      }}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${symbol ?? 'token'} from watchlist` : `Add ${symbol ?? 'token'} to watchlist`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg transition-colors',
        watched ? 'text-gold' : 'text-subtle hover:text-gold',
        withLabel ? 'h-9 border border-line px-3 text-sm font-medium hover:bg-white/[0.04]' : 'p-1.5',
        className,
      )}
    >
      <Star className="h-4 w-4" fill={watched ? 'currentColor' : 'none'} aria-hidden />
      {withLabel && (watched ? 'Watching' : 'Watch')}
    </button>
  )
}
