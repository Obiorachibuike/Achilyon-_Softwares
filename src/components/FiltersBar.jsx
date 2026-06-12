import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

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
  const volumes = [
    { label: 'Any Volume', value: 'all' },
    { label: '> $50k', value: '50k' },
    { label: '> $500k', value: '500k' },
    { label: '> $5m', value: '5m' },
  ]
  const mcapOptions = [
    { label: 'Any MCAP', value: 'all' },
    { label: 'Micro (< $100k)', value: 'micro' },
    { label: 'Small (< $1M)', value: 'small' },
    { label: 'Mid (< $10M)', value: 'mid' },
    { label: 'Large (> $10M)', value: 'large' },
  ]

  const dexMapping = {
    'ethereum': ['Uniswap', 'SushiSwap'],
    'base': ['Aerodrome', 'BaseSwap'],
    'bnb': ['PancakeSwap'],
    'solana': ['Raydium', 'Orca'],
    'arbitrum': ['Camelot', 'Uniswap'],
    'polygon': ['QuickSwap', 'Uniswap'],
    'avalanche': ['Trader Joe', 'Pangolin']
  }

  const availableDexes = filters.network === 'all' ? [] : dexMapping[filters.network] || []

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      {/* Network Select */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      {/* DEX Select */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        value={filters.dex}
        disabled={filters.network === 'all'}
        onChange={(e) => setFilters({ dex: e.target.value })}
      >
        <option value="all">All DEXes</option>
        {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      {/* Age Select */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Volume Select */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      {/* MCAP Select */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {mcapOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium transition-colors ${
          filters.verified
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        Verified
      </button>

      <div className="flex-1 min-w-[20px]"></div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="bg-secondary text-foreground text-sm pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64"
        />
      </div>
    </div>
  )
}

export default FiltersBar
