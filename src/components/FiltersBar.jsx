import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow, Shield } from 'lucide-react'

const dexMapping = {
  ethereum: ['Uniswap', 'SushiSwap'],
  base: ['Aerodrome', 'BaseSwap'],
  bnb: ['PancakeSwap'],
  solana: ['Raydium', 'Orca'],
  arbitrum: ['Camelot', 'Uniswap'],
  polygon: ['QuickSwap', 'Uniswap'],
  avalanche: ['Trader Joe', 'Pangolin'],
}

const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
const ages = [
  { label: 'All Time', value: 'all' },
  { label: '< 1h', value: '1h' },
  { label: '< 6h', value: '6h' },
  { label: '< 24h', value: '24h' },
  { label: '< 7d', value: '7d' },
]
const liquidities = [
  { label: 'Any Liquidity', value: 'all' },
  { label: '> $10k', value: '10k' },
  { label: '> $100k', value: '100k' },
  { label: '> $1m', value: '1m' },
]
const marketCaps = [
  { label: 'Any MCAP', value: 'all' },
  { label: '< $100k (Micro)', value: 'micro' },
  { label: '< $1m (Small)', value: 'small' },
  { label: '$1m - $10m (Mid)', value: 'mid' },
  { label: '> $10m (Large)', value: 'large' },
]
const volumes = [
  { label: 'Any Volume', value: 'all' },
  { label: '> $10k', value: '10k' },
  { label: '> $100k', value: '100k' },
  { label: '> $1m', value: '1m' },
]
const sortOptions = [
  { label: 'Trending', value: 'trending' },
  { label: 'Market Cap', value: 'mcap' },
  { label: 'Volume (24h)', value: 'volume' },
  { label: 'Age', value: 'age' },
]

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm, setFilters])

  const availableDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      {/* Network Select */}
      <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border">
        <Filter size={16} className="text-muted-foreground" />
        <select
          className="bg-transparent text-sm font-medium outline-none cursor-pointer"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
      </div>

      {/* DEX Select */}
      {availableDexes.length > 0 && (
        <select
          className="bg-secondary text-sm font-medium px-3 py-2 rounded-lg border border-border outline-none"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      {/* Age Select */}
      <select
        className="bg-secondary text-sm font-medium px-3 py-2 rounded-lg border border-border outline-none"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-sm font-medium px-3 py-2 rounded-lg border border-border outline-none"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Market Cap Select */}
      <select
        className="bg-secondary text-sm font-medium px-3 py-2 rounded-lg border border-border outline-none"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Volume Select */}
      <select
        className="bg-secondary text-sm font-medium px-3 py-2 rounded-lg border border-border outline-none"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      <div className="h-6 w-px bg-border mx-1 hidden lg:block"></div>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
          filters.verified
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <Shield size={16} />
        Verified
      </button>

      {/* Sort Select */}
      <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border ml-auto">
        <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
        <select
          className="bg-transparent text-sm font-medium outline-none cursor-pointer"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          {sortOptions.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>
      </div>

      {/* Search Input */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search symbol/address..."
          className="bg-secondary text-sm font-medium pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  )
}

export default FiltersBar
