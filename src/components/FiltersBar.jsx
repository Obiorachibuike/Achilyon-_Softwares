import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, CheckCircle, ArrowDownWideNarrow } from 'lucide-react'

const networks = [
  { id: 'all', name: 'All Networks' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'bnb', name: 'BNB' },
  { id: 'solana', name: 'Solana' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'avalanche', name: 'Avalanche' },
]

const dexMapping = {
  all: ['All DEXes'],
  ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
  base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
  bnb: ['PancakeSwap', 'Biswap'],
  solana: ['Raydium', 'Orca', 'Jupiter'],
  arbitrum: ['Camelot', 'Uniswap', 'GMX'],
  polygon: ['QuickSwap', 'Uniswap'],
  avalanche: ['Trader Joe', 'Pangolin'],
}

const ages = ['All Time', '< 1h', '< 6h', '< 24h', '< 7d']
const marketCaps = [
  { id: 'all', name: 'Market Cap' },
  { id: 'micro', name: 'Micro (<$1M)' },
  { id: 'small', name: 'Small ($1M-$10M)' },
  { id: 'mid', name: 'Mid ($10M-$100M)' },
  { id: 'large', name: 'Large (>$100M)' },
]
const liquidities = ['Liquidity', '> $10k', '> $100k', '> $1m']
const volumes = ['24h Volume', '> $10k', '> $100k', '> $1m']

const sortOptions = [
  { id: 'trending', name: 'Trending' },
  { id: 'mcap', name: 'Market Cap' },
  { id: 'volume', name: 'Volume' },
  { id: 'age', name: 'Age' },
]

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  const currentDexes = dexMapping[filters.network] || dexMapping.all

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <div className="relative">
        <select
          className="appearance-none bg-secondary text-foreground pl-3 pr-8 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
          <ArrowDownWideNarrow size={14} />
        </div>
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
      >
        <option value="all">All DEXes</option>
        {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a} value={a === 'All Time' ? 'all' : a}>{a}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l} value={l === 'Liquidity' ? 'all' : l}>{l}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v} value={v === '24h Volume' ? 'all' : v}>{v}</option>)}
      </select>

      <div className="relative">
        <select
          className="appearance-none bg-secondary text-foreground pl-3 pr-8 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          {sortOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
          <ArrowDownWideNarrow size={14} />
        </div>
      </div>

      <div className="h-8 w-[1px] bg-border mx-2 hidden xl:block"></div>

      <button
        onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
        className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors text-sm font-medium ${
          filters.verifiedOnly
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <CheckCircle size={16} />
        Verified
      </button>

      <div className="flex-1"></div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
        <input
          type="text"
          placeholder="Search by name, symbol or address..."
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  )
}

export default FiltersBar
