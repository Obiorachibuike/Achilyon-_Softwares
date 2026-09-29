'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChainId, WatchlistEntry } from '@/types'

const key = (chain: string, address: string) => `${chain}:${address.toLowerCase()}`

interface WatchlistStore {
  items: WatchlistEntry[]
  has: (chain: ChainId, address: string) => boolean
  add: (chain: ChainId, address: string) => void
  remove: (chain: ChainId, address: string) => void
  /** Merge entries from the server (used after sign-in). */
  merge: (entries: WatchlistEntry[]) => void
}

/**
 * Local watchlist (localStorage). When a wallet is signed in, the
 * `useWatchlist` hook mirrors changes to the server-side watchlist.
 */
export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      has: (chain, address) => get().items.some((i) => key(i.chain, i.address) === key(chain, address)),
      add: (chain, address) => {
        if (get().has(chain, address)) return
        set((s) => ({ items: [{ chain, address, addedAt: Date.now() }, ...s.items].slice(0, 200) }))
      },
      remove: (chain, address) => set((s) => ({ items: s.items.filter((i) => key(i.chain, i.address) !== key(chain, address)) })),
      merge: (entries) =>
        set((s) => {
          const map = new Map(s.items.map((i) => [key(i.chain, i.address), i]))
          for (const e of entries) if (!map.has(key(e.chain, e.address))) map.set(key(e.chain, e.address), e)
          return { items: [...map.values()].sort((a, b) => b.addedAt - a.addedAt) }
        }),
    }),
    { name: 'achilyon-watchlist-v2', version: 1 },
  ),
)
