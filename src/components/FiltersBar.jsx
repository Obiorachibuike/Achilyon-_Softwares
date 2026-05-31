
import useCoinStore from '../store/useCoinStore'
import { ShieldCheck } from 'lucide-react'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()

  const networks = [
    { name: 'Ethereum', dexes: ['Uniswap', 'SushiSwap'] },
    { name: 'Base', dexes: ['Aerodrome', 'BaseSwap'] },
    { name: 'BNB', dexes: ['PancakeSwap'] },
    { name: 'Solana', dexes: ['Raydium', 'Orca'] },
    { name: 'Arbitrum', dexes: ['Uniswap', 'Camelot'] },
    { name: 'Polygon', dexes: ['QuickSwap'] },
    { name: 'Avalanche', dexes: ['Trader Joe'] }
  ]

  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = ['Micro Cap (< $1M)', 'Small Cap (< $10M)', 'Mid Cap (< $100M)', 'Large Cap (> $100M)']
  const volumes = ['> $10k', '> $100k', '> $1m', '> $10m']

  const currentNetwork = networks.find(n => n.name.toLowerCase() === filters.network)

  return (
    <div className="bg-card p-4 border-b border-border flex flex-wrap gap-4 items-center">
      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.network}
        onChange={(e) => setFilters({ network: e.target.value, dex: 'all' })}
      >
        <option value="all">All Networks</option>
        {networks.map(n => <option key={n.name} value={n.name.toLowerCase()}>{n.name}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.dex}
        onChange={(e) => setFilters({ dex: e.target.value })}
        disabled={filters.network === 'all'}
      >
        <option value="all">All DEXes</option>
        {currentNetwork?.dexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
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
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        {marketCaps.map(m => <option key={m} value={m.toLowerCase()}>{m}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume (24h)</option>
        {volumes.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      <button
        onClick={() => setFilters({ verified: !filters.verified })}
        className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
          filters.verified
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-secondary border-border text-muted-foreground'
        }`}
      >
        <ShieldCheck size={16} />
        Verified
      </button>

      <div className="flex-1"></div>

      <input
        type="text"
        placeholder="Search pairs..."
        value={filters.searchQuery}
        onChange={(e) => setFilters({ searchQuery: e.target.value })}
        className="bg-secondary text-foreground px-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
      />
    </div>
  )
}

export default FiltersBar
