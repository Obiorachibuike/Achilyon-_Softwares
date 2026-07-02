import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/utils'

const dexMapping = {
  ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
  base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
  bnb: ['PancakeSwap', 'Biswap'],
  solana: ['Raydium', 'Orca', 'Jupiter'],
  arbitrum: ['Camelot', 'Uniswap', 'GMX'],
  polygon: ['QuickSwap', 'Uniswap'],
  avalanche: ['Trader Joe', 'Pangolin']
}

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '< 1h' },
    { label: '< 6h', value: '< 6h' },
    { label: '< 24h', value: '< 24h' },
    { label: '< 7d', value: '< 7d' }
  ]
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = [
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1M-$10M)', value: 'small' },
    { label: 'Mid Cap ($10M-$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' }
  ]
  const volumes = ['> $10k', '> $100k', '> $1m']
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' }
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  const activeDexes = filters.network === 'all' ? [] : dexMapping[filters.network] || []

  return (
    <div className="bg-card p-4 border-b border-border space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Network Filter */}
        <div className="relative group">
          <select
            className="appearance-none bg-secondary text-foreground pl-10 pr-8 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium cursor-pointer"
            value={filters.network}
            onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
          >
            <option value="all">All Networks</option>
            {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
          </select>
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* DEX Filter (Dynamic) */}
        {activeDexes.length > 0 && (
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
            value={filters.dex}
            onChange={(e) => setFilters({ dex: e.target.value })}
          >
            <option value="all">All DEXes</option>
            {activeDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
          </select>
        )}

        {/* Age Filter */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
           {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>

        {/* Liquidity Filter */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          <option value="all">Min Liquidity</option>
          {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {/* Market Cap Filter */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          <option value="all">Market Cap</option>
          {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {/* Volume Filter */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          <option value="all">Min Volume</option>
          {volumes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {/* Sort Filter */}
        <div className="relative">
          <select
            className="appearance-none bg-secondary text-foreground pl-10 pr-8 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium cursor-pointer"
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
          >
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ArrowDownWideNarrow className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Verified Only Toggle */}
        <button
          onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
            filters.verifiedOnly
              ? "bg-primary/10 border-primary text-primary"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Verified
        </button>

        <div className="flex-1 min-w-[100px]"></div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search symbols or addresses..."
            className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
