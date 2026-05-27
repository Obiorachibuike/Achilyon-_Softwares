import { useEffect, useCallback } from 'react';
import CoinFilters from '../components/CoinFilters';
import CoinsTable from '../components/CoinsTable';
import AISummary from '../components/AISummary';
import { useCoinStore } from '../store/useCoinStore';
import { dexScreenerService } from '../services/dexScreener';
import { RefreshCcw } from 'lucide-react';

export default function CoinsPage() {
  const { filters, setCoins, setLoading, setError, loading, coins } = useCoinStore();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pairs = await dexScreenerService.getLatestPairs(filters.chain);

      // Apply client-side filters (mocking what a backend indexer would do)
      const filteredPairs = pairs.filter(pair => {
        const liquidity = pair.liquidity?.usd || 0;
        const volume = pair.volume?.h24 || 0;
        return liquidity >= filters.minLiquidity && volume >= filters.minVolume24h;
      });

      setCoins(filteredPairs);
    } catch (err) {
      setError('Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  }, [filters.chain, filters.minLiquidity, filters.minVolume24h, setCoins, setError, setLoading]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Market Terminal</h2>
          <p className="text-neutral-500 text-sm">Real-time on-chain discovery and intelligence</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400"
          disabled={loading}
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <CoinFilters />

      <div className="flex-1 overflow-hidden flex flex-col p-6">
        {coins.length > 0 && <AISummary token={coins[0]} />}

        <div className="flex-1 bg-neutral-900/30 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
          <CoinsTable />
        </div>
      </div>
    </div>
  );
}
