import { Search, ChevronDown } from 'lucide-react'
import useCoinStore from '../store/useCoinStore'
import { cn } from '../lib/utils'

const networks = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'base', label: 'Base' },
  { id: 'bsc', label: 'BNB' },
  { id: 'solana', label: 'Solana' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'avalanche', label: 'Avalanche' },
]

const dexesByChain = {
  ethereum: [
    { id: 'all', label: 'All DEXes' },
    { id: 'uniswap', label: 'Uniswap' },
    { id: 'sushiswap', label: 'SushiSwap' },
  ],
  base: [
    { id: 'all', label: 'All DEXes' },
    { id: 'aerodrome', label: 'Aerodrome' },
    { id: 'baseswap', label: 'BaseSwap' },
  ],
  bsc: [
    { id: 'all', label: 'All DEXes' },
    { id: 'pancakeswap', label: 'PancakeSwap' },
  ],
  solana: [
    { id: 'all', label: 'All DEXes' },
    { id: 'raydium', label: 'Raydium' },
    { id: 'orca', label: 'Orca' },
  ],
  arbitrum: [
    { id: 'all', label: 'All DEXes' },
    { id: 'uniswap', label: 'Uniswap' },
    { id: 'camelot', label: 'Camelot' },
  ],
  polygon: [
    { id: 'all', label: 'All DEXes' },
    { id: 'quickswap', label: 'QuickSwap' },
  ],
  avalanche: [
    { id: 'all', label: 'All DEXes' },
    { id: 'traderjoe', label: 'Trader Joe' },
  ],
}

const ages = [
  { id: '1h', label: '< 1h' },
  { id: '6h', label: '< 6h' },
  { id: '24h', label: '< 24h' },
  { id: '7d', label: '< 7d' },
]

const liquidities = [
  { id: 10000, label: '> $10k' },
  { id: 100000, label: '> $100k' },
  { id: 1000000, label: '> $1m' },
]

export function TopFiltersBar() {
  const { filters, setFilters } = useCoinStore()

  const currentDexes = dexesByChain[filters.chain] || [{ id: 'all', label: 'All DEXes' }]

  return (
    <div className="border-b border-border bg-card p-4 flex flex-wrap items-center gap-4">
      {/* Network Filter */}
      <div className="flex bg-muted rounded-md p-1 overflow-x-auto">
        {networks.map((net) => (
          <button
            key={net.id}
            onClick={() => setFilters({ chain: net.id, dex: 'all' })}
            className={cn(
              "px-3 py-1 rounded-sm text-sm transition-all whitespace-nowrap",
              filters.chain === net.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {net.label}
          </button>
        ))}
      </div>

      {/* DEX Filter */}
      <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1 bg-background">
        <span className="text-xs text-muted-foreground font-medium uppercase">DEX:</span>
        <select
          className="bg-transparent text-sm outline-none cursor-pointer"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          {currentDexes.map(dex => (
            <option key={dex.id} value={dex.id}>{dex.label}</option>
          ))}
        </select>
      </div>

      {/* Age Filter */}
      <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1 bg-background">
        <span className="text-xs text-muted-foreground font-medium uppercase">Age:</span>
        <select
          className="bg-transparent text-sm outline-none cursor-pointer"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          {ages.map(age => (
            <option key={age.id} value={age.id}>{age.label}</option>
          ))}
        </select>
      </div>

      {/* Liquidity Filter */}
      <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1 bg-background">
        <span className="text-xs text-muted-foreground font-medium uppercase">Liquidity:</span>
        <select
          className="bg-transparent text-sm outline-none cursor-pointer"
          value={filters.minLiquidity}
          onChange={(e) => setFilters({ minLiquidity: Number(e.target.value) })}
        >
          {liquidities.map(liq => (
            <option key={liq.id} value={liq.id}>{liq.label}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Search by token or address..."
          className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
      </div>

      {/* Sort / Refresh / More */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-muted rounded-md transition-colors border border-border">
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  )
}
