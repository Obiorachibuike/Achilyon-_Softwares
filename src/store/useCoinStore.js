import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  dashboardCoins: [],
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all', // Default to all to show more data initially
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

  // Wallet state
  address: null,
  balance: '0.00',
  isConnected: false,

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setDashboardCoins: (dashboardCoins) => set({ dashboardCoins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    // Mock connection
    const mockAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    set({
      address: mockAddress,
      balance: (Math.random() * 10).toFixed(2),
      isConnected: true
    });
  },

  disconnectWallet: () => set({ address: null, balance: '0.00', isConnected: false }),
}))

export default useCoinStore
