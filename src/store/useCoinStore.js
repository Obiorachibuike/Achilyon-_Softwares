import { create } from 'zustand';

export const useCoinStore = create((set) => ({
  coins: [],
  loading: false,
  error: null,
  filters: {
    chain: 'ethereum',
    dex: 'all',
    age: '24h',
    minLiquidity: 10000,
    minMarketCap: 0,
    maxMarketCap: Infinity,
    minVolume24h: 0,
  },
  currentView: 'coins', // dashboard, wallets, coins, etc.

  setCoins: (coins) => set({ coins }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),
  setCurrentView: (view) => set({ currentView: view }),
}));
