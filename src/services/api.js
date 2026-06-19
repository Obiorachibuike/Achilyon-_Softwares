import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Helper to de-duplicate pairs by their pair address
const deduplicatePairs = (pairs) => {
  const seen = new Set();
  return pairs.filter(pair => {
    const duplicate = seen.has(pair.pairAddress);
    seen.add(pair.pairAddress);
    return !duplicate;
  });
};

export const coinService = {
  async getTrending() {
    try {
      // Fetch common quote tokens to get a broad range of trending pairs
      const quotes = ['USDT', 'USDC', 'ETH', 'SOL'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const results = await Promise.all(requests);

      let allPairs = [];
      results.forEach(res => {
        if (res.data.pairs) allPairs = [...allPairs, ...res.data.pairs];
      });

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
      // ChainId mapping for DexScreener if needed
      // Most common are: ethereum, bsc, solana, base, arbitrum, polygon, avax
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${chainId}`);
      // Secondary filter to ensure we only get pairs for the requested chain
      const pairs = response.data.pairs || [];
      return pairs.filter(p => p.chainId === chainId.toLowerCase() || p.chainId === (chainId === 'bnb' ? 'bsc' : chainId.toLowerCase()));
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
