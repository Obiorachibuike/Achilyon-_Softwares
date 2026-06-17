
import { useState, useEffect } from 'react'
import useCoinStore from '../store/useCoinStore'
import { Search, CheckCircle2, ArrowDownWideNarrow } from 'lucide-react'
import { cn } from '../lib/utils'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery)

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
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Camelot', 'Uniswap'],
    polygon: ['QuickSwap', 'Uniswap'],
    avalanche: ['Trader Joe', 'Pangolin'],
    all: []
  }

  const ages = [
    { label: 'All Time', value: 'all' },
    { label: '< 1h', value: '1h' },
    { label: '< 6h', value: '6h' },
    { label: '< 24h', value: '24h' },
    { label: '< 7d', value: '7d' },
  ]

  const liquidities = [
    { label: 'Liquidity', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1M', value: '1m' },
  ]

  const marketCaps = [
    { label: 'Market Cap', value: 'all' },
    { label: 'Micro Cap (< $100k)', value: 'micro' },
    { label: 'Small Cap (< $1M)', value: 'small' },
    { label: 'Mid Cap (< $10M)', value: 'mid' },
    { label: 'Large Cap (> $10M)', value: 'large' },
  ]

  const volumes = [
    { label: 'Volume', value: 'all' },
    { label: '> $10k', value: '10k' },
    { label: '> $100k', value: '100k' },
    { label: '> $1M', value: '1m' },
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: searchTerm })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-3 items-center">
      {/* Network */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary h-10 min-w-[120px]"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>

      {/* DEX - Dynamic */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary h-10 min-w-[120px]"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXs</option>
        {filters.network !== 'all' && dexMapping[filters.network]?.map(dex => (
          <option key={dex} value={dex.toLowerCase()}>{dex}</option>
        ))}
      </select>

      {/* Age */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary h-10"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      {/* Liquidity */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary h-10"
        value={filters.liquidity}
        onChange={(e) => setFilters({ liquidity: e.target.value })}
      >
        {liquidities.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      {/* Volume */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary h-10"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        {volumes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>

      {/* Market Cap */}
      <select
        className="bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary h-10"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        {marketCaps.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Verified Toggle */}
      <button
        onClick={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded border h-10 transition-colors text-sm font-medium",
          filters.verifiedOnly
            ? "bg-primary/10 border-primary text-primary"
            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
        )}
      >
        <CheckCircle2 size={16} />
        Verified
      </button>

      <div className="flex-1 min-w-[20px]"></div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary text-foreground text-sm pl-10 pr-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 h-10"
        />
      </div>

      <button className="p-2 rounded bg-secondary border border-border hover:bg-muted text-muted-foreground">
        <ArrowDownWideNarrow size={20} />
      </button>
    </div>
  )
}

export default FiltersBar
