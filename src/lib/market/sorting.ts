import type { MarketToken } from '@/types'
import { trendingScore } from './scoring'

export type SortKey =
  | 'price' | 'change1h' | 'change6h' | 'change24h' | 'volume' | 'liquidity' | 'marketCap'
  | 'txns' | 'buyRatio' | 'age' | 'trending' | 'progress'

export type SortDirection = 'asc' | 'desc'

export const SORT_ACCESSORS: Record<SortKey, (t: MarketToken) => number> = {
  price: (t) => t.market.priceUsd,
  change1h: (t) => t.market.priceChange.h1,
  change6h: (t) => t.market.priceChange.h6,
  change24h: (t) => t.market.priceChange.h24,
  volume: (t) => t.market.volume.h24,
  liquidity: (t) => t.market.liquidityUsd,
  marketCap: (t) => t.market.marketCap,
  txns: (t) => t.market.txns.h24.buys + t.market.txns.h24.sells,
  buyRatio: (t) => buyRatio(t),
  // Newer tokens sort first when descending.
  age: (t) => t.token.createdAt,
  trending: (t) => trendingScore(t).score,
  progress: (t) => t.curve?.progress ?? (t.token.status === 'bonding' ? 0 : 1),
}

export function buyRatio(t: MarketToken): number {
  const { buys, sells } = t.market.txns.h24
  return buys + sells === 0 ? 0.5 : buys / (buys + sells)
}

export function sortTokens(tokens: MarketToken[], key: SortKey, direction: SortDirection = 'desc'): MarketToken[] {
  const get = SORT_ACCESSORS[key]
  const mult = direction === 'desc' ? -1 : 1
  return [...tokens].sort((a, b) => (get(a) - get(b)) * mult)
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const p = Math.min(Math.max(1, page), pages)
  return { items: items.slice((p - 1) * pageSize, p * pageSize), page: p, pages, total: items.length }
}
