
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { CheckCircle2 } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']

  const dexMap = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
  }

  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const mcapOptions = [
    { label: 'Micro Cap (<$1M)', value: 'micro' },
    { label: 'Small Cap ($1M-$10M)', value: 'small' },
    { label: 'Mid Cap ($10M-$100M)', value: 'mid' },
    { label: 'Large Cap (>$100M)', value: 'large' },
  ]
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const volumes = ['> $10k', '> $100k', '> $1m']
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' },
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <div className="flex flex-wrap gap-2">
        {/* Network */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>

        {/* DEX - Dynamic based on network */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
          disabled={filters.network === 'all'}
        >
          <option value="all">All DEXes</option>
          {filters.network !== 'all' && dexMap[filters.network]?.map(d => (
            <option key={d} value={d.toLowerCase()}>{d}</option>
          ))}
        </select>

        {/* Age */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          <option value="all">All Time</option>
          {ages.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Market Cap */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          <option value="all">Market Cap</option>
          {mcapOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {/* Liquidity */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          <option value="all">Liquidity</option>
          {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {/* Volume */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          <option value="all">24h Volume</option>
          {volumes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {/* Sort */}
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          {sortOptions.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>

        <button
          onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
          className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
            filters.verifiedOnly
              ? 'bg-primary/20 border-primary text-primary'
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 size={16} />
          Verified
        </button>
      </div>

      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search pairs by name, symbol or address..."
          className="bg-secondary text-foreground px-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-full text-sm"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
    </div>
  )
}

export default FiltersBar
