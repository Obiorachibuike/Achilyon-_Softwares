import axios from 'axios';

const BASE_URL = 'https://api.dexscreener.com/latest/dex';

export const dexScreenerService = {
  async getLatestPairs(chainId) {
    try {
      // DexScreener doesn't have a direct "latest by chain" endpoint in their free API
      // but we can search for common tokens or use their search endpoint.
      // For this demo, we'll use a search query for the chain to get active pairs.
      const response = await axios.get(`${BASE_URL}/search?q=${chainId}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error('Error fetching from DexScreener:', error);
      throw error;
    }
  },

  async getPair(chainId, pairAddress) {
    try {
      const response = await axios.get(`${BASE_URL}/pairs/${chainId}/${pairAddress}`);
      return response.data.pair;
    } catch (error) {
      console.error('Error fetching pair from DexScreener:', error);
      throw error;
    }
  }
};
