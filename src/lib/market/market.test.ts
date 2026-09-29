import { describe, expect, it } from 'vitest'
import { applyFilters, countActiveFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams, type MarketFilters } from './filters'
import { scoreMatch, searchMarket } from './search'
import { paginate, sortTokens } from './sorting'
import { rankBy, trendingScore } from './scoring'
import { isChainId } from '@/lib/blockchain/chains'
import { makeToken } from '@/test/fixtures'

const now = Date.now()
const tokens = [
  makeToken({ token: { symbol: 'ACH', name: 'Achilyon', chain: 'base', verified: true }, market: { marketCap: 5_000_000, liquidityUsd: 400_000, priceChange: { h24: 12 } } }),
  makeToken({ token: { symbol: 'PEPE', name: 'Pepe', chain: 'ethereum', createdAt: now - 2 * 3_600_000 }, market: { marketCap: 900_000, liquidityUsd: 50_000, priceChange: { h24: -20 }, volume: { h24: 5_000 } } }),
  makeToken({ token: { symbol: 'ACHX', name: 'Achx Index', chain: 'solana', status: 'bonding', launchpad: true }, market: { marketCap: 30_000, liquidityUsd: 10_000, priceChange: { h24: 3 } }, pair: { dexId: 'raydium', dexName: 'Raydium' } }),
]

describe('filters', () => {
  it('applies network, market cap, liquidity and verification filters', () => {
    expect(applyFilters(tokens, { chain: 'base' })).toHaveLength(1)
    expect(applyFilters(tokens, { minMarketCap: 100_000 })).toHaveLength(2)
    expect(applyFilters(tokens, { minMarketCap: 100_000, maxMarketCap: 1_000_000 })).toHaveLength(1)
    expect(applyFilters(tokens, { minLiquidity: 40_000 })).toHaveLength(2)
    expect(applyFilters(tokens, { verifiedOnly: true })[0]?.token.symbol).toBe('ACH')
  })

  it('applies change direction, age, DEX, status and volume filters', () => {
    expect(applyFilters(tokens, { changeDirection: 'down' }).map((t) => t.token.symbol)).toEqual(['PEPE'])
    expect(applyFilters(tokens, { changeDirection: 'up', minChange: 10 }).map((t) => t.token.symbol)).toEqual(['ACH'])
    expect(applyFilters(tokens, { minChange: 10 })).toHaveLength(2)
    expect(applyFilters(tokens, { maxAgeHours: 6 }, now).map((t) => t.token.symbol)).toEqual(['PEPE'])
    expect(applyFilters(tokens, { dex: 'raydium' })).toHaveLength(1)
    expect(applyFilters(tokens, { status: 'bonding' })).toHaveLength(1)
    expect(applyFilters(tokens, { minVolume: 10_000 })).toHaveLength(2)
    expect(applyFilters(tokens, { query: 'achilyon' })).toHaveLength(1)
  })

  it('round-trips through URL params', () => {
    const f: MarketFilters = { ...DEFAULT_FILTERS, chain: 'solana', minMarketCap: 1000, maxAgeHours: 24, changeDirection: 'up', minChange: 5, dex: 'raydium', status: 'bonding', verifiedOnly: true, query: 'ach' }
    expect(filtersFromParams(filtersToParams(f), isChainId)).toEqual(f)
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('ignores malicious or invalid params', () => {
    const f = filtersFromParams(new URLSearchParams('chain=moon&minLiquidity=-5&dex=<script>&status=rugged&changeDirection=sideways'), isChainId)
    expect(f).toEqual(DEFAULT_FILTERS)
  })

  it('counts active filters excluding the search query', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0)
    expect(countActiveFilters({ ...DEFAULT_FILTERS, chain: 'base', verifiedOnly: true, query: 'x' })).toBe(2)
  })
})

describe('search', () => {
  it('ranks exact address > exact symbol > symbol prefix > name', () => {
    const [ach, , achx] = tokens as [typeof tokens[0], typeof tokens[0], typeof tokens[0]]
    expect(scoreMatch(ach, ach.token.address)).toBe(1000)
    expect(scoreMatch(ach, '$ach')).toBe(900)
    expect(scoreMatch(achx, 'ach')).toBe(700)
    expect(scoreMatch(ach, 'nothing-here')).toBe(0)
  })

  it('returns the exact ticker first and tie-breaks on liquidity', () => {
    const r = searchMarket(tokens, 'ach')
    expect(r.tokens.map((t) => t.token.symbol)).toEqual(['ACH', 'ACHX'])
    expect(searchMarket(tokens, '  ').tokens).toHaveLength(0)
  })

  it('finds creators and pairs by address', () => {
    const creator = tokens[0]!.token.creator!
    expect(searchMarket(tokens, creator).creators[0]).toEqual({ address: creator, tokens: 3 })
    expect(searchMarket(tokens, tokens[1]!.pair.address).pairs[0]?.address).toBe(tokens[1]!.pair.address)
  })
})

describe('sorting, pagination and scoring', () => {
  it('sorts in both directions without mutating input', () => {
    const copy = [...tokens]
    expect(sortTokens(tokens, 'marketCap').map((t) => t.token.symbol)).toEqual(['ACH', 'PEPE', 'ACHX'])
    expect(sortTokens(tokens, 'change24h', 'asc')[0]?.token.symbol).toBe('PEPE')
    expect(tokens).toEqual(copy)
  })

  it('paginates and clamps page numbers', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    expect(paginate(items, 3, 10)).toEqual({ items: [20, 21, 22], page: 3, pages: 3, total: 23 })
    expect(paginate(items, 99, 10).page).toBe(3)
  })

  it('exposes transparent score components', () => {
    const s = trendingScore(tokens[0]!)
    expect(s.components.length).toBeGreaterThan(1)
    expect(s.score).toBeGreaterThanOrEqual(0)
    expect(s.score).toBeLessThanOrEqual(100)
    expect(rankBy(tokens, trendingScore, 2)).toHaveLength(2)
  })
})
