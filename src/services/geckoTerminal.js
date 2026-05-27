import axios from 'axios';

const BASE_URL = 'https://api.geckoterminal.com/api/v2';

export const geckoTerminalService = {
  async getTrendingPools(network = 'eth') {
    try {
      const response = await axios.get(`${BASE_URL}/networks/${network}/trending_pools`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching from GeckoTerminal:', error);
      throw error;
    }
  },

  async getNewPools(network = 'eth') {
    try {
      const response = await axios.get(`${BASE_URL}/networks/${network}/new_pools`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching new pools from GeckoTerminal:', error);
      throw error;
    }
  }
};
