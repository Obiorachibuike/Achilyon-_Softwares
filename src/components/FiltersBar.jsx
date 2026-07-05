import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = ['Micro Cap (<$1M)', 'Small Cap ($1M-$10M)', 'Mid Cap ($10M-$100M)', 'Large Cap (>$100M)']
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' },
  ]

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
    base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
    bnb: ['PancakeSwap', 'Biswap'],
    solana: ['Raydium', 'Orca', 'Jupiter'],
    arbitrum: ['Camelot', 'Uniswap', 'GMX'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin']
  }

  const currentDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center sticky top-0 z-20">
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border focus-within:ring-1 focus-within:ring-primary w-full md:w-64">
        <Search size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search symbols/contracts..."
          className="bg-transparent text-sm text-foreground outline-none w-full"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      <div className="h-6 w-px bg-border hidden lg:block mx-2"></div>

      {/* Network Select */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-muted-foreground" />
        <select
          className="bg-secondary text-sm text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
      </div>

      {/* DEX Select (Dynamic) */}
      {currentDexes.length > 0 && (
        <select
          className="bg-secondary text-sm text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXs</option>
          {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      {/* Age Select */}
      <select
        className="bg-secondary text-sm text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">All Time</option>
        {ages.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-sm text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity</option>
        {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      {/* Market Cap Select */}
      <select
        className="bg-secondary text-sm text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        {marketCaps.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <div className="flex-1"></div>

      {/* Sort Select */}
      <div className="flex items-center gap-2">
        <ArrowDownWideNarrow size={18} className="text-muted-foreground" />
        <select
          className="bg-secondary text-sm font-medium text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value })}
        >
          {sortOptions.map(s => <option key={s.value} value={s.value}>Sort by: {s.label}</option>)}
        </select>
      </div>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
          filters.verifiedOnly
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:border-muted-foreground'
        }`}
      >
        Verified Only
      </button>
    </div>
  )
}

export default FiltersBar
