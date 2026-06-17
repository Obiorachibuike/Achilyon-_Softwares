import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // Fetch pairs for common base/quote tokens to get a broad discovery list
      const queries = ['USDT', 'USDC', 'ETH', 'SOL'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // Deduplicate by pairAddress
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
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
    try {
      // DexScreener uses 'bsc' for BNB chain
      const searchChain = chainId === 'bnb' ? 'bsc' : chainId;
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${searchChain}`);
      return (response.data.pairs || []).filter(p => p.chainId === searchChain);
    } catch (error) {
      console.error("DexScreener chain fetch error", error);
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
