import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

const getMappedChainId = (chainId) => {
  const mapping = {
    'bnb': 'bsc',
    'ethereum': 'ethereum',
    'solana': 'solana',
    'base': 'base',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  };
  return mapping[chainId] || chainId;
};

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
      // Fetch multiple high-volume quotes to discover trending pairs
      const quotes = ['USDT', 'USDC', 'WETH', 'SOL'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
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
      console.error("DexScreener Search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    const mappedChain = getMappedChainId(chainId);
    try {
      // DexScreener doesn't have a direct "all pairs for chain" endpoint
      // So we query for common base tokens on that chain
      const commonTokens = ['USDT', 'USDC', 'WETH', 'WBTC'];
      const requests = commonTokens.map(t => axios.get(`${DEX_SCREENER_API}/search?q=${mappedChain}%20${t}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(res => res.data.pairs || []);
      // Filter for strictly that chain since search can be broad
      const chainPairs = allPairs.filter(p => p.chainId === mappedChain);
      return deduplicatePairs(chainPairs);
    } catch (error) {
      console.error("DexScreener Chain API error", error);
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
