'use client'
import { useCallback } from 'react'
import type { ChainId } from '@/types'
import { useWatchlistStore } from '@/stores/watchlist'
import { useWallet } from '@/stores/wallet'
import { api } from '@/lib/api/client'
import { toast } from '@/stores/toast'

/**
 * Watchlist facade: always updates the local list instantly, and mirrors to
 * the server when a wallet session exists.
 */
export function useWatchlist() {
  const items = useWatchlistStore((s) => s.items)
  const session = useWallet((s) => s.session)

  const isWatched = useCallback((chain: ChainId, address: string) => items.some((i) => i.chain === chain && i.address.toLowerCase() === address.toLowerCase()), [items])

  const toggle = useCallback(async (chain: ChainId, address: string, symbol?: string) => {
    const store = useWatchlistStore.getState()
    const watched = store.has(chain, address)
    if (watched) store.remove(chain, address)
    else store.add(chain, address)
    toast.success(watched ? 'Removed from watchlist' : 'Added to watchlist', symbol)
    if (session) {
      try {
        if (watched) await api.del(`/api/watchlist/${chain}/${encodeURIComponent(address)}`)
        else await api.post('/api/watchlist', { chain, address })
      } catch {
        toast.warning('Saved locally', 'Could not sync your watchlist to your account.')
      }
    }
    return !watched
  }, [session])

  return { items, isWatched, toggle }
}
