import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  address: null,
  balance: '0',
  searchQuery: '',
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all',
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    verified: false,
    sort: 'trending',
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
    const mockBalance = (Math.random() * 10).toFixed(2)
    set({ address: mockAddress, balance: mockBalance })
  },

  disconnectWallet: () => set({ address: null, balance: '0' }),
}))

export default useCoinStore
