import axios from 'axios';

const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex';

const chainMapping = {
  bnb: 'bsc',
  ethereum: 'ethereum',
  base: 'base',
  solana: 'solana',
  arbitrum: 'arbitrum',
  polygon: 'polygon',
  avalanche: 'avalanche'
};

const getUniquePairs = (pairs) => {
  const seen = new Set();
  return pairs.filter(pair => {
    if (!pair.pairAddress) return false;
    const id = pair.pairAddress.toLowerCase();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const coinService = {
  async getTrending() {
    try {
      // Fetch data using multiple common quote tokens to broaden discovery
      const queries = ['USDT', 'USDC', 'ETH', 'SOL'];
      const results = await Promise.allSettled(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${q}`))
      );

      const allPairs = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data.pairs || []);

      return getUniquePairs(allPairs);
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
    const mappedChain = chainMapping[chainId.toLowerCase()] || chainId.toLowerCase();
    try {
      // Query for multiple common tokens on the specific chain
      const queries = ['USDT', 'USDC', 'WETH', 'SOL'];
      const results = await Promise.allSettled(
        queries.map(q => axios.get(`${DEX_SCREENER_API}/search?q=${mappedChain} ${q}`))
      );

      const allPairs = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data.pairs || []);

      // Filter to ensure results strictly match the requested chain
      const filteredPairs = allPairs.filter(p => p.chainId === mappedChain);

      return getUniquePairs(filteredPairs);
    } catch (error) {
      console.error(`DexScreener API error for chain ${chainId}`, error);
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
