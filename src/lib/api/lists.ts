import type { MarketToken } from '@/types'
import { applyFilters, type MarketFilters } from '@/lib/market/filters'
import { sortTokens, type SortDirection, type SortKey } from '@/lib/market/sorting'

/** Named market views shared by API routes and pages. */
export type MarketList = 'all' | 'trending' | 'new' | 'pairs' | 'gainers' | 'losers'

export const MARKET_LISTS: MarketList[] = ['all', 'trending', 'new', 'pairs', 'gainers', 'losers']

export const SORT_KEYS: SortKey[] = ['price', 'change1h', 'change6h', 'change24h', 'volume', 'liquidity', 'marketCap', 'txns', 'buyRatio', 'age', 'trending', 'progress']

export function selectList(tokens: MarketToken[], list: MarketList, filters: Partial<MarketFilters>, sort?: { key: SortKey; dir: SortDirection }): MarketToken[] {
  let out = applyFilters(tokens, filters)
  switch (list) {
    case 'gainers':
      out = out.filter((t) => t.market.priceChange.h24 > 0 && (t.token.status === 'bonding' || t.market.liquidityUsd >= 5_000))
      break
    case 'losers':
      out = out.filter((t) => t.market.priceChange.h24 < 0 && (t.token.status === 'bonding' || t.market.liquidityUsd >= 5_000))
      break
    case 'new':
      out = out.filter((t) => Date.now() - t.token.createdAt < 7 * 86_400_000)
      break
    case 'pairs':
      out = [...out].sort((a, b) => b.pair.createdAt - a.pair.createdAt)
      break
    default:
      break
  }
  if (sort) return sortTokens(out, sort.key, sort.dir)
  switch (list) {
    case 'trending': return sortTokens(out, 'trending')
    case 'new': return sortTokens(out, 'age')
    case 'pairs': return out
    case 'gainers': return sortTokens(out, 'change24h', 'desc')
    case 'losers': return sortTokens(out, 'change24h', 'asc')
    default: return sortTokens(out, 'volume')
  }
}
