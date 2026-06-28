import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  dashboardCoins: [], // Dedicated for dashboard view to avoid filter interference
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all',
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
  address: null,
  isConnected: false,

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setDashboardCoins: (coins) => set({ dashboardCoins: coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const mockAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    set({ address: mockAddress, isConnected: true });
  },

  disconnectWallet: () => set({ address: null, isConnected: false }),
}))

export default useCoinStore
