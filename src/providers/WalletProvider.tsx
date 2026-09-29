'use client'
import { useEffect, type ReactNode } from 'react'
import { startDiscovery, subscribeConnectors } from '@/lib/wallet/registry'
import { useWallet } from '@/stores/wallet'
import { useWatchlistStore } from '@/stores/watchlist'
import { api } from '@/lib/api/client'
import type { WatchlistEntry } from '@/types'

/** Boots wallet discovery, restores sessions and syncs the watchlist after sign-in. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const session = useWallet((s) => s.session)

  useEffect(() => {
    startDiscovery()
    const { refreshConnectors, loadSession, reconnect } = useWallet.getState()
    const unsub = subscribeConnectors(refreshConnectors)
    void loadSession()
    const t = setTimeout(() => void reconnect(), 500)
    return () => {
      unsub()
      clearTimeout(t)
    }
  }, [])

  // Merge local ↔ server watchlists once a session exists.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await api.get<WatchlistEntry[]>('/api/watchlist')
        if (cancelled) return
        const local = useWatchlistStore.getState().items
        const remoteKeys = new Set(remote.map((r) => `${r.chain}:${r.address.toLowerCase()}`))
        useWatchlistStore.getState().merge(remote)
        for (const l of local.filter((i) => !remoteKeys.has(`${i.chain}:${i.address.toLowerCase()}`)).slice(0, 50)) {
          await api.post('/api/watchlist', { chain: l.chain, address: l.address }).catch(() => undefined)
        }
      } catch {
        /* offline — local list keeps working */
      }
    })()
    return () => { cancelled = true }
  }, [session])

  return <>{children}</>
}
