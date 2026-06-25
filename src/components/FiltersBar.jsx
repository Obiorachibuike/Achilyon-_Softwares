
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ArrowDownWideNarrow } from 'lucide-react'

const networks = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'bnb', name: 'BNB Chain' },
  { id: 'solana', name: 'Solana' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'avalanche', name: 'Avalanche' }
]

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

const FiltersBar = () => {
  const { filters, setFilters, setSearchQuery } = useCoinStore()
  const [localSearch, setLocalSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchQuery])

  const activeDexes = dexMapping[filters.network] || []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      {/* Network */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>

      {/* DEX */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {activeDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      {/* Age */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
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
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity</option>
        <option value="10k">&gt; $10k</option>
        <option value="100k">&gt; $100k</option>
        <option value="1m">&gt; $1m</option>
      </select>

      {/* Market Cap */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        <option value="micro">Micro Cap</option>
        <option value="small">Small Cap</option>
        <option value="mid">Mid Cap</option>
        <option value="large">Large Cap</option>
      </select>

      <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border">
        <input
          type="checkbox"
          id="verified"
          className="accent-primary"
          checked={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.checked })}
        />
        <label htmlFor="verified" className="text-sm cursor-pointer select-none">Verified</label>
      </div>

      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name or address..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="bg-secondary text-foreground text-sm pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <ArrowDownWideNarrow className="text-muted-foreground w-4 h-4" />
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value })}
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
