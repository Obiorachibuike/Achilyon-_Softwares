import { useCoinStore } from '../../store/useCoinStore';
import { cn } from '../../lib/utils';
import { Search } from 'lucide-react';

const chains = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'bsc', name: 'BNB' },
  { id: 'solana', name: 'Solana' },
  { id: 'arbitrum', name: 'Arbitrum' },
];

export function FilterBar() {
  const { filters, setFilters } = useCoinStore();

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border-b border-border sticky top-0 z-10">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network:</span>
        <div className="flex p-1 bg-secondary rounded-lg overflow-x-auto">
          {chains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => setFilters({ chain: chain.id })}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-all whitespace-nowrap",
                filters.chain === chain.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {chain.name}
            </button>
          ))}
        </div>
      </div>

      <div className="h-6 w-px bg-border hidden md:block" />

      <div className="flex items-center space-x-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Market Cap</span>
          <select
            className="bg-secondary text-xs rounded px-2 py-1 border-none focus:ring-1 focus:ring-ring outline-none"
            value={filters.mcap}
            onChange={(e) => setFilters({ mcap: e.target.value })}
          >
            <option value="all">All Caps</option>
            <option value="micro">Micro (&lt;$1M)</option>
            <option value="small">Small ($1M-$10M)</option>
            <option value="mid">Mid ($10M-$100M)</option>
            <option value="large">Large (&gt;$100M)</option>
          </select>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Liquidity</span>
          <select
            className="bg-secondary text-xs rounded px-2 py-1 border-none focus:ring-1 focus:ring-ring outline-none"
            value={filters.liquidity}
            onChange={(e) => setFilters({ liquidity: e.target.value })}
          >
            <option value="all">All Liq</option>
            <option value="10k">&gt; $10k</option>
            <option value="100k">&gt; $100k</option>
            <option value="1m">&gt; $1m</option>
          </select>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Age</span>
          <select
            className="bg-secondary text-xs rounded px-2 py-1 border-none focus:ring-1 focus:ring-ring outline-none"
            value={filters.age}
            onChange={(e) => setFilters({ age: e.target.value })}
          >
            <option value="all">All Age</option>
            <option value="1h">&lt; 1h</option>
            <option value="6h">&lt; 6h</option>
            <option value="24h">&lt; 24h</option>
          </select>
        </div>
      </div>

      <div className="flex-1" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input
          type="text"
          placeholder="Search pairs..."
          className="bg-secondary text-xs rounded-lg pl-9 pr-4 py-2 w-48 md:w-64 border-none focus:ring-1 focus:ring-ring outline-none"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
      </div>
    </div>
  );
}
