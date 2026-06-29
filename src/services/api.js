import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Common quote tokens to search for to get a broad list of pairs
const COMMON_TOKENS = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];

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
      // Query multiple common tokens to get a diverse set of trending/active pairs
      const requests = COMMON_TOKENS.slice(0, 3).map(token =>
        axios.get(`${DEX_SCREENER_API}/search?q=${token}`)
      );

      const results = await Promise.all(requests);
      const allPairs = results.flatMap(r => r.data.pairs || []);

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
      console.error("DexScreener Search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      // DexScreener uses 'bsc' for BNB chain
      const mappedChainId = chainId === 'bnb' ? 'bsc' : chainId;

      // We search for the chain name/id to get relevant pairs
      // For more comprehensive results, we could combine with common tokens
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChainId}`);
      let pairs = response.data.pairs || [];

      // Filter strictly by chainId if DexScreener returns mixed results
      return pairs.filter(p => p.chainId === mappedChainId);
    } catch (error) {
      console.error("DexScreener Chain error", error);
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
