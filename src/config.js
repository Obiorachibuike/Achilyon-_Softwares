const env = import.meta.env ?? {}

const toNumber = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const config = {
  dexApiBase: (env.VITE_DEXSCREENER_API_BASE || 'https://api.dexscreener.com').replace(/\/$/, ''),
  goplusApiBase: (env.VITE_GOPLUS_API_BASE || 'https://api.gopluslabs.io/api/v1').replace(/\/$/, ''),
  marketQueries: (env.VITE_MARKET_QUERIES || 'SOL,WETH,USDC,USDT,BNB,PEPE,BONK,WIF,ARB,BRETT')
    .split(',')
    .map(q => q.trim())
    .filter(Boolean),
  refreshIntervalMs: Math.max(15000, toNumber(env.VITE_REFRESH_INTERVAL_MS, 60000)),
  paperStartingBalance: toNumber(env.VITE_PAPER_STARTING_BALANCE, 10000),
}

/** Chains surfaced in filters. `id` matches DexScreener chainId, `goplus` the GoPlus chain id. */
export const CHAINS = [
  { id: 'solana', label: 'Solana', short: 'SOL', goplus: 'solana' },
  { id: 'ethereum', label: 'Ethereum', short: 'ETH', goplus: '1' },
  { id: 'base', label: 'Base', short: 'BASE', goplus: '8453' },
  { id: 'bsc', label: 'BNB Chain', short: 'BSC', goplus: '56' },
  { id: 'arbitrum', label: 'Arbitrum', short: 'ARB', goplus: '42161' },
  { id: 'polygon', label: 'Polygon', short: 'POL', goplus: '137' },
  { id: 'avalanche', label: 'Avalanche', short: 'AVAX', goplus: '43114' },
]

export const chainLabel = (id) => CHAINS.find(c => c.id === id)?.label ?? (id ? id[0].toUpperCase() + id.slice(1) : '—')

export const AGE_OPTIONS = [
  { id: 'any', label: 'Any age', hours: null },
  { id: '1h', label: '< 1 hour', hours: 1 },
  { id: '6h', label: '< 6 hours', hours: 6 },
  { id: '24h', label: '< 24 hours', hours: 24 },
  { id: '7d', label: '< 7 days', hours: 24 * 7 },
  { id: '30d', label: '< 30 days', hours: 24 * 30 },
]

export const LIQUIDITY_OPTIONS = [
  { id: 'any', label: 'Any liquidity', min: 0 },
  { id: '10k', label: '> $10K', min: 10_000 },
  { id: '100k', label: '> $100K', min: 100_000 },
  { id: '1m', label: '> $1M', min: 1_000_000 },
]
