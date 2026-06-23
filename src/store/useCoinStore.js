import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  dashboardCoins: [],
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
  searchQuery: '',
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending
  address: null,
  balance: null,

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setDashboardCoins: (coins) => set({ dashboardCoins: coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const mockAddress = '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    const mockBalance = (Math.random() * 9 + 1).toFixed(2)
    set({ address: mockAddress, balance: mockBalance })
  }
}))

export default useCoinStore
