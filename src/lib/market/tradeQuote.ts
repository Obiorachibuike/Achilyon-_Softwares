import type { MarketToken, TradeSide } from '@/types'
import { fromSnapshot, minimumReceived, quoteBuy, quoteSell } from '@/lib/bondingCurve'
import { poolFromLiquidity, quotePoolBuy, quotePoolSell } from './amm'

/**
 * Client-side trade quote for the trading panel. Mirrors the settlement maths
 * used by the demo engine (bonding curve while on-curve, x·y=k pool
 * otherwise), so the preview matches execution up to price movement.
 *
 * Amount units: USD for buys, tokens for sells.
 */

export const POOL_FEE_BPS = 30
export const HIGH_IMPACT_PCT = 5
export const EXTREME_IMPACT_PCT = 15

export interface TradeQuote {
  side: TradeSide
  venue: 'curve' | 'pool'
  amountIn: number
  /** Tokens for buys, USD for sells. */
  amountOut: number
  minReceived: number
  feeUsd: number
  feeBps: number
  avgPriceUsd: number
  spotPriceUsd: number
  priceImpactPct: number
  /** Buy was clipped by the remaining curve supply. */
  capped: boolean
}

export type ImpactLevel = 'ok' | 'high' | 'extreme'

export function impactLevel(pct: number): ImpactLevel {
  if (pct >= EXTREME_IMPACT_PCT) return 'extreme'
  if (pct >= HIGH_IMPACT_PCT) return 'high'
  return 'ok'
}

export function quoteTrade(t: MarketToken, side: TradeSide, amount: number, slippageBps: number): TradeQuote | null {
  if (!(amount > 0) || !Number.isFinite(amount)) return null
  if (t.curve && t.token.status === 'bonding' && !t.curve.migrated) {
    const state = fromSnapshot(t.curve)
    const q = state.config.quoteUsd
    if (side === 'buy') {
      const r = quoteBuy(state, amount / q)
      if (r.tokensOut <= 0) return null
      return {
        side, venue: 'curve', amountIn: amount, amountOut: r.tokensOut, minReceived: minimumReceived(r.tokensOut, slippageBps),
        feeUsd: r.fee * q, feeBps: t.curve.feeBps, avgPriceUsd: r.avgPrice * q, spotPriceUsd: r.spotBefore * q, priceImpactPct: r.priceImpactPct, capped: r.capped,
      }
    }
    const r = quoteSell(state, Math.min(amount, state.tokensSold))
    if (r.quoteOut <= 0) return null
    const out = r.quoteOut * q
    return {
      side, venue: 'curve', amountIn: amount, amountOut: out, minReceived: minimumReceived(out, slippageBps),
      feeUsd: r.fee * q, feeBps: t.curve.feeBps, avgPriceUsd: r.avgPrice * q, spotPriceUsd: r.spotBefore * q, priceImpactPct: r.priceImpactPct, capped: false,
    }
  }
  const pool = poolFromLiquidity(t.market.liquidityUsd, t.market.priceUsd)
  const r = side === 'buy' ? quotePoolBuy(pool, amount, POOL_FEE_BPS) : quotePoolSell(pool, amount, POOL_FEE_BPS)
  if (r.amountOut <= 0) return null
  return {
    side, venue: 'pool', amountIn: amount, amountOut: r.amountOut, minReceived: minimumReceived(r.amountOut, slippageBps),
    feeUsd: r.fee, feeBps: POOL_FEE_BPS, avgPriceUsd: r.avgPriceUsd, spotPriceUsd: r.spotPriceUsd, priceImpactPct: r.priceImpactPct, capped: false,
  }
}

/** Amount for a 25/50/75/MAX shortcut, leaving nothing behind on MAX. */
export function fractionOf(balance: number, pct: number): number {
  if (!(balance > 0)) return 0
  if (pct >= 100) return balance
  return Math.floor(balance * (pct / 100) * 1e6) / 1e6
}
