import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // Query for various common quotes to get a diverse trending set
      const queries = ['USDT', 'USDC', 'WETH', 'SOL'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = results.flatMap(r => r.data.pairs || []);
      return allPairs;
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
      console.error("Search API error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      // Map common chain names if needed
      const q = chainId === 'bnb' ? 'bsc' : chainId;
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${q}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error("Chain API error", error);
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
