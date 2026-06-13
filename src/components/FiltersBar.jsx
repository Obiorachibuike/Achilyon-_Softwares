import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, Filter, ArrowDownWideNarrow, ShieldCheck } from 'lucide-react'

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

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  const handleNetworkChange = (e) => {
    setFilters({ network: e.target.value, dex: 'all' })
  }

  const availableDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center sticky top-0 z-20">
      {/* Network Select */}
      <div className="relative">
        <select
          className="appearance-none bg-secondary text-foreground pl-3 pr-8 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[140px] text-sm"
          value={filters.network}
          onChange={handleNetworkChange}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
        <Filter className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* DEX Select (Dynamic) */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[120px] text-sm disabled:opacity-50"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      {/* Age Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">Age: All</option>
        <option value="1h">&lt; 1h</option>
        <option value="6h">&lt; 6h</option>
        <option value="24h">&lt; 24h</option>
        <option value="7d">&lt; 7d</option>
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity</option>
        <option value="10k">&gt; $10k</option>
        <option value="100k">&gt; $100k</option>
        <option value="1m">&gt; $1m</option>
      </select>

      {/* Market Cap Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        <option value="micro">&lt; $100k</option>
        <option value="small">$100k - $1M</option>
        <option value="mid">$1M - $10M</option>
        <option value="large">&gt; $10M</option>
      </select>

      {/* Sort Select */}
      <div className="relative">
        <select
          className="appearance-none bg-secondary text-foreground pl-3 pr-8 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[130px] text-sm"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          <option value="trending">Trending</option>
          <option value="mcap">Market Cap</option>
          <option value="volume">Volume (24h)</option>
          <option value="age">Newest</option>
        </select>
        <ArrowDownWideNarrow className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors text-sm font-medium ${
          filters.verified
            ? 'bg-green-500/10 border-green-500/50 text-green-500'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        Verified Only
      </button>

      <div className="flex-1 min-w-[200px] relative">
        <input
          type="text"
          placeholder="Search tokens, symbols or addresses..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}

export default FiltersBar
