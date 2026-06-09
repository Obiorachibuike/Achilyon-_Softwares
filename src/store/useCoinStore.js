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
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  walletAddress: null,
  walletBalance: null,

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10).toUpperCase();
    const mockBalance = (Math.random() * 9 + 1).toFixed(2); // 1.00 - 10.00 ETH
    set({ walletAddress: mockAddress, walletBalance: mockBalance });
  }
}))

export default useCoinStore
