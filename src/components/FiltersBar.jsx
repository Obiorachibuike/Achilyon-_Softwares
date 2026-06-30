
import { useEffect, useState } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, ShieldCheck, ArrowDownWideNarrow } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [localSearch, setLocalSearch] = useState(filters.searchQuery)

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = ['< 1h', '< 6h', '< 24h', '< 7d', 'all']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = [
    { id: 'micro', label: 'Micro Cap (<$1M)' },
    { id: 'small', label: 'Small Cap ($1M-$10M)' },
    { id: 'mid', label: 'Mid Cap ($10M-$100M)' },
    { id: 'large', label: 'Large Cap (>$100M)' }
  ]

  const dexMapping = {
    'ethereum': ['Uniswap', 'SushiSwap', 'Curve'],
    'base': ['Aerodrome', 'BaseSwap', 'Uniswap'],
    'bnb': ['PancakeSwap', 'Biswap'],
    'solana': ['Raydium', 'Orca', 'Jupiter'],
    'arbitrum': ['Camelot', 'Uniswap', 'GMX'],
    'polygon': ['QuickSwap', 'Uniswap'],
    'avalanche': ['Trader Joe', 'Pangolin']
  }

  const currentDexes = filters.network === 'all' ? [] : (dexMapping[filters.network] || [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localSearch })
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border space-y-4 shadow-sm z-10">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search by token or address..."
            className="bg-secondary/50 text-foreground pl-10 pr-4 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 w-full transition-all"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Network */}
        <select
          className="bg-secondary/50 text-foreground px-4 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 font-medium transition-all"
          value={filters.network}
          onChange={(e) => {
            setFilters({ network: e.target.value, dex: 'all' })
          }}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n} value={n.toLowerCase()}>{n}</option>)}
        </select>

        {/* DEX (Dynamic) */}
        {currentDexes.length > 0 && (
          <select
            className="bg-secondary/50 text-foreground px-4 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 font-medium transition-all"
            value={filters.dex}
            onChange={(e) => setFilters({ dex: e.target.value })}
          >
            <option value="all">All DEXes</option>
            {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
          </select>
        )}

        {/* Age */}
        <select
          className="bg-secondary/50 text-foreground px-4 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 font-medium transition-all"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          <option value="all">Age: All Time</option>
          {ages.filter(a => a !== 'all').map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Verified Toggle */}
        <button
          onClick={() => setFilters({ verified: !filters.verified })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-medium ${
            filters.verified
            ? 'bg-green-500/10 border-green-500/50 text-green-500'
            : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck size={18} />
          Verified
        </button>

        <div className="flex-1"></div>

        {/* Sort */}
        <div className="flex items-center gap-2">
           <ArrowDownWideNarrow size={18} className="text-muted-foreground" />
           <select
            className="bg-secondary/50 text-foreground px-4 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/50 font-bold transition-all text-sm"
            value={filters.sort}
            onChange={(e) => setFilters({ sort: e.target.value })}
          >
            <option value="trending">Trending Score</option>
            <option value="mcap">Market Cap</option>
            <option value="volume">24h Volume</option>
            <option value="age">Age</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center border-t border-border/50 pt-4">
        {/* Market Cap */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Market Cap:</span>
          <div className="flex gap-2">
             {marketCaps.map(cap => (
               <button
                 key={cap.id}
                 onClick={() => setFilters({ marketCap: filters.marketCap === cap.id ? 'all' : cap.id })}
                 className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                   filters.marketCap === cap.id
                   ? 'bg-primary border-primary text-primary-foreground'
                   : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'
                 }`}
               >
                 {cap.label.split(' ')[0]}
               </button>
             ))}
          </div>
        </div>

        <div className="w-[1px] h-4 bg-border hidden md:block"></div>

        {/* Liquidity */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Liquidity:</span>
          <div className="flex gap-2">
             {liquidities.map(liq => (
               <button
                 key={liq}
                 onClick={() => setFilters({ liquidity: filters.liquidity === liq ? 'all' : liq })}
                 className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                   filters.liquidity === liq
                   ? 'bg-primary border-primary text-primary-foreground'
                   : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'
                 }`}
               >
                 {liq}
               </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FiltersBar
