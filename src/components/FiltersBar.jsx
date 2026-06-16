import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck, ArrowDownWideNarrow } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = [
    { id: 'ethereum', name: 'Ethereum' },
    { id: 'base', name: 'Base' },
    { id: 'bnb', name: 'BNB' },
    { id: 'solana', name: 'Solana' },
    { id: 'arbitrum', name: 'Arbitrum' },
    { id: 'polygon', name: 'Polygon' },
    { id: 'avalanche', name: 'Avalanche' }
  ]

  const dexMapping = {
    all: [],
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin']
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search pairs..."
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>

      {/* Network */}
      <div className="flex items-center gap-2">
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>

      {/* DEX (Dynamic) */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {filters.network !== 'all' && dexMapping[filters.network]?.map(d => (
          <option key={d} value={d.toLowerCase()}>{d}</option>
        ))}
      </select>

      {/* Age */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">All Time</option>
        <option value="1h">&lt; 1h</option>
        <option value="6h">&lt; 6h</option>
        <option value="24h">&lt; 24h</option>
        <option value="7d">&lt; 7d</option>
      </select>

      {/* Liquidity */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity</option>
        <option value="> 10k">&gt; $10k</option>
        <option value="> 100k">&gt; $100k</option>
        <option value="> 1m">&gt; $1m</option>
      </select>

      {/* Market Cap */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        <option value="micro">Micro Cap (&lt;$1M)</option>
        <option value="small">Small Cap ($1M - $10M)</option>
        <option value="mid">Mid Cap ($10M - $100M)</option>
        <option value="large">Large Cap (&gt;$100M)</option>
      </select>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm ${
          filters.verified
            ? "bg-green-500/10 border-green-500/50 text-green-500"
            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShieldCheck size={16} />
        <span>Verified Only</span>
      </button>

      <div className="flex-1"></div>

      {/* Sort */}
      <div className="flex items-center gap-2 bg-secondary rounded-lg border border-border px-3 py-2">
        <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
        <select
          className="bg-transparent text-foreground outline-none text-sm cursor-pointer"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          <option value="trending">Trending</option>
          <option value="mcap">Market Cap</option>
          <option value="volume">Volume</option>
          <option value="age">Age</option>
        </select>
      </div>
    </div>
  )
}

export default FiltersBar
