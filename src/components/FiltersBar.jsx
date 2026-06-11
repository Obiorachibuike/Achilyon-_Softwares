import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow, CheckCircle2 } from 'lucide-react'

const dexMapping = {
  ethereum: ['Uniswap', 'SushiSwap'],
  base: ['Aerodrome', 'BaseSwap'],
  bnb: ['PancakeSwap'],
  solana: ['Raydium', 'Orca'],
  arbitrum: ['Camelot', 'Uniswap'],
  polygon: ['QuickSwap', 'Uniswap'],
  avalanche: ['Trader Joe', 'Pangolin']
}

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const mcaps = [
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1M-$10M)', value: 'small' },
    { label: 'Mid Cap ($10M-$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' }
  ]
  const volumes = ['> $10k', '> $100k', '> $1m']

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, setFilters])

  const currentDexOptions = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      {/* Network Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-muted-foreground" />
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
      </div>

      {/* DEX Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[120px] disabled:opacity-50"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {currentDexOptions.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      {/* Age Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">Age: All</option>
        {ages.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      {/* Liquidity Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity: All</option>
        {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      {/* MCAP Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">MCAP: All</option>
        {mcaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Volume Filter */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume: All</option>
        {volumes.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      {/* Verified Filter */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
          filters.verified
            ? "bg-primary/20 border-primary text-primary"
            : "bg-secondary border-border text-muted-foreground"
        }`}
      >
        <CheckCircle2 size={16} />
        Verified
      </button>

      <div className="flex-1"></div>

      {/* Sorting */}
      <div className="flex items-center gap-2">
        <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          <option value="trending">Sort: Trending</option>
          <option value="marketCap">Sort: MCAP</option>
          <option value="volume">Sort: Volume</option>
          <option value="age">Sort: Age</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          className="bg-secondary text-foreground text-sm pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  )
}

export default FiltersBar
