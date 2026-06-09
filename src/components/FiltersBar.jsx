import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = [
    { id: 'ethereum', name: 'Ethereum', dexes: ['Uniswap', 'SushiSwap'] },
    { id: 'base', name: 'Base', dexes: ['Aerodrome', 'BaseSwap'] },
    { id: 'bsc', name: 'BNB', dexes: ['PancakeSwap'] },
    { id: 'solana', name: 'Solana', dexes: ['Raydium', 'Orca'] },
    { id: 'arbitrum', name: 'Arbitrum', dexes: ['Camelot', 'Uniswap'] },
    { id: 'polygon', name: 'Polygon', dexes: ['QuickSwap', 'Uniswap'] },
    { id: 'avalanche', name: 'Avalanche', dexes: ['Trader Joe', 'Pangolin'] },
  ]

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

  const mcaps = [
    { label: 'Any MCAP', value: 'all' },
    { label: 'Micro Cap', value: 'micro' }, // < 1M
    { label: 'Small Cap', value: 'small' }, // 1M - 10M
    { label: 'Mid Cap', value: 'mid' },     // 10M - 100M
    { label: 'Large Cap', value: 'large' }, // > 100M
  ]

  const volumes = [
    { label: 'Any Volume', value: 'all' },
    { label: '> $50k', value: '50k' },
    { label: '> $500k', value: '500k' },
    { label: '> $5m', value: '5m' },
  ]

  const activeNetwork = networks.find(n => n.id === filters.network)
  const availableDexes = activeNetwork ? activeNetwork.dexes : []

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center sticky top-0 z-20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {mcaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
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
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      <label className="flex items-center gap-2 text-sm cursor-pointer ml-2">
        <input
          type="checkbox"
          checked={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.checked })}
          className="rounded border-border bg-secondary text-primary focus:ring-primary"
        />
        <span className={filters.verified ? "text-primary font-medium" : "text-muted-foreground"}>Verified Only</span>
      </label>
    </div>
  )
}

export default FiltersBar
