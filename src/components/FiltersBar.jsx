
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'

const NETWORK_DEX_MAP = {
  ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
  base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
  bnb: ['PancakeSwap', 'Biswap'],
  solana: ['Raydium', 'Orca', 'Jupiter'],
  arbitrum: ['Uniswap', 'Camelot', 'SushiSwap'],
  polygon: ['QuickSwap', 'Uniswap'],
  avalanche: ['Trader Joe', 'Pangolin']
}

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' }
  ]
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const volumes = ['> $50k', '> $500k', '> $5m']
  const marketCaps = ['Micro Cap', 'Small Cap', 'Mid Cap', 'Large Cap']
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Liquidity', value: 'liquidity' },
    { label: 'Volume (24h)', value: 'volume' },
    { label: 'Age', value: 'age' }
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  const availableDexes = filters.network !== 'all' ? NETWORK_DEX_MAP[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Network</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
          value={filters.network}
          onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">DEX</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary min-w-[120px] disabled:opacity-50"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
          disabled={filters.network === 'all'}
        >
          <option value="all">All DEXes</option>
          {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Age</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Liquidity</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.liquidity}
          onChange={(e) => setFilters({ liquidity: e.target.value })}
        >
          <option value="all">Any</option>
          {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Volume</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.volume}
          onChange={(e) => setFilters({ volume: e.target.value })}
        >
          <option value="all">Any</option>
          {volumes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">MCAP</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.marketCap}
          onChange={(e) => setFilters({ marketCap: e.target.value })}
        >
          <option value="all">Any</option>
          {marketCaps.map(m => <option key={m} value={m.toLowerCase().replace(' ', '-')}>{m}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Sort By</label>
        <select
          className="bg-secondary text-foreground text-sm px-3 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex-1"></div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Search</label>
        <input
          type="text"
          placeholder="Symbol or Address..."
          className="bg-secondary text-foreground text-sm px-4 py-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
    </div>
  )
}

export default FiltersBar
