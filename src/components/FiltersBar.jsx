
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

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
    { label: '< 7d', value: '7d' }
  ]

  const liquidities = [
    { label: 'Liquidity (All)', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]

  const marketCaps = [
    { label: 'MCAP (All)', value: 'all' },
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap (<$10M)', value: 'small' },
    { label: 'Mid Cap (<$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' }
  ]

  const volumes = [
    { label: 'Volume (All)', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]

  const sortOptions = [
    { label: 'Sort: Trending', value: 'trending' },
    { label: 'Sort: Market Cap', value: 'mcap' },
    { label: 'Sort: Volume', value: 'volume' },
    { label: 'Sort: Age', value: 'age' }
  ]

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, setFilters])

  const currentDexes = filters.network !== 'all' ? dexMapping[filters.network] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      {/* Network Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      {/* DEX Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm disabled:opacity-50"
        value={filters.dex}
        disabled={filters.network === 'all'}
        onChange={(e) => setFilters({ dex: e.target.value })}
      >
        <option value="all">All DEXes</option>
        {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

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

      {/* MCAP Select */}
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

      {/* Sort Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.sortBy}
        onChange={(e) => setFilters({ sortBy: e.target.value })}
      >
        {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <label className="flex items-center gap-2 cursor-pointer ml-2">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary"
          checked={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.checked })}
        />
        <span className="text-sm font-medium">Verified</span>
      </label>

      <div className="flex-1 min-w-[20px]"></div>

      {/* Search Input */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Search pairs or addresses..."
          className="bg-secondary text-foreground px-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm transition-all focus:w-80"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchTerm('')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default FiltersBar
