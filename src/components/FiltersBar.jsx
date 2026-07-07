
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' }
  ]
  const liquidities = [
    { label: 'All Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]
  const marketCaps = [
    { label: 'All MCaps', value: 'all' },
    { label: 'Micro (<$1M)', value: 'micro' },
    { label: 'Small ($1M-$10M)', value: 'small' },
    { label: 'Mid ($10M-$100M)', value: 'mid' },
    { label: 'Large (>$100M)', value: 'large' }
  ]
  const volumes = [
    { label: 'All Volume', value: 'all' },
    { label: '> $50k (24h)', value: '50k' },
    { label: '> $250k (24h)', value: '250k' },
    { label: '> $1M (24h)', value: '1m' }
  ]

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
    base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
    bnb: ['PancakeSwap', 'Biswap'],
    solana: ['Raydium', 'Orca', 'Jupiter'],
    arbitrum: ['Camelot', 'Uniswap', 'GMX'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
  }

  const currentDexes = filters.network === 'all' ? [] : (dexMapping[filters.network] || [])

  // Debounce search input
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      {/* Network Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      {/* DEX Select (Dynamic) */}
      {currentDexes.length > 0 && (
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      {/* Age Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Market Cap Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Volume Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
        className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors text-sm ${
          filters.verifiedOnly
          ? 'bg-primary/20 border-primary text-primary'
          : 'bg-secondary border-border text-muted-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        <span>Verified</span>
      </button>

      <div className="flex-1 min-w-[20px]"></div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>
    </div>
  )
}

export default FiltersBar
