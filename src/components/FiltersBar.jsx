
import useCoinStore from '../store/useCoinStore'

const FiltersBar = () => {
  const { filters, setFilters } = useCoinStore()

  const networks = ['Ethereum', 'Base', 'BNB', 'Solana', 'Arbitrum', 'Polygon', 'Avalanche']
  const ages = ['All Time', '< 1h', '< 6h', '< 24h', '< 7d']
  const liquidities = ['> $10k', '> $100k', '> $1m']
  const volumes = ['> $10k', '> $100k', '> $1m']
  const marketCaps = ['Micro Cap', 'Small Cap', 'Mid Cap', 'Large Cap']

  const chainDexMap = {
    ethereum: ['Uniswap', 'SushiSwap'],
    base: ['Aerodrome', 'BaseSwap'],
    bnb: ['PancakeSwap'],
    solana: ['Raydium', 'Orca'],
    arbitrum: ['Uniswap', 'Camelot'],
    polygon: ['QuickSwap'],
    avalanche: ['Trader Joe']
  }

  const currentDexes = chainDexMap[filters.network] || []

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

      {currentDexes.length > 0 && (
        <select
          className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
          value={filters.dex}
          onChange={(e) => setFilters({ dex: e.target.value })}
        >
          <option value="all">All DEXes</option>
          {currentDexes.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
        </select>
      )}

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.age}
        onChange={(e) => setFilters({ age: e.target.value })}
      >
        {ages.map(a => <option key={a} value={a === 'All Time' ? 'all' : a}>{a}</option>)}
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
        value={filters.volume}
        onChange={(e) => setFilters({ volume: e.target.value })}
      >
        <option value="all">Volume</option>
        {volumes.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      <select
        className="bg-secondary text-foreground px-3 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
        value={filters.marketCap}
        onChange={(e) => setFilters({ marketCap: e.target.value })}
      >
        <option value="all">Market Cap</option>
        {marketCaps.map(m => <option key={m} value={m.toLowerCase().replace(' ', '-')}>{m}</option>)}
      </select>

      <div className="flex-1"></div>

      <input
        type="text"
        placeholder="Search pairs..."
        className="bg-secondary text-foreground px-4 py-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary w-64"
        value={filters.searchQuery}
        onChange={(e) => setFilters({ searchQuery: e.target.value })}
      />
    </div>
  )
}

export default FiltersBar
