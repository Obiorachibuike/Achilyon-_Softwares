import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const key = (chainId, pairAddress) => `${chainId}:${pairAddress}`.toLowerCase()

export const snapshot = (pair) => ({
  chainId: pair.chainId,
  pairAddress: pair.pairAddress,
  symbol: pair.baseToken?.symbol,
  name: pair.baseToken?.name,
  quote: pair.quoteToken?.symbol,
  icon: pair.info?.imageUrl ?? null,
  priceUsd: pair.priceUsd ?? null,
})

const useWatchlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      has: (chainId, pairAddress) => get().items.some((i) => key(i.chainId, i.pairAddress) === key(chainId, pairAddress)),
      add: (pair) => {
        if (get().has(pair.chainId, pair.pairAddress)) return
        set((s) => ({ items: [{ ...snapshot(pair), addedAt: Date.now() }, ...s.items] }))
      },
      remove: (chainId, pairAddress) =>
        set((s) => ({ items: s.items.filter((i) => key(i.chainId, i.pairAddress) !== key(chainId, pairAddress)) })),
      toggle: (pair) => {
        const { has, add, remove } = get()
        if (has(pair.chainId, pair.pairAddress)) { remove(pair.chainId, pair.pairAddress); return false }
        add(pair)
        return true
      },
      clear: () => set({ items: [] }),
    }),
    { name: 'achilyon-watchlist', version: 1 },
  ),
)

export default useWatchlistStore
