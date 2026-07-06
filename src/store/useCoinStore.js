import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all', // Set default to 'all' for better initial discovery
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    sortBy: 'trending', // trending, mcap, volume, age
    verifiedOnly: false,
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
    const mockAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockBalance = (Math.random() * 10).toFixed(2);
    set({ address: mockAddress, balance: mockBalance });
  },

  disconnectWallet: () => set({ address: null, balance: '0.00' }),
}))

export default useCoinStore
