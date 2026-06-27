import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck, ArrowDownWideNarrow } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']

  const dexMapping = {
    'ethereum': ['Uniswap', 'SushiSwap', 'Curve'],
    'base': ['Aerodrome', 'BaseSwap', 'Uniswap'],
    'bnb': ['PancakeSwap', 'Biswap'],
    'solana': ['Raydium', 'Orca', 'Jupiter'],
    'arbitrum': ['Camelot', 'Uniswap', 'GMX'],
    'polygon': ['QuickSwap', 'Uniswap'],
    'avalanche': ['Trader Joe', 'Pangolin']
  }

  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' }
  ]

  const mcaps = [
    { label: 'Market Cap', value: 'all' },
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1M-$10M)', value: 'small' },
    { label: 'Mid Cap ($10M-$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' }
  ]

  const liquidities = [
    { label: 'Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]

  const volumes = [
    { label: 'Volume', value: 'all' },
    { label: '> $10k (24h)', value: '10k' },
    { label: '> $100k (24h)', value: '100k' },
    { label: '> $1m (24h)', value: '1m' }
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  const activeDexes = filters.network === 'all' ? [] : (dexMapping[filters.network] || [])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, symbol or address..."
            className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-80 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Network */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>

        {/* DEX - Dynamic */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
          disabled={filters.network === 'all'}
        >
          <option value="all">All DEXes</option>
          {activeDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>

        <div className="h-6 w-px bg-border mx-1 hidden lg:block" />

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
          {mcaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
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

        <button
          onClick={() => setFilters({ verified: !filters.verified })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            filters.verified
              ? 'bg-primary/20 border-primary text-primary'
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Verified
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowDownWideNarrow className="w-4 h-4" />
          <span>Sort: Trending</span>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
