
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = [
    { name: 'Ethereum', dexes: ['Uniswap', 'SushiSwap'] },
    { name: 'Base', dexes: ['Aerodrome', 'BaseSwap'] },
    { name: 'BNB', dexes: ['PancakeSwap'] },
    { name: 'Solana', dexes: ['Raydium', 'Orca'] },
    { name: 'Arbitrum', dexes: ['Camelot', 'Uniswap'] },
    { name: 'Polygon', dexes: ['QuickSwap', 'Uniswap'] },
    { name: 'Avalanche', dexes: ['Trader Joe', 'Pangolin'] }
  ]

  const ages = [
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' }
  ]

  const liquidities = [
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]

  const volumes = [
    { label: 'Vol > $10k', value: '10k' },
    { label: 'Vol > $100k', value: '100k' },
    { label: 'Vol > $1m', value: '1m' }
  ]

  const marketCaps = [
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1M-$10M)', value: 'small' },
    { label: 'Mid Cap ($10M-$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' }
  ]

  const sorts = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' }
  ]

  const currentNetwork = networks.find(n => n.name.toLowerCase() === filters.network)

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
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n.name} value={n.name.toLowerCase()}>{n.name}</option>)}
      </select>

      {/* Dynamic DEX Select */}
      <select
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {currentNetwork?.dexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      {/* Age Select */}
      <select
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">Age: Any</option>
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity: Any</option>
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Volume Select */}
      <select
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume: Any</option>
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      {/* Market Cap Select */}
      <select
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">MCAP: Any</option>
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Sort Select */}
      <select
        className="bg-secondary text-foreground px-3 py-1.5 rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary font-medium border-primary/30"
        value={filters.sortBy}
        onChange={(e) => setFilters({ sortBy: e.target.value })}
      >
        {sorts.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <label className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded border border-border text-sm cursor-pointer hover:bg-secondary/80">
        <input
          type="checkbox"
          className="accent-primary"
          checked={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.checked })}
        />
        <span>Verified</span>
      </label>

      <div className="flex-1 min-w-[8rem]"></div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, symbol or address..."
          className="bg-secondary text-foreground px-4 py-1.5 pr-10 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-full sm:w-72 text-sm"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
        {localSearch && (
          <button
             className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
             onClick={() => setLocalSearch('')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default FiltersBar
