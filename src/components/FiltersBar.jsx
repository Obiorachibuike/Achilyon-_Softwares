
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck, ArrowDownWideNarrow } from 'lucide-react'
import { useEffect, useState } from 'react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = [
    { name: 'Ethereum', value: 'ethereum' },
    { name: 'Base', value: 'base' },
    { name: 'BNB', value: 'bnb' },
    { name: 'Solana', value: 'solana' },
    { name: 'Arbitrum', value: 'arbitrum' },
    { name: 'Polygon', value: 'polygon' },
    { name: 'Avalanche', value: 'avalanche' }
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

  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const volumes = ['1h Volume', '24h Volume']
  const marketCaps = ['Micro Cap', 'Small Cap', 'Mid Cap', 'Large Cap']
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'marketCap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' }
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  const activeDexes = filters.network === 'all' ? [] : (dexMapping[filters.network] || [])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center sticky top-0 z-10">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Network Filter */}
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n.value} value={n.value}>{n.name}</option>)}
        </select>

        {/* DEX Filter */}
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          value={filters.dex}
          disabled={filters.network === 'all'}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {activeDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>

        {/* Age Filter */}
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          <option value="all">Age: Any</option>
          {ages.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Liquidity Filter */}
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          <option value="all">Liquidity: Any</option>
          {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {/* Volume Filter */}
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          <option value="all">Volume: Any</option>
          {volumes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {/* Market Cap Filter */}
        <select
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          <option value="all">MCAP: Any</option>
          {marketCaps.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="h-8 w-[1px] bg-border mx-2 hidden lg:block"></div>

      <div className="flex items-center gap-4 flex-1 min-w-[200px]">
        {/* Verified Toggle */}
        <button
          onClick={() => setFilters({ verified: !filters.verified })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            filters.verified
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Verified</span>
        </button>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search symbol or address..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="bg-secondary text-foreground text-sm pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-full"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
          <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
          <select
            className="bg-transparent text-foreground text-sm outline-none cursor-pointer"
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
          >
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
