
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ArrowDownWideNarrow, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/utils'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
    base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
    bnb: ['PancakeSwap', 'Biswap'],
    solana: ['Raydium', 'Orca', 'Jupiter'],
    arbitrum: ['Camelot', 'Uniswap', 'GMX'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin']
  }

  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' },
  ]

  const liquidities = [
    { label: 'Liquidity: All', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' },
  ]

  const mcaps = [
    { label: 'MCAP: All', value: 'all' },
    { label: 'Micro (< $1M)', value: 'micro' },
    { label: 'Small ($1M - $10M)', value: 'small' },
    { label: 'Mid ($10M - $100M)', value: 'mid' },
    { label: 'Large (> $100M)', value: 'large' },
  ]

  const volumes = [
    { label: 'Volume: All', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' },
  ]

  const sortOptions = [
    { label: 'Sort: Trending', value: 'trending' },
    { label: 'Sort: Market Cap', value: 'mcap' },
    { label: 'Sort: Volume', value: 'volume' },
    { label: 'Sort: Age', value: 'age' },
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  const currentDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center sticky top-0 z-20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search pairs..."
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      {currentDexes.length > 0 && (
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {mcaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => setFilters({ verified: !filters.verified })}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
            filters.verified
              ? "bg-primary/20 border-primary text-primary"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Verified
        </button>

        <div className="flex items-center gap-2 bg-secondary rounded-lg border border-border px-3 py-2">
          <ArrowDownWideNarrow className="w-4 h-4 text-muted-foreground" />
          <select
            className="bg-transparent text-foreground outline-none text-sm"
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
          >
            {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
