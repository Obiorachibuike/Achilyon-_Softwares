import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    // For a real trending endpoint, DexScreener uses token profiles or specific search volumes
    // For MVP, we fetch latest pairs which serves as a discovery mechanism
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=USDT`);
      return response.data.pairs || [];
    } catch (error) {
      console.error("DexScreener API error", error);
      return [];
    }
  },

  async searchPairs(query) {
    if (!query) return [];
    const response = await axios.get(`${DEX_SCREENER_API}/search?q=${query}`);
    return response.data.pairs || [];
  },

  async getPairsByChain(chainId) {
    // DexScreener API doesn't have a direct "all pairs for chain" endpoint without a query
    // So we query for common base tokens on that chain
    const response = await axios.get(`${DEX_SCREENER_API}/search?q=${chainId}`);
    return response.data.pairs || [];
  }
};

export const geckoService = {
  async getNewPools(network = 'eth') {
    try {
        const response = await axios.get(`https://api.geckoterminal.com/api/v2/networks/${network}/new_pools`);
        return response.data.data;
    } catch (e) {
        console.error("GeckoTerminal API error", e);
        return [];
    }
  }
};
