import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Map internal chain IDs to DexScreener IDs
const getMappedChainId = (chainId) => {
  const mapping = {
    'ethereum': 'ethereum',
    'base': 'base',
    'bnb': 'bsc',
    'solana': 'solana',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  };
  return mapping[chainId] || chainId;
};

export const coinService = {
  async getTrending() {
    try {
      // Querying common quote tokens across major chains to get a broad trending set
      const quotes = ['USDT', 'USDC', 'WETH', 'SOL'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(res => res.data.pairs || []);
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
      console.error("Search API error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    const dsChainId = getMappedChainId(chainId);
    try {
      // Since DexScreener doesn't have an "all pairs for chain" endpoint,
      // we query common quote tokens for that specific chain
      const quotes = ['USDT', 'USDC', 'WETH', 'WBNB', 'SOL', 'WMATIC', 'WAVAX'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(res => res.data.pairs || []);
      // Filter for the specific chain and de-duplicate
      const chainPairs = allPairs.filter(p => p.chainId === dsChainId);
      const uniquePairs = Array.from(new Map(chainPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs;
    } catch (error) {
      console.error("Chain API error", error);
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
