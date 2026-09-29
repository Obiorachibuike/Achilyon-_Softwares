import { describe, expect, it } from 'vitest'
import { fractionOf, impactLevel, quoteTrade } from './tradeQuote'
import { poolFromLiquidity, quotePoolBuy, quotePoolSell } from './amm'
import { makeCurveToken, makeToken } from '@/test/fixtures'

describe('AMM pool maths', () => {
  it('preserves x·y=k and charges fees', () => {
    const pool = poolFromLiquidity(200_000, 0.01)
    const k = pool.usdReserve * pool.tokenReserve
    const q = quotePoolBuy(pool, 1_000, 30)
    const after = (pool.usdReserve + 1_000 - q.fee) * (pool.tokenReserve - q.amountOut)
    expect(after).toBeCloseTo(k, -2)
    expect(q.fee).toBeCloseTo(3, 10)
    expect(q.avgPriceUsd).toBeGreaterThan(q.spotPriceUsd)
  })

  it('sells return less than spot value', () => {
    const pool = poolFromLiquidity(200_000, 0.01)
    const q = quotePoolSell(pool, 100_000, 30)
    expect(q.amountOut).toBeLessThan(100_000 * 0.01)
  })
})

describe('quoteTrade', () => {
  it('routes on-curve tokens through the bonding curve', () => {
    const q = quoteTrade(makeCurveToken(), 'buy', 100, 100)
    expect(q?.venue).toBe('curve')
    expect(q?.feeBps).toBe(100)
  })

  it('routes listed tokens through the pool', () => {
    const q = quoteTrade(makeToken(), 'buy', 100, 100)
    expect(q?.venue).toBe('pool')
  })

  it('computes minimum received from slippage', () => {
    const q = quoteTrade(makeToken(), 'buy', 1_000, 250)!
    expect(q.minReceived).toBeCloseTo(q.amountOut * 0.975, 6)
  })

  it('returns null for empty or invalid amounts', () => {
    expect(quoteTrade(makeToken(), 'buy', 0, 100)).toBeNull()
    expect(quoteTrade(makeToken(), 'sell', Number.NaN, 100)).toBeNull()
  })

  it('flags high and extreme price impact', () => {
    const thin = makeToken({ market: { liquidityUsd: 20_000 } })
    expect(impactLevel(quoteTrade(thin, 'buy', 50, 100)!.priceImpactPct)).toBe('ok')
    expect(impactLevel(quoteTrade(thin, 'buy', 1_000, 100)!.priceImpactPct)).toBe('high')
    expect(impactLevel(quoteTrade(thin, 'buy', 5_000, 100)!.priceImpactPct)).toBe('extreme')
  })

  it('computes 25/50/75/MAX shortcuts', () => {
    expect(fractionOf(1000, 25)).toBe(250)
    expect(fractionOf(1000, 100)).toBe(1000)
    expect(fractionOf(0, 50)).toBe(0)
    expect(fractionOf(0.3333333333, 50)).toBeLessThanOrEqual(0.3333333333 / 2)
  })
})
