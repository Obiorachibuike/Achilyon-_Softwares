import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// We'll query multiple common quote tokens to get a broader set of pairs
const QUOTE_TOKENS = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];

export const coinService = {
  async getTrending() {
    try {
      // For discovery, we fetch pairs for multiple major tokens concurrently
      const requests = QUOTE_TOKENS.slice(0, 3).map(token =>
        axios.get(`${DEX_SCREENER_API}/search?q=${token}`)
      );

      const results = await Promise.all(requests);
      const allPairs = results.flatMap(res => res.data.pairs || []);

      // De-duplicate by pair address
      const seen = new Set();
      return allPairs.filter(pair => {
        const isDuplicate = seen.has(pair.pairAddress);
        seen.add(pair.pairAddress);
        return !isDuplicate;
      });
    } catch (error) {
      console.error("DexScreener trending API error", error);
      return [];
    }
  },

  async searchPairs(query) {
    if (!query) return [];
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${query}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error("DexScreener search API error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      const mappedChainId = getMappedChainId(chainId);
      // DexScreener search with chainId usually works well to filter
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChainId}`);

      // Double check filter for the specific chain
      return (response.data.pairs || []).filter(p => p.chainId === mappedChainId);
    } catch (error) {
      console.error("DexScreener chain API error", error);
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
