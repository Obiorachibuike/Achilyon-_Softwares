import type { MarketToken, SearchResults, TradingPair } from '@/types'
import { detectAddressKind } from '@/lib/blockchain/chains'

/**
 * Relevance-ranked search across tokens, pairs and creators.
 * Exact symbol / address matches rank first, then prefixes, then substrings;
 * ties break on liquidity so established markets surface above noise.
 */
export function scoreMatch(t: MarketToken, q: string): number {
  const query = q.trim().toLowerCase()
  if (!query) return 0
  const symbol = t.token.symbol.toLowerCase()
  const name = t.token.name.toLowerCase()
  const addr = t.token.address.toLowerCase()
  const pair = t.pair.address.toLowerCase()
  const creator = (t.token.creator ?? '').toLowerCase()
  if (addr === query || pair === query) return 1000
  if (symbol === query || symbol === query.replace(/^\$/, '')) return 900
  if (creator && creator === query) return 800
  if (symbol.startsWith(query)) return 700
  if (name === query) return 650
  if (name.startsWith(query)) return 600
  if (name.split(/\s+/).some((w) => w.startsWith(query))) return 500
  if (symbol.includes(query)) return 400
  if (name.includes(query)) return 300
  if (query.length >= 6 && (addr.includes(query) || pair.includes(query))) return 200
  return 0
}

export function searchMarket(tokens: MarketToken[], q: string, limit = 8): SearchResults {
  const query = q.trim()
  if (query.length < 1) return { tokens: [], pairs: [], creators: [] }
  const ranked = tokens
    .map((t) => ({ t, s: scoreMatch(t, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || b.t.market.liquidityUsd - a.t.market.liquidityUsd)
  const pairs: TradingPair[] = ranked
    .filter((r) => r.s >= 700 || r.t.pair.address.toLowerCase() === query.toLowerCase())
    .map((r) => r.t.pair)
    .slice(0, 5)
  const creators = new Map<string, number>()
  if (detectAddressKind(query)) {
    for (const t of tokens) {
      if (t.token.creator && t.token.creator.toLowerCase() === query.toLowerCase()) creators.set(t.token.creator, (creators.get(t.token.creator) ?? 0) + 1)
    }
  }
  return {
    tokens: ranked.slice(0, limit).map((r) => r.t),
    pairs,
    creators: [...creators.entries()].map(([address, count]) => ({ address, tokens: count })),
  }
}
