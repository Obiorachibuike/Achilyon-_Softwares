
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck, ArrowDownWideNarrow } from 'lucide-react'

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
  { label: 'Micro Cap (< $1M)', value: 'micro' },
  { label: 'Small Cap ($1M - $10M)', value: 'small' },
  { label: 'Mid Cap ($10M - $100M)', value: 'mid' },
  { label: 'Large Cap (> $100M)', value: 'large' },
]
const volumes = [
  { label: 'Any Volume', value: 'all' },
  { label: 'Volume > $1k', value: '1k' },
  { label: 'Volume > $10k', value: '10k' },
  { label: 'Volume > $100k', value: '100k' },
  { label: 'Volume > $1m', value: '1m' },
]

const dexMapping = {
  ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
  base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
  bnb: ['PancakeSwap', 'Biswap', 'ApeSwap'],
  solana: ['Raydium', 'Orca', 'Jupiter'],
  arbitrum: ['Camelot', 'Uniswap', 'GMX'],
  polygon: ['QuickSwap', 'Uniswap', 'SushiSwap'],
  avalanche: ['Trader Joe', 'Pangolin', 'SushiSwap'],
}

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm, setFilters])

  const currentDexes = filters.network === 'all' ? [] : (dexMapping[filters.network] || [])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      {/* Network Filter */}
      <div className="flex items-center gap-2">
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
      </div>

      {/* Dynamic DEX Filter */}
      {filters.network !== 'all' && (
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      {/* Age Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Market Cap Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Volume Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
          filters.verified
            ? 'bg-green-500/10 border-green-500/50 text-green-500'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        Verified
      </button>

      <div className="flex-1"></div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs, tokens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary text-foreground text-sm pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64"
        />
      </div>

      <button className="p-2 text-muted-foreground hover:text-foreground">
        <ArrowDownWideNarrow size={20} />
      </button>
    </div>
  )
}

export default FiltersBar
