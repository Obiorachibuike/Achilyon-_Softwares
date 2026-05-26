import axios from 'axios';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

const GECKOTERMINAL_API = 'https://api.geckoterminal.com/api/v2';

const CHAIN_MAPPING = {
  ethereum: 'eth',
  base: 'base',
  bsc: 'bsc',
  solana: 'solana',
  arbitrum: 'arbitrum',
  polygon: 'polygon_pos',
  avalanche: 'avax',
  tron: 'tron',
  ton: 'ton'
};

export const dexService = {
  async getLatestPairs(chainId = 'ethereum') {
    // Note: DexScreener doesn't have a simple "latest for chain" endpoint without search or specific pairs
    // Usually we use the token profiles or search with empty query for trending
    const response = await axios.get(`${DEXSCREENER_API}/search?q=${chainId}`);
    return response.data.pairs || [];
  },

  async getNewPools(network = 'ethereum') {
    // GeckoTerminal new pools endpoint
    const geckoChainId = CHAIN_MAPPING[network] || network;
    try {
      const response = await axios.get(`${GECKOTERMINAL_API}/networks/${geckoChainId}/new_pools`);
      // Normalize GeckoTerminal data to look more like DexScreener if needed,
      // but for now we'll just return it or use DexScreener trending
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching new pools:", error);
      return [];
    }
  },

  async getTrendingPools() {
    // DexScreener trending pairs (simulated via search for now as they don't have a direct "trending" REST endpoint easily accessible without API key in some cases)
    const response = await axios.get(`${DEXSCREENER_API}/search?q=trending`);
    return response.data.pairs || [];
  },

  async searchPairs(query) {
    const response = await axios.get(`${DEXSCREENER_API}/search?q=${query}`);
    return response.data.pairs || [];
  },

  async getPair(chainId, pairAddress) {
    const response = await axios.get(`${DEXSCREENER_API}/pairs/${chainId}/${pairAddress}`);
    return response.data.pairs || [];
  },

  async getSocialSignals(tokenAddress) {
    // Simulated chat/social scraping logic
    // Picks up sentiment spikes from Telegram/Discord/Twitter
    const sentiments = ['Bullish', 'Bearish', 'Neutral', 'Highly Bullish', 'Accumulating'];
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const signalStrength = Math.floor(Math.random() * 100);

    return {
      tokenAddress,
      sentiment: randomSentiment,
      strength: signalStrength,
      mentions24h: Math.floor(Math.random() * 1000),
      action: signalStrength > 70 ? 'BUY' : signalStrength < 30 ? 'SELL' : 'WAIT'
    };
  }
};
