import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { FilterBar } from './components/coins/FilterBar';
import { CoinsTable } from './components/coins/CoinsTable';
import { Dashboard } from './components/dashboard/Dashboard';
import { WalletIntel } from './components/wallet/WalletIntel';
import { Trending } from './components/coins/Trending';
import { useCoinStore } from './store/useCoinStore';
import { dexService } from './services/dexService';

function App() {
  const { currentView, filters, setTokens, setLoading, setError } = useCoinStore();

  useEffect(() => {
    const fetchData = async () => {
      if (currentView !== 'coins') return;

      setLoading(true);
      try {
        const pairs = await dexService.getLatestPairs(filters.chain);
        setTokens(pairs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [filters.chain, currentView, setTokens, setLoading, setError]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'wallets':
        return <WalletIntel />;
      case 'trending':
        return <Trending />;
      case 'coins':
        return (
          <>
            <header className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Coin Discovery</h2>
                <div className="flex items-center space-x-4">
                  <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium border border-green-500/20">
                    Live Data
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    Connect Wallet
                  </button>
                </div>
              </div>
            </header>
            <FilterBar />
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <div className="bg-card rounded-xl border border-border flex-1 overflow-hidden flex flex-col">
                <CoinsTable />
              </div>
            </div>
          </>
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            View &quot;{currentView}&quot; is under construction.
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
