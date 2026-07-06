import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

const getMappedChainId = (chainId) => {
  const mapping = {
    'bnb': 'bsc',
    'ethereum': 'ethereum',
    'base': 'base',
    'solana': 'solana',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  };
  return mapping[chainId] || chainId;
};

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
      // Query common base tokens to get a broad set of active pairs
      const queries = ['USDT', 'USDC', 'WETH', 'SOL'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

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
      console.error("DexScreener search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    const mappedChainId = getMappedChainId(chainId);
    try {
      // Since we can't fetch all pairs for a chain, we search by chain name/id
      // and common tokens to maximize results
      const queries = [mappedChainId, 'USDT', 'USDC'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // Filter by chainId to ensure we only return pairs for the requested network
      const chainPairs = allPairs.filter(p => p.chainId === mappedChainId);
      return deduplicatePairs(chainPairs);
    } catch (error) {
      console.error("DexScreener chain pairs error", error);
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
