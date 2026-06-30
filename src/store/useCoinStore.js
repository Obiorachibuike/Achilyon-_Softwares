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
    sort: 'trending', // trending, mcap, volume, age
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

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
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10).toUpperCase() + '...' + Math.random().toString(16).slice(2, 6).toUpperCase();
    const mockBalance = (1.0 + Math.random() * 9).toFixed(2);
    set({ address: mockAddress, balance: mockBalance });
  },

  disconnectWallet: () => set({ address: null, balance: '0.00' }),
}))

export default useCoinStore
