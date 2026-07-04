
import useCoinStore from '../store/useCoinStore'
import { Search } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const volumes = ['> $10k', '> $100k', '> $1m']
  const marketCaps = [
    { label: 'Micro Cap', value: 'micro' },
    { label: 'Small Cap', value: 'small' },
    { label: 'Mid Cap', value: 'mid' },
    { label: 'Large Cap', value: 'large' },
  ]
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' },
  ]

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
  }

  const currentDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
        />
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
        value={filters.network}
        onChange={(e) => {
            setFilters({ network: e.target.value, dex: 'all' })
        }}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
        value={filters.dex}
        disabled={filters.network === 'all'}
        onChange={(e) => setFilters({ dex: e.target.value })}
      >
        <option value="all">All DEXes</option>
        {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">Age</option>
        {ages.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity</option>
        {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume</option>
        {volumes.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      <div className="flex-1"></div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium uppercase">Sort By:</span>
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value })}
        >
          {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  )
}

export default FiltersBar
