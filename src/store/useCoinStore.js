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
    verifiedOnly: false,
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Wallet State
  address: null,
  balance: '0.00',
  isConnected: false,

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
    set({
      address: mockAddress,
      balance: mockBalance,
      isConnected: true
    });
  },

  disconnectWallet: () => set({
    address: null,
    balance: '0.00',
    isConnected: false
  })
}))

export default useCoinStore
