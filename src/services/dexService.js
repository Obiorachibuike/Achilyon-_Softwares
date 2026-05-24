import axios from 'axios';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const dexService = {
  async getLatestPairs(chainId = 'ethereum') {
    // Note: DexScreener doesn't have a simple "latest for chain" endpoint without search or specific pairs
    // Usually we use the token profiles or search with empty query for trending
    const response = await axios.get(`${DEXSCREENER_API}/search?q=${chainId}`);
    return response.data.pairs || [];
  },

  async searchPairs(query) {
    const response = await axios.get(`${DEXSCREENER_API}/search?q=${query}`);
    return response.data.pairs || [];
  },

  async getPair(chainId, pairAddress) {
    const response = await axios.get(`${DEXSCREENER_API}/pairs/${chainId}/${pairAddress}`);
    return response.data.pairs || [];
  }
};
