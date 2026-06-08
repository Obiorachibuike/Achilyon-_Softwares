
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'

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
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = ['Micro Cap', 'Small Cap', 'Mid Cap', 'Large Cap']
  const volumes = ['> $50k', '> $500k', '> $5m']
  const sortOptions = [
    { label: 'Trending', value: 'trending' },
    { label: 'Market Cap', value: 'mcap' },
    { label: 'Volume', value: 'volume' },
    { label: 'Age', value: 'age' },
  ]

  const availableDexes = filters.network !== 'all' ? dexMap[filters.network] || [] : []


  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {availableDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        <option value="all">All Time</option>
        {ages.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        <option value="all">Liquidity</option>
        {liquidities.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        {marketCaps.map(m => <option key={m} value={m.toLowerCase().replace(' ', '-')}>{m}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume</option>
        {volumes.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.sortBy}
        onChange={(e) => setFilters({ sortBy: e.target.value })}
      >
        {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.verified}
          onChange={(e) => setFilters({ verified: e.target.checked })}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm font-medium">Verified</span>
      </label>

      <div className="flex-1"></div>

      <input
        type="text"
        placeholder="Search pairs..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="bg-secondary text-foreground px-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64"
      />
    </div>
  )
}

export default FiltersBar
