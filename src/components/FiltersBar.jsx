import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Shield } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
    all: []
  }

  const availableDexes = dexMapping[filters.network] || []

  return (
    <div className="bg-card p-4 border-b border-border space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Network & DEX */}
        <div className="flex gap-2">
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.network}
            onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
          >
            <option value="all">All Networks</option>
            {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
          </select>

          {availableDexes.length > 0 && (
            <select
              className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
              value={filters.dex}
              onChange={(e) => setFilters({ dex: e.target.value })}
            >
              <option value="all">All DEXes</option>
              {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
            </select>
          )}
        </div>

        {/* Market Filters */}
        <div className="flex gap-2">
          <select
            className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.age}
            onChange={(e) => setFilters({ age: e.target.value })}
          >
            <option value="all">Age: All</option>
            <option value="1h">{'< 1h'}</option>
            <option value="6h">{'< 6h'}</option>
            <option value="24h">{'< 24h'}</option>
            <option value="7d">{'< 7d'}</option>
          </select>

          <select
            className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.liquidity}
            onChange={(e) => setFilters({ liquidity: e.target.value })}
          >
            <option value="all">Liquidity: All</option>
            <option value="10k">{'> $10k'}</option>
            <option value="100k">{'> $100k'}</option>
            <option value="1m">{'> $1m'}</option>
          </select>

          <select
            className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            value={filters.sort}
            onChange={(e) => setFilters({ sort: e.target.value })}
          >
            <option value="trending">Sort: Trending</option>
            <option value="mcap">Sort: Market Cap</option>
            <option value="volume">Sort: Volume</option>
            <option value="age">Sort: Age</option>
          </select>
        </div>

        {/* Verified Toggle */}
        <button
          onClick={() => setFilters({ verified: !filters.verified })}
          className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors text-sm font-medium ${
            filters.verified
              ? 'bg-primary/20 border-primary text-primary'
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield size={16} />
          Verified
        </button>

        <div className="flex-1"></div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search symbol or address..."
            className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
