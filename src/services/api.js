import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

export const coinService = {
  async getTrending() {
    try {
      // DexScreener doesn't have a global trending endpoint in the public API
      // We'll search for common pairs to populate the initial list
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
    try {
      // ChainId mapping if necessary, but DexScreener often uses slugs
      // We query multiple common base/quote tokens to get a diverse set of pairs for the chain
      const queries = ['USDT', 'USDC', 'ETH', 'WETH', 'SOL'];
      const results = await Promise.all(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = results.flatMap(r => r.data.pairs || []);

      // De-duplicate pairs by pairAddress
      const seen = new Set();
      const uniquePairs = allPairs.filter(p => {
        if (seen.has(p.pairAddress)) return false;
        seen.add(p.pairAddress);
        return true;
      });

      // DexScreener uses 'bsc' for BNB chain
      const targetChain = chainId === 'bnb' ? 'bsc' : chainId.toLowerCase();

      // Filter by chainId (DexScreener uses chainId field like 'ethereum', 'bsc', 'solana', etc)
      return uniquePairs.filter(p => p.chainId === targetChain);
    } catch (error) {
      console.error("DexScreener Chain discovery error", error);
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
