import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // Fetching pairs with common quote tokens for broad discovery
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=USDT`);
      return response.data.pairs || [];
    } catch (error) {
      console.error("DexScreener API error", error);
      return [];
    }
  },

  async searchPairs(query) {
    if (!query) return [];
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${query}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error("DexScreener API error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      // DexScreener uses 'bsc' for BNB chain
      const searchChain = chainId === 'bnb' ? 'bsc' : chainId;

      // We search for the chain name and then strictly filter by chainId in the application
      // To get more results, we can search for common tokens on that chain
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${searchChain}`);
      const pairs = response.data.pairs || [];

      return pairs.filter(p => p.chainId === searchChain);
    } catch (error) {
      console.error("DexScreener API error", error);
      return [];
    }
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
