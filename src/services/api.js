import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

// Common quote tokens to search for to get a broad discovery dataset
const QUOTE_TOKENS = ['USDT', 'USDC', 'WETH', 'SOL', 'WMATIC', 'WBNB', 'WAVAX'];

export const coinService = {
  async getTrending() {
    try {
      // Concurrently query for pairs with common quote tokens to get a diverse initial list
      const requests = QUOTE_TOKENS.map(token =>
        axios.get(`${DEX_SCREENER_API}/search?q=${token}`)
      );

      const results = await Promise.all(requests);
      const allPairs = results.flatMap(res => res.data.pairs || []);

      // Deduplicate by pairAddress
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
      // DexScreener uses 'bsc' for BNB chain
      const mappedChainId = chainId === 'bnb' ? 'bsc' : chainId;

      // We query for the chain name to get results for that specific network
      const response = await axios.get(`${DEX_SCREENER_API}/search?q=${mappedChainId}`);
      let pairs = response.data.pairs || [];

      // Secondary filter to ensure we only have pairs from the intended chain
      // (search is broad, e.g., searching "solana" might return bridge tokens on ETH)
      return pairs.filter(p => p.chainId === mappedChainId);
    } catch (error) {
      console.error(`DexScreener chain error for ${chainId}`, error);
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
