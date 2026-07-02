import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  dashboardCoins: [], // Separate state for dashboard to avoid filter interference
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all', // Set default to 'all' for better initial visibility
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    sortBy: 'trending',
    verifiedOnly: false,
  },
  loading: false,
  error: null,
  view: 'dashboard',

  // Wallet State
  wallet: {
    connected: false,
    address: null,
    balance: '0.00',
  },

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setDashboardCoins: (coins) => set({ dashboardCoins: coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock wallet connection
    const mockAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockBalance = (Math.random() * 10).toFixed(2);
    set({
      wallet: {
        connected: true,
        address: mockAddress,
        balance: mockBalance,
      }
    });
  },

  disconnectWallet: () => set({
    wallet: {
      connected: false,
      address: null,
      balance: '0.00',
    }
  }),
}))

export default useCoinStore
