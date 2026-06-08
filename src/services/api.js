import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    // For a real trending endpoint, DexScreener uses token profiles or specific search volumes
    // For MVP, we fetch latest pairs which serves as a discovery mechanism
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
    const response = await axios.get(`${DEX_SCREENER_API}/search?q=${query}`);
    return response.data.pairs || [];
  },

  async getPairsByChain(chainId) {
    // DexScreener API doesn't have a direct "all pairs for chain" endpoint without a query
    // So we query for common quote tokens on that chain to get a representative sample
    const quotes = ['USDT', 'USDC', 'ETH', 'WETH', 'SOL'];
    try {
      const results = await Promise.all(
        quotes.map(quote =>
          axios.get(`${DEX_SCREENER_API}/search?q=${chainId} ${quote}`)
            .then(res => res.data.pairs || [])
            .catch(() => [])
        )
      );

      // Flatten and remove duplicates by pairAddress
      const allPairs = results.flat();
      const uniquePairs = Array.from(new Map(allPairs.map(p => [p.pairAddress, p])).values());

      return uniquePairs;
    } catch (error) {
      console.error(`Error fetching pairs for ${chainId}:`, error);
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
