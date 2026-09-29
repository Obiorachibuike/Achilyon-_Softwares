import { describe, expect, it } from 'vitest'
import {
  applyBuy, applySell, CurveError, curveAt, curvePoints, createCurve, defaultCurveConfig, fromSnapshot, getPricingModel,
  launchCurveConfig, minimumReceived, quoteBuy, quoteSell, summarizeCurve, toSnapshot, validateCurveConfig,
} from '@/lib/bondingCurve'

const ETH = 3200
const config = defaultCurveConfig('ETH', ETH)

describe('bonding curve configuration', () => {
  it('starts near the target $5K market cap for any quote asset', () => {
    for (const [symbol, usd] of [['ETH', 3200], ['SOL', 160], ['BNB', 590]] as const) {
      const s = summarizeCurve(createCurve(defaultCurveConfig(symbol, usd)))
      expect(s.marketCapUsd).toBeGreaterThan(4_900)
      expect(s.marketCapUsd).toBeLessThan(5_100)
    }
  })

  it('graduates at a much higher market cap than it starts', () => {
    const s = summarizeCurve(createCurve(config))
    expect(s.migrationMarketCapUsd / s.marketCapUsd).toBeGreaterThan(10)
  })

  it('launch curves keep the same economics regardless of total supply', () => {
    const a = summarizeCurve(createCurve(launchCurveConfig('ETH', ETH, 1_000_000_000, 80)))
    const b = summarizeCurve(createCurve(launchCurveConfig('ETH', ETH, 10_000_000_000, 80)))
    expect(a.marketCapUsd).toBeCloseTo(b.marketCapUsd, 3)
    expect(a.migrationMarketCapUsd).toBeCloseTo(b.migrationMarketCapUsd, 3)
  })

  it('rejects invalid configurations', () => {
    expect(validateCurveConfig(config)).toEqual([])
    expect(validateCurveConfig({ ...config, curveSupply: config.totalSupply * 2 }).length).toBeGreaterThan(0)
    expect(validateCurveConfig({ ...config, virtualTokenReserve: config.curveSupply / 2 }).length).toBeGreaterThan(0)
  })
})

describe('pricing model', () => {
  it('price increases monotonically as tokens are sold', () => {
    const pts = curvePoints(config, 32)
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.priceUsd).toBeGreaterThan(pts[i - 1]!.priceUsd)
  })

  it('tokensForQuote inverts costBetween', () => {
    const model = getPricingModel(config)
    const from = 123_000_000
    const cost = model.costBetween(from, from + 50_000_000)
    expect(model.tokensForQuote(from, cost)).toBeCloseTo(50_000_000, 0)
  })

  it('linear model is internally consistent', () => {
    const linear = { ...config, kind: 'linear' as const }
    const model = getPricingModel(linear)
    const cost = model.costBetween(0, 10_000_000)
    expect(model.tokensForQuote(0, cost)).toBeCloseTo(10_000_000, 0)
    expect(model.spotPrice(10_000_000)).toBeGreaterThan(model.spotPrice(0))
  })
})

describe('trading on the curve', () => {
  it('buy quote charges the fee and reports positive impact', () => {
    const q = quoteBuy(createCurve(config), 1)
    expect(q.fee).toBeCloseTo(0.01, 10)
    expect(q.tokensOut).toBeGreaterThan(0)
    expect(q.spotAfter).toBeGreaterThan(q.spotBefore)
    expect(q.priceImpactPct).toBeGreaterThan(0)
  })

  it('a buy followed by selling everything loses roughly two fees and never profits', () => {
    const start = createCurve(config)
    const { state, quote } = applyBuy(start, 2)
    const sell = quoteSell(state, quote.tokensOut)
    expect(sell.quoteOut).toBeLessThan(2)
    expect(sell.quoteOut).toBeGreaterThan(2 * 0.97)
    const after = applySell(state, quote.tokensOut).state
    expect(after.tokensSold).toBeCloseTo(0, 3)
    expect(after.quoteRaised).toBeCloseTo(0, 9)
  })

  it('larger orders have larger price impact', () => {
    const s = createCurve(config)
    expect(quoteBuy(s, 5).priceImpactPct).toBeGreaterThan(quoteBuy(s, 0.5).priceImpactPct)
  })

  it('clips buys at the end of the curve and refunds the excess', () => {
    const nearEnd = curveAt(config, config.curveSupply - 1_000_000)
    const q = quoteBuy(nearEnd, 1_000)
    expect(q.capped).toBe(true)
    expect(q.tokensOut).toBeCloseTo(1_000_000, 0)
    expect(q.refund).toBeGreaterThan(0)
  })

  it('enforces slippage protection', () => {
    const s = createCurve(config)
    const q = quoteBuy(s, 1)
    expect(() => applyBuy(s, 1, q.tokensOut * 1.01)).toThrow(CurveError)
    expect(() => applyBuy(s, 1, minimumReceived(q.tokensOut, 100))).not.toThrow()
  })

  it('rejects invalid amounts and trading on a completed curve', () => {
    const s = createCurve(config)
    expect(() => quoteBuy(s, 0)).toThrow(CurveError)
    expect(() => quoteBuy(s, Number.NaN)).toThrow(CurveError)
    expect(() => quoteBuy({ ...s, migrated: true }, 1)).toThrow(/complete/)
  })

  it('snapshots round-trip', () => {
    const s = curveAt(config, 250_000_000)
    const back = fromSnapshot(toSnapshot(s))
    expect(back.tokensSold).toBe(s.tokensSold)
    expect(summarizeCurve(back).priceUsd).toBeCloseTo(summarizeCurve(s).priceUsd, 12)
  })
})
