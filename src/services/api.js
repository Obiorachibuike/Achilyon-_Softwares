import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Common quote tokens to search against to broaden results
const QUOTE_TOKENS = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];

const deduplicatePairs = (pairs) => {
  const seen = new Set();
  return pairs.filter(pair => {
    if (seen.has(pair.pairAddress)) return false;
    seen.add(pair.pairAddress);
    return true;
  });
};

export const coinService = {
  async getTrending() {
    try {
      // Query multiple common tokens to get a diverse set of "trending" or active pairs
      const requests = QUOTE_TOKENS.slice(0, 3).map(token =>
        axios.get(`${DEX_SCREENER_API}/search?q=${token}`)
      );
      const results = await Promise.all(requests);
      const allPairs = results.flatMap(res => res.data.pairs || []);
      return deduplicatePairs(allPairs);
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
      // DexScreener uses 'bsc' instead of 'bnb' in some contexts, handled in App.jsx usually
      // To get more pairs, we query the chain name + common tokens
      const requests = [
        axios.get(`${DEX_SCREENER_API}/search?q=${chainId}`),
        ...QUOTE_TOKENS.slice(0, 2).map(token =>
            axios.get(`${DEX_SCREENER_API}/search?q=${chainId}%20${token}`)
        )
      ];

      const results = await Promise.all(requests);
      const allPairs = results.flatMap(res => res.data.pairs || []);

      // Filter strictly by chainId just in case search was too broad
      return deduplicatePairs(allPairs).filter(p => p.chainId === chainId);
    } catch (error) {
      console.error(`Error fetching pairs for ${chainId}`, error);
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
