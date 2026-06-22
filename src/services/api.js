import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Map internal chain names to DexScreener chainIds
const chainMap = {
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
      // Query for multiple common quote tokens to get a diverse trending list
      const queries = ['USDT', 'USDC', 'WETH', 'SOL'];
      const responses = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = responses.flatMap(r => r.data.pairs || []);
      // Remove duplicates by pairAddress
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
      console.error("DexScreener Search error", error);
      return [];
    }
  },

  async getPairsByChain(network) {
    const chainId = chainMap[network] || network;
    try {
      // Since there's no "list all" for a chain, we search for the chainId
      // and common base assets on that chain
      const queries = [chainId, 'USDT', 'USDC'];
      const responses = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = responses.flatMap(r => r.data.pairs || []);
      // Filter strictly for the requested chain
      const filteredPairs = allPairs.filter(p => p.chainId === chainId);

      const uniquePairs = Array.from(new Map(filteredPairs.map(p => [p.pairAddress, p])).values());
      return uniquePairs;
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
