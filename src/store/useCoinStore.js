import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  address: null,
  filters: {
    network: 'all',
    dex: 'all',
    age: '24h',
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    sortBy: 'trending',
    verifiedOnly: false,
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock wallet connection for MVP
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
    set({ address: mockAddress })
  },

  disconnectWallet: () => set({ address: null }),
}))

export default useCoinStore
