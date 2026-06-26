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
  address: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  connectWallet: () => {
    const randomAddr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    set({ address: randomAddr });
  },

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
}))

export default useCoinStore
