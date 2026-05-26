import { create } from 'zustand'

const useCoinStore = create((set) => ({
  // Navigation
  activeView: 'coins',
  setActiveView: (view) => set({ activeView: view }),

  // Filters
  filters: {
    chain: 'ethereum',
    dex: 'all',
    age: '24h',
    minLiquidity: 10000,
    minVolume: 0,
    marketCap: 'all',
    search: '',
  },
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  // Data
  coins: [],
  setCoins: (coins) => set({ coins }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  error: null,
  setError: (error) => set({ error }),

  // WebSocket / Real-time updates
  isLive: true,
  setIsLive: (isLive) => set({ isLive }),
}))

export default useCoinStore
