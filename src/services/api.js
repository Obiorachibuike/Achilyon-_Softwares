import axios from 'axios'

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex'
const GECKOTERMINAL_BASE_URL = 'https://api.geckoterminal.com/api/v2'

export const coinService = {
  // Fetch trending tokens from DexScreener
  async getTrending() {
    try {
      // DexScreener doesn't have a direct "trending" endpoint in their public API
      // but we can search for popular ones or use specific pairs.
      // For MVP, we'll use their search with a generic query or a known trending list if available.
      const response = await axios.get(`${DEXSCREENER_BASE_URL}/search?q=trending`)
      return response.data.pairs || []
    } catch (error) {
      console.error('Error fetching trending from DexScreener:', error)
      return []
    }
  },

  // Search tokens by query (symbol, name, address)
  async searchTokens(query) {
    try {
      const response = await axios.get(`${DEXSCREENER_BASE_URL}/search?q=${query}`)
      return response.data.pairs || []
    } catch (error) {
      console.error('Error searching tokens:', error)
      return []
    }
  },

  // Get tokens for a specific chain from GeckoTerminal
  async getNewPools(network = 'eth') {
    try {
      const response = await axios.get(`${GECKOTERMINAL_BASE_URL}/networks/${network}/new_pools`)
      return response.data.data || []
    } catch (error) {
      console.error(`Error fetching new pools for ${network}:`, error)
      return []
    }
  },

  // Get pair details from DexScreener
  async getPairDetails(chainId, pairAddress) {
    try {
      const response = await axios.get(`${DEXSCREENER_BASE_URL}/pairs/${chainId}/${pairAddress}`)
      return response.data.pair
    } catch (error) {
      console.error('Error fetching pair details:', error)
      return null
    }
  }
}
