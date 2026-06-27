import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';
const GECKO_TERMINAL_API = 'https://api.geckoterminal.com/api/v2';

// Helper to map chain names to API identifiers
const getMappedChainId = (chain) => {
  const mapping = {
    'ethereum': 'ethereum',
    'base': 'base',
    'bnb': 'bsc',
    'solana': 'solana',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  };
  return mapping[chain.toLowerCase()] || chain.toLowerCase();
};

export const coinService = {
  async getTrending() {
    try {
      // DexScreener search with common quote tokens often returns trending/active pairs
      const queries = ['USDT', 'USDC', 'WETH', 'SOL'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // Deduplicate by pair address
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
    } catch (error) {
      console.error("DexScreener trending fetch error", error);
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

  async getPairsByChain(chain) {
    const chainId = getMappedChainId(chain);
    try {
      // DexScreener doesn't have a "list all" for chain, so we search by chain name
      // or common tokens on that chain.
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${chainId}`);
      // Filter results to ensure they belong to the requested chain
      return (response.data.pairs || []).filter(p => p.chainId === chainId);
    } catch (error) {
      console.error(`DexScreener chain fetch error for ${chain}`, error);
      return [];
    }
  }
};

export const geckoService = {
  async getNewPools(chain = 'eth') {
    const network = getMappedChainId(chain);
    try {
        const response = await axios.get(`${GECKO_TERMINAL_API}/networks/${network}/new_pools`);
        return response.data.data || [];
    } catch (e) {
        console.error("GeckoTerminal new pools error", e);
        return [];
    }
  },

  async getTrendingPools(chain = 'eth') {
    const network = getMappedChainId(chain);
    try {
      const response = await axios.get(`${GECKO_TERMINAL_API}/networks/${network}/trending_pools`);
      return response.data.data || [];
    } catch (e) {
      console.error("GeckoTerminal trending pools error", e);
      return [];
    }
  }
};
