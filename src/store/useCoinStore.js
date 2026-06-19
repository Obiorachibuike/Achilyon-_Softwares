import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all', // Changed default to 'all' to show more data initially
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    sort: 'trending',
    verified: false,
  },
  loading: false,
  error: null,
  view: 'dashboard',

  // Wallet state
  address: null,
  balance: '0.00',

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock wallet connection
    const mockAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const mockBalance = (Math.random() * 10 + 1).toFixed(2)
    set({ address: mockAddress, balance: mockBalance })
  }
}))

export default useCoinStore
