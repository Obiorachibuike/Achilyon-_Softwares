import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Chain mapping for DexScreener
const CHAIN_MAP = {
  'ethereum': 'ethereum',
  'base': 'base',
  'bnb': 'bsc',
  'solana': 'solana',
  'arbitrum': 'arbitrum',
  'polygon': 'polygon',
  'avalanche': 'avalanche'
};

export const coinService = {
  async getTrending() {
    try {
      // Get trending by searching for broad market tokens
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
      console.error("DexScreener search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    const dsChainId = CHAIN_MAP[chainId] || chainId;
    try {
      // DexScreener doesn't have a direct "list all" for a chain.
      // We fetch common quote pairs to populate the discovery list.
      const queries = ['USDT', 'USDC', 'ETH', 'SOL'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${dsChainId}%20${q}`))
      );

      const allPairs = results.flatMap(r => r.data.pairs || []);

      // Deduplicate by pair address
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs.filter(p => p.chainId === dsChainId);
    } catch (error) {
      console.error(`Error fetching pairs for chain ${dsChainId}`, error);
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
