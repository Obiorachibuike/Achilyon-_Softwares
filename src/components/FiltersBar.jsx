import { useState, useEffect } from 'react'
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
    { id: 'avalanche', name: 'Avalanche' },
  ]

  const dexMapping = {
    ethereum: ['Uniswap', 'SushiSwap', 'Curve'],
    base: ['Aerodrome', 'BaseSwap', 'Uniswap'],
    bnb: ['PancakeSwap', 'Biswap'],
    solana: ['Raydium', 'Orca', 'Jupiter'],
    arbitrum: ['Camelot', 'Uniswap', 'GMX'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
  }

  const ages = [
    { id: 'all', name: 'All Time' },
    { id: '1h', name: '< 1h' },
    { id: '6h', name: '< 6h' },
    { id: '24h', name: '< 24h' },
    { id: '7d', name: '< 7d' },
  ]

  const liquidities = [
    { id: 'all', name: 'Liquidity' },
    { id: '10k', name: '> $10k' },
    { id: '100k', name: '> $100k' },
    { id: '1m', name: '> $1m' },
  ]

  const marketCaps = [
    { id: 'all', name: 'Market Cap' },
    { id: 'micro', name: 'Micro (<$1M)' },
    { id: 'small', name: 'Small ($1M-$10M)' },
    { id: 'mid', name: 'Mid ($10M-$100M)' },
    { id: 'large', name: 'Large (>$100M)' },
  ]

  const sorts = [
    { id: 'trending', name: 'Trending' },
    { id: 'mcap', name: 'Market Cap' },
    { id: 'volume', name: 'Volume' },
    { id: 'age', name: 'Age' },
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center sticky top-0 z-20">
      {/* Network Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>

      {/* DEX Select - Dynamic based on network */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {filters.network !== 'all' && dexMapping[filters.network]?.map(dex => (
          <option key={dex} value={dex.toLowerCase()}>{dex}</option>
        ))}
      </select>

      {/* Age Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {/* Liquidity Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {/* Market Cap Select */}
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      {/* Sort Select */}
      <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3">
        <ArrowDownWideNarrow size={16} className="text-muted-foreground" />
        <select
          className="bg-transparent text-foreground py-2 outline-none text-sm font-medium"
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value })}
        >
          {sorts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
          filters.verified
            ? "bg-green-500/10 border-green-500/50 text-green-500"
            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShieldCheck size={16} />
        Verified
      </button>

      <div className="flex-1"></div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Search name or address..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="bg-secondary text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
        />
      </div>
    </div>
  )
}

export default FiltersBar
