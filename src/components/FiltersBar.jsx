import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ArrowDownWideNarrow, Shield } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' },
  ]
  const liquidities = [
    { label: 'All Liq.', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' },
  ]
  const marketCaps = [
    { label: 'All MCAP', value: 'all' },
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1-10M)', value: 'small' },
    { label: 'Mid Cap ($10-100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' },
  ]

  const dexMapping = {
    'ethereum': ['Uniswap', 'SushiSwap', 'Curve'],
    'base': ['Aerodrome', 'BaseSwap', 'Uniswap'],
    'bnb': ['PancakeSwap', 'Biswap'],
    'solana': ['Raydium', 'Orca', 'Jupiter'],
    'arbitrum': ['Camelot', 'Uniswap', 'GMX'],
    'polygon': ['QuickSwap', 'Uniswap'],
    'avalanche': ['Trader Joe', 'Pangolin'],
    'all': []
  }

  const availableDexes = dexMapping[filters.network] || []

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center sticky top-0 z-20">
      {/* Network */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      {/* DEX */}
      {availableDexes.length > 0 && (
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium transition-all"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      {/* Age */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Market Cap */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          filters.verified
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground'
        }`}
      >
        <Shield size={16} />
        Verified Only
      </button>

      <div className="flex-1"></div>

      {/* Sort */}
      <div className="flex items-center gap-2 mr-2">
        <ArrowDownWideNarrow size={18} className="text-muted-foreground" />
        <select
          className="bg-transparent text-foreground outline-none text-sm font-bold appearance-none cursor-pointer hover:text-primary transition-colors"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          <option value="trending">Trending</option>
          <option value="mcap">Market Cap</option>
          <option value="volume">Volume</option>
          <option value="age">Age</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search symbols/address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>
    </div>
  )
}

export default FiltersBar
