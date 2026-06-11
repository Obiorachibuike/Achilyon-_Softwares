import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // For discovery, we query for common quotes across top chains to get a broader dataset
      const commonQuotes = ['USDT', 'USDC', 'ETH', 'SOL'];
      const requests = commonQuotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const responses = await Promise.all(requests);

      const allPairs = responses.flatMap(r => r.data.pairs || []);

      // De-duplicate by pairAddress
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs;
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
      console.error("DexScreener search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    // DexScreener uses 'bsc' for BNB chain
    const dexChainId = chainId === 'bnb' ? 'bsc' : chainId;
    try {
      // Querying for common tokens on specific chain
      // Adding common quotes to narrow results to that chain more effectively
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${dexChainId}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error(`DexScreener chain fetch error for ${dexChainId}`, error);
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
