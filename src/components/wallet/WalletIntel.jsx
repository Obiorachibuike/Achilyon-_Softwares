import { Wallet, Search, History, ShieldAlert, PieChart, BarChart } from 'lucide-react';
import { cn } from '../../lib/utils';

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold flex items-center space-x-2">
              <PieChart size={18} className="text-primary" />
              <span>Portfolio Breakdown</span>
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center items-center text-muted-foreground space-y-4">
            <BarChart size={40} className="opacity-20" />
            <div className="w-full space-y-3">
              {[
                { label: 'Stablecoins', value: '45%', width: 'w-[45%]', color: 'bg-blue-500' },
                { label: 'Blue Chips', value: '35%', width: 'w-[35%]', color: 'bg-purple-500' },
                { label: 'Small Caps', value: '20%', width: 'w-[20%]', color: 'bg-orange-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color, item.width)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold flex items-center space-x-2">
              <ShieldAlert size={18} className="text-red-500" />
              <span>Contract Analysis</span>
            </h3>
          </div>
          <div className="p-6 flex-1 space-y-4">
            <div className="p-3 bg-secondary/50 rounded-lg border border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500/20 text-green-500 rounded flex items-center justify-center font-bold">V</div>
                <div>
                  <div className="text-sm font-medium">Verified Contract</div>
                  <div className="text-[10px] text-muted-foreground">Source code matched</div>
                </div>
              </div>
              <div className="text-green-500 text-xs font-bold">SAFE</div>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg border border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500/20 text-yellow-500 rounded flex items-center justify-center font-bold">L</div>
                <div>
                  <div className="text-sm font-medium">Liquidity Lock</div>
                  <div className="text-[10px] text-muted-foreground">90% locked for 6 months</div>
                </div>
              </div>
              <div className="text-yellow-500 text-xs font-bold">WARNING</div>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg border border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 text-blue-500 rounded flex items-center justify-center font-bold">O</div>
                <div>
                  <div className="text-sm font-medium">Ownership</div>
                  <div className="text-[10px] text-muted-foreground">Renounced by developer</div>
                </div>
              </div>
              <div className="text-blue-500 text-xs font-bold">SAFE</div>
            </div>
          </div>
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
