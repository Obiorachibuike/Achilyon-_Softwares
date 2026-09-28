import { create } from 'zustand'
import { dexService } from '../services/api'

let inflight = null

const useMarketStore = create((set, get) => ({
  pairs: [],
  status: 'idle', // idle | loading | ready | error
  error: null,
  lastUpdated: null,

  /** Fetch (or refresh) the market universe. Concurrent calls share one request. */
  fetchMarket: async ({ silent = false } = {}) => {
    if (inflight) return inflight
    if (!silent || !get().pairs.length) set({ status: 'loading', error: null })
    inflight = dexService
      .getMarketUniverse()
      .then((pairs) => set({ pairs, status: 'ready', error: null, lastUpdated: Date.now() }))
      .catch((err) => set({ status: get().pairs.length ? 'ready' : 'error', error: err?.message || 'Failed to load market data' }))
      .finally(() => { inflight = null })
    return inflight
  },

  /** Merge freshly fetched pairs (e.g. from a detail page) into the cache. */
  upsertPairs: (incoming) => set((s) => {
    if (!incoming?.length) return s
    const map = new Map(s.pairs.map((p) => [`${p.chainId}:${p.pairAddress}`.toLowerCase(), p]))
    incoming.forEach((p) => map.set(`${p.chainId}:${p.pairAddress}`.toLowerCase(), p))
    return { pairs: [...map.values()] }
  }),
}))

export default useMarketStore
