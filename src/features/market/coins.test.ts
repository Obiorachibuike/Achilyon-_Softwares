import { describe, expect, it } from 'vitest'
import { dexesForChain } from '@/lib/blockchain/dexes'
import { applyFilters } from '@/lib/market/filters'
import { trendingScore } from '@/lib/market/scoring'
import { makeToken } from '@/test/fixtures'

describe('Coins Terminal & Filter Logic', () => {
  describe('DEX chain mapping', () => {
    it('maps Ethereum DEXes correctly', () => {
      const ethDexes = dexesForChain('ethereum').map((d) => d.id)
      expect(ethDexes).toContain('uniswap')
      expect(ethDexes).toContain('sushiswap')
      expect(ethDexes).toContain('curve')
    })

    it('maps Base DEXes correctly', () => {
      const baseDexes = dexesForChain('base').map((d) => d.id)
      expect(baseDexes).toContain('aerodrome')
      expect(baseDexes).toContain('baseswap')
      expect(baseDexes).toContain('uniswap')
    })

    it('maps BNB Chain DEXes correctly', () => {
      const bscDexes = dexesForChain('bsc').map((d) => d.id)
      expect(bscDexes).toContain('pancakeswap')
      expect(bscDexes).toContain('biswap')
    })

    it('maps Solana DEXes correctly', () => {
      const solDexes = dexesForChain('solana').map((d) => d.id)
      expect(solDexes).toContain('raydium')
      expect(solDexes).toContain('orca')
      expect(solDexes).toContain('jupiter')
      expect(solDexes).toContain('meteora')
    })

    it('maps Arbitrum DEXes correctly', () => {
      const arbDexes = dexesForChain('arbitrum').map((d) => d.id)
      expect(arbDexes).toContain('camelot')
      expect(arbDexes).toContain('uniswap')
      expect(arbDexes).toContain('sushiswap')
      expect(arbDexes).toContain('curve')
      expect(arbDexes).toContain('gmx')
    })

    it('maps Polygon DEXes correctly', () => {
      const polyDexes = dexesForChain('polygon').map((d) => d.id)
      expect(polyDexes).toContain('quickswap')
      expect(polyDexes).toContain('uniswap')
      expect(polyDexes).toContain('sushiswap')
      expect(polyDexes).toContain('curve')
    })

    it('maps Avalanche DEXes correctly', () => {
      const avaxDexes = dexesForChain('avalanche').map((d) => d.id)
      expect(avaxDexes).toContain('traderjoe')
      expect(avaxDexes).toContain('pangolin')
      expect(avaxDexes).toContain('uniswap')
      expect(avaxDexes).toContain('curve')
    })
  })

  describe('Market filters', () => {
    const baseTime = 1_700_000_000_000

    const t1 = makeToken({
      token: {
        address: '0x1111111111111111111111111111111111111111',
        chain: 'base',
        createdAt: baseTime - 30 * 60 * 1000, // 30 mins ago (< 1h)
      },
      market: {
        marketCap: 500_000, // Micro cap (<$1M)
        liquidityUsd: 15_000, // >$10k
        volume: { h1: 5_000, h6: 8_000, h24: 12_000 }, // >$10k 24h
        priceChange: { m5: 0, h1: 5, h6: 12, h24: 25 },
        txns: { h1: { buys: 20, sells: 5 }, h24: { buys: 150, sells: 50 } },
      },
      pair: {
        dexId: 'aerodrome',
        dexName: 'Aerodrome',
      },
    })

    const t2 = makeToken({
      token: {
        address: '0x2222222222222222222222222222222222222222',
        chain: 'ethereum',
        createdAt: baseTime - 4 * 3600 * 1000, // 4 hours ago (< 6h)
      },
      market: {
        marketCap: 5_000_000, // Small cap ($1M–$10M)
        liquidityUsd: 150_000, // >$100k
        volume: { h1: 40_000, h6: 120_000, h24: 250_000 }, // >$100k 24h
        priceChange: { m5: 0, h1: -2, h6: 4, h24: -15 },
        txns: { h1: { buys: 5, sells: 15 }, h24: { buys: 40, sells: 120 } },
      },
      pair: {
        dexId: 'uniswap',
        dexName: 'Uniswap',
      },
    })

    const t3 = makeToken({
      token: {
        address: '0x3333333333333333333333333333333333333333',
        chain: 'solana',
        createdAt: baseTime - 48 * 3600 * 1000, // 48 hours ago (< 7d)
      },
      market: {
        marketCap: 50_000_000, // Mid cap ($10M–$100M)
        liquidityUsd: 2_500_000, // >$1m
        volume: { h1: 300_000, h6: 800_000, h24: 3_000_000 }, // >$1m 24h
        priceChange: { m5: 0, h1: 1, h6: 2, h24: 3 },
        txns: { h1: { buys: 60, sells: 50 }, h24: { buys: 500, sells: 450 } },
      },
      pair: {
        dexId: 'raydium',
        dexName: 'Raydium',
      },
    })

    const allTokens = [t1, t2, t3]

    it('filters by chain', () => {
      const res = applyFilters(allTokens, { chain: 'base' }, baseTime)
      expect(res).toHaveLength(1)
      expect(res[0]?.token.address).toBe(t1.token.address)
    })

    it('filters by DEX', () => {
      const res = applyFilters(allTokens, { dex: 'uniswap' }, baseTime)
      expect(res).toHaveLength(1)
      expect(res[0]?.token.address).toBe(t2.token.address)
    })

    it('filters by age categories', () => {
      // < 1h
      const age1h = applyFilters(allTokens, { maxAgeHours: 1 }, baseTime)
      expect(age1h).toHaveLength(1)
      expect(age1h[0]?.token.address).toBe(t1.token.address)

      // < 6h
      const age6h = applyFilters(allTokens, { maxAgeHours: 6 }, baseTime)
      expect(age6h).toHaveLength(2)

      // < 7d (168h)
      const age7d = applyFilters(allTokens, { maxAgeHours: 168 }, baseTime)
      expect(age7d).toHaveLength(3)
    })

    it('filters by market cap tiers (micro, small, mid cap)', () => {
      // Micro cap (<$1M)
      const micro = applyFilters(allTokens, { minMarketCap: 0, maxMarketCap: 1_000_000 }, baseTime)
      expect(micro).toHaveLength(1)
      expect(micro[0]?.token.address).toBe(t1.token.address)

      // Small cap ($1M - $10M)
      const small = applyFilters(allTokens, { minMarketCap: 1_000_000, maxMarketCap: 10_000_000 }, baseTime)
      expect(small).toHaveLength(1)
      expect(small[0]?.token.address).toBe(t2.token.address)

      // Mid cap ($10M - $100M)
      const mid = applyFilters(allTokens, { minMarketCap: 10_000_000, maxMarketCap: 100_000_000 }, baseTime)
      expect(mid).toHaveLength(1)
      expect(mid[0]?.token.address).toBe(t3.token.address)
    })

    it('filters by liquidity thresholds', () => {
      const liq100k = applyFilters(allTokens, { minLiquidity: 100_000 }, baseTime)
      expect(liq100k).toHaveLength(2)
      expect(liq100k.map((x) => x.token.address)).toEqual([t2.token.address, t3.token.address])

      const liq1m = applyFilters(allTokens, { minLiquidity: 1_000_000 }, baseTime)
      expect(liq1m).toHaveLength(1)
      expect(liq1m[0]?.token.address).toBe(t3.token.address)
    })

    it('filters by volume thresholds', () => {
      const vol100k = applyFilters(allTokens, { minVolume: 100_000 }, baseTime)
      expect(vol100k).toHaveLength(2)

      const vol1m = applyFilters(allTokens, { minVolume: 1_000_000 }, baseTime)
      expect(vol1m).toHaveLength(1)
      expect(vol1m[0]?.token.address).toBe(t3.token.address)
    })

    it('computes trending score for discovery terminal display', () => {
      const s1 = trendingScore(t1)
      expect(s1.score).toBeGreaterThan(0)
      expect(s1.score).toBeLessThanOrEqual(100)
      expect(s1.components).toBeDefined()
      expect(s1.components.length).toBeGreaterThan(0)
    })
  })
})
