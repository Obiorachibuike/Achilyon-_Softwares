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
    verified: false,
    sortBy: 'trending', // trending, mcap, volume, age
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Wallet State
  wallet: {
    address: null,
    isConnected: false,
    balance: '0.00',
  },

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock connection
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
    set({
      wallet: {
        address: mockAddress,
        isConnected: true,
        balance: (Math.random() * 10).toFixed(2)
      }
    })
  },

  disconnectWallet: () => {
    set({
      wallet: {
        address: null,
        isConnected: false,
        balance: '0.00'
      }
    })
  }
}))

export default useCoinStore
