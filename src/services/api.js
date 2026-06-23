import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // Fetching pairs with high liquidity/volume by searching common quote tokens
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=USDT`);
      return response.data.pairs || [];
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
    const mappedChainId = getMappedChainId(chainId);
    try {
      // DexScreener search API is broad, so we query for the chain and common quotes
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChainId}`);
      // Filter results to ensure they belong to the correct chain
      return (response.data.pairs || []).filter(p => p.chainId === mappedChainId);
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
