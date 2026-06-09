import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
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
      console.error("DexScreener Search error", error);
      return [];
    }
  },

  async getPairsByChain(chainId) {
    // DexScreener doesn't have a chain-wide endpoint.
    // Concurrently fetch common quote tokens to build a representative dataset.
    const quoteTokens = ['USDT', 'USDC', 'ETH', 'WETH', 'SOL'];
    try {
      const requests = quoteTokens.map(quote =>
        axios.get(`${DEX_SCREENER_API}/search?q=${chainId} ${quote}`)
      );
      const responses = await Promise.all(requests);

      // Merge and deduplicate pairs
      const allPairs = responses.flatMap(r => r.data.pairs || []);
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      // Secondary filter to ensure we only have pairs for the requested chain
      return uniquePairs.filter(p => p.chainId === chainId);
    } catch (error) {
      console.error(`DexScreener chain fetch error for ${chainId}`, error);
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
