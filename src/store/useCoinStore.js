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
    verified: false,
    searchQuery: '',
    minTrendScore: 0,
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  // Wallet state
  walletAddress: null,
  isWalletConnected: false,
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
    const mockBalance = (Math.random() * 10).toFixed(4);
    set({ walletAddress: mockAddress, isWalletConnected: true, balance: mockBalance });
  },

  disconnectWallet: () => set({ walletAddress: null, isWalletConnected: false, balance: '0.00' }),
}))

export default useCoinStore
