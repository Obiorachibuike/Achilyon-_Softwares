import { Wallet, ArrowUpRight, History } from 'lucide-react';

const WalletsPage = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Wallet Intelligence</h1>
          <p className="text-gray-400 text-sm">Track your portfolio and analyze smart money movements.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
          <Wallet size={20} />
          Add Wallet to Track
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-dark-lighter border border-dark-accent p-6 rounded-2xl">
          <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-semibold">Total Balance</div>
          <div className="text-3xl font-bold mb-2">$0.00</div>
          <div className="text-green-500 text-sm flex items-center gap-1">
            <ArrowUpRight size={14} /> +0% (24h)
          </div>
        </div>
        <div className="bg-dark-lighter border border-dark-accent p-6 rounded-2xl">
          <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-semibold">Tracked Wallets</div>
          <div className="text-3xl font-bold mb-2">0</div>
          <div className="text-gray-500 text-sm">Connect a wallet to start tracking</div>
        </div>
        <div className="bg-dark-lighter border border-dark-accent p-6 rounded-2xl">
          <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-semibold">Profit/Loss (24h)</div>
          <div className="text-3xl font-bold mb-2">$0.00</div>
          <div className="text-gray-500 text-sm flex items-center gap-1">
            <History size={14} /> No recent activity
          </div>
        </div>
      </div>

      <div className="bg-dark-lighter border border-dark-accent rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-dark-accent rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
          <Wallet size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">No Wallets Tracked</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Connect your wallet or add a public address to monitor its holdings, transactions, and performance in real-time.
        </p>
        <button className="bg-dark-accent hover:bg-dark-accent/70 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Connect Wallet
        </button>
      </div>
    </div>
  );
};

export default WalletsPage;
