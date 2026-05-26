import { create } from 'zustand';

export const useCoinStore = create((set) => ({
  tokens: [],
  isLoading: false,
  error: null,
  currentView: 'coins',
  filters: {
    chain: 'ethereum',
    dex: 'all',
    timeWindow: '24h',
    mcap: 'all',
    liquidity: 'all',
    age: 'all',
    volume: 'all',
    buysSellsRatio: 'all',
    holders: 'all',
    search: '',
  },
  setView: (view) => set({ currentView: view }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  setTokens: (tokens) => set({ tokens }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getFilteredTokens: () => {
    const { tokens, filters } = useCoinStore.getState();
    return tokens.filter(token => {
      // Search filtering
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const symbol = token.baseToken?.symbol?.toLowerCase() || '';
        const name = token.baseToken?.name?.toLowerCase() || '';
        const address = token.baseToken?.address?.toLowerCase() || '';
        if (!symbol.includes(searchLower) && !name.includes(searchLower) && !address.includes(searchLower)) {
          return false;
        }
      }

      // Market Cap filtering
      if (filters.mcap !== 'all') {
        const fdv = token.fdv || 0;
        if (filters.mcap === 'micro' && fdv > 1000000) return false;
        if (filters.mcap === 'small' && (fdv < 1000000 || fdv > 10000000)) return false;
        if (filters.mcap === 'mid' && (fdv < 10000000 || fdv > 100000000)) return false;
        if (filters.mcap === 'large' && fdv < 100000000) return false;
      }

      // Liquidity filtering
      if (filters.liquidity !== 'all') {
        const liq = token.liquidity?.usd || 0;
        if (filters.liquidity === '10k' && liq < 10000) return false;
        if (filters.liquidity === '100k' && liq < 100000) return false;
        if (filters.liquidity === '1m' && liq < 1000000) return false;
      }

      // Volume filtering
      if (filters.volume !== 'all') {
        const vol = token.volume?.h24 || 0;
        if (filters.volume === '10k' && vol < 10000) return false;
        if (filters.volume === '100k' && vol < 100000) return false;
        if (filters.volume === '1m' && vol < 1000000) return false;
      }

      // Age filtering (simulated as dexScreener pairs have pairCreatedAt)
      if (filters.age !== 'all') {
        const createdAt = token.pairCreatedAt || 0;
        const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
        if (filters.age === '1h' && ageHours > 1) return false;
        if (filters.age === '6h' && ageHours > 6) return false;
        if (filters.age === '24h' && ageHours > 24) return false;
        if (filters.age === '7d' && ageHours > 168) return false;
      }

      // DEX filtering
      if (filters.dex !== 'all' && token.dexId !== filters.dex) {
        return false;
      }

      return true;
    });
  }
}));
