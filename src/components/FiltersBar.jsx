
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ArrowDownWideNarrow } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters, searchQuery, setSearchQuery } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' }
  ]
  const liquidities = [
    { label: 'Any Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1m', value: '1m' }
  ]
  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin']
  }

  const currentDexes = filters.network === 'all' ? [] : (dexMapping[filters.network] || [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchQuery])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <div className="relative">
        <select
          className="appearance-none bg-secondary text-foreground pl-3 pr-8 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
           <ArrowDownWideNarrow size={14} />
        </div>
      </div>

      {currentDexes.length > 0 && (
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

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
        value={filters.sort}
        onChange={(e) => setFilters({ sort: e.target.value })}
      >
        <option value="trending">Trending Score</option>
        <option value="mcap">Market Cap</option>
        <option value="volume">Volume (24h)</option>
        <option value="age">Age (Newest)</option>
      </select>

      <div className="flex items-center gap-2 ml-2">
        <input
          type="checkbox"
          id="verified"
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary"
          checked={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.checked })}
        />
        <label htmlFor="verified" className="text-sm font-medium">Verified</label>
      </div>

      <div className="flex-1"></div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search symbols or addresses..."
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-72 text-sm"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
    </div>
  )
}

export default FiltersBar
