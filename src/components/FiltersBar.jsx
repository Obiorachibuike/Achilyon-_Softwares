import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin']
  }

  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' }
  ]

  const liquidities = [
    { label: 'Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]

  const volumes = [
    { label: 'Volume', value: 'all' },
    { label: '> $50k', value: '50k' },
    { label: '> $250k', value: '250k' },
    { label: '> $1m', value: '1m' }
  ]

  const marketCaps = [
    { label: 'Market Cap', value: 'all' },
    { label: 'Micro Cap (< $1M)', value: 'micro' },
    { label: 'Small Cap ($1M - $10M)', value: 'small' },
    { label: 'Mid Cap ($10M - $100M)', value: 'mid' },
    { label: 'Large Cap (> $100M)', value: 'large' }
  ]

  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume (24h)', value: 'volume' },
    { label: 'Age', value: 'age' }
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center sticky top-0 z-20">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search by token or address..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg border border-border">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            className="bg-transparent text-foreground text-xs font-medium outline-none cursor-pointer"
            value={filters.network}
            onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
          >
            <option value="all">All Networks</option>
            {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
          </select>
        </div>

        {filters.network !== 'all' && dexMapping[filters.network] && (
          <select
            className="bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:ring-1 focus:ring-primary"
            value={filters.dex}
            onChange={(e) => setFilters({ dex: e.target.value })}
          >
            <option value="all">All DEXes</option>
            {dexMapping[filters.network].map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
          </select>
        )}

        <select
          className="bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:ring-1 focus:ring-primary"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>

        <select
          className="bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:ring-1 focus:ring-primary"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        <select
          className="bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:ring-1 focus:ring-primary"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>

        <select
          className="bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border text-xs outline-none focus:ring-1 focus:ring-primary"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <div className="h-6 w-px bg-border mx-1"></div>

        <div className="flex items-center gap-2">
          <ArrowDownWideNarrow className="w-4 h-4 text-primary" />
          <select
            className="bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
          >
            {sortOptions.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => setFilters({ verifiedOnly: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary"
          />
          <span className="text-xs font-medium">Verified Only</span>
        </label>
      </div>
    </div>
  )
}

export default FiltersBar
