import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

const QUOTE_TOKENS = ['USDT', 'USDC', 'ETH', 'SOL', 'WETH', 'WBTC'];

export const coinService = {
  async getTrending() {
    try {
      // Query for multiple common quote tokens to get a broad trending list
      const requests = QUOTE_TOKENS.slice(0, 3).map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
      const responses = await Promise.all(requests);

      const allPairs = responses.flatMap(r => r.data.pairs || []);

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
      console.error("DexScreener Search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    const mappedId = getMappedChainId(chainId);
    try {
      // Query for multiple common quote tokens on that chain to get a broader dataset
      const requests = QUOTE_TOKENS.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${mappedId} ${q}`));
      const responses = await Promise.all(requests);

      const allPairs = responses.flatMap(r => r.data.pairs || []);

      // Filter by chainId to ensure results are strictly for the requested network
      // and de-duplicate by pairAddress
      const filteredPairs = allPairs.filter(p => p.chainId === mappedId);
      const uniquePairs = Array.from(new Map(filteredPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs;
    } catch (error) {
      console.error("DexScreener Chain API error", error);
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
