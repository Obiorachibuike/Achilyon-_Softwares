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
    verifiedOnly: false,
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Wallet state
  wallet: {
    address: null,
    balance: 0,
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
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
    const mockBalance = (Math.random() * 10).toFixed(2)
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
      balance: 0,
      isConnected: false,
    }
  })
}))

export default useCoinStore
