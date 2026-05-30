
import useCoinStore from '../store/useCoinStore'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()

  const networks = [
    { id: 'ethereum', name: 'Ethereum', dexes: ['Uniswap', 'SushiSwap'] },
    { id: 'base', name: 'Base', dexes: ['Aerodrome', 'BaseSwap'] },
    { id: 'bsc', name: 'BNB', dexes: ['PancakeSwap'] },
    { id: 'solana', name: 'Solana', dexes: ['Raydium', 'Orca'] },
    { id: 'arbitrum', name: 'Arbitrum', dexes: ['Uniswap', 'Camelot'] },
    { id: 'polygon', name: 'Polygon', dexes: ['QuickSwap'] },
    { id: 'avalanche', name: 'Avalanche', dexes: ['Trader Joe', 'Pangolin'] },
  ]

  const ages = ['< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const marketCaps = ['Micro Cap', 'Small Cap', 'Mid Cap', 'Large Cap']
  const volumes = ['> $10k', '> $100k', '> $1m', '> $10m']

  const activeNetwork = networks.find(n => n.id === filters.network)

  return (
    <div className="bg-card p-4 border-b border-border space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[140px]"
          value={filters.network}
          onChange={(e) => {
            setFilters({ network: e.target.value, dex: 'all' })
          }}
        >
          <option value="all">All Networks</option>
          {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>

        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm min-w-[120px]"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
          disabled={filters.network === 'all'}
        >
          <option value="all">All DEXes</option>
          {activeNetwork?.dexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>

        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          value={filters.age}
          onChange={(e) => setFilters({ age: e.target.value })}
        >
          <option value="all">Any Age</option>
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
          <option value="all">Volume</option>
          {volumes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <div className="flex-1"></div>

        <input
          type="text"
          placeholder="Search pairs..."
          className="bg-secondary text-foreground px-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64 text-sm"
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-6 items-center border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-muted-foreground">Buy/Sell Ratio:</span>
          <select
            className="bg-transparent text-foreground text-xs font-medium outline-none"
            value={filters.buysSellsRatio}
            onChange={(e) => setFilters({ buysSellsRatio: e.target.value })}
          >
            <option value="all">All</option>
            <option value=">1.5">&gt; 1.5</option>
            <option value=">2">&gt; 2.0</option>
            <option value=">3">&gt; 3.0</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary"
            checked={filters.verified}
            onChange={(e) => setFilters({ verified: e.target.checked })}
          />
          <span className="text-xs font-bold uppercase group-hover:text-primary transition-colors">Verified Only</span>
        </label>
      </div>
    </div>
  )
}

export default FiltersBar
