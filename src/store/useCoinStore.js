import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  filters: {
    network: 'all',
    dex: 'all',
    age: '24h',
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    verified: false,
    sortBy: 'trending',
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Mock Wallet State
  address: null,
  connected: false,

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);
    set({ address: mockAddress, connected: true });
  },

  disconnectWallet: () => set({ address: null, connected: false }),
}))

export default useCoinStore
