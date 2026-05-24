import { Wallet, Search, History } from 'lucide-react';

export function WalletIntel() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Wallet Intelligence</h2>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Track wallet address..."
              className="bg-card border border-border rounded-lg pl-10 pr-4 py-2 w-80 text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
            Add to Watchlist
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-4 rounded-xl space-y-2">
          <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
          <p className="text-2xl font-bold">$124,500.00</p>
          <div className="text-xs text-green-500 font-medium">+12.5% (24h)</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-2">
          <p className="text-sm text-muted-foreground">Active Alerts</p>
          <p className="text-2xl font-bold">12</p>
          <div className="text-xs text-muted-foreground font-medium">3 high priority</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-2">
          <p className="text-sm text-muted-foreground">Win Rate (Smart Wallets)</p>
          <p className="text-2xl font-bold">68%</p>
          <div className="text-xs text-blue-500 font-medium">Top 5% of traders</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold flex items-center space-x-2">
            <History size={18} className="text-primary" />
            <span>Recent Smart Money Activity</span>
          </h3>
          <button className="text-xs text-primary font-medium hover:underline">View All</button>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          <Wallet size={48} className="mx-auto mb-4 opacity-20" />
          <p>Connect your wallet or search an address to see real-time monitoring.</p>
        </div>
      </div>
    </div>
  );
}
