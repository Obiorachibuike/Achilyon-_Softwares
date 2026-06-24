
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow, CheckCircle2 } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  const networks = [
    { id: 'ethereum', name: 'Ethereum' },
    { id: 'base', name: 'Base' },
    { id: 'bnb', name: 'BNB' },
    { id: 'solana', name: 'Solana' },
    { id: 'arbitrum', name: 'Arbitrum' },
    { id: 'polygon', name: 'Polygon' },
    { id: 'avalanche', name: 'Avalanche' },
  ]

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
  }

  const ages = [
    { id: 'all', name: 'All Time' },
    { id: '1h', name: '< 1h' },
    { id: '6h', name: '< 6h' },
    { id: '24h', name: '< 24h' },
    { id: '7d', name: '< 7d' },
  ]

  const caps = [
    { id: 'all', name: 'Market Cap' },
    { id: 'micro', name: 'Micro Cap (<$1M)' },
    { id: 'small', name: 'Small Cap ($1M-$10M)' },
    { id: 'mid', name: 'Mid Cap ($10M-$100M)' },
    { id: 'large', name: 'Large Cap (>$100M)' },
  ]

  const liquidities = [
    { id: 'all', name: 'Liquidity' },
    { id: '10k', name: '> $10k' },
    { id: '100k', name: '> $100k' },
    { id: '1m', name: '> $1m' },
  ]

  const volumes = [
    { id: 'all', name: 'Volume' },
    { id: '1h', name: '1h Volume' },
    { id: '24h', name: '24h Volume' },
  ]

  const sortOptions = [
    { id: 'trending', name: 'Trending' },
    { id: 'mcap', name: 'Market Cap' },
    { id: 'volume', name: 'Volume' },
    { id: 'age', name: 'Age' },
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  const availableDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card border-b border-border p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or address..."
            className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Network */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>

        {/* DEX - Dynamic */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
          disabled={filters.network === 'all'}
        >
          <option value="all">All DEXes</option>
          {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>

        <div className="h-6 w-px bg-border mx-1"></div>

        {/* Filters Button (Visual indicator) */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
          <Filter size={16} />
          Filters
        </div>

        {/* Age */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          {ages.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {/* Liquidity */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          {liquidities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {/* Market Cap */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          {caps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Volume */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          {volumes.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>

        <div className="flex-1"></div>

        {/* Verified Toggle */}
        <button
          onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filters.verifiedOnly ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-secondary text-muted-foreground border border-border'
          }`}
        >
          <CheckCircle2 size={16} />
          Verified
        </button>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
          >
            {sortOptions.map(s => <option key={s.id} value={s.id}>Sort: {s.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
