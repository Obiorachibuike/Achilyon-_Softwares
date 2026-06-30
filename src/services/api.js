import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // Fetching across common quote tokens to get a diverse discovery set
      const commonQuotes = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];
      const requests = commonQuotes.slice(0, 3).map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`));
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
      console.error("DexScreener search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    try {
      const mappedChain = getMappedChainId(chainId);
      // We search for the chain name and then filter by chainId in the application
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChain}`);
      return (response.data.pairs || []).filter(p => p.chainId === mappedChain);
    } catch (error) {
      console.error(`DexScreener chain error (${chainId})`, error);
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
