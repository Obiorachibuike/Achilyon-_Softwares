import { create } from 'zustand'

const useCoinStore = create((set) => ({
  coins: [],
  address: null,
  filters: {
    network: 'all',
    dex: 'all',
    age: 'all',
    marketCap: 'all',
    liquidity: 'all',
    volume: 'all',
    searchQuery: '',
    sort: 'trending',
  },
  loading: false,
  error: null,
  view: 'dashboard', // dashboard, wallets, contracts, coins, alerts, smart-money, trending

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  setView: (view) => set({ view }),

  setCoins: (coins) => set({ coins }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  connectWallet: () => {
    const randomAddress = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    set({ address: randomAddress });
  },

  disconnectWallet: () => set({ address: null }),
}))

export default useCoinStore
