import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Helper to map UI chain names to DexScreener chain IDs
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
  return mapping[chain] || chain;
};

export const coinService = {
  async getTrending() {
    try {
      // Query for common quote tokens to get a broad discovery set
      const quotes = ['USDT', 'USDC', 'WETH', 'SOL'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // De-duplicate by pair address
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
      console.error("Search API error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      const mappedChain = getMappedChainId(chainId);
      // DexScreener doesn't have a broad "by chain" endpoint,
      // so we search for the chain name and then filter.
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChain}`);
      const pairs = response.data.pairs || [];
      return pairs.filter(p => p.chainId === mappedChain);
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
