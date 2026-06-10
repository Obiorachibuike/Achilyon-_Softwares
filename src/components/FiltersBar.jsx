
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow } from 'lucide-react'

const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']

const dexMapping = {
  ethereum: ['Uniswap', 'SushiSwap'],
  base: ['Aerodrome', 'BaseSwap'],
  bnb: ['PancakeSwap'],
  solana: ['Raydium', 'Orca'],
  arbitrum: ['Camelot', 'Uniswap'],
  polygon: ['QuickSwap', 'Uniswap'],
  avalanche: ['Trader Joe', 'Pangolin'],
  all: []
}

const ages = [
  { label: '< 1h', value: '1h' },
  { label: '< 6h', value: '6h' },
  { label: '< 24h', value: '24h' },
  { label: '< 7d', value: '7d' },
]

const marketCaps = [
  { label: 'Micro Cap (< $1M)', value: 'micro' },
  { label: 'Small Cap ($1M - $10M)', value: 'small' },
  { label: 'Mid Cap ($10M - $100M)', value: 'mid' },
  { label: 'Large Cap (> $100M)', value: 'large' },
]

const liquidities = [
  { label: '> $10k', value: '10k' },
  { label: '> $100k', value: '100k' },
  { label: '> $1m', value: '1m' },
]

const volumes = [
  { label: '1h Volume', value: '1h' },
  { label: '24h Volume', value: '24h' },
]

const sortOptions = [
  { label: 'Trending', value: 'trending' },
  { label: 'Market Cap', value: 'mcap' },
  { label: 'Volume', value: 'volume' },
  { label: 'Age', value: 'age' },
]

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search pairs..."
            className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.network}
            onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
          >
            <option value="all">All Networks</option>
            {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
          </select>

          {filters.network !== 'all' && dexMapping[filters.network]?.length > 0 && (
            <select
              className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
              value={filters.dex}
              onChange={(e) => setFilters({ dex: e.target.value })}
            >
              <option value="all">All DEXes</option>
              {dexMapping[filters.network].map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
            </select>
          )}

          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.age}
            onChange={(e) => setFilters({ age: e.target.value })}
          >
            <option value="all">Age</option>
            {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.marketCap}
            onChange={(e) => setFilters({ marketCap: e.target.value })}
          >
            <option value="all">Market Cap</option>
            {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.liquidity}
            onChange={(e) => setFilters({ liquidity: e.target.value })}
          >
            <option value="all">Liquidity</option>
            {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>

          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.volume}
            onChange={(e) => setFilters({ volume: e.target.value })}
          >
            <option value="all">Volume Filter</option>
            {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-2">
          <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
          >
            {sortOptions.map(s => <option key={s.value} value={s.value}>Sort by {s.label}</option>)}
          </select>

          <label className="flex items-center gap-2 cursor-pointer ml-2">
             <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => setFilters({ verified: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
             />
             <span className="text-sm font-medium">Verified</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
