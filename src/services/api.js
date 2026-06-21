import axios from 'axios';
import { getMappedChainId } from '../lib/utils';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

const fetchPairsConcurrently = async (queryPrefix) => {
  const quoteTokens = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];
  const requests = quoteTokens.map(quote =>
    axios.get(`${DEX_SCREENER_API}/search?q=${queryPrefix ? `${queryPrefix} ` : ''}${quote}`)
      .catch(() => ({ data: { pairs: [] } }))
  );

  const results = await Promise.all(requests);
  const allPairs = results.flatMap(r => r.data.pairs || []);

  // De-duplicate by pairAddress
  const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());
  return uniquePairs;
};

export const coinService = {
  async getTrending() {
    try {
      return await fetchPairsConcurrently('');
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
      console.error("DexScreener API search error", error);
      return [];
    }
  },

  async getPairsByChain(chainName) {
    try {
      const mappedChainId = getMappedChainId(chainName);
      return await fetchPairsConcurrently(mappedChainId);
    } catch (error) {
      console.error("DexScreener API chain error", error);
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
