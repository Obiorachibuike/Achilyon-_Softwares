
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck, ArrowDownWideNarrow } from 'lucide-react'

const dexMapping = {
  'ethereum': ['Uniswap', 'SushiSwap'],
  'base': ['Aerodrome', 'BaseSwap'],
  'bnb': ['PancakeSwap'],
  'solana': ['Raydium', 'Orca'],
  'arbitrum': ['Camelot', 'Uniswap'],
  'polygon': ['QuickSwap', 'Uniswap'],
  'avalanche': ['Trader Joe', 'Pangolin']
}

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
    { label: 'Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]
  const marketCaps = [
    { label: 'Market Cap', value: 'all' },
    { label: '< $100k', value: 'micro' },
    { label: '$100k - $1M', value: 'small' },
    { label: '$1M - $10M', value: 'mid' },
    { label: '> $10M', value: 'large' }
  ]
  const volumes = [
    { label: 'Volume', value: 'all' },
    { label: '> $50k', value: '50k' },
    { label: '> $200k', value: '200k' },
    { label: '> $1m', value: '1m' }
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  const activeDexes = dexMapping[filters.network] || []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center sticky top-0 z-20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      {filters.network !== 'all' && activeDexes.length > 0 && (
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXs</option>
          {activeDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
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
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      <div className="h-8 w-px bg-border mx-1"></div>

      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
          filters.verified
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        Verified
      </button>

      <div className="flex-1"></div>

      <div className="flex items-center gap-2 text-sm">
        <ArrowDownWideNarrow className="w-4 h-4 text-muted-foreground" />
        <select
          className="bg-transparent text-foreground outline-none font-medium"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          <option value="trending">Trending</option>
          <option value="marketCap">Market Cap</option>
          <option value="volume">Volume</option>
          <option value="age">Age</option>
        </select>
      </div>
    </div>
  )
}

export default FiltersBar
