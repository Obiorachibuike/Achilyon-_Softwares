import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all',
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    sortBy: 'trending',
    verified: false,
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending
  wallet: {
    address: null,
    balance: null,
    isConnected: false,
  },

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock wallet connection
    const mockAddress = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const mockBalance = (Math.random() * 10 + 1).toFixed(2)
    set({
      wallet: {
        address: mockAddress,
        balance: mockBalance,
        isConnected: true,
      }
    })
  },

  disconnectWallet: () => set({
    wallet: {
      address: null,
      balance: null,
      isConnected: false,
    }
  })
}))

export default useCoinStore
