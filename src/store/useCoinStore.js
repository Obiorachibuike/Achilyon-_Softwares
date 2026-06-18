import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all', // Changed to 'all' as default for broader discovery
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    verified: false,
  },
  searchQuery: '',
  sort: 'trending', // trending, marketCap, volume, age
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Mock wallet state
  wallet: {
    address: null,
    balance: '0.00',
    isConnected: false,
  },

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSort: (sort) => set({ sort }),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock connection
    const randomAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const randomBalance = (Math.random() * 10).toFixed(2)
    set({
      wallet: {
        address: randomAddress,
        balance: randomBalance,
        isConnected: true
      }
    })
  },

  disconnectWallet: () => set({
    wallet: {
      address: null,
      balance: '0.00',
      isConnected: false
    }
  })
}))

export default useCoinStore
