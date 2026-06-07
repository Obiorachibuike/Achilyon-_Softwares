import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ShieldCheck } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchValue, setSearchValue] = useState(filters.searchQuery)

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
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1M-$10M)', value: 'small' },
    { label: 'Mid Cap ($10M-$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' },
  ]

  const currentNetwork = networks.find(n => n.id === filters.network)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchValue })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchValue, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <Filter size={18} className="text-muted-foreground" />
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>

        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm disabled:opacity-50"
          value={filters.dex}
          disabled={filters.network === 'all'}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {currentNetwork?.dexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {mcaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors text-sm ${
          filters.verified
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        Verified Only
      </button>

      <div className="flex-1"></div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>
    </div>
  )
}

export default FiltersBar
