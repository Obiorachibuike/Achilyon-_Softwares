import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // Query for common base tokens to get a broad set of trending pairs
      const quotes = ['USDT', 'USDC', 'WETH', 'SOL'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // Deduplicate by pairAddress
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs;
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
    try {
      // For a specific chain, we search for the chain name and common quote tokens on that chain
      const quotes = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${chainId} ${q}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // Filter strictly by chainId as search is broad
      const filteredPairs = allPairs.filter(p => p.chainId === chainId || (chainId === 'bnb' && p.chainId === 'bsc'));

      // Deduplicate
      return Array.from(new Map(filteredPairs.map(p => [p.pairAddress, p])).values());
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
