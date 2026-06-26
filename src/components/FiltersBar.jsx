
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm, setFilters])

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

  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = ['Micro', 'Small', 'Mid', 'Large']
  const volumes = ['> $10k', '> $100k', '> $1m']

  const availableDexes = filters.network !== 'all' ? dexMapping[filters.network] || [] : []

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64"
        />
      </div>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        value={filters.dex}
        disabled={filters.network === 'all'}
        onChange={(e) => setFilters({ dex: e.target.value })}
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
        {marketCaps.map(m => <option key={m} value={m.toLowerCase()}>{m}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume (24h)</option>
        {volumes.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
          filters.verified
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        <span className="text-sm font-medium">Verified</span>
      </button>

      <div className="flex-1"></div>

      <div className="flex items-center gap-2">
         <select className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm">
            <option>Trending</option>
            <option>Market Cap</option>
            <option>Volume</option>
            <option>Age</option>
         </select>
      </div>
    </div>
  )
}

export default FiltersBar
