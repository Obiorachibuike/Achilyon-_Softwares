import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Helper to deduplicate pairs
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
      // Query for common quote tokens to get a broad discovery dataset
      const quotes = ['USDT', 'USDC', 'ETH', 'SOL'];
      const requests = quotes.map(quote => axios.get(`${DEX_SCREENER_API}/search?q=${quote}`));
      const results = await Promise.all(requests);

      const allPairs = results.flatMap(res => res.data.pairs || []);
      return deduplicatePairs(allPairs);
    } catch (error) {
      console.error("DexScreener API error (getTrending)", error);
      return [];
    }
  },

  async searchPairs(query) {
    if (!query) return [];
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${query}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error("DexScreener API error (searchPairs)", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      const mappedChainId = getMappedChainId(chainId);

      // DexScreener doesn't have a direct "all pairs for chain" endpoint,
      // so we query for the chain name and common tokens.
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChainId}`);
      let pairs = response.data.pairs || [];

      // Filter strictly by the requested chain to avoid noise from other chains in search results
      return pairs.filter(p => p.chainId === mappedChainId);
    } catch (error) {
      console.error(`DexScreener API error (getPairsByChain: ${chainId})`, error);
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
