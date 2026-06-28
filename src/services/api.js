import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Common quote tokens to discover pairs
const QUOTE_TOKENS = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];

export const coinService = {
  async getTrending() {
    try {
      // Query multiple common tokens to get a broader dataset
      const requests = QUOTE_TOKENS.slice(0, 3).map(token =>
        axios.get(`${DEX_SCREENER_API}/search?q=${token}`)
      );

      const results = await Promise.all(requests);
      const allPairs = results.flatMap(r => r.data.pairs || []);

      // De-duplicate by pair address
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
    const mappedChain = getMappedChainId(chainId);
    try {
      // For chain discovery, we query for common quote tokens on that chain
      // DexScreener search results often include chain info
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChain}`);
      return (response.data.pairs || []).filter(p => p.chainId === mappedChain);
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
