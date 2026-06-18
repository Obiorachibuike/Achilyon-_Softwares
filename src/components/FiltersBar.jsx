
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ArrowDownWideNarrow, ShieldCheck } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters, searchQuery, setSearchQuery, sort, setSort } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(searchQuery)

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
    { label: '< 7d', value: '7d' },
  ]

  const marketCaps = [
    { label: 'Market Cap', value: 'all' },
    { label: 'Micro Cap (< $100k)', value: 'micro' },
    { label: 'Small Cap ($100k - $1m)', value: 'small' },
    { label: 'Mid Cap ($1m - $10m)', value: 'mid' },
    { label: 'Large Cap (> $10m)', value: 'large' },
  ]

  const liquidities = [
    { label: 'Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' },
  ]

  const volumes = [
    { label: 'Volume', value: 'all' },
    { label: '1h Volume > $1k', value: '1h_1k' },
    { label: '24h Volume > $10k', value: '24h_10k' },
    { label: '24h Volume > $100k', value: '24h_100k' },
  ]

  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'marketCap' },
    { label: 'Volume (24h)', value: 'volume' },
    { label: 'Age', value: 'age' },
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchQuery])

  return (
    <div className="bg-card p-4 border-b border-border space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Network & DEX */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>

        {filters.network !== 'all' && dexMapping[filters.network] && (
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
            value={filters.dex}
            onChange={(e) => setFilters({ dex: e.target.value })}
          >
            <option value="all">All DEXes</option>
            {dexMapping[filters.network].map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
          </select>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search by token or address..."
            className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-full text-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Verified Toggle */}
        <button
          onClick={() => setFilters({ verified: !filters.verified })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
            filters.verified
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck size={16} />
          Verified
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Age */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>

        {/* Market Cap */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {/* Liquidity */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        {/* Volume */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>

        <div className="flex-1"></div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowDownWideNarrow size={18} className="text-muted-foreground" />
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
