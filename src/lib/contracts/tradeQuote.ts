import { BPS, quoteBuyExact, quoteSellExact, spotPriceQuote, toUnits, type OnchainCurve } from './curveMath'

/**
 * Exact on-chain trade quotes for the trading panel. Amounts are wei; the
 * maths is the bigint port that tests prove matches the contract exactly.
 */

export interface OnchainQuote {
  side: 'buy' | 'sell'
  amountIn: bigint
  amountOut: bigint
  minOut: bigint
  fee: bigint
  /** Buy only: native refunded because the order would overshoot the curve. */
  refund: bigint
  capped: boolean
  priceImpactPct: number
  avgPriceQuote: number
}

export const applySlippage = (amount: bigint, slippageBps: number) => (amount * (BPS - BigInt(Math.max(0, Math.min(5000, Math.round(slippageBps)))))) / BPS

export type QuoteProblem = 'zero' | 'complete' | 'balance' | 'exceeds-curve' | 'too-small'

export function onchainQuote(curve: OnchainCurve, side: 'buy' | 'sell', amountIn: bigint, slippageBps: number, balance?: bigint): { quote: OnchainQuote } | { problem: QuoteProblem } {
  if (amountIn <= 0n) return { problem: 'zero' }
  if (curve.complete) return { problem: 'complete' }
  if (balance !== undefined && amountIn > balance) return { problem: 'balance' }
  const spot = spotPriceQuote(curve)
  if (side === 'buy') {
    const q = quoteBuyExact(curve, amountIn)
    if (q.tokensOut === 0n) return { problem: 'too-small' }
    const spent = toUnits(q.net)
    const avg = spent / toUnits(q.tokensOut)
    return { quote: { side, amountIn, amountOut: q.tokensOut, minOut: applySlippage(q.tokensOut, slippageBps), fee: q.fee, refund: q.refund, capped: q.capped, priceImpactPct: spot > 0 ? (avg / spot - 1) * 100 : 0, avgPriceQuote: avg } }
  }
  const sold = curve.curveSupply - curve.realTokenReserve
  if (amountIn > sold) return { problem: 'exceeds-curve' }
  const q = quoteSellExact(curve, amountIn)
  if (q.quoteOut === 0n) return { problem: 'too-small' }
  const avg = toUnits(q.gross) / toUnits(amountIn)
  return { quote: { side, amountIn, amountOut: q.quoteOut, minOut: applySlippage(q.quoteOut, slippageBps), fee: q.fee, refund: 0n, capped: false, priceImpactPct: spot > 0 ? (1 - avg / spot) * 100 : 0, avgPriceQuote: avg } }
}

export const QUOTE_PROBLEM: Record<QuoteProblem, string> = {
  zero: 'Enter an amount greater than zero',
  complete: 'This curve has completed — trading continues after migration',
  balance: 'Amount exceeds your balance',
  'exceeds-curve': 'Amount exceeds tokens sold on the curve',
  'too-small': 'Amount too small',
}
