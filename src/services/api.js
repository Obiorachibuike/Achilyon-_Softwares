import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Helper to map UI chain names to DexScreener API chain IDs
const mapChainId = (chain) => {
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
      // Fetch pairs for common high-volume quotes to simulate a trending discovery
      const quotes = ['USDT', 'USDC', 'ETH', 'SOL'];
      const requests = quotes.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(r => r.data.pairs || []);
      // Remove duplicates by pairAddress
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

  async getPairsByChain(chainId) {
    const mappedId = mapChainId(chainId);
    try {
      // Querying for the chain name usually returns top pairs for that chain on DexScreener
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedId}`);
      // Filter results to ensure they belong to the requested chain
      return (response.data.pairs || []).filter(p => p.chainId === mappedId);
    } catch (error) {
      console.error(`DexScreener chain fetch error for ${mappedId}`, error);
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
