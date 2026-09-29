import type { ChainId, MarketToken, TokenStatus } from '@/types'

/**
 * Reusable market filter model. Every discovery page shares these filters;
 * they serialize to/from URL search params so views are shareable.
 */
export interface MarketFilters {
  chain: ChainId | 'all'
  minMarketCap: number
  maxMarketCap: number
  minLiquidity: number
  minVolume: number
  /** Maximum token age in hours (0 = any). */
  maxAgeHours: number
  /** Minimum absolute 24h change in % (sign handled by `changeDirection`). */
  minChange: number
  changeDirection: 'any' | 'up' | 'down'
  dex: string | 'all'
  status: TokenStatus | 'all'
  verifiedOnly: boolean
  query: string
}

export const DEFAULT_FILTERS: MarketFilters = {
  chain: 'all',
  minMarketCap: 0,
  maxMarketCap: 0,
  minLiquidity: 0,
  minVolume: 0,
  maxAgeHours: 0,
  minChange: 0,
  changeDirection: 'any',
  dex: 'all',
  status: 'all',
  verifiedOnly: false,
  query: '',
}

export function matchesQuery(t: MarketToken, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [t.token.symbol, t.token.name, t.token.address, t.pair.address, t.token.creator, t.pair.dexName, t.pair.quoteToken.symbol]
    .some((v) => v != null && v.toLowerCase().includes(q))
}

export function applyFilters(tokens: MarketToken[], f: Partial<MarketFilters>, now = Date.now()): MarketToken[] {
  const filters = { ...DEFAULT_FILTERS, ...f }
  return tokens.filter((t) => {
    const m = t.market
    if (filters.chain !== 'all' && t.token.chain !== filters.chain) return false
    if (filters.minMarketCap && m.marketCap < filters.minMarketCap) return false
    if (filters.maxMarketCap && m.marketCap > filters.maxMarketCap) return false
    if (filters.minLiquidity && m.liquidityUsd < filters.minLiquidity) return false
    if (filters.minVolume && m.volume.h24 < filters.minVolume) return false
    if (filters.maxAgeHours && (now - t.token.createdAt) / 3_600_000 > filters.maxAgeHours) return false
    if (filters.changeDirection === 'up' && m.priceChange.h24 < Math.max(filters.minChange, 0.0001)) return false
    if (filters.changeDirection === 'down' && m.priceChange.h24 > -Math.max(filters.minChange, 0.0001)) return false
    if (filters.changeDirection === 'any' && filters.minChange && Math.abs(m.priceChange.h24) < filters.minChange) return false
    if (filters.dex !== 'all' && t.pair.dexId !== filters.dex) return false
    if (filters.status !== 'all' && t.token.status !== filters.status) return false
    if (filters.verifiedOnly && !t.token.verified) return false
    return matchesQuery(t, filters.query)
  })
}

export function countActiveFilters(f: MarketFilters): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof MarketFilters)[]).filter((k) => k !== 'query' && f[k] !== DEFAULT_FILTERS[k]).length
}

const NUMERIC_KEYS = ['minMarketCap', 'maxMarketCap', 'minLiquidity', 'minVolume', 'maxAgeHours', 'minChange'] as const

export function filtersFromParams(params: URLSearchParams, isChain: (v: string) => v is ChainId): MarketFilters {
  const f: MarketFilters = { ...DEFAULT_FILTERS }
  const chain = params.get('chain')
  if (chain && isChain(chain)) f.chain = chain
  for (const key of NUMERIC_KEYS) {
    const n = Number(params.get(key))
    if (Number.isFinite(n) && n > 0) f[key] = n
  }
  const dir = params.get('changeDirection')
  if (dir === 'up' || dir === 'down') f.changeDirection = dir
  const dex = params.get('dex')
  if (dex && /^[a-z0-9-_]{2,32}$/.test(dex)) f.dex = dex
  const status = params.get('status')
  if (status === 'bonding' || status === 'migrated' || status === 'listed') f.status = status
  if (params.get('verified') === '1') f.verifiedOnly = true
  f.query = (params.get('q') ?? '').slice(0, 80)
  return f
}

export function filtersToParams(f: MarketFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.chain !== 'all') p.set('chain', f.chain)
  for (const key of NUMERIC_KEYS) if (f[key]) p.set(key, String(f[key]))
  if (f.changeDirection !== 'any') p.set('changeDirection', f.changeDirection)
  if (f.dex !== 'all') p.set('dex', f.dex)
  if (f.status !== 'all') p.set('status', f.status)
  if (f.verifiedOnly) p.set('verified', '1')
  if (f.query) p.set('q', f.query)
  return p
}
