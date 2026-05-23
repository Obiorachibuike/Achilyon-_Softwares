import axios from 'axios';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  getLatestPairs: async () => {
    // Note: DexScreener doesn't have a simple "all latest" endpoint without chain
    // Usually we fetch by chain or search. For MVP, we'll fetch some trending/latest from major chains
    try {
      const response = await axios.get(`${DEXSCREENER_API}/search?q=WETH`);
      return response.data.pairs || [];
    } catch (error) {
      console.error('Error fetching latest pairs:', error);
      return [];
    }
  },

  searchPairs: async (query) => {
    try {
      const response = await axios.get(`${DEXSCREENER_API}/search?q=${query}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error('Error searching pairs:', error);
      return [];
    }
  },

  getPairsByChain: async (chainId) => {
    // This is a placeholder as DexScreener API has specific structures
    // For now, search by chain name or use their specific chain endpoints if available
    try {
      const response = await axios.get(`${DEXSCREENER_API}/search?q=${chainId}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error(`Error fetching pairs for ${chainId}:`, error);
      return [];
    }
  }
};
