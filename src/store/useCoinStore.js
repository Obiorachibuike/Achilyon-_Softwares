import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  dashboardCoins: [], // Separate state for dashboard to avoid filter interference
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all',
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    verified: false,
    searchQuery: '',
    sortBy: 'trending', // trending, mcap, volume, age
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Mock Wallet State
  address: null,
  balance: '0.00',

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setDashboardCoins: (coins) => set({ dashboardCoins: coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const mockAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const mockBalance = (Math.random() * 9 + 1).toFixed(2)
    set({ address: mockAddress, balance: mockBalance })
  },

  disconnectWallet: () => set({ address: null, balance: '0.00' })
}))

export default useCoinStore
